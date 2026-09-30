import "server-only";

import type { Prisma } from "@/generated/prisma";
import { writeAudit } from "@/lib/audit";
import { isoToDate } from "@/lib/dates";
import { grossOf, salaryMonthsToGenerate, type SalaryMonth } from "@/lib/payroll";

/**
 * The salary write core (docs/V12B-DESIGN.md D2, D4–D6, D8, Y1). Everything
 * here runs inside the caller's `$transaction`, after the caller's revision
 * bump (or on a plan created in that same transaction), scoped by the caller's
 * `establishmentId` — it is in the scoping gate's static sweep. It never writes
 * `paidHalalas`: the caller runs `reallocatePlan` afterwards (W5, Y12).
 */

type Tx = Prisma.TransactionClient;

export type AllowanceSnapshot = { type: "HOUSING" | "TRANSPORT" | "OTHER"; label: string | null; amountHalalas: number };

/** The salary columns every salary decision reads from an employee. */
export type SalaryTerms = {
  employeeId: string;
  basicSalaryHalalas: number;
  payDay: number;
  endDate: string | null;
  allowances: AllowanceSnapshot[];
};

/**
 * A new gross below a month's deductions (D5) — thrown so the whole
 * transaction rolls back; the action answers `err.deductionExceedsGross`.
 */
export class DeductionExceedsGrossError extends Error {
  constructor() {
    super("deductions exceed the new gross");
    this.name = "DeductionExceedsGrossError";
  }
}

/** The employee's current allowances, in the order they were entered. */
export async function currentAllowances(tx: Tx, establishmentId: string, employeeId: string): Promise<AllowanceSnapshot[]> {
  return tx.employeeAllowance.findMany({
    where: { establishmentId, employeeId },
    select: { type: true, label: true, amountHalalas: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
}

/** D8: the plan total is always Σ amountDue, recomputed by aggregate — never incremented. */
export async function recomputePlanTotal(tx: Tx, establishmentId: string, planId: string): Promise<void> {
  const sum = await tx.instalment.aggregate({
    where: { establishmentId, planId },
    _sum: { amountDueHalalas: true },
  });
  await tx.plan.updateMany({
    where: { establishmentId, id: planId },
    data: { totalHalalas: Number(sum._sum.amountDueHalalas ?? 0) },
  });
}

/**
 * D2 + Y1: create the months due now — the instalments, then one snapshot
 * period each. Periods are created **without** skipDuplicates (S3): a second
 * concurrent plan for the same employee and month aborts on the unique index.
 */
export async function generateMonths(
  tx: Tx,
  establishmentId: string,
  plan: { id: string; startDate: string },
  terms: SalaryTerms,
  today: string,
): Promise<SalaryMonth[]> {
  const existing = await tx.salaryPeriod.findMany({
    where: { establishmentId, employeeId: terms.employeeId },
    select: { periodYm: true },
  });
  const months = salaryMonthsToGenerate({
    startDate: plan.startDate,
    endDate: terms.endDate,
    payDay: terms.payDay,
    todayISO: today,
    existing: existing.map((p) => p.periodYm),
  });
  if (months.length === 0) return months;

  const gross = grossOf(terms.basicSalaryHalalas, terms.allowances);
  await tx.instalment.createMany({
    data: months.map((m) => ({
      establishmentId,
      planId: plan.id,
      seq: m.seq,
      dueDate: isoToDate(m.dueDate),
      amountDueHalalas: gross,
      periodYm: m.periodYm,
    })),
  });
  const created = await tx.instalment.findMany({
    where: { establishmentId, planId: plan.id, periodYm: { in: months.map((m) => m.periodYm) } },
    select: { id: true, periodYm: true },
  });
  await tx.salaryPeriod.createMany({
    data: created.map((row) => ({
      establishmentId,
      employeeId: terms.employeeId,
      instalmentId: row.id,
      periodYm: row.periodYm!,
      basicHalalas: terms.basicSalaryHalalas,
      allowances: terms.allowances,
      grossHalalas: gross,
    })),
  });
  return months;
}

/**
 * Delete the plan's months due after `afterISO` that nothing fixes — the
 * v1.2a *delete* predicate (the FK): `paidHalalas = 0` and no entry at all,
 * soft-deleted included, names it (a V1 reference probe). Order N5:
 * deductions → periods → instalments. Returns the deleted months.
 */
export async function deleteUnfixedMonthsAfter(
  tx: Tx,
  establishmentId: string,
  planId: string,
  afterISO: string,
): Promise<string[]> {
  const rows = await tx.instalment.findMany({
    where: { establishmentId, planId, dueDate: { gt: isoToDate(afterISO) }, paidHalalas: 0 },
    select: { id: true, periodYm: true },
  });
  if (rows.length === 0) return [];
  const referenced = await tx.transaction.groupBy({
    by: ["instalmentId"],
    where: { establishmentId, instalmentId: { in: rows.map((r) => r.id) } },
  });
  const linked = new Set(referenced.map((r) => r.instalmentId));
  const doomed = rows.filter((r) => !linked.has(r.id));
  if (doomed.length === 0) return [];

  const ids = doomed.map((r) => r.id);
  const periods = await tx.salaryPeriod.findMany({
    where: { establishmentId, instalmentId: { in: ids } },
    select: { id: true },
  });
  const periodIds = periods.map((p) => p.id);
  if (periodIds.length > 0) {
    await tx.salaryDeduction.deleteMany({ where: { establishmentId, salaryPeriodId: { in: periodIds } } });
    await tx.salaryPeriod.deleteMany({ where: { establishmentId, id: { in: periodIds } } });
  }
  await tx.instalment.deleteMany({ where: { establishmentId, planId, id: { in: ids } } });
  return doomed.map((r) => r.periodYm ?? "");
}

/**
 * Z4 + D9: a month's salary may still change (deductions) only while its plan
 * is OPEN and the month is unpaid by the D5 predicate — `paidHalalas = 0` and
 * no non-deleted payment names it. Works on `db` or inside a transaction.
 */
export async function isMonthOpen(tx: Tx, establishmentId: string, instalmentId: string): Promise<boolean> {
  const row = await tx.instalment.findFirst({
    where: { establishmentId, id: instalmentId },
    select: { paidHalalas: true, plan: { select: { state: true } } },
  });
  if (!row || row.plan.state !== "OPEN" || row.paidHalalas !== 0) return false;
  const payments = await tx.transaction.count({ where: { establishmentId, deletedAt: null, instalmentId } });
  return payments === 0;
}

/**
 * v1.2a archive (write-off of the unpaid remainder), for a SALARY plan whose
 * employment ended (D6) or whose salary was removed with nothing unpaid (S4).
 */
export async function archiveSalaryPlan(
  tx: Tx,
  establishmentId: string,
  planId: string,
  userId: string,
  reason: "EMPLOYMENT_ENDED" | "SALARY_REMOVED",
): Promise<void> {
  const { count } = await tx.plan.updateMany({
    where: { establishmentId, id: planId, state: "OPEN" },
    data: { state: "ARCHIVED", closedAt: new Date() },
  });
  if (count === 0) return; // already closed: nothing changed, nothing to audit
  await writeAudit({
    establishmentId,
    userId,
    action: "PLAN_ARCHIVE",
    entity: "Plan",
    entityId: planId,
    before: { state: "OPEN" },
    after: { state: "ARCHIVED", reason },
    client: tx,
  });
}
