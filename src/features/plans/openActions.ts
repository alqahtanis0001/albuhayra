"use server";

/**
 * v1.4 (docs/V14-SPEC.md C2, C3, C6; D8, D21 P1, P7, P10, P16) — the
 * OPEN_ENDED agreement's mutations. OWNER only. Every write is scoped in the
 * SQL; every state change starts its `$transaction` with the revision bump.
 * Payments are `recordOpenPlanPayment` (transactions/actions.ts). An open
 * plan moves only through `closeOpenPlan` / `reopenOpenPlan` / the payment's
 * auto-close; the scheduled actions refuse it (`err.planKindFixed`, P1).
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { writeAudit } from "@/lib/audit";
import { requireOwner } from "@/lib/auth";
import { dateToISO } from "@/lib/dates";
import { db } from "@/lib/db";
import { OpenPlanEditSchema, OpenPlanInputSchema, invalid, type ActionResult } from "@/lib/validation";

import { bumpRevision, ConcurrentChangeError } from "./allocate";
import {
  checkOpenRefs, fieldError, isReferenced, openAuditOf, openColumns, readPlan, receivedOf, type OpenPlanRead,
} from "./openRules";

export type OpenPlanFormState = ActionResult<{ id: string }> | ActionResult<null> | null;

const idSchema = z.string().trim().min(1, "err.required").max(64, "err.tooLong");

function revalidatePlans(): void {
  revalidatePath("/owner", "layout");
  revalidatePath("/staff", "layout");
}

export async function createOpenPlan(_prev: OpenPlanFormState, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const { user, establishmentId } = await requireOwner();
  // P16: a posted `kind` / `employeeId` is stripped here; the write below names both.
  const parsed = OpenPlanInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  const bad = await checkOpenRefs(establishmentId, parsed.data, { partyId: null, categoryId: null });
  if (bad) return bad;

  const columns = openColumns(parsed.data);
  const id = await db.$transaction(async (tx) => {
    const plan = await tx.plan.create({
      data: { establishmentId, ...columns, kind: "OPEN_ENDED", employeeId: null },
      select: { id: true },
    });
    await writeAudit({
      establishmentId,
      userId: user.id,
      action: "PLAN_CREATE",
      entity: "Plan",
      entityId: plan.id,
      after: { ...openAuditOf(columns), kind: "OPEN_ENDED" },
      client: tx,
    });
    return plan.id;
  });
  revalidatePlans();
  return { ok: true, data: { id } };
}

/** The plan, if it is this establishment's open-ended one; the refusal otherwise. */
async function openPlanOrRefusal(establishmentId: string, planId: string) {
  const parsedId = idSchema.safeParse(planId);
  if (!parsedId.success) return { refusal: invalid(parsedId.error) };
  const plan = await readPlan(establishmentId, parsedId.data);
  if (!plan) return { refusal: { ok: false as const, error: "err.notFound" } };
  if (plan.kind !== "OPEN_ENDED") return { refusal: { ok: false as const, error: "err.planNotOpenEnded" } };
  return { plan };
}

export async function updateOpenPlan(planId: string, _prev: OpenPlanFormState, formData: FormData): Promise<ActionResult<null>> {
  const { user, establishmentId } = await requireOwner();
  const found = await openPlanOrRefusal(establishmentId, planId);
  if (found.refusal) return found.refusal;
  const plan = found.plan;
  const parsed = OpenPlanEditSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  const input = parsed.data;
  if (plan.state !== "OPEN") return { ok: false, error: "err.planClosed" };

  // C6 / D8 / P7 / P10: once any entry references the plan (deleted included),
  // party, direction and start are fixed; so is the category (each payment carries it, D9).
  if (await isReferenced(establishmentId, plan.id)) {
    if (input.partyId !== plan.partyId) return fieldError("partyId", "err.planPartyLocked");
    if (input.direction !== plan.direction) return fieldError("direction", "err.planPartyLocked");
    if (input.startDate !== dateToISO(plan.startDate)) return fieldError("startDate", "err.planPartyLocked");
    if (input.categoryId !== plan.categoryId) return fieldError("categoryId", "err.paymentLinkFixed");
  }
  if (input.totalHalalas !== undefined && input.totalHalalas < (await receivedOf(establishmentId, plan.id))) {
    return fieldError("totalHalalas", "err.totalBelowPaid");
  }
  const bad = await checkOpenRefs(establishmentId, input, plan);
  if (bad) return bad;

  const columns = openColumns(input);
  try {
    await db.$transaction(async (tx) => {
      await bumpRevision(tx, establishmentId, plan.id, plan.revision);
      await tx.plan.updateMany({ where: { establishmentId, id: plan.id }, data: columns });
      await writeAudit({
        establishmentId,
        userId: user.id,
        action: "PLAN_UPDATE",
        entity: "Plan",
        entityId: plan.id,
        before: openAuditOf({
          partyId: plan.partyId, direction: plan.direction, title: plan.title, totalHalalas: plan.totalHalalas,
          categoryId: plan.categoryId, startDate: plan.startDate, expectedEndDate: plan.expectedEndDate, notes: plan.notes,
        }),
        after: openAuditOf(columns),
        client: tx,
      });
    });
  } catch (error) {
    if (error instanceof ConcurrentChangeError) return { ok: false, error: "err.concurrentChange" };
    throw error;
  }
  revalidatePlans();
  return { ok: true, data: null };
}

/** «إنهاء الاتفاقية»: OPEN → ARCHIVED, `closedAt` now; the payments stay (C3). */
export async function closeOpenPlan(planId: string): Promise<ActionResult<null>> {
  const { user, establishmentId } = await requireOwner();
  const found = await openPlanOrRefusal(establishmentId, planId);
  if (found.refusal) return found.refusal;
  if (found.plan.state !== "OPEN") return { ok: false, error: "err.planClosed" };
  return moveState(user.id, establishmentId, found.plan, "ARCHIVED");
}

/** «إعادة فتح»: ARCHIVED → OPEN (open-ended plans only, C3). */
export async function reopenOpenPlan(planId: string): Promise<ActionResult<null>> {
  const { user, establishmentId } = await requireOwner();
  const parsedId = idSchema.safeParse(planId);
  if (!parsedId.success) return invalid(parsedId.error);
  const plan = await readPlan(establishmentId, parsedId.data);
  if (!plan) return { ok: false, error: "err.notFound" };
  if (plan.kind !== "OPEN_ENDED") return { ok: false, error: "err.planReopenNotAllowed" };
  if (plan.state !== "ARCHIVED") return { ok: false, error: "err.invalidInput" };
  return moveState(user.id, establishmentId, plan, "OPEN");
}

async function moveState(
  userId: string,
  establishmentId: string,
  plan: OpenPlanRead,
  state: "OPEN" | "ARCHIVED",
): Promise<ActionResult<null>> {
  try {
    await db.$transaction(async (tx) => {
      await bumpRevision(tx, establishmentId, plan.id, plan.revision);
      await tx.plan.updateMany({
        where: { establishmentId, id: plan.id },
        data: { state, closedAt: state === "ARCHIVED" ? new Date() : null },
      });
      await writeAudit({
        establishmentId,
        userId,
        action: state === "ARCHIVED" ? "PLAN_ARCHIVE" : "PLAN_REOPEN",
        entity: "Plan",
        entityId: plan.id,
        before: { state: plan.state },
        after: { state },
        client: tx,
      });
    });
  } catch (error) {
    if (error instanceof ConcurrentChangeError) return { ok: false, error: "err.concurrentChange" };
    throw error;
  }
  revalidatePlans();
  return { ok: true, data: null };
}
