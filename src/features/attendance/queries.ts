import "server-only";

import {
  daysOfMonth,
  derivedStatus,
  employedOn,
  isWorkDay,
  minutesBetween,
  prefillStatus,
  type Schedule,
} from "@/lib/attendance";
import { dateToISO, isoToDate } from "@/lib/dates";
import { db } from "@/lib/db";
import type { AttendanceStatusValue } from "@/lib/validation";

/**
 * الحضور — the owner's reads (spec §3.3; D10, Z1, Z2). Pages call these after
 * `requireOwner()` with the session's establishment; every query is scoped by
 * it. Staff `canEdit` does not apply (spec §3.3). No `Date` crosses the
 * boundary — ISO strings, and `updatedAt` as an ISO instant (Y6).
 */

export type AttendanceRecordView = {
  status: AttendanceStatusValue;
  statusOverridden: boolean;
  checkIn: string | null;
  checkOut: string | null;
  note: string | null;
  minutes: number | null;
  /** Echo back when saving (Y6/Z3): a mismatch is err.concurrentChange. */
  updatedAt: string;
};

export type DaySheetRow = {
  employeeId: string;
  name: string;
  jobTitle: string | null;
  schedule: Schedule & { workEnd: string | null };
  workDay: boolean;
  record: AttendanceRecordView | null;
  /** For a row with no record: عطلة on a non-work day, else null (غير مسجل). */
  prefill: "HOLIDAY" | null;
  /** The status the record's check-in implies, shown when not overridden. */
  derived: "PRESENT" | "LATE" | null;
};

export type StatusTotals = Record<AttendanceStatusValue, number>;

export const EMPLOYEE_SCHEDULE_SELECT = {
  id: true, jobTitle: true, startDate: true, endDate: true, workDays: true, workStart: true, workEnd: true,
  graceMinutes: true, party: { select: { name: true } },
} as const;

const RECORD_SELECT = {
  id: true, employeeId: true, date: true, status: true, statusOverridden: true, checkIn: true, checkOut: true,
  note: true, updatedAt: true,
} as const;

type RecordRead = {
  employeeId: string; date: Date; status: AttendanceStatusValue; statusOverridden: boolean;
  checkIn: string | null; checkOut: string | null; note: string | null; updatedAt: Date;
};

export function toRecordView(r: RecordRead): AttendanceRecordView {
  return {
    status: r.status,
    statusOverridden: r.statusOverridden,
    checkIn: r.checkIn,
    checkOut: r.checkOut,
    note: r.note,
    minutes: minutesBetween(r.checkIn, r.checkOut),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export function emptyTotals(): StatusTotals {
  return { PRESENT: 0, LATE: 0, ABSENT: 0, LEAVE: 0, REMOTE: 0, HOLIDAY: 0 };
}

/** Z2: employees employed on any day of [from, to], whatever their current status. */
function employedWhere(establishmentId: string, from: string, to: string) {
  return {
    establishmentId,
    startDate: { lte: isoToDate(to) },
    OR: [{ endDate: null }, { endDate: { gte: isoToDate(from) } }],
  };
}

/** The daily sheet: one row per employee employed on `date` (Z2), by name. */
export async function getDaySheet(establishmentId: string, date: string): Promise<{ date: string; rows: DaySheetRow[] }> {
  const employees = await db.employee.findMany({
    where: employedWhere(establishmentId, date, date),
    select: EMPLOYEE_SCHEDULE_SELECT,
    orderBy: [{ party: { name: "asc" } }, { id: "asc" }],
  });
  const records = employees.length
    ? await db.attendanceRecord.findMany({
        where: { establishmentId, date: isoToDate(date), employeeId: { in: employees.map((e) => e.id) } },
        select: RECORD_SELECT,
      })
    : [];
  return {
    date,
    rows: employees.map((e) => {
      const record = records.find((r) => r.employeeId === e.id);
      const schedule = { workDays: e.workDays, workStart: e.workStart, workEnd: e.workEnd, graceMinutes: e.graceMinutes };
      return {
        employeeId: e.id,
        name: e.party.name,
        jobTitle: e.jobTitle,
        schedule,
        workDay: isWorkDay(e.workDays, date),
        record: record ? toRecordView(record) : null,
        prefill: record ? null : prefillStatus(e.workDays, date),
        derived: derivedStatus(record?.checkIn, schedule, date),
      };
    }),
  };
}

/**
 * «نسخ من آخر يوم عمل»: the latest date before `beforeISO` with any record in
 * this establishment, or null — one scoped read, however long the gap (an Eid
 * break included).
 */
export async function getLastRecordedDate(establishmentId: string, beforeISO: string): Promise<string | null> {
  const row = await db.attendanceRecord.findFirst({
    where: { establishmentId, date: { lt: isoToDate(beforeISO) } },
    orderBy: { date: "desc" },
    select: { date: true },
  });
  return row ? dateToISO(row.date) : null;
}

export type GridCell = { date: string; employed: boolean; workDay: boolean; status: AttendanceStatusValue | null };
export type GridRow = { employeeId: string; name: string; cells: GridCell[]; totals: StatusTotals; minutes: number };

/**
 * The monthly grid: employees × days. A day outside the employment (Z2) or with
 * no record has no status — non-work days are never counted absent (spec §3.3).
 */
export async function getMonthGrid(
  establishmentId: string,
  ym: string,
): Promise<{ ym: string; days: string[]; rows: GridRow[] }> {
  const days = daysOfMonth(ym);
  const employees = await db.employee.findMany({
    where: employedWhere(establishmentId, days[0]!, days.at(-1)!),
    select: EMPLOYEE_SCHEDULE_SELECT,
    orderBy: [{ party: { name: "asc" } }, { id: "asc" }],
  });
  const records = employees.length
    ? await db.attendanceRecord.findMany({
        where: {
          establishmentId,
          employeeId: { in: employees.map((e) => e.id) },
          date: { gte: isoToDate(days[0]!), lte: isoToDate(days.at(-1)!) },
        },
        select: RECORD_SELECT,
      })
    : [];
  return {
    ym,
    days,
    rows: employees.map((e) => {
      const hire = dateToISO(e.startDate);
      const end = e.endDate ? dateToISO(e.endDate) : null;
      const mine = records.filter((r) => r.employeeId === e.id);
      const totals = emptyTotals();
      let minutes = 0;
      const cells = days.map((date) => {
        const employed = employedOn(date, hire, end);
        const record = employed ? mine.find((r) => dateToISO(r.date) === date) : undefined;
        if (record) {
          totals[record.status] += 1;
          minutes += minutesBetween(record.checkIn, record.checkOut) ?? 0;
        }
        return { date, employed, workDay: isWorkDay(e.workDays, date), status: record?.status ?? null };
      });
      return { employeeId: e.id, name: e.party.name, cells, totals, minutes };
    }),
  };
}
