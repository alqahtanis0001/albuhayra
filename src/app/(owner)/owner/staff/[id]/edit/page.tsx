import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { updateEmployee } from "@/features/employees/actions";
import { EmployeeForm } from "@/features/employees/components/EmployeeForm";
import { employeeValues } from "@/features/employees/components/formValues";
import { getEmployee, listLinkableStaff } from "@/features/employees/queries";
import { ensureSalaryInstalments } from "@/features/payroll/generate";
import { t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";

export const metadata: Metadata = { title: t.employees.editTitle };

export default async function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { establishmentId } = await requireOwner();
  await ensureSalaryInstalments(establishmentId);
  // The id comes from the route only; another establishment's reads as missing.
  const { id } = await params;
  const employee = await getEmployee(establishmentId, id);
  if (!employee) notFound();
  const staff = await listLinkableStaff(establishmentId, employee.userId);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">{t.employees.editTitle}</h1>
      <EmployeeForm
        action={updateEmployee.bind(null, employee.id)}
        employeeId={employee.id}
        initial={employeeValues(employee)}
        staff={staff}
      />
    </div>
  );
}
