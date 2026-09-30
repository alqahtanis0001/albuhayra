import "server-only";

import type { Prisma } from "@/generated/prisma";
import { dateToISO, isoToDate } from "@/lib/dates";
import { grossOf, payDateFor } from "@/lib/payroll";

import { DeductionExceedsGrossError, type AllowanceSnapshot, type SalaryTerms } from "./core";

/**
 * D5 split out of core.ts for size; same contract — inside the caller's
 * transaction after its revision bump, scoped, never writes `paidHalalas`.
 */

type Tx = Prisma.TransactionClient;

/** Order-stable form of an allowances list — jsonb does not keep key order. */
function canon(list: unknown): string {
  const rows = Array.isArray(list) ? (list as Array<Partial<AllowanceSnapshot>>) : [];
  return JSON.stringify(rows.map((a) => [a.type, a.label ?? null, a.amountHalalas]));
}

/**
 * D5: re-snapshot the months whose pay date is after today and that are
 * **unpaid** — `paidHalalas = 0` and no non-deleted payment (S4). Each gets the
 * new basic/allowances, amountDue = gross − Σ its deductions, and the new pay
 * date. Paid and past months are never touched. Returns before/after for the
 * `SALARY_UPDATE` audit (empty when nothing changed).
 */
export async function resnapshotFutureMonths(
  tx: Tx,
  establishmentId: string,
  planId: string,
  terms: SalaryTerms,
  today: string,
): Promise<{ before: unknown[]; after: unknown[] }> {
  const rows = await tx.instalment.findMany({
    where: { establishmentId, planId, dueDate: { gt: isoToDate(today) }, paidHalalas: 0 },
    select: { id: true, periodYm: true, dueDate: true, amountDueHalalas: true },
  });
  if (rows.length === 0) return { before: [], after: [] };
  const payments = await tx.transaction.groupBy({
    by: ["instalmentId"],
    where: { establishmentId, deletedAt: null, instalmentId: { in: rows.map((r) => r.id) } },
  });
  const hasPayment = new Set(payments.map((p) => p.instalmentId));
  const unpaid = rows.filter((r) => !hasPayment.has(r.id) && r.periodYm !== null);
  if (unpaid.length === 0) return { before: [], after: [] };

  const periods = await tx.salaryPeriod.findMany({
    where: { establishmentId, instalmentId: { in: unpaid.map((r) => r.id) } },
    select: { id: true, instalmentId: true, basicHalalas: true, allowances: true, grossHalalas: true },
  });
  const deductions = await tx.salaryDeduction.groupBy({
    by: ["salaryPeriodId"],
    where: { establishmentId, salaryPeriodId: { in: periods.map((p) => p.id) } },
    _sum: { amountHalalas: true },
  });
  const deducted = new Map(deductions.map((d) => [d.salaryPeriodId, Number(d._sum.amountHalalas ?? 0)]));
  const gross = grossOf(terms.basicSalaryHalalas, terms.allowances);

  const before: unknown[] = [];
  const after: unknown[] = [];
  for (const row of unpaid) {
    const period = periods.find((p) => p.instalmentId === row.id);
    const minus = period ? (deducted.get(period.id) ?? 0) : 0;
    if (minus > gross) throw new DeductionExceedsGrossError();
    const dueDate = payDateFor(row.periodYm!, terms.payDay);
    const amountDueHalalas = gross - minus;
    const same =
      dueDate === dateToISO(row.dueDate) &&
      amountDueHalalas === row.amountDueHalalas &&
      period?.basicHalalas === terms.basicSalaryHalalas &&
      canon(period.allowances) === canon(terms.allowances);
    if (same) continue;
    await tx.instalment.updateMany({
      where: { establishmentId, planId, id: row.id },
      data: { dueDate: isoToDate(dueDate), amountDueHalalas },
    });
    if (period) {
      await tx.salaryPeriod.updateMany({
        where: { establishmentId, id: period.id },
        data: { basicHalalas: terms.basicSalaryHalalas, allowances: terms.allowances, grossHalalas: gross },
      });
    }
    before.push({ periodYm: row.periodYm, dueDate: dateToISO(row.dueDate), amountDueHalalas: row.amountDueHalalas, grossHalalas: period?.grossHalalas ?? null });
    after.push({ periodYm: row.periodYm, dueDate, amountDueHalalas, grossHalalas: gross });
  }
  return { before, after };
}
