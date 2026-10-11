/**
 * v1.4 part 3 (D32 B1): the month helpers the report filters need, pure and
 * free of the validation barrel — `ReportFilters` is a client leaf and the zod
 * bundle must stay out of that route. `reportRange.ts` re-exports them for the
 * server parser. Imports `@/lib/dates` only.
 */
import { dateToISO, lastMonths, monthEnd, monthNameAr, monthStart, ymString } from "@/lib/dates";

export type MonthOption = { value: string; label: string };

/** The whole of one month as a range; `month` echoes the key. */
export function monthRange(ym: string): { from: string; to: string; month: string } {
  const [year, month] = ym.split("-").map(Number);
  return {
    from: dateToISO(monthStart(year!, month!)),
    to: dateToISO(monthEnd(year!, month!)),
    month: ym,
  };
}

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

/** The filter form's period state: `month` "" means a custom range. */
export type PeriodState = { month: string; from: string; to: string };

/** Choosing a month sets from/to to that month; «فترة مخصصة» ("") keeps the dates. */
export function afterMonthChoice(state: PeriodState, month: string): PeriodState {
  if (!month) return { ...state, month: "" };
  const { from, to } = monthRange(month);
  return { month, from, to };
}

/** Typing a date selects «فترة مخصصة»: the month goes, the other date stays. */
export function afterDateTyped(state: PeriodState, field: "from" | "to", value: string): PeriodState {
  return { ...state, [field]: value, month: "" };
}
