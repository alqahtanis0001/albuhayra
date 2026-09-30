/**
 * v1.3 item 10: the employee page's 12-month strip (server component). One
 * cell per month, oldest at the inline start (right, in RTL), tinted by the
 * attendance rate — and the % always written in the cell, because a soft tint
 * alone is ~1.2:1 against white. The full counts are the cell's screen-reader
 * text and its hover title. Tints print plain (`.print-plain`).
 */
import { Card } from "@/components/Card";
import { t } from "@/i18n/ar";
import { monthNameAr } from "@/lib/dates";

import { HEAT_CLASS, heatStep, pctText, type HeatCell } from "./attendanceVisual";

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));
}

function cellText(c: HeatCell, month: string): string {
  if (c.state === "beforeHire") return fill(t.attendanceVisual.heatBeforeHire, { month });
  if (c.state === "noData" || c.rate === null) return fill(t.attendanceVisual.heatNoData, { month });
  return fill(t.attendanceVisual.heatCell, {
    month,
    pct: pctText(c.rate),
    present: c.totals.PRESENT,
    late: c.totals.LATE,
    absent: c.totals.ABSENT,
    leave: c.totals.LEAVE,
    remote: c.totals.REMOTE,
  });
}

export function AttendanceHeatStrip({ cells }: { cells: HeatCell[] }) {
  return (
    <Card title={t.attendanceVisual.heatTitle}>
      <ol className="grid grid-cols-6 gap-1 sm:grid-cols-12" aria-label={t.attendanceVisual.heatTitle}>
        {cells.map((c) => {
          const [y, m] = c.ym.split("-");
          const month = `${monthNameAr(Number(m))} ${y}`;
          const text = cellText(c, month);
          const muted = c.state === "beforeHire";
          return (
            <li
              key={c.ym}
              title={text}
              className={`print-plain flex min-h-14 flex-col items-center justify-center rounded border border-gray-200 px-0.5 py-1 text-center text-gray-900 ${
                muted ? "bg-gray-50" : HEAT_CLASS[heatStep(c.rate)]
              }`}
            >
              <span aria-hidden="true" className="text-[11px] leading-tight">
                {monthNameAr(Number(m))}
              </span>
              <span aria-hidden="true" className="text-sm font-semibold">
                {c.rate === null ? "—" : <bdi dir="ltr" className="tabular-nums">{pctText(c.rate)}</bdi>}
              </span>
              <span className="sr-only">{text}</span>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-xs text-gray-600">{t.attendanceVisual.heatRate}</p>
    </Card>
  );
}

export default AttendanceHeatStrip;
