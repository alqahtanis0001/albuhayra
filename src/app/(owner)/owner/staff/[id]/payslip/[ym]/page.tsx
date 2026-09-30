import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LinkButton } from "@/components/LinkButton";
import { PayslipView } from "@/features/employees/components/PayslipView";
import { getPayslip } from "@/features/employees/payslip";
import { ensureSalaryInstalments } from "@/features/payroll/generate";
import { periodLabel } from "@/features/plans/components/PlanBits";
import { PrintButton } from "@/features/reports/components/PrintButton";
import { PrintFooter } from "@/features/reports/components/PrintFooter";
import { PrintHeader } from "@/features/reports/components/PrintHeader";
import { t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { PeriodYmSchema } from "@/lib/validation";

export const metadata: Metadata = { title: t.employees.payslip };

/**
 * One employee's payslip for one month, printable (spec §3.4). A malformed
 * month, an unknown id, another establishment's id and a month with no salary
 * all reach notFound().
 */
export default async function PayslipPage({
  params,
}: {
  params: Promise<{ id: string; ym: string }>;
}) {
  const { user, establishmentId } = await requireOwner();
  await ensureSalaryInstalments(establishmentId);
  const { id, ym } = await params;
  const month = PeriodYmSchema.safeParse(ym);
  if (!month.success) notFound();
  const slip = await getPayslip(establishmentId, id, month.data);
  if (!slip) notFound();

  return (
    <div className="flex flex-col gap-4">
      <PrintHeader
        establishmentName={user.establishmentName}
        title={`${t.payslip.title} — ${periodLabel(slip.periodYm)}`}
        subject={slip.employee.name}
        printedAt={todayISO()}
      />

      <h1 className="no-print text-xl font-semibold text-gray-900">
        {t.payslip.title} — {periodLabel(slip.periodYm)}
      </h1>

      <PayslipView slip={slip} />

      <div className="no-print flex flex-wrap gap-2">
        <PrintButton />
        <LinkButton href={`/owner/staff/${slip.employee.id}`} variant="secondary">
          {t.common.back}
        </LinkButton>
      </div>
      <PrintFooter />
    </div>
  );
}
