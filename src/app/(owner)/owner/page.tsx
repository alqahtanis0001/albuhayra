import type { Metadata } from "next";

import { Card } from "@/components/Card";
import { MoneyText } from "@/components/MoneyText";
import { StatCard } from "@/components/StatCard";
import { BalanceByMethod } from "@/features/dashboard/components/BalanceByMethod";
import { RecentTransactions } from "@/features/dashboard/components/RecentTransactions";
import { SixMonthChart } from "@/features/dashboard/components/SixMonthChart";
import { TopOutCategories } from "@/features/dashboard/components/TopOutCategories";
import { ActiveProjects } from "@/features/dashboard/components/ActiveProjects";
import { OverdueStrip, WeekDues } from "@/features/dashboard/components/WeekDues";
import { QuickActions } from "@/features/dashboard/components/QuickActions";
import { getOwnerDashboard } from "@/features/dashboard/queries";
import { ensureSalaryInstalments } from "@/features/payroll/generate";
import { getDues } from "@/features/plans/dues";
import { topActiveProjects } from "@/features/projects/queries";
import { t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";

export const metadata: Metadata = { title: t.dashboard.ownerTitle };

/**
 * Top to bottom as docs/V12-SPEC.md §1 orders it: quick actions; the four money
 * cards; this week's dues with the red متأخرات strip; الإضافات الجارية; then
 * balance by method, the chart, top expenses and the last entries.
 */
export default async function OwnerHomePage() {
  // The layout gates the segment; this call is what scopes the read.
  const { establishmentId } = await requireOwner();
  // D2: this month's salary rows exist before anything reads them (cached per request).
  await ensureSalaryInstalments(establishmentId);
  const [data, dues, projects] = await Promise.all([
    getOwnerDashboard(establishmentId),
    getDues(establishmentId),
    topActiveProjects(establishmentId),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">{t.dashboard.ownerTitle}</h1>

      <QuickActions />

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label={t.dashboard.balanceTotal}
          value={<MoneyText halalas={data.balanceTotalHalalas} signed />}
        />
        <StatCard
          label={t.dashboard.monthNet}
          value={<MoneyText halalas={data.monthNetHalalas} signed />}
        />
        <StatCard
          label={t.dashboard.monthIn}
          tone="in"
          value={<MoneyText halalas={data.monthInHalalas} direction="IN" />}
        />
        <StatCard
          label={t.dashboard.monthOut}
          tone="out"
          value={<MoneyText halalas={data.monthOutHalalas} direction="OUT" />}
        />
      </div>

      <OverdueStrip dues={dues} />
      <WeekDues dues={dues} />

      <ActiveProjects rows={projects} />

      <BalanceByMethod rows={data.balanceByMethod} />

      <Card title={t.dashboard.last6Months} bodyClassName="">
        <SixMonthChart months={data.last6Months} />
      </Card>

      <TopOutCategories rows={data.topOutCategories} monthOutHalalas={data.monthOutHalalas} />

      <RecentTransactions rows={data.recent} />
    </div>
  );
}
