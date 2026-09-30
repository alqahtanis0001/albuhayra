import "server-only";

import type { Prisma } from "@/generated/prisma";
import { allocate } from "@/lib/allocation";
import { writeAudit } from "@/lib/audit";
import { dateToISO } from "@/lib/dates";

/**
 * The plan write core (docs/BACKEND.md → v1.2a → Plans; V4, W14). Everything
 * here runs inside the caller's `$transaction` and is scoped by the caller's
 * `establishmentId` — it is in the scoping gate's static sweep.
 *
 * **The only place `paidHalalas` is written** (W5 gates it): the column is a
 * cache of `allocate()` over the plan's non-deleted linked transactions.
 */

/**
 * Thrown inside `$transaction` when the plan changed since it was read, so the
 * whole transaction rolls back. Callers catch **only** this class
 * (`instanceof`) and answer `err.concurrentChange`; anything else propagates.
 */
export class ConcurrentChangeError extends Error {
  constructor() {
    super("plan revision changed");
    this.name = "ConcurrentChangeError";
  }
}

type Tx = Prisma.TransactionClient;

/**
 * The revision lock — the **first** statement of every plan-affecting
 * `$transaction`. `seen` was read in the same `findFirst` as the plan's
 * state/total/direction, before any sum (V4). Two concurrent payments cannot
 * both pass: the second bump matches 0 rows and aborts.
 */
export async function bumpRevision(
  tx: Tx,
  establishmentId: string,
  planId: string,
  seen: number,
): Promise<void> {
  const { count } = await tx.plan.updateMany({
    where: { establishmentId, id: planId, revision: seen },
    data: { revision: { increment: 1 } },
  });
  if (count === 0) throw new ConcurrentChangeError();
}

/**
 * Recompute every instalment's `paidHalalas` from scratch and write the rows
 * that changed — one scoped `updateMany` each — plus one `PLAN_ALLOCATE` audit
 * when anything changed. Returns the residue `allocate()` could not place.
 */
export async function reallocatePlan(
  tx: Tx,
  establishmentId: string,
  planId: string,
  userId: string,
): Promise<{ overpaidHalalas: number }> {
  const instalments = await tx.instalment.findMany({
    where: { establishmentId, planId },
    select: { id: true, dueDate: true, seq: true, amountDueHalalas: true, paidHalalas: true },
  });
  if (instalments.length === 0) return { overpaidHalalas: 0 };

  const payments = await tx.transaction.findMany({
    where: {
      establishmentId,
      deletedAt: null,
      instalmentId: { in: instalments.map((i) => i.id) },
    },
    select: { id: true, instalmentId: true, date: true, createdAt: true, amountHalalas: true },
  });

  const result = allocate(
    instalments.map((i) => ({
      id: i.id,
      dueDate: dateToISO(i.dueDate),
      seq: i.seq,
      amountDueHalalas: i.amountDueHalalas,
    })),
    payments.map((p) => ({
      id: p.id,
      instalmentId: p.instalmentId!,
      date: dateToISO(p.date),
      createdAt: p.createdAt.toISOString(),
      amountHalalas: p.amountHalalas,
    })),
  );

  const changed = instalments.filter((i) => (result.paid[i.id] ?? 0) !== i.paidHalalas);
  for (const row of changed) {
    await tx.instalment.updateMany({
      where: { establishmentId, id: row.id },
      data: { paidHalalas: result.paid[row.id] ?? 0 },
    });
  }

  if (changed.length > 0) {
    await writeAudit({
      establishmentId,
      userId,
      action: "PLAN_ALLOCATE",
      entity: "Plan",
      entityId: planId,
      before: changed.map((r) => ({ instalmentId: r.id, paidHalalas: r.paidHalalas })),
      after: changed.map((r) => ({ instalmentId: r.id, paidHalalas: result.paid[r.id] ?? 0 })),
      client: tx,
    });
  }
  return { overpaidHalalas: result.overpaidHalalas };
}
