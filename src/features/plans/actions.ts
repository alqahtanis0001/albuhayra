"use server";

/**
 * الاتفاقيات — mutations (docs/BACKEND.md → v1.2a → Plans; V4, V5, V7, W12, W14).
 * OWNER only. Every write is scoped in the SQL; every plan-affecting
 * `$transaction` starts with the revision bump; `paidHalalas` is written only
 * by `reallocatePlan`. Payments are the transaction actions (payments.ts).
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { Prisma } from "@/generated/prisma";
import { writeAudit } from "@/lib/audit";
import { requireOwner } from "@/lib/auth";
import { dateToISO, isoToDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { PlanInputSchema, invalid, type ActionResult, type PlanInput } from "@/lib/validation";

import { bumpRevision, ConcurrentChangeError, reallocatePlan } from "./allocate";
import { resolveSchedule } from "./scheduleEdit";

export type PlanState = ActionResult<{ id: string }> | ActionResult<null> | null;

const idSchema = z.string().trim().min(1, "err.required").max(64, "err.tooLong");

function revalidatePlans(): void {
  revalidatePath("/owner", "layout");
  revalidatePath("/staff", "layout");
}

function fieldError(field: string, key: string) {
  return { ok: false as const, error: key, fieldErrors: { [field]: key } };
}

/** `instalments` arrives as one JSON string field; unparsable → err.scheduleInvalid. */
function parsePlanForm(formData: FormData) {
  const raw = Object.fromEntries(formData) as Record<string, unknown>;
  let instalments: unknown;
  try {
    instalments = JSON.parse(String(raw.instalments ?? ""));
  } catch {
    return { error: fieldError("instalments", "err.scheduleInvalid") };
  }
  const parsed = PlanInputSchema.safeParse({ ...raw, instalments });
  return parsed.success ? { input: parsed.data } : { error: invalid(parsed.error) };
}

/**
 * Party and category must exist here; active unless kept (V5: the plan's own
 * party/category may stay when edited, never be newly assigned); the category
 * must match the direction.
 */
async function checkRefs(
  establishmentId: string,
  input: PlanInput,
  kept: { partyId: string | null; categoryId: string | null },
) {
  const [party, category] = await Promise.all([
    db.party.findFirst({ where: { establishmentId, id: input.partyId }, select: { active: true } }),
    db.category.findFirst({ where: { establishmentId, id: input.categoryId }, select: { type: true, active: true } }),
  ]);
  if (!party || (!party.active && input.partyId !== kept.partyId)) return fieldError("partyId", "err.partyInvalid");
  if (!category || (!category.active && input.categoryId !== kept.categoryId)) {
    return fieldError("categoryId", "err.categoryInvalid");
  }
  if (category.type !== input.direction) return fieldError("categoryId", "err.categoryDirectionMismatch");
  return null;
}

function planColumns(input: PlanInput) {
  return {
    partyId: input.partyId,
    direction: input.direction,
    title: input.title,
    totalHalalas: input.totalHalalas,
    categoryId: input.categoryId,
    startDate: isoToDate(input.startDate),
    reminderDays: input.reminderDays,
    notes: input.notes ?? null,
  };
}

/** `seq` = order by (dueDate, input order). */
function ordered<T extends { dueDate: string }>(rows: T[]): Array<T & { seq: number }> {
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => (a.row.dueDate < b.row.dueDate ? -1 : a.row.dueDate > b.row.dueDate ? 1 : a.index - b.index))
    .map(({ row }, i) => ({ ...row, seq: i + 1 }));
}

export async function createPlan(_prev: PlanState, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const { user, establishmentId } = await requireOwner();
  const parsed = parsePlanForm(formData);
  if (parsed.error) return parsed.error;
  const input = parsed.input;
  // V7: a new plan has no existing rows to name.
  if (input.instalments.some((r) => r.id !== undefined)) return fieldError("instalments", "err.scheduleInvalid");
  const bad = await checkRefs(establishmentId, input, { partyId: null, categoryId: null });
  if (bad) return bad;

  const rows = ordered(input.instalments.map(({ dueDate, amountDueHalalas }) => ({ dueDate, amountDueHalalas })));
  const columns = planColumns(input);
  const id = await db.$transaction(async (tx) => {
    const plan = await tx.plan.create({ data: { establishmentId, ...columns }, select: { id: true } });
    await tx.instalment.createMany({
      data: rows.map((r) => ({
        establishmentId,
        planId: plan.id,
        seq: r.seq,
        dueDate: isoToDate(r.dueDate),
        amountDueHalalas: r.amountDueHalalas,
      })),
    });
    await writeAudit({
      establishmentId,
      userId: user.id,
      action: "PLAN_CREATE",
      entity: "Plan",
      entityId: plan.id,
      // W12: rows without ids.
      after: { ...columns, startDate: input.startDate, instalments: rows },
      client: tx,
    });
    return plan.id;
  });

  revalidatePlans();
  return { ok: true, data: { id } };
}

const PLAN_READ = {
  id: true, state: true, revision: true, partyId: true, direction: true, categoryId: true,
  title: true, totalHalalas: true, startDate: true, reminderDays: true, notes: true, kind: true,
} as const;

