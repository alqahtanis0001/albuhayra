/**
 * The report range comes from the URL: `?month=YYYY-MM` for the common case, or
 * `?from=&to=` for a custom span. Both are attacker-controlled, so the custom
 * path goes through `ReportRangeSchema` and anything invalid falls back to the
 * current month rather than throwing.
 *
 * Month arithmetic uses `monthStart`/`monthEnd` from `src/lib/dates.ts` — the
 * only place that decides what "this month" means, in Riyadh.
 */
import {
  currentMonthKey,
  dateToISO,
  lastMonths,
  monthEnd,
  monthNameAr,
  monthStart,
  ymString,
} from "@/lib/dates";
import { ReportRangeSchema, toFieldErrors } from "@/lib/validation";

export type ResolvedRange = {
  from: string;
  to: string;
  /** "YYYY-MM" when the range is exactly one month, else null — drives the picker. */
  month: string | null;
  /**
   * Set when a submitted custom range was refused. `from`/`to` above stay the
   * safe fallback — they are what gets queried, and querying the rejected span
   * is the very thing MAX_REPORT_SPAN_DAYS exists to prevent. These are only
   * echoed back into the form, so the message sits under the dates the user
   * actually typed.
   */
  rejected?: { from: string; to: string; toError: string };
};

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

/**
 * The same bounds `LockInputSchema` uses. Shape alone is not enough: `Date.UTC`
 * maps years 0-99 to 1900-1999, so `?month=0050-03` would resolve to March 1950
 * — a real month, outside the picker's 24 options, so the select would fall back
 * to its first option and display a month other than the one reported on.
 */
function inRange(year: number): boolean {
  return year >= 2000 && year <= 2100;
}

export function monthRange(ym: string): ResolvedRange {
  const [year, month] = ym.split("-").map(Number);
  return {
    from: dateToISO(monthStart(year!, month!)),
    to: dateToISO(monthEnd(year!, month!)),
    month: ym,
  };
}

export function currentMonthRange(): ResolvedRange {
  const { year, month } = currentMonthKey();
  return monthRange(ymString(year, month));
}

export function parseReportRange(raw: Record<string, string | string[] | undefined>): ResolvedRange {
  const month = typeof raw.month === "string" ? raw.month : undefined;
  const shaped = month ? MONTH_RE.exec(month) : null;
  if (shaped && inRange(Number(shaped[1]))) return monthRange(month!);

  const from = typeof raw.from === "string" ? raw.from : undefined;
  const to = typeof raw.to === "string" ? raw.to : undefined;
  if (from && to) {
    const parsed = ReportRangeSchema.safeParse({ from, to });
    if (parsed.success) {
      return { from: parsed.data.from, to: parsed.data.to, month: null };
    }
    // Refused — reversed, malformed, or over MAX_REPORT_SPAN_DAYS. The report
    // shown is the current month; the rejected dates come back only to carry the
    // message under the field the user typed in.
    return {
      ...currentMonthRange(),
      rejected: {
        from,
        to,
        toError: toFieldErrors(parsed.error).to ?? "err.rangeInvalid",
      },
    };
  }
  return currentMonthRange();
}

export type MonthOption = { value: string; label: string };

/** Only needed for a month outside the 24-month window, which arrives as a string. */
function labelFor(ym: string): string {
  const [year, month] = ym.split("-").map(Number);
  return `${monthNameAr(month!)} ${year}`;
}

/**
 * The last 24 months, newest first — an owner reports on a month that has ended.
 * `selected` is added when it falls outside that window, which a hand-edited
 * `?month=` can do: the report is correct for it, so the picker has to show it
 * rather than silently displaying whichever month happens to be first.
 */
export function monthOptions(selected?: string | null): MonthOption[] {
  const recent = lastMonths(24)
    .reverse()
    .map((m) => ({
      value: ymString(m.year, m.month),
      label: `${monthNameAr(m.month)} ${m.year}`,
    }));

  if (selected && !recent.some((o) => o.value === selected)) {
    return [{ value: selected, label: labelFor(selected) }, ...recent];
  }
  return recent;
}

