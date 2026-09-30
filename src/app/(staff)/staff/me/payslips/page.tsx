import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { MoneyText } from "@/components/MoneyText";
import { getMyPayslips } from "@/features/attendance/mine";
import { ownEmployee } from "@/features/attendance/own";
import { ensureSalaryInstalments } from "@/features/payroll/generate";
import { periodLabel } from "@/features/plans/components/PlanBits";
import { t } from "@/i18n/ar";
import { requireStaff } from "@/lib/auth";

export const metadata: Metadata = { title: t.myAttendance.myPayslips };

/** «حضوري» — own payslips, newest first (spec §3.1). Unlinked → notFound(). */
export default async function MyPayslipsPage() {
  await requireStaff();
  const { establishmentId, employee } = await ownEmployee();
  if (!employee) notFound();
  // Y11: only the session's own employee is generated.
  await ensureSalaryInstalments(establishmentId, employee.id);
  const rows = await getMyPayslips();
  if (!rows) notFound();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">{t.myAttendance.myPayslips}</h1>
      <Card bodyClassName="">
        {rows.length === 0 ? (
          <EmptyState title={t.myAttendance.noPayslips} />
        ) : (
          <ul className="flex flex-col">
            {rows.map((row) => (
              <li key={row.periodYm} className="border-b border-gray-200 last:border-b-0">
                <Link
                  href={`/staff/me/payslip/${row.periodYm}`}
                  className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm hover:bg-gray-50"
                >
                  <span className="font-medium text-gray-900">{periodLabel(row.periodYm)}</span>
                  <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span>
                      {t.employees.net}: <MoneyText halalas={row.netHalalas} />
                    </span>
                    <span className="text-xs text-gray-600">
                      {row.remainingHalalas > 0 ? (
                        <>
                          {t.employees.remaining}: <MoneyText halalas={row.remainingHalalas} inheritColor />
                        </>
                      ) : (
                        t.instalmentStatus.PAID
                      )}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
