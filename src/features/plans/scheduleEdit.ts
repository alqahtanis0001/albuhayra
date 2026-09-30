import "server-only";

import { dateToISO } from "@/lib/dates";
import { db } from "@/lib/db";
import type { DirectionValue, PlanInput } from "@/lib/validation";

/**
 * The schedule rules of `updatePlan` (docs/BACKEND.md → v1.2a → Plans; V7),
 * split out of actions.ts. A row is **fixed** when it has `paidHalalas > 0` or
 * any entry — deleted included, its foreign key still points there — names it.
 * Fixed rows must come back unchanged; unfixed rows may change or go; a
 * duplicate or foreign id is `err.scheduleInvalid`; with any fixed row the
 * party and direction are locked.
 */

type Refusal = { field: string; error: string };
type Resolved = {
  /** Unfixed rows the submission dropped. */
  deleteIds: string[];
  /** The schedule as it was, for the audit. */
  before: Array<{ id: string; seq: number; dueDate: string; amountDueHalalas: number }>;
};

export async function resolveSchedule(
  establishmentId: string,
  plan: { id: string; partyId: string; direction: DirectionValue },
  input: PlanInput,
): Promise<Resolved | Refusal> {
  const existing = await db.instalment.findMany({
    where: { establishmentId, planId: plan.id },
    select: { id: true, seq: true, dueDate: true, amountDueHalalas: true, paidHalalas: true },
  });
  const ids = existing.map((r) => r.id);
  // Reference probe (V1): no deletedAt, no amounts.
  const referenced = ids.length
    ? await db.transaction.groupBy({ by: ["instalmentId"], where: { establishmentId, instalmentId: { in: ids } } })
    : [];
  const linked = new Set(referenced.map((r) => r.instalmentId));

  const submitted = input.instalments.filter((r) => r.id !== undefined);
  const submittedIds = submitted.map((r) => r.id!);
  if (new Set(submittedIds).size !== submittedIds.length) return { field: "instalments", error: "err.scheduleInvalid" };
  const byId = new Map(existing.map((r) => [r.id, r]));
  if (submittedIds.some((id) => !byId.has(id))) return { field: "instalments", error: "err.scheduleInvalid" };

  const fixed = existing.filter((r) => r.paidHalalas > 0 || linked.has(r.id));
  for (const row of fixed) {
    const back = submitted.find((r) => r.id === row.id);
    if (!back || back.dueDate !== dateToISO(row.dueDate) || back.amountDueHalalas !== row.amountDueHalalas) {
      return { field: "instalments", error: "err.schedulePaidRowChanged" };
    }
  }
  if (fixed.length > 0 && (input.partyId !== plan.partyId || input.direction !== plan.direction)) {
    return { field: "partyId", error: "err.planPartyLocked" };
  }

  const keep = new Set(submittedIds);
  return {
    deleteIds: existing.filter((r) => !keep.has(r.id)).map((r) => r.id),
    before: existing
      .map((r) => ({ id: r.id, seq: r.seq, dueDate: dateToISO(r.dueDate), amountDueHalalas: r.amountDueHalalas }))
      .sort((a, b) => a.seq - b.seq),
  };
}
