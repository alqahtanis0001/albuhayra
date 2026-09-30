/**
 * v1.3 item 6 — the week ribbon's pure grouping. Everything comes from
 * `getDues` (no new query): the overdue rows become one tile, and the week's
 * rows are grouped by `dueDate` into one tile per day from `today` to
 * `weekEnd` inclusive, every day present (empty days are zero tiles). لنا = IN,
 * علينا = OUT; the two are never added together.
 */
import { isoToDate, toGregorian, toHijri } from "@/lib/dates";
import type { DirectionValue } from "@/lib/validation";

const DAY_MS = 86_400_000;

export type RibbonRow = { dueDate: string; direction: DirectionValue; remainingHalalas: number };

export type RibbonTotals = { count: number; inHalalas: number; outHalalas: number };

export type RibbonDay = RibbonTotals & { date: string; isToday: boolean };

export function sumRows(rows: RibbonRow[]): RibbonTotals {
  const totals: RibbonTotals = { count: 0, inHalalas: 0, outHalalas: 0 };
  for (const row of rows) {
    totals.count += 1;
    if (row.direction === "IN") totals.inHalalas += row.remainingHalalas;
    else totals.outHalalas += row.remainingHalalas;
  }
  return totals;
}

/** Every ISO date from `from` to `to` inclusive (UTC day arithmetic, no clock). */
export function daysBetween(from: string, to: string): string[] {
  const days: string[] = [];
  const end = Date.parse(`${to}T00:00:00Z`);
  for (let ms = Date.parse(`${from}T00:00:00Z`); ms <= end; ms += DAY_MS) {
    days.push(new Date(ms).toISOString().slice(0, 10));
  }
  return days;
}

export function buildRibbon(dues: {
  today: string;
  weekEnd: string;
  overdue: RibbonRow[];
  thisWeek: RibbonRow[];
}): { overdue: RibbonTotals; days: RibbonDay[] } {
  return {
    overdue: sumRows(dues.overdue),
    days: daysBetween(dues.today, dues.weekEnd).map((date) => ({
      date,
      isToday: date === dues.today,
      ...sumRows(dues.thisWeek.filter((r) => r.dueDate === date)),
    })),
  };
}

const WEEKDAY = new Intl.DateTimeFormat("ar-SA-u-nu-latn", { weekday: "long", timeZone: "UTC" });

/**
 * A tile's date for its accessible name, as DateText shows it: Gregorian, then
 * Hijri — «2026-10-01 (1448/04/19 هـ)» — through the app's own formatters.
 */
export function tileDate(iso: string): string {
  const d = isoToDate(iso);
  return `${toGregorian(d)} (${toHijri(d)})`;
}

/** «الخميس» for an ISO date — the day itself, independent of the machine's zone. */
export function weekdayAr(iso: string): string {
  return WEEKDAY.format(new Date(`${iso}T00:00:00Z`));
}
