/**
 * v1.3 item 13 (docs/V13-SPEC.md) — pure helpers for the statement header.
 * Sign convention of `balanceHalalas` (src/features/parties/statement.ts):
 * + = لنا (the party owes us), − = علينا (we owe the party), 0 = settled.
 */
import type { SeriesPoint } from "@/components/visualPalette";
import { isoToDate, toGregorian, toHijri } from "@/lib/dates";

export type BalanceKind = "owesUs" | "weOwe" | "settled";

export function balanceKind(halalas: number): BalanceKind {
  if (halalas > 0) return "owesUs";
  if (halalas < 0) return "weOwe";
  return "settled";
}

/**
 * The running balance as a daily series: one point per date, the balance
 * after that date's last row. Rows arrive in statement order (date ascending).
 */
export function statementPoints(rows: { date: string; balanceHalalas: number }[]): SeriesPoint[] {
  const points: SeriesPoint[] = [];
  for (const row of rows) {
    const last = points.at(-1);
    if (last && last.date === row.date) last.value = row.balanceHalalas;
    else points.push({ date: row.date, value: row.balanceHalalas });
  }
  return points;
}

/**
 * A date inside a plain-text summary, with DateText's own formatters:
 * Gregorian, then the Hijri in brackets — "2026-09-29 (1448/04/18 هـ)".
 */
export function summaryDate(iso: string): string {
  const d = isoToDate(iso);
  return `${toGregorian(d)} (${toHijri(d)})`;
}
