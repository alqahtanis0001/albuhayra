import type { Metadata } from "next";

import { Card } from "@/components/Card";
import { BalanceByMethod } from "@/features/dashboard/components/BalanceByMethod";
import { RecentTransactions } from "@/features/dashboard/components/RecentTransactions";
import { OwnerStatCards } from "@/features/dashboard/components/OwnerStatCards";
import { SixMonthCard } from "@/features/dashboard/components/SixMonthCard";
import { TopOutCategories } from "@/features/dashboard/components/TopOutCategories";
import { ActiveProjects } from "@/features/dashboard/components/ActiveProjects";
import { FirstRunCard } from "@/features/dashboard/components/FirstRunCard";
import { PendingJoinNotice } from "@/features/dashboard/components/PendingJoinNotice";
import { OverdueStrip, WeekDues } from "@/features/dashboard/components/WeekDues";
import { QuickActions } from "@/features/dashboard/components/QuickActions";
import { getOwnerDashboard } from "@/features/dashboard/queries";
import { listPendingStaffNames } from "@/features/establishments/queries";
import { ensureSalaryInstalments } from "@/features/payroll/generate";
import { getDues } from "@/features/plans/dues";
import { topActiveProjects } from "@/features/projects/queries";
import { t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";

export const metadata: Metadata = { title: t.dashboard.ownerTitle };

/**
 * Top to bottom: the pending-join notice (v1.4 part 3 R9, when any); quick actions; the first-run card (v1.4 D25 — knowingly
 * placed above the money cards, amending docs/V12-SPEC.md §1's order, D27 S4);
 * the four money cards; this week's dues with the red متأخرات strip; الإضافات
 * الجارية; then balance by method, the chart, top expenses and the last entries.
 */
export default async function OwnerHomePage() {
  // The layout gates the segment; this call is what scopes the read.
  const { establishmentId } = await requireOwner();
  // D2: this month's salary rows exist before anything reads them (cached per request).
  await ensureSalaryInstalments(establishmentId);
  const [data, dues, projects, pendingNames] = await Promise.all([
    getOwnerDashboard(establishmentId),
    getDues(establishmentId),
    topActiveProjects(establishmentId),
    listPendingStaffNames(establishmentId), // R9: the pending-join notice, names only.
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">{t.dashboard.ownerTitle}</h1>

      {/* R9 (D32 S5): above the quick actions; nothing when no request waits. */}
      <PendingJoinNotice names={pendingNames} />

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

      <OverdueStrip dues={dues} />
      <WeekDues dues={dues} />

      <ActiveProjects rows={projects} />

      <BalanceByMethod rows={data.balanceByMethod} />

      <Card title={t.dashboard.last6Months} bodyClassName="">
        <SixMonthCard months={data.last6Months} />
      </Card>

      <TopOutCategories rows={data.topOutCategories} monthOutHalalas={data.monthOutHalalas} />

      <RecentTransactions rows={data.recent} />
    </div>
  );
}
