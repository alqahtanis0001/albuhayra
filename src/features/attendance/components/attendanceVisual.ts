/**
 * v1.3 item 10 (docs/V13-SPEC.md) — pure, client-safe helpers for the tinted
 * grid and the 12-month heat strip. Tints are Tailwind classes from the v1.3
 * tokens (never inline styles), so `.print-plain` wins in print; text on any
 * tint is gray-900. Colour is never the only signal: the letter code and the
 * % stay as text.
 */
import type { AttendanceStatusValue } from "@/lib/validation";

export type Totals = Record<AttendanceStatusValue, number>;

export const STATUS_TINT: Record<AttendanceStatusValue, string> = {
  PRESENT: "bg-tint-in",
  LATE: "bg-tint-amber",
  ABSENT: "bg-tint-out",
  LEAVE: "bg-tint-blue",
  REMOTE: "bg-tint-teal",
  HOLIDAY: "bg-tint-grey",
};

/**
 * Attendance rate of one month (0..1), or null with nothing to count.
 * Attended = حاضر + متأخر + عن بُعد. Denominator = attended + غائب: the
 * recorded days the employee was expected at work. عطلة (not a work day) and
 * إجازة (approved leave) are left out, and so is an unrecorded day — no record
 * is unknown, never absent (spec §3.3).
 */
export function attendanceRate(totals: Totals): number | null {
  const attended = totals.PRESENT + totals.LATE + totals.REMOTE;
  const counted = attended + totals.ABSENT;
  return counted === 0 ? null : attended / counted;
}

/** 0.873 → "87%" (rounded, Western digits). */
export function pctText(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

/** Heat tint step: 0 = no data (white), 1 < 50%, 2 < 75%, 3 < 90%, 4 ≥ 90%. */
export function heatStep(rate: number | null): 0 | 1 | 2 | 3 | 4 {
  if (rate === null) return 0;
  if (rate < 0.5) return 1;
  if (rate < 0.75) return 2;
  if (rate < 0.9) return 3;
  return 4;
}

export const HEAT_CLASS = ["bg-white", "bg-heat-1", "bg-heat-2", "bg-heat-3", "bg-heat-4"] as const;

/** The `n` months ending at `endYm`, oldest first ("YYYY-MM"). */
export function lastMonths(endYm: string, n = 12): string[] {
  const [y, m] = endYm.split("-").map(Number);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(y!, m! - 1 - (n - 1 - i), 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

const emptyTotals = (): Totals => ({ PRESENT: 0, LATE: 0, ABSENT: 0, LEAVE: 0, REMOTE: 0, HOLIDAY: 0 });

export type HeatCell = {
  ym: string;
  state: "beforeHire" | "noData" | "rate";
  totals: Totals;
  rate: number | null;
};

/**
 * One cell per month, oldest first (the oldest sits at the inline start —
 * the right, in RTL). A month wholly before the hire month is «قبل التعيين»;
 * a month with nothing countable is «لا توجد بيانات».
 */
export function heatCells(
  records: { date: string; status: AttendanceStatusValue }[],
  endYm: string,
  hireDate: string,
): HeatCell[] {
  const hireYm = hireDate.slice(0, 7);
  return lastMonths(endYm).map((ym) => {
    const totals = emptyTotals();
    for (const r of records) if (r.date.slice(0, 7) === ym) totals[r.status] += 1;
    if (ym < hireYm) return { ym, state: "beforeHire", totals, rate: null };
    const rate = attendanceRate(totals);
    return { ym, state: rate === null ? "noData" : "rate", totals, rate };
  });
}
