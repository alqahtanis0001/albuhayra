import type { Metadata } from "next";

import { Card } from "@/components/Card";
import { WheelCard } from "@/components/WheelCard";
import { attentionRows } from "@/features/dashboard/attention";
import { ActiveProjects } from "@/features/dashboard/components/ActiveProjects";
import { AttentionCard } from "@/features/dashboard/components/AttentionCard";
import { BalanceByMethod } from "@/features/dashboard/components/BalanceByMethod";
import { FirstRunCard } from "@/features/dashboard/components/FirstRunCard";
import { HomeDetails } from "@/features/dashboard/components/HomeDetails";
import { OwnerStatCards } from "@/features/dashboard/components/OwnerStatCards";
import { QuickActions } from "@/features/dashboard/components/QuickActions";
import { RecentTransactions } from "@/features/dashboard/components/RecentTransactions";
import { SixMonthCard } from "@/features/dashboard/components/SixMonthCard";
import { TopOutCategories } from "@/features/dashboard/components/TopOutCategories";
import { getOwnerOverview } from "@/features/dashboard/overviewReads";
import { getOwnerDashboard } from "@/features/dashboard/queries";
import { buildWheelModel } from "@/features/dashboard/wheelModel";
import { listPendingStaffNames } from "@/features/establishments/queries";
import { ensureSalaryInstalments } from "@/features/payroll/generate";
import { getDues } from "@/features/plans/dues";
import { topActiveProjects } from "@/features/projects/queries";
import { t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";
import { todayISO } from "@/lib/dates";

export const metadata: Metadata = { title: t.dashboard.ownerTitle };

/**
 * v1.5 (docs/V15-SPEC.md A, home order): quick actions → the first-run card
 * (when any) → the four money cards → the overview wheel → «يحتاج انتباهك»
 * (overdue, this week, join requests, salaries — replaces the متأخرات strip,
 * WeekDues and the join notice) → the last five entries → «التفاصيل والرسوم»
 * (six-month card, expense donut, balance by method, الأنشطة الجارية).
 */
export default async function OwnerHomePage() {
  // The layout gates the segment; this call is what scopes the read.
  const { establishmentId } = await requireOwner();
  // D2: this month's salary rows exist before anything reads them (cached per request).
  await ensureSalaryInstalments(establishmentId);
  const today = todayISO();
  const [data, overview, dues, projects, pendingNames] = await Promise.all([
    getOwnerDashboard(establishmentId),
    getOwnerOverview(establishmentId, today),
    getDues(establishmentId, today),
    topActiveProjects(establishmentId),
    listPendingStaffNames(establishmentId), // R9: names only.
  ]);
  const wheel = buildWheelModel(
    {
      today,
      hasEntry: data.firstRun.hasEntry,
      balanceTotalHalalas: data.balanceTotalHalalas,
      monthNetHalalas: data.monthNetHalalas,
      prevMonthToDateNetHalalas: data.prevMonthToDateNetHalalas,
      monthInHalalas: data.monthInHalalas,
      monthOutHalalas: data.monthOutHalalas,
      topOutCategories: data.topOutCategories,
      overview,
    },
    t.wheel,
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">{t.dashboard.ownerTitle}</h1>

      <QuickActions />

      <FirstRunCard firstRun={data.firstRun} />

      <OwnerStatCards
        balanceTotalHalalas={data.balanceTotalHalalas}
        monthNetHalalas={data.monthNetHalalas}
        monthInHalalas={data.monthInHalalas}
        monthOutHalalas={data.monthOutHalalas}
        daily30={data.daily30}
        prevMonthToDateNetHalalas={data.prevMonthToDateNetHalalas}
      />

      <WheelCard model={wheel} />

      <AttentionCard rows={attentionRows({ dues, pendingNames, dial: overview.dial })} />

      <RecentTransactions rows={data.recent} viewAllHref="/owner/transactions" />

      <HomeDetails>
        <Card title={t.dashboard.last6Months} bodyClassName="">
          <SixMonthCard months={data.last6Months} />
        </Card>
        <TopOutCategories rows={data.topOutCategories} monthOutHalalas={data.monthOutHalalas} />
        <BalanceByMethod rows={data.balanceByMethod} />
        <ActiveProjects rows={projects} />
      </HomeDetails>
    </div>
  );
}
