import type { Metadata } from "next";

import { createEmployee } from "@/features/employees/actions";
import { EmployeeForm } from "@/features/employees/components/EmployeeForm";
import { emptyEmployeeValues } from "@/features/employees/components/formValues";
import { listAdoptableParties, listLinkableStaff } from "@/features/employees/queries";
import { t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";
import { todayISO } from "@/lib/dates";

export const metadata: Metadata = { title: t.employees.newTitle };

export default async function NewEmployeePage() {
  const { establishmentId } = await requireOwner();
  const [staff, adoptable] = await Promise.all([
    listLinkableStaff(establishmentId),
    listAdoptableParties(establishmentId),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">{t.employees.newTitle}</h1>
      <EmployeeForm
        action={createEmployee}
        initial={emptyEmployeeValues(todayISO())}
        staff={staff}
        adoptable={adoptable}
      />
    </div>
  );
}
