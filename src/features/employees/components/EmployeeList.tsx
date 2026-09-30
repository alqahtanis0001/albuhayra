/**
 * الموظفون: one row per employee — name and job title, hire date (and end date
 * when set), and the monthly gross or «لا يوجد راتب مسجل». Amounts are neutral:
 * a salary has no direction to show until it is paid. Each row leads to the
 * employee's page.
 */
import Link from "next/link";

import { Badge } from "@/components/Badge";
import { DateText } from "@/components/DateText";
import { MoneyText } from "@/components/MoneyText";
import type { EmployeeRow } from "@/features/employees/queries";
import { t } from "@/i18n/ar";

export function EmployeeList({ rows }: { rows: EmployeeRow[] }) {
  return (
    <ul className="flex flex-col">
      {rows.map((row) => (
        <li key={row.id} className="border-b border-gray-200 last:border-b-0">
          <Link
            href={`/owner/staff/${row.id}`}
            className="flex flex-wrap items-start justify-between gap-3 p-3 hover:bg-gray-50"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="truncate text-sm font-medium text-gray-900">{row.name}</span>
                {row.hasLogin ? <Badge tone="neutral">{t.employees.sectionLogin}</Badge> : null}
              </span>
              {row.jobTitle ? <span className="text-xs text-gray-600">{row.jobTitle}</span> : null}
              <span className="flex flex-wrap items-start gap-x-3 gap-y-1 text-xs text-gray-600">
                <span className="flex items-start gap-1">
                  {t.employees.startDate}: <DateText date={row.startDate} compact />
                </span>
                {row.endDate ? (
                  <span className="flex items-start gap-1">
                    {t.employees.endDate}: <DateText date={row.endDate} compact />
                  </span>
                ) : null}
              </span>
            </div>
            <div className="flex flex-col items-end gap-0.5 text-end text-sm">
              {row.grossHalalas === null ? (
                <span className="text-xs text-gray-600">{t.employees.noSalary}</span>
              ) : (
                <>
                  <span className="text-xs text-gray-600">{t.employees.gross}</span>
                  <MoneyText halalas={row.grossHalalas} />
                </>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default EmployeeList;
