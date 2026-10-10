import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertUnlocked } from "@/features/locks/assertUnlocked";
import { bumpRevision, ConcurrentChangeError } from "@/features/plans/allocate";
import { writeAudit } from "@/lib/audit";
import { requireOwner, type AuthedUser } from "@/lib/auth";
import { dateToISO, isoToDate, monthKey } from "@/lib/dates";
import { db } from "@/lib/db";
import { OpenPlanPaymentSchema, invalid, type ActionResult, type TransactionInput } from "@/lib/validation";

import { checkLinks, snapshot } from "./links";
import type { EntryResolution, Existing } from "./payments";

/**
 * v1.4 (docs/V14-SPEC.md C3, C4, D7, D9; D21 P3–P5, P13, P14) — payments on
 * OPEN_ENDED agreements. A payment is an ordinary `Transaction` carrying
 * `planId` and never `instalmentId` (C1, `assertSingleLink`); its direction,
 * party and category are the plan's. OWNER only — recording through
 * `requireOwner()`, editing through `resolveOpenPlanEdit` (P4). Inside one
 * `$transaction`: the revision bump first (V4), the write, the received sum
 * from non-deleted rows (never a cache), the auto-close at **≥** total (C4).
 * Server-only and in the scoping gate's static sweep; `actions.ts` delegates.
 */

export type OpenPaymentResult = ActionResult<{ transactionId: string; autoClosed: boolean }>;
export type OpenPaymentState = OpenPaymentResult | null;

const idSchema = z.string().trim().min(1, "err.required").max(64, "err.tooLong");

const fieldError = (field: string, key: string) => ({ ok: false as const, error: key, fieldErrors: { [field]: key } });

/** C1's "DB check in the action" (P20): a row may link an instalment or a plan, never both. */
export function assertSingleLink(data: { instalmentId?: string | null; planId?: string | null }): "err.planBothLinks" | null {
  return data.instalmentId && data.planId ? "err.planBothLinks" : null;
}

const PLAN_READ = {
  id: true, kind: true, state: true, revision: true, totalHalalas: true,
  direction: true, partyId: true, categoryId: true, startDate: true,
} as const;

export async function recordOpenPlanPaymentFor(planId: string, formData: FormData): Promise<OpenPaymentResult> {
  const { user, establishmentId } = await requireOwner();
  const parsedId = idSchema.safeParse(planId);
  if (!parsedId.success) return invalid(parsedId.error);
  const parsed = OpenPlanPaymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  const input = parsed.data;

  // V4: revision in the same read as state/total/direction, before any sum.
  const plan = await db.plan.findFirst({ where: { establishmentId, id: parsedId.data }, select: PLAN_READ });
  if (!plan) return { ok: false, error: "err.notFound" };
  if (plan.kind !== "OPEN_ENDED") return { ok: false, error: "err.planNotOpenEnded" };
  if (plan.state !== "OPEN") return { ok: false, error: "err.planClosed" };
  // D8 (amended): a payment never predates the agreement.
  if (input.date < dateToISO(plan.startDate)) return fieldError("date", "err.paymentBeforeStart");
  const when = isoToDate(input.date);
  const locked = await assertUnlocked(establishmentId, [monthKey(when)]);
  if (locked) return { ok: false, error: locked };

  // Inherited, not posted: the plan's direction, party and category (C3; V5 — its own category, no active check).
  const data = {
    establishmentId,
    date: when,
    direction: plan.direction,
    amountHalalas: input.amountHalalas,
    categoryId: plan.categoryId,
    paymentMethod: input.paymentMethod,
    partyId: plan.partyId,
    projectId: null,
    counterparty: null,
    note: input.note ?? null,
    planId: plan.id,
    createdById: user.id,
  };
  const both = assertSingleLink(data);
  if (both) return { ok: false, error: both };

  try {
    const result = await db.$transaction(async (tx) => {
      await bumpRevision(tx, establishmentId, plan.id, plan.revision);
      const row = await tx.transaction.create({ data, select: { id: true } });
      // C4: received = Σ non-deleted payments of this plan, read after the write — never a cache.
      const sum = await tx.transaction.aggregate({
        where: { establishmentId, planId: plan.id, deletedAt: null },
        _sum: { amountHalalas: true },
      });
      const received = Number(sum._sum.amountHalalas ?? 0);
      // ≥, so a payment to exactly the total closes it; above it is allowed and closes it too (P14).
      const autoClosed = plan.totalHalalas !== null && received >= plan.totalHalalas;
      if (autoClosed) {
        await tx.plan.updateMany({
          where: { establishmentId, id: plan.id, state: "OPEN" },
          data: { state: "ARCHIVED", closedAt: new Date() },
        });
        await writeAudit({
          establishmentId,
          userId: user.id,
          action: "PLAN_ARCHIVE",
          entity: "Plan",
          entityId: plan.id,
          before: { state: "OPEN" },
          after: { state: "ARCHIVED", autoClosed: true, receivedHalalas: received },
          client: tx,
        });
      }
      await writeAudit({
        establishmentId,
        userId: user.id,
        action: "CREATE",
        entity: "Transaction",
        entityId: row.id,
        after: { ...snapshot(data) },
        client: tx,
      });
      return { transactionId: row.id, autoClosed };
    });
    revalidatePath("/owner", "layout");
    revalidatePath("/staff", "layout");
    return { ok: true, data: result };
  } catch (error) {
    if (error instanceof ConcurrentChangeError) return { ok: false, error: "err.concurrentChange" };
    throw error;
  }
}

const refuse = (key: string, field?: string) => ({ ok: false as const, key, field });

/**
 * D9 on the ordinary edit path, called by `resolveEntry` before anything else
 * when the stored row carries `planId`: OWNER only (P4); an `instalmentId`
 * arriving on it → `err.planBothLinks`; direction and party are **refused**
 * on mismatch (an absent party counts — the banner posts it, so absent means
 * forged), the date may not predate the plan (D8); the category is **not**
 * locked (P3, parity with instalment payments); `planId` itself is never in
 * `links`, so it cannot change. The plan is bumped (P13); state never changes.
 */
export async function resolveOpenPlanEdit(
  establishmentId: string,
  user: Pick<AuthedUser, "role" | "status" | "canEdit" | "establishmentId">,
  input: TransactionInput,
  existing: Existing,
): Promise<EntryResolution> {
  if (user.role !== "OWNER") return refuse("err.forbidden");
  const both = assertSingleLink({ planId: existing.planId, instalmentId: input.instalmentId ?? existing.instalmentId });
  if (both) return refuse(both, "instalmentId");

  const plan = await db.plan.findFirst({
    where: { establishmentId, id: existing.planId ?? "" },
    select: { id: true, kind: true, revision: true, direction: true, partyId: true, startDate: true },
  });
  if (!plan || plan.kind !== "OPEN_ENDED") return refuse("err.planNotOpenEnded");
  if (input.direction !== plan.direction) return refuse("err.paymentDirectionMismatch", "direction");
  if (input.partyId !== plan.partyId) return refuse("err.paymentPartyMismatch", "partyId");
  if (input.date < dateToISO(plan.startDate)) return refuse("err.paymentBeforeStart", "date");

  const bad = await checkLinks(establishmentId, { projectId: input.projectId }, existing);
  if (bad) return refuse(bad.key, bad.field);

  return {
    ok: true,
    links: { partyId: plan.partyId, projectId: input.projectId ?? null, counterparty: null },
    payment: { planId: plan.id, revision: plan.revision },
  };
}
