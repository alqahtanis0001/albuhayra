import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { MySalaryList } from "@/features/attendance/components/MySalaryList";
import { getMySalaryInstalments } from "@/features/attendance/mine";
import { ownEmployee } from "@/features/attendance/own";
import { ensureSalaryInstalments } from "@/features/payroll/generate";
import { t } from "@/i18n/ar";
import { requireStaff } from "@/lib/auth";

export const metadata: Metadata = { title: t.myAttendance.mySalary };

/** «حضوري» — own salary months (X3). Unlinked → notFound(). */
export default async function MySalaryPage() {
  await requireStaff();
  const { establishmentId, employee } = await ownEmployee();
  if (!employee) notFound();
  // Y11: only the session's own employee is generated.
  await ensureSalaryInstalments(establishmentId, employee.id);
  const rows = await getMySalaryInstalments();
  if (!rows) notFound();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">{t.myAttendance.mySalary}</h1>
      <Card bodyClassName="">
        {rows.length === 0 ? <EmptyState title={t.myAttendance.noSalary} /> : <MySalaryList rows={rows} />}
      </Card>
    </div>
  );
}
