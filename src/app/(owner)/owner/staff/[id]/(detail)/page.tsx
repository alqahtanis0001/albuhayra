import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EmployeeActions } from "@/features/employees/components/EmployeeActions";
import {
  MonthsCard,
  ProfileCard,
  SalaryCard,
  ThisMonthCard,
} from "@/features/employees/components/EmployeeProfile";
import { getEmployee, getUnpaidSalaryMonths } from "@/features/employees/queries";
import { ensureSalaryInstalments } from "@/features/payroll/generate";
import { t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";
import { todayISO } from "@/lib/dates";

export const metadata: Metadata = { title: t.employees.title };

/**
 * An employee: controls, profile, salary terms, this month's salary and the
 * latest months with their payslips. Salary months are generated first (D2).
 * An unknown id and another establishment's id both reach notFound().
 */
export default async function EmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { establishmentId } = await requireOwner();
  await ensureSalaryInstalments(establishmentId);
  const { id } = await params;
  const today = todayISO();
  const employee = await getEmployee(establishmentId, id, today);
  if (!employee) notFound();
  const canEnd = employee.status === "ACTIVE" && employee.endDate === null;
  const unpaid = canEnd ? await getUnpaidSalaryMonths(establishmentId, employee.id) : [];
  const pay = employee.thisMonth?.payable ? employee.thisMonth.instalmentId : null;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">{employee.name}</h1>

      <EmployeeActions
        employeeId={employee.id}
        partyId={employee.partyId}
        canEnd={canEnd}
        canReactivate={!canEnd}
        endPending={employee.status === "ACTIVE" && employee.endDate !== null}
        hasSalary={employee.grossHalalas !== null}
        payInstalmentId={pay}
        startDate={employee.startDate}
        today={today}
        thisYm={today.slice(0, 7)}
        unpaid={unpaid}
      />

      <ProfileCard e={employee} />
      <SalaryCard e={employee} />
      {employee.thisMonth ? <ThisMonthCard employeeId={employee.id} m={employee.thisMonth} /> : null}
      <MonthsCard employeeId={employee.id} months={employee.months} />
    </div>
  );
}
