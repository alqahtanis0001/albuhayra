/**
 * The equal-split schedule builder (docs/BACKEND.md → v1.2a → Pure helpers).
 * Pure and client-safe: the plan form runs it in the browser to fill the
 * editable preview. The server never trusts its output — it validates the rows
 * it receives with `PlanInputSchema`.
 *
 * Dates are ISO `YYYY-MM-DD` strings handled with UTC arithmetic, so the
 * machine's time zone can never move a due date.
 */
import type { ScheduleFrequency } from "./validation/plans";
import { MAX_INSTALMENTS } from "./validation/plans";

export type ScheduleRow = { dueDate: string; amountDueHalalas: number };

export type ScheduleInput = {
  totalHalalas: number;
  count: number;
  frequency: ScheduleFrequency;
  /** Required for EVERY_N_DAYS, 1–365. */
  everyDays?: number;
  firstDueDate: string;
};

export const MAX_EVERY_DAYS = 365;

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function parseISO(iso: string): Date | null {
  if (!ISO.test(iso)) return null;
  const date = new Date(`${iso}T00:00:00Z`);
  // Rejects 2026-02-30, which Date would roll into March.
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso ? null : date;
}

function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/**
 * MONTHLY keeps the anchor day of the first due date and clamps to each
 * month's end separately: 31 Jan → 28/29 Feb → 31 Mar, never drifting to 28.
 */
function addMonthsAnchored(first: Date, months: number): Date {
  const total = first.getUTCMonth() + months;
  const year = first.getUTCFullYear() + Math.floor(total / 12);
  const monthIndex = ((total % 12) + 12) % 12;
  const day = Math.min(first.getUTCDate(), daysInMonth(year, monthIndex));
  return new Date(Date.UTC(year, monthIndex, day));
}

/**
 * Equal split: every row `floor(total / count)`, the **last** row adds the
 * remainder, so the rows always sum to the total. Returns `null` when no valid
 * schedule exists — a count above the total (a row would be zero, V6), a count
 * outside 1–MAX_INSTALMENTS, a bad interval or date — and the UI says why.
 */
export function buildSchedule(input: ScheduleInput): ScheduleRow[] | null {
  const { totalHalalas, count, frequency, everyDays, firstDueDate } = input;
  if (!Number.isInteger(totalHalalas) || totalHalalas <= 0) return null;
  if (!Number.isInteger(count) || count < 1 || count > MAX_INSTALMENTS) return null;
  if (count > totalHalalas) return null;
  const first = parseISO(firstDueDate);
  if (!first) return null;
  if (
    frequency === "EVERY_N_DAYS" &&
    (!Number.isInteger(everyDays) || everyDays! < 1 || everyDays! > MAX_EVERY_DAYS)
  ) {
    return null;
  }

  const base = Math.floor(totalHalalas / count);
  const remainder = totalHalalas - base * count;

  return Array.from({ length: count }, (_, k) => {
    const due =
      frequency === "WEEKLY"
        ? addDays(first, 7 * k)
        : frequency === "EVERY_N_DAYS"
          ? addDays(first, everyDays! * k)
          : addMonthsAnchored(first, k);
    return {
      dueDate: toISO(due),
      amountDueHalalas: k === count - 1 ? base + remainder : base,
    };
  });
}
