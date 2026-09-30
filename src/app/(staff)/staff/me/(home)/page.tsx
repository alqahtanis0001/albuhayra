import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LinkButton } from "@/components/LinkButton";
import { ClockCard } from "@/features/attendance/components/ClockCard";
import { MonthTotals } from "@/features/attendance/components/MonthSheet";
import { getMyMonth, getMySelf } from "@/features/attendance/mine";
import { t } from "@/i18n/ar";
import { requireStaff } from "@/lib/auth";

export const metadata: Metadata = { title: t.myAttendance.title };

/**
 * «حضوري» (spec §1, §3.1, §3.3): today's check-in/out on the server clock,
 * this month's totals, and the way to own month, payslips and salary months.
 * Only for a login linked to an employee — an unlinked one gets notFound(),
 * whatever the nav showed. Everything is read by the session, never an id.
 */
export default async function MyAttendancePage() {
  await requireStaff();
  const self = await getMySelf();
  if (!self) notFound();
  const ym = self.today.slice(0, 7);
  const month = await getMyMonth(ym);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">{t.myAttendance.title}</h1>
      <ClockCard self={self} />
      {month ? (
        <MonthTotals totals={month.totals} minutes={month.minutes} title={t.myAttendance.myMonth} />
      ) : null}
      <div className="flex flex-wrap gap-2">
        <LinkButton href={`/staff/me/month/${ym}`} variant="secondary">
          {t.myAttendance.myMonth}
        </LinkButton>
        <LinkButton href="/staff/me/payslips" variant="secondary">
          {t.myAttendance.myPayslips}
        </LinkButton>
        <LinkButton href="/staff/me/salary" variant="secondary">
          {t.myAttendance.mySalary}
        </LinkButton>
      </div>
    </div>
  );
}
