"use server";

/**
 * Salary deductions (spec §3.4; D9, D8, Z4). OWNER only. A deduction lives on
 * a month's `SalaryPeriod` and reduces that month's instalment:
 * amountDue = gross − Σ deductions. Only while the plan is OPEN and the month
 * unpaid (Z4, both add and delete); Σ ≤ gross. Every write runs under the
 * plan's revision lock, recomputes the total by aggregate (D8) and
 * re-allocates. Not subject to month locks (D9).
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { bumpRevision, ConcurrentChangeError, reallocatePlan } from "@/features/plans/allocate";
import { writeAudit } from "@/lib/audit";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { DeductionInputSchema, invalid, type ActionResult } from "@/lib/validation";
import type { Prisma } from "@/generated/prisma";

import { isMonthOpen, recomputePlanTotal } from "./core";

export type DeductionState = ActionResult<null> | null;

const idSchema = z.string().trim().min(1, "err.required").max(64, "err.tooLong");

function fieldError(field: string, key: string) {
  return { ok: false as const, error: key, fieldErrors: { [field]: key } };
}

type Period = { id: string; instalmentId: string; grossHalalas: number };

/** The month's plan (revision read before any sum, V4) — null when not found here. */
async function planOf(establishmentId: string, instalmentId: string) {
  const instalment = await db.instalment.findFirst({ where: { establishmentId, id: instalmentId }, select: { planId: true } });
  if (!instalment) return null;
  return db.plan.findFirst({ where: { establishmentId, id: instalment.planId }, select: { id: true, revision: true } });
}

/** D9: amountDue = gross − Σ deductions, then the total (D8) and the allocation. */
async function settleMonth(tx: Prisma.TransactionClient, establishmentId: string, period: Period, planId: string, userId: string) {
  const sum = await tx.salaryDeduction.aggregate({
    where: { establishmentId, salaryPeriodId: period.id },
    _sum: { amountHalalas: true },
  });
  const deducted = Number(sum._sum.amountHalalas ?? 0);
  await tx.instalment.updateMany({
    where: { establishmentId, id: period.instalmentId },
    data: { amountDueHalalas: period.grossHalalas - deducted },
  });
  await recomputePlanTotal(tx, establishmentId, planId);
  await reallocatePlan(tx, establishmentId, planId, userId);
  return deducted;
}

function revalidateSalary(): void {
  revalidatePath("/owner", "layout");
  revalidatePath("/staff", "layout");
}

export async function addDeduction(employeeId: string, _prev: DeductionState, formData: FormData): Promise<ActionResult<null>> {
  const { user, establishmentId } = await requireOwner();
  const parsedId = idSchema.safeParse(employeeId);
  if (!parsedId.success) return invalid(parsedId.error);
  const parsed = DeductionInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  const input = parsed.data;

  const period = await db.salaryPeriod.findFirst({
    where: { establishmentId, employeeId: parsedId.data, periodYm: input.periodYm },
    select: { id: true, instalmentId: true, grossHalalas: true },
  });
  if (!period) return fieldError("periodYm", "err.notFound");
  const plan = await planOf(establishmentId, period.instalmentId);
  if (!plan) return { ok: false, error: "err.notFound" };
  if (!(await isMonthOpen(db, establishmentId, period.instalmentId))) return { ok: false, error: "err.salaryPeriodPaid" };
  const existing = await db.salaryDeduction.aggregate({
    where: { establishmentId, salaryPeriodId: period.id },
    _sum: { amountHalalas: true },
  });
  if (Number(existing._sum.amountHalalas ?? 0) + input.amountHalalas > period.grossHalalas) {
    return fieldError("amountHalalas", "err.deductionExceedsGross");
  }

  try {
    await db.$transaction(async (tx) => {
      await bumpRevision(tx, establishmentId, plan.id, plan.revision);
      const row = await tx.salaryDeduction.create({
        data: { establishmentId, salaryPeriodId: period.id, amountHalalas: input.amountHalalas, reason: input.reason, createdById: user.id },
        select: { id: true },
      });
      const total = await settleMonth(tx, establishmentId, period, plan.id, user.id);
      await writeAudit({
        establishmentId, userId: user.id, action: "DEDUCTION_ADD", entity: "SalaryPeriod", entityId: period.id,
        after: { deductionId: row.id, periodYm: input.periodYm, amountHalalas: input.amountHalalas, reason: input.reason, deductionsHalalas: total },
        client: tx,
      });
    });
  } catch (error) {
    if (error instanceof ConcurrentChangeError) return { ok: false, error: "err.concurrentChange" };
    throw error;
  }
  revalidateSalary();
  return { ok: true, data: null };
}

export async function deleteDeduction(deductionId: string): Promise<ActionResult<null>> {
  const { user, establishmentId } = await requireOwner();
  const parsedId = idSchema.safeParse(deductionId);
  if (!parsedId.success) return invalid(parsedId.error);

  const deduction = await db.salaryDeduction.findFirst({
    where: { establishmentId, id: parsedId.data },
    select: { id: true, salaryPeriodId: true, amountHalalas: true, reason: true },
  });
  if (!deduction) return { ok: false, error: "err.notFound" };
  const period = await db.salaryPeriod.findFirst({
    where: { establishmentId, id: deduction.salaryPeriodId },
    select: { id: true, instalmentId: true, grossHalalas: true, periodYm: true },
  });
  const plan = period ? await planOf(establishmentId, period.instalmentId) : null;
  if (!period || !plan) return { ok: false, error: "err.notFound" };
  if (!(await isMonthOpen(db, establishmentId, period.instalmentId))) return { ok: false, error: "err.salaryPeriodPaid" };

  try {
    await db.$transaction(async (tx) => {
      await bumpRevision(tx, establishmentId, plan.id, plan.revision);
      const { count } = await tx.salaryDeduction.deleteMany({ where: { establishmentId, id: deduction.id } });
      if (count === 0) throw new ConcurrentChangeError();
      const total = await settleMonth(tx, establishmentId, period, plan.id, user.id);
      await writeAudit({
        establishmentId, userId: user.id, action: "DEDUCTION_DELETE", entity: "SalaryPeriod", entityId: period.id,
        before: { deductionId: deduction.id, periodYm: period.periodYm, amountHalalas: deduction.amountHalalas, reason: deduction.reason },
        after: { deductionsHalalas: total },
        client: tx,
      });
    });
  } catch (error) {
    if (error instanceof ConcurrentChangeError) return { ok: false, error: "err.concurrentChange" };
    throw error;
  }
  revalidateSalary();
  return { ok: true, data: null };
}
