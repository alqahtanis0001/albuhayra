import "server-only";

import { dateToISO } from "@/lib/dates";
import { db } from "@/lib/db";
import { grossOf } from "@/lib/payroll";
import type { PaymentMethodValue } from "@/lib/validation";

import { AllowanceSnapshotSchema, type AllowanceLine } from "./queries";

/**
 * The payslip for one employee and month (spec §3.4; D4, D12, S10). Built from
 * the month's `SalaryPeriod` snapshot and its deductions; paid / remaining from
 * the instalment's `paidHalalas` (after a rollover that is what actually paid
 * it), plus the payments recorded against it. Owner pages only in CP1.
 */

export type Payslip = {
  establishmentName: string;
  employee: { id: string; name: string; jobTitle: string | null };
  periodYm: string;
  dueDate: string;
  basicHalalas: number;
  allowances: AllowanceLine[];
  grossHalalas: number;
  deductions: Array<{ amountHalalas: number; reason: string }>;
  deductionsHalalas: number;
  netHalalas: number;
  paidHalalas: number;
  remainingHalalas: number;
  payments: Array<{ date: string; amountHalalas: number; paymentMethod: PaymentMethodValue }>;
};

export async function getPayslip(
  establishmentId: string,
  employeeId: string,
  periodYm: string,
): Promise<Payslip | null> {
  const [establishment, employee, period] = await Promise.all([
    db.establishment.findFirst({ where: { id: establishmentId }, select: { name: true } }),
    db.employee.findFirst({
      where: { establishmentId, id: employeeId },
      select: { id: true, jobTitle: true, party: { select: { name: true } } },
    }),
    db.salaryPeriod.findFirst({
      where: { establishmentId, employeeId, periodYm },
      select: { id: true, instalmentId: true, basicHalalas: true, allowances: true, grossHalalas: true },
    }),
  ]);
  if (!establishment || !employee || !period) return null;

  const [deductions, instalment, payments] = await Promise.all([
    db.salaryDeduction.findMany({
      where: { establishmentId, salaryPeriodId: period.id },
      select: { amountHalalas: true, reason: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
    db.instalment.findFirst({
      where: { establishmentId, id: period.instalmentId },
      select: { dueDate: true, amountDueHalalas: true, paidHalalas: true },
    }),
    db.transaction.findMany({
      where: { establishmentId, deletedAt: null, instalmentId: period.instalmentId },
      select: { date: true, amountHalalas: true, paymentMethod: true },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    }),
  ]);
  if (!instalment) return null;

  // N4 + R-note 6: a snapshot that does not parse is a defect, not an empty
  // list — printing a gross its lines do not add up to is the silent wrong
  // number. `parse` throws, and the page's error boundary shows instead.
  const allowances = AllowanceSnapshotSchema.parse(period.allowances);
  if (grossOf(period.basicHalalas, allowances) !== period.grossHalalas) {
    throw new Error("salary period snapshot does not add up to its gross");
  }
  const deductionsHalalas = deductions.reduce((sum, d) => sum + d.amountHalalas, 0);
  return {
    establishmentName: establishment.name,
    employee: { id: employee.id, name: employee.party.name, jobTitle: employee.jobTitle },
    periodYm,
    dueDate: dateToISO(instalment.dueDate),
    basicHalalas: period.basicHalalas,
    allowances,
    grossHalalas: period.grossHalalas,
    deductions,
    deductionsHalalas,
    netHalalas: instalment.amountDueHalalas,
    paidHalalas: instalment.paidHalalas,
    remainingHalalas: Math.max(0, instalment.amountDueHalalas - instalment.paidHalalas),
    payments: payments.map((p) => ({ date: dateToISO(p.date), amountHalalas: p.amountHalalas, paymentMethod: p.paymentMethod })),
  };
}
