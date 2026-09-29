import type { Metadata } from "next";
import Link from "next/link";

import { Card } from "@/components/Card";
import { MoneyText } from "@/components/MoneyText";
import { StatCard } from "@/components/StatCard";
import { PlusIcon } from "@/components/icons";
import { BalanceByMethod } from "@/features/dashboard/components/BalanceByMethod";
import { RecentTransactions } from "@/features/dashboard/components/RecentTransactions";
import { SixMonthChart } from "@/features/dashboard/components/SixMonthChart";
import { TopOutCategories } from "@/features/dashboard/components/TopOutCategories";
import { getOwnerDashboard } from "@/features/dashboard/components/data";
import { t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";

export const metadata: Metadata = { title: t.dashboard.ownerTitle };

export default async function OwnerHomePage() {
  // The layout gates the segment; this call is what scopes the read.
  const { establishmentId } = await requireOwner();
  const data = await getOwnerDashboard(establishmentId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-gray-900">
          {t.dashboard.ownerTitle}
        </h1>
        <Link
          href="/owner/transactions/new"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent px-4 font-medium text-white hover:bg-accent-dark"
        >
          <PlusIcon size={18} />
          {t.transaction.addButton}
        </Link>
      </div>

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

      <BalanceByMethod rows={data.balanceByMethod} />

      <Card title={t.dashboard.last6Months} bodyClassName="">
        <SixMonthChart months={data.last6Months} />
      </Card>

      <TopOutCategories rows={data.topOutCategories} monthOutHalalas={data.monthOutHalalas} />

      <RecentTransactions rows={data.recent} />
    </div>
  );
}
