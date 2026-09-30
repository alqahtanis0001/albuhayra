import "server-only";

import { isMonthOpen } from "@/features/payroll/core";
import { daysOfMonth, employedOn, isWorkDay, minutesBetween, prefillStatus } from "@/lib/attendance";
import { dateToISO, isoToDate } from "@/lib/dates";
import { db } from "@/lib/db";

import { EMPLOYEE_SCHEDULE_SELECT, emptyTotals, toRecordView, type AttendanceRecordView, type StatusTotals } from "./queries";

/**
 * One employee's month (spec §3.4): day rows, totals per status, hours, and
 * the month's salary with its deductions. Shared by the owner's monthly sheet
 * and «حضوري» — the self-service caller passes `withNotes: false` (Z6: the
 * owner's attendance notes are not shown to staff). Scoped by the caller's
 * establishment; a foreign or unknown employee reads as null.
 */

export type MonthDay = {
  date: string;
  employed: boolean;
  workDay: boolean;
  record: AttendanceRecordView | null;
  prefill: "HOLIDAY" | null;
};

export type MonthSalary = {
  periodYm: string;
  instalmentId: string;
  dueDate: string;
  basicHalalas: number;
  grossHalalas: number;
  deductions: Array<{ id: string; amountHalalas: number; reason: string }>;
  deductionsHalalas: number;
  netHalalas: number;
  paidHalalas: number;
  remainingHalalas: number;
  /** Z4: deductions may be added or deleted — plan OPEN and the month unpaid. */
  editable: boolean;
};

export type EmployeeMonth = {
  employee: { id: string; name: string; jobTitle: string | null; startDate: string; endDate: string | null };
  ym: string;
  days: MonthDay[];
  totals: StatusTotals;
  minutes: number;
  salary: MonthSalary | null;
};

export async function employeeMonth(
  establishmentId: string,
  employeeId: string,
  ym: string,
  opts: { withNotes: boolean },
): Promise<EmployeeMonth | null> {
  const e = await db.employee.findFirst({ where: { establishmentId, id: employeeId }, select: EMPLOYEE_SCHEDULE_SELECT });
  if (!e) return null;
  const days = daysOfMonth(ym);
  const [records, period] = await Promise.all([
    db.attendanceRecord.findMany({
      where: { establishmentId, employeeId: e.id, date: { gte: isoToDate(days[0]!), lte: isoToDate(days.at(-1)!) } },
      select: { employeeId: true, date: true, status: true, statusOverridden: true, checkIn: true, checkOut: true, note: true, updatedAt: true },
    }),
    db.salaryPeriod.findFirst({
      where: { establishmentId, employeeId: e.id, periodYm: ym },
      select: { id: true, instalmentId: true, basicHalalas: true, grossHalalas: true },
    }),
  ]);

  const hire = dateToISO(e.startDate);
  const end = e.endDate ? dateToISO(e.endDate) : null;
  const totals = emptyTotals();
  let minutes = 0;
  const rows = days.map((date): MonthDay => {
    const employed = employedOn(date, hire, end);
    const found = employed ? records.find((r) => dateToISO(r.date) === date) : undefined;
    if (found) {
      totals[found.status] += 1;
      minutes += minutesBetween(found.checkIn, found.checkOut) ?? 0;
    }
    const record = found ? toRecordView({ ...found, note: opts.withNotes ? found.note : null }) : null;
    return { date, employed, workDay: isWorkDay(e.workDays, date), record, prefill: employed && !found ? prefillStatus(e.workDays, date) : null };
  });

  return {
    employee: { id: e.id, name: e.party.name, jobTitle: e.jobTitle, startDate: hire, endDate: end },
    ym,
    days: rows,
    totals,
    minutes,
    salary: period ? await monthSalary(establishmentId, period) : null,
  };
}

async function monthSalary(
  establishmentId: string,
  period: { id: string; instalmentId: string; basicHalalas: number; grossHalalas: number },
): Promise<MonthSalary | null> {
  const [instalment, deductions] = await Promise.all([
    db.instalment.findFirst({
      where: { establishmentId, id: period.instalmentId },
      select: { periodYm: true, dueDate: true, amountDueHalalas: true, paidHalalas: true },
    }),
    db.salaryDeduction.findMany({
      where: { establishmentId, salaryPeriodId: period.id },
      select: { id: true, amountHalalas: true, reason: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
  ]);
  if (!instalment) return null;
  return {
    periodYm: instalment.periodYm ?? "",
    instalmentId: period.instalmentId,
    dueDate: dateToISO(instalment.dueDate),
    basicHalalas: period.basicHalalas,
    grossHalalas: period.grossHalalas,
    deductions,
    deductionsHalalas: deductions.reduce((s, d) => s + d.amountHalalas, 0),
    netHalalas: instalment.amountDueHalalas,
    paidHalalas: instalment.paidHalalas,
    remainingHalalas: Math.max(0, instalment.amountDueHalalas - instalment.paidHalalas),
    editable: await isMonthOpen(db, establishmentId, period.instalmentId),
  };
}

/** The owner's monthly sheet per employee (M6). */
export async function getEmployeeMonth(establishmentId: string, employeeId: string, ym: string): Promise<EmployeeMonth | null> {
  return employeeMonth(establishmentId, employeeId, ym, { withNotes: true });
}
