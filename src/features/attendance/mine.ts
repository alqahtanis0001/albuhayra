import "server-only";

import { getPayslip, type Payslip } from "@/features/employees/payslip";
import { derivedStatus, isWorkDay } from "@/lib/attendance";
import { dateToISO, isoToDate, nowRiyadhHHMM, todayISO } from "@/lib/dates";
import { db } from "@/lib/db";
import { dayOffset, instalmentStatus, type InstalmentStatus } from "@/lib/instalments";

import { employeeMonth, type EmployeeMonth } from "./month";
import { canClock, ownEmployee } from "./own";
import { toRecordView, type AttendanceRecordView } from "./queries";

/**
 * «حضوري» reads (spec §3.1, X3; Z5, Z6). Each call resolves the session's own
 * employee through `ownEmployee()` and takes no employee id at all. null =
 * the login is not linked (the page answers `notFound()`). Reads work for a
 * linked ENDED employee too (Z5); the owner's notes are left out (Z6).
 */

export type MySelf = {
  name: string;
  today: string;
  /** Server clock at render, for the "recorded from the system clock" note. */
  now: string;
  workDay: boolean;
  schedule: { workStart: string | null; workEnd: string | null };
  record: AttendanceRecordView | null;
  derived: "PRESENT" | "LATE" | null;
  canClock: boolean;
};

export async function getMySelf(): Promise<MySelf | null> {
  const { establishmentId, employee } = await ownEmployee();
  if (!employee) return null;
  const at = new Date();
  const today = todayISO(at);
  const record = await db.attendanceRecord.findFirst({
    where: { establishmentId, employeeId: employee.id, date: isoToDate(today) },
    select: { employeeId: true, date: true, status: true, statusOverridden: true, checkIn: true, checkOut: true, note: true, updatedAt: true },
  });
  return {
    name: employee.name,
    today,
    now: nowRiyadhHHMM(at),
    workDay: isWorkDay(employee.workDays, today),
    schedule: { workStart: employee.workStart, workEnd: employee.workEnd },
    record: record ? toRecordView({ ...record, note: null }) : null,
    derived: derivedStatus(record?.checkIn, employee, today),
    canClock: canClock(employee, today),
  };
}

export async function getMyMonth(ym: string): Promise<EmployeeMonth | null> {
  const { establishmentId, employee } = await ownEmployee();
  return employee ? employeeMonth(establishmentId, employee.id, ym, { withNotes: false }) : null;
}

export type MyPayslipRow = { periodYm: string; netHalalas: number; paidHalalas: number; remainingHalalas: number };

/** Own salary months that have a payslip, newest first. */
export async function getMyPayslips(): Promise<MyPayslipRow[] | null> {
  const { establishmentId, employee } = await ownEmployee();
  if (!employee) return null;
  const periods = await db.salaryPeriod.findMany({
    where: { establishmentId, employeeId: employee.id },
    select: { periodYm: true, instalmentId: true },
    orderBy: { periodYm: "desc" },
  });
  const rows = periods.length
    ? await db.instalment.findMany({
        where: { establishmentId, id: { in: periods.map((p) => p.instalmentId) } },
        select: { id: true, amountDueHalalas: true, paidHalalas: true },
      })
    : [];
  return periods.flatMap((p) => {
    const i = rows.find((r) => r.id === p.instalmentId);
    return i
      ? [{ periodYm: p.periodYm, netHalalas: i.amountDueHalalas, paidHalalas: i.paidHalalas, remainingHalalas: Math.max(0, i.amountDueHalalas - i.paidHalalas) }]
      : [];
  });
}

export async function getMyPayslip(ym: string): Promise<Payslip | null> {
  const { establishmentId, employee } = await ownEmployee();
  return employee ? getPayslip(establishmentId, employee.id, ym) : null;
}

export type MySalaryInstalment = {
  periodYm: string | null;
  dueDate: string;
  amountDueHalalas: number;
  paidHalalas: number;
  remainingHalalas: number;
  status: InstalmentStatus;
  dayOffset: number;
  /** The plan was archived (employment ended): an unpaid remainder was written off. */
  closed: boolean;
};

/** X3: own salary months — due date, amount, paid, remaining, status. */
export async function getMySalaryInstalments(): Promise<MySalaryInstalment[] | null> {
  const { establishmentId, employee } = await ownEmployee();
  if (!employee) return null;
  const today = todayISO();
  const rows = await db.instalment.findMany({
    where: { establishmentId, plan: { employeeId: employee.id, kind: "SALARY", state: { in: ["OPEN", "ARCHIVED"] } } },
    select: {
      periodYm: true, dueDate: true, amountDueHalalas: true, paidHalalas: true,
      plan: { select: { state: true, reminderDays: true } },
    },
    orderBy: [{ dueDate: "desc" }, { id: "asc" }],
  });
  return rows.map((r) => {
    const dueDate = dateToISO(r.dueDate);
    return {
      periodYm: r.periodYm,
      dueDate,
      amountDueHalalas: r.amountDueHalalas,
      paidHalalas: r.paidHalalas,
      remainingHalalas: Math.max(0, r.amountDueHalalas - r.paidHalalas),
      status: instalmentStatus({ ...r, dueDate }, today, r.plan.reminderDays),
      dayOffset: dayOffset(dueDate, today),
      closed: r.plan.state !== "OPEN",
    };
  });
}