export async function updatePlan(planId: string, _prev: PlanState, formData: FormData): Promise<ActionResult<null>> {
  const { user, establishmentId } = await requireOwner();
  const parsedId = idSchema.safeParse(planId);
  if (!parsedId.success) return invalid(parsedId.error);
  const parsed = parsePlanForm(formData);
  if (parsed.error) return parsed.error;
  const input = parsed.input;

  // V4: revision in the same read as state/direction, before anything is summed.
  const plan = await db.plan.findFirst({ where: { establishmentId, id: parsedId.data }, select: PLAN_READ });
  if (!plan) return { ok: false, error: "err.notFound" };
  if (plan.kind === "SALARY") return { ok: false, error: "err.salaryPlanManaged" }; // D1
  if (plan.state !== "OPEN") return { ok: false, error: "err.planClosed" };

  const schedule = await resolveSchedule(establishmentId, plan, input);
  if ("error" in schedule) return fieldError(schedule.field, schedule.error);
  const bad = await checkRefs(establishmentId, input, plan);
  if (bad) return bad;

  const rows = ordered(input.instalments);
  const columns = planColumns(input);
  try {
    await db.$transaction(async (tx) => {
      await bumpRevision(tx, establishmentId, plan.id, plan.revision);
      if (schedule.deleteIds.length > 0) {
        await tx.instalment.deleteMany({ where: { establishmentId, planId: plan.id, id: { in: schedule.deleteIds } } });
      }
      for (const row of rows.filter((r) => r.id)) {
        await tx.instalment.updateMany({
          where: { establishmentId, planId: plan.id, id: row.id },
          data: { seq: row.seq, dueDate: isoToDate(row.dueDate), amountDueHalalas: row.amountDueHalalas },
        });
      }
      const created = rows.filter((r) => !r.id);
      if (created.length > 0) {
        await tx.instalment.createMany({
          data: created.map((r) => ({
            establishmentId,
            planId: plan.id,
            seq: r.seq,
            dueDate: isoToDate(r.dueDate),
            amountDueHalalas: r.amountDueHalalas,
          })),
        });
      }
      await tx.plan.updateMany({ where: { establishmentId, id: plan.id }, data: columns });
      await reallocatePlan(tx, establishmentId, plan.id, user.id);
      const { id: _id, state: _s, revision: _r, kind: _k, ...before } = plan;
      await writeAudit({
        establishmentId,
        userId: user.id,
        action: "PLAN_UPDATE",
        entity: "Plan",
        entityId: plan.id,
        before: { ...before, startDate: dateToISO(plan.startDate), instalments: schedule.before },
        after: { ...columns, startDate: input.startDate, instalments: rows },
        client: tx,
      });
    });
  } catch (error) {
    if (error instanceof ConcurrentChangeError) return { ok: false, error: "err.concurrentChange" };
    // V2: a row a payment points at, raced in after the check.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return fieldError("instalments", "err.schedulePaidRowChanged");
    }
    throw error;
  }

  revalidatePlans();
  return { ok: true, data: null };
}

/** OPEN with no non-deleted payment → CANCELLED; else `err.planHasPayments`. */
export async function cancelPlan(planId: string): Promise<ActionResult<null>> {
  return closePlan(planId, "CANCELLED");
}

/** OPEN → ARCHIVED: the unpaid remainder is written off. No un-archive in v1.2a. */
export async function archivePlan(planId: string): Promise<ActionResult<null>> {
  return closePlan(planId, "ARCHIVED");
}

async function closePlan(planId: string, state: "CANCELLED" | "ARCHIVED"): Promise<ActionResult<null>> {
  const { user, establishmentId } = await requireOwner();
  const parsedId = idSchema.safeParse(planId);
  if (!parsedId.success) return invalid(parsedId.error);

  const plan = await db.plan.findFirst({
    where: { establishmentId, id: parsedId.data },
    select: { id: true, state: true, revision: true, kind: true },
  });
  if (!plan) return { ok: false, error: "err.notFound" };
  // D1/S1: a salary plan is ended or archived only through its employee.
  if (plan.kind === "SALARY") return { ok: false, error: "err.salaryPlanManaged" };
  if (plan.state !== "OPEN") return { ok: false, error: "err.planClosed" };

  if (state === "CANCELLED") {
    const payments = await db.transaction.count({
      where: { establishmentId, deletedAt: null, instalment: { planId: plan.id } },
    });
    if (payments > 0) return { ok: false, error: "err.planHasPayments" };
  }

  try {
    await db.$transaction(async (tx) => {
      await bumpRevision(tx, establishmentId, plan.id, plan.revision);
      await tx.plan.updateMany({ where: { establishmentId, id: plan.id }, data: { state, closedAt: new Date() } });
      await writeAudit({
        establishmentId,
        userId: user.id,
        action: state === "CANCELLED" ? "PLAN_CANCEL" : "PLAN_ARCHIVE",
        entity: "Plan",
        entityId: plan.id,
        before: { state: "OPEN" },
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
