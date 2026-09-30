import type { Metadata } from "next";

import { EmptyState } from "@/components/EmptyState";
import { LinkButton } from "@/components/LinkButton";
import { Tabs } from "@/components/Tabs";
import { PlusIcon } from "@/components/icons";
import { EmployeeList } from "@/features/employees/components/EmployeeList";
import { listEmployees } from "@/features/employees/queries";
import { ensureSalaryInstalments } from "@/features/payroll/generate";
import { t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";

export const metadata: Metadata = { title: t.employees.title };

/** الموظفون: نشطون (default) or سابقون via ?status=ENDED; anything else = نشطون. */
export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { establishmentId } = await requireOwner();
  await ensureSalaryInstalments(establishmentId);
  const status = (await searchParams).status === "ENDED" ? "ENDED" : "ACTIVE";
  const rows = await listEmployees(establishmentId, { status });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-gray-900">{t.employees.title}</h1>
        <LinkButton href="/owner/staff/new" className="no-print">
          <PlusIcon size={18} />
          {t.employees.add}
        </LinkButton>
      </div>

      <Tabs
        label={t.employees.title}
        active={status}
        tabs={[
          { key: "ACTIVE", label: t.employees.activeTab, href: "/owner/staff" },
          { key: "ENDED", label: t.employees.endedTab, href: "/owner/staff?status=ENDED" },
        ]}
      />

      <div className="rounded-xl border border-gray-200 bg-white">
        {rows.length === 0 ? (
          status === "ACTIVE" ? (
            <EmptyState title={t.employees.empty} hint={t.employees.emptyHint} />
          ) : (
            <EmptyState title={t.employees.emptyEnded} />
          )
        ) : (
          <EmployeeList rows={rows} />
        )}
      </div>
    </div>
  );
}
