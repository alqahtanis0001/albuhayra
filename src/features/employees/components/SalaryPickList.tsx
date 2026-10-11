/**
 * v1.5 (docs/V15-SPEC.md B3 row 3, D15, D21): /owner/staff?pick=salary — the
 * «+» sheet's «صرف راتب». A banner says what to do and offers the way out; each
 * row is one ACTIVE employee with this month's salary instalment: payable rows
 * open the payment screen for that instalment (the URL EmployeeActions uses),
 * a month already paid shows «مدفوع» and opens the employee page instead.
 */
import Link from "next/link";

import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { MoneyText } from "@/components/MoneyText";
import { salaryPickHref, type SalaryPickRow } from "@/features/employees/salaryPickRules";
import { t } from "@/i18n/ar";

export function SalaryPickBanner() {
  return (
    <div className="no-print flex flex-wrap items-center justify-between gap-2 rounded-lg border border-accent-line bg-accent-soft px-3 py-2">
      <p className="text-sm font-medium text-accent-dark">{t.salaryPick.banner}</p>
      <Link
        href="/owner/staff"
        className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-medium text-accent-dark underline hover:bg-white"
      >
        {t.salaryPick.cancel}
      </Link>
    </div>
  );
}

export function SalaryPickList({ rows }: { rows: SalaryPickRow[] }) {
  if (rows.length === 0) return <EmptyState title={t.salaryPick.empty} />;
  return (
    <ul className="flex flex-col">
      {rows.map((row) => (
        <li key={row.employeeId} className="border-b border-gray-200 last:border-b-0">
          <Link
            href={salaryPickHref(row)}
            className="flex min-h-14 flex-wrap items-center justify-between gap-3 p-3 hover:bg-gray-50"
          >
            <span className="flex min-w-0 flex-col gap-1">
              <span className="truncate text-sm font-medium text-gray-900">{row.name}</span>
              {row.jobTitle ? <span className="text-xs text-gray-600">{row.jobTitle}</span> : null}
            </span>
            {row.payable ? (
              <span className="flex flex-col items-end gap-0.5 text-end text-sm">
                <span className="text-xs text-gray-600">{t.employees.paySalary}</span>
                <MoneyText halalas={row.remainingHalalas} />
              </span>
            ) : (
              <Badge tone="in">{t.salaryPick.paid}</Badge>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
