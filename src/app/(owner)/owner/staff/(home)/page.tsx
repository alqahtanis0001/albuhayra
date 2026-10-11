import type { Metadata } from "next";

import { EmptyState } from "@/components/EmptyState";
import { LinkButton } from "@/components/LinkButton";
import { Tabs } from "@/components/Tabs";
import { PlusIcon } from "@/components/icons";
import { EmployeeList } from "@/features/employees/components/EmployeeList";
import { SalaryPickBanner, SalaryPickList } from "@/features/employees/components/SalaryPickList";
import { listEmployees } from "@/features/employees/queries";
import { listSalaryPick } from "@/features/employees/salaryPick";
import { isSalaryPick } from "@/features/employees/salaryPickRules";
import { ensureSalaryInstalments } from "@/features/payroll/generate";
import { t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";

export const metadata: Metadata = { title: t.employees.title };

/**
 * الموظفون: نشطون (default) or سابقون via ?status=ENDED; anything else = نشطون.
 * v1.5 (B3, D21): `?pick=salary` is the «صرف راتب» pick list — ACTIVE only, no
 * tabs and no «موظف جديد»; without it the page is unchanged.
 */
export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { establishmentId } = await requireOwner();
  await ensureSalaryInstalments(establishmentId);
  const raw = await searchParams;

  if (isSalaryPick(raw.pick)) {
    const picks = await listSalaryPick(establishmentId);
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold text-gray-900">{t.employees.title}</h1>
        <SalaryPickBanner />
        <div className="rounded-xl border border-gray-200 bg-white">
          <SalaryPickList rows={picks} />
        </div>
      </div>
    );
  }

  const status = raw.status === "ENDED" ? "ENDED" : "ACTIVE";
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
            <EmptyState kind="employees" title={t.employees.empty} hint={t.employees.emptyHint} />
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
