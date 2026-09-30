import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Card } from "@/components/Card";
import { LinkButton } from "@/components/LinkButton";
import { ChevronEndIcon, ChevronStartIcon } from "@/components/icons";
import { MonthDays, MonthTotals } from "@/features/attendance/components/MonthSheet";
import { SalaryMonthCard } from "@/features/attendance/components/SalaryMonthCard";
import { getEmployeeMonth } from "@/features/attendance/month";
import { ensureSalaryInstalments } from "@/features/payroll/generate";
import { periodLabel } from "@/features/plans/components/PlanBits";
import { t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";
import { currentMonthKey, ymString } from "@/lib/dates";
import { addMonthsYm } from "@/lib/payroll";
import { PeriodYmSchema } from "@/lib/validation";

export const metadata: Metadata = { title: t.employees.monthSheet };

/**
 * كشف الشهر (spec §3.4): one employee's attendance month, its totals and hours,
 * and that month's salary with its deductions. Months run to next month (its
 * salary already exists, D2). A malformed or later month, an unknown id and
 * another establishment's id all reach notFound() (Z6).
 */
export default async function EmployeeMonthPage({
  params,
}: {
  params: Promise<{ id: string; ym: string }>;
}) {
  const { establishmentId } = await requireOwner();
  await ensureSalaryInstalments(establishmentId);
  const { id, ym } = await params;
  const { year, month } = currentMonthKey();
  const last = addMonthsYm(ymString(year, month), 1);
  const parsed = PeriodYmSchema.safeParse(ym);
  if (!parsed.success || parsed.data > last) notFound();
  const sheet = await getEmployeeMonth(establishmentId, id, parsed.data);
  if (!sheet) notFound();

  const base = `/owner/staff/${sheet.employee.id}`;
  const prev = addMonthsYm(sheet.ym, -1);
  const next = addMonthsYm(sheet.ym, 1);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-gray-900">
          {t.employees.monthSheet} — {periodLabel(sheet.ym)}
        </h1>
        <Link href={base} className="text-sm text-accent-dark underline-offset-2 hover:underline">
          {sheet.employee.name}
        </Link>
      </div>

      <nav aria-label={t.employees.monthSheet} className="flex flex-wrap gap-2">
        <LinkButton href={`${base}/month/${prev}`} variant="secondary">
          <ChevronStartIcon size={18} />
          {periodLabel(prev)}
        </LinkButton>
        {next <= last ? (
          <LinkButton href={`${base}/month/${next}`} variant="secondary">
            {periodLabel(next)}
            <ChevronEndIcon size={18} />
          </LinkButton>
        ) : null}
      </nav>

      <MonthTotals totals={sheet.totals} minutes={sheet.minutes} />

      {sheet.salary ? (
        <SalaryMonthCard employeeId={sheet.employee.id} salary={sheet.salary} />
      ) : (
        <Card>
          <p className="text-sm text-gray-600">{t.employees.noSalary}</p>
        </Card>
      )}
      {sheet.salary ? (
        <div>
          <LinkButton href={`${base}/payslip/${sheet.ym}`} variant="secondary">
            {t.employees.payslip}
          </LinkButton>
        </div>
      ) : null}

      <MonthDays days={sheet.days} withNotes />
    </div>
  );
}
