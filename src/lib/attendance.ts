/**
 * v1.2b attendance helpers — pure, client-safe, no DB, no clock
 * (docs/V12B-DESIGN.md D10, D11, X7, Y5; TASKS Z1). Times are "HH:MM"
 * (Riyadh wall clock), dates ISO "YYYY-MM-DD" read in UTC.
 */
import type { AttendanceStatusValue } from "@/lib/validation";

/** Sun=1, Mon=2, Tue=4, Wed=8, Thu=16, Fri=32, Sat=64 — the `Employee.workDays` bits. */
export function weekdayBit(iso: string): number {
  return 1 << new Date(`${iso}T00:00:00Z`).getUTCDay();
}

export function isWorkDay(workDays: number, iso: string): boolean {
  return (workDays & weekdayBit(iso)) !== 0;
}

/** "08:30" → 510. */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h! * 60 + m!;
}

/** Worked minutes; null unless both times exist and out is strictly later (N1). */
export function minutesBetween(checkIn: string | null | undefined, checkOut: string | null | undefined): number | null {
  if (!checkIn || !checkOut) return null;
  const d = toMinutes(checkOut) - toMinutes(checkIn);
  return d > 0 ? d : null;
}

export type Schedule = { workDays: number; workStart: string | null; graceMinutes: number | null };

/**
 * Y5 + D11: the status a check-in time implies. LATE only when a start time
 * and a grace are both set and the check-in is after start + grace (grace 0 =
 * late after the start minute); a null grace or no start → PRESENT; a non-work
 * day → PRESENT, never late. Null without a check-in.
 */
export function derivedStatus(
  checkIn: string | null | undefined,
  schedule: Schedule,
  iso: string,
): "PRESENT" | "LATE" | null {
  if (!checkIn) return null;
  if (!isWorkDay(schedule.workDays, iso)) return "PRESENT";
  if (!schedule.workStart || schedule.graceMinutes === null) return "PRESENT";
  return toMinutes(checkIn) > toMinutes(schedule.workStart) + schedule.graceMinutes ? "LATE" : "PRESENT";
}

/** The sheet's prefill for a day with no record: عطلة on non-work days, nothing otherwise. */
export function prefillStatus(workDays: number, iso: string): "HOLIDAY" | null {
  return isWorkDay(workDays, iso) ? null : "HOLIDAY";
}

/** Z1 `expected`: with a check-in, the derived status; else HOLIDAY on a non-work day; else none. */
export function expectedStatus(
  checkIn: string | null | undefined,
  schedule: Schedule,
  iso: string,
): AttendanceStatusValue | null {
  return checkIn ? derivedStatus(checkIn, schedule, iso) : prefillStatus(schedule.workDays, iso);
}

/**
 * Z1: what is stored for a posted status — the server alone decides
 * "overridden". ABSENT / LEAVE / REMOTE always override. HOLIDAY overrides
 * unless it is what the day expects. PRESENT / LATE override when they differ
 * from a non-empty expectation (a check-in's derived status, or عطلة on a
 * non-work day); with nothing expected they stand as posted, not overridden,
 * so a later check-in can still derive late (lead's ruling on Z1). So a row
 * that is not overridden always carries a post equal to its expected status,
 * or has nothing expected — storing the post is the same as recomputing.
 */
export function settleStatus(
  posted: AttendanceStatusValue,
  checkIn: string | null | undefined,
  schedule: Schedule,
  iso: string,
): { status: AttendanceStatusValue; statusOverridden: boolean } {
  const expected = expectedStatus(checkIn, schedule, iso);
  const overridden =
    posted === "ABSENT" || posted === "LEAVE" || posted === "REMOTE"
      ? true
      : posted === "HOLIDAY"
        ? posted !== expected
        : expected !== null && posted !== expected;
  return { status: posted, statusOverridden: overridden };
}

/** Every ISO day of a "YYYY-MM" month, first to last. */
export function daysOfMonth(ym: string): string[] {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(Date.UTC(y!, m!, 0)).getUTCDate();
  return Array.from({ length: last }, (_, i) => `${ym}-${String(i + 1).padStart(2, "0")}`);
}

/** Z2: employed on that day — hire ≤ date ≤ (end ?? ∞), whatever the current status. */
export function employedOn(iso: string, hireDate: string, endDate: string | null): boolean {
  return hireDate <= iso && (endDate === null || iso <= endDate);
}
