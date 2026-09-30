/**
 * The monthly attendance grid (spec §3.3/§3.4): employees × days, each cell a
 * one-letter status code — explained by the legend printed beside it, never
 * colour alone — then totals per status and hours. A day outside the
 * employment is blank; an employed work day with no record shows «—», an
 * unrecorded non-work day a muted «ع» (GridCellText). Printable
 * through the existing print block (`attendance-grid` only tightens cells).
 * v1.3 item 10: a recorded cell is tinted by its status (the letter stays);
 * `.print-plain` prints it as the letter on white.
 */
import Link from "next/link";

import type { GridCell, GridRow } from "@/features/attendance/queries";
import { t } from "@/i18n/ar";
import { AttendanceStatusEnum } from "@/lib/validation";

import { STATUS_TINT } from "./attendanceVisual";
import { hoursText } from "./sheetDraft";

const STATUSES = AttendanceStatusEnum.options;

export function AttendanceLegend() {
  return (
    <div className="report-card rounded-xl border border-gray-200 bg-white p-3 text-sm">
      <p className="mb-2 font-semibold text-gray-900">{t.attendanceVisual.legend}</p>
      <dl className="flex flex-wrap gap-x-4 gap-y-1">
        {STATUSES.map((s) => (
          <div key={s} className="flex items-center gap-1">
            <dt
              className={`print-plain inline-flex h-6 min-w-6 items-center justify-center rounded border border-gray-300 px-1 font-semibold text-gray-900 ${STATUS_TINT[s]}`}
            >
              {t.attendanceCode[s]}
            </dt>
            <dd>= {t.attendanceStatus[s]}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * A recorded status's code; on an employed day without a record, the
 * schedule's عطلة code muted on a non-work day (display only — not in the
 * totals; a non-work day is never absent) and «—» on a work day; blank
 * outside the employment.
 */
function GridCellText({ cell }: { cell: GridCell }) {
  if (!cell.employed) return null;
  if (cell.status) return <>{t.attendanceCode[cell.status]}</>;
  if (!cell.workDay) return <span className="text-gray-600">{t.attendanceCode.HOLIDAY}</span>;
  return <>—</>;
}

/** A recorded status's tint (print-plain on paper); else the non-work-day grey. */
function cellTint(c: GridCell): string {
  if (c.employed && c.status) return `print-plain text-gray-900 ${STATUS_TINT[c.status]}`;
  return c.workDay ? "" : "bg-gray-50";
}

/** Plain cells: the shared Th/Td carry px-3, too wide for 31 day columns. */
const BASE = "border-b border-gray-200 py-1";
const CELL = `${BASE} px-1 text-center`;
const WIDE = `${BASE} px-2`;

export function MonthGrid({ ym, days, rows }: { ym: string; days: string[]; rows: GridRow[] }) {
  return (
    <div className="report-card overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="attendance-grid w-full border-collapse text-xs">
        <caption className="sr-only">{t.attendance.printTitle}</caption>
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className={`${WIDE} sticky start-0 bg-gray-50 text-start`}>
              {t.employees.name}
            </th>
            {days.map((d) => (
              <th key={d} scope="col" className={`${CELL} font-semibold tabular-nums`}>
                {Number(d.slice(8))}
              </th>
            ))}
            {STATUSES.map((s) => (
              <th key={s} scope="col" className={`${CELL} font-semibold`} title={t.attendanceStatus[s]}>
                {t.attendanceCode[s]}
              </th>
            ))}
            <th scope="col" className={`${WIDE} text-center font-semibold`}>
              {t.attendance.hours}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.employeeId}>
              <th scope="row" className={`${WIDE} sticky start-0 whitespace-nowrap bg-white text-start font-medium`}>
                <Link
                  href={`/owner/staff/${row.employeeId}/month/${ym}`}
                  className="text-accent-dark underline-offset-2 hover:underline"
                >
                  {row.name}
                </Link>
              </th>
              {row.cells.map((c) => (
                <td key={c.date} className={`${CELL} ${cellTint(c)}`}>
                  <GridCellText cell={c} />
                </td>
              ))}
              {STATUSES.map((s) => (
                <td key={s} className={`${CELL} tabular-nums`}>
                  {row.totals[s]}
                </td>
              ))}
              <td className={`${WIDE} whitespace-nowrap text-center`}>
                <bdi className="tabular-nums">{hoursText(t.attendance.hoursValue, row.minutes)}</bdi>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
