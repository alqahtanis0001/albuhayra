import type { Metadata } from "next";
import Link from "next/link";

import { MoneyText } from "@/components/MoneyText";
import { StatCard } from "@/components/StatCard";
import { PlusIcon } from "@/components/icons";
import { RecentTransactions } from "@/features/dashboard/components/RecentTransactions";
import { getStaffDashboard } from "@/features/dashboard/queries";
import { t } from "@/i18n/ar";
import { requireStaff } from "@/lib/auth";

export const metadata: Metadata = { title: t.dashboard.staffTitle };

export default async function StaffHomePage() {
  const { user, establishmentId } = await requireStaff();
  const data = await getStaffDashboard(establishmentId, user.id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-gray-900">
          {t.dashboard.staffTitle}
        </h1>
        <Link
          href="/staff/transactions/new"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent px-4 font-medium text-white hover:bg-accent-dark"
        >
          <PlusIcon size={18} />
          {t.transaction.addButton}
        </Link>
      </div>

      {/* `canEdit` is re-read from the database on every request, so this notice
          tracks the owner's switch immediately rather than until a re-login. */}
      {!data.canEdit ? (
        <p
          role="status"
          className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
        >
          {t.dashboard.noEditPermission}
        </p>
      ) : null}

      {/* Establishment-wide, not this employee's own: an employee needs to see
          the month they are contributing to.

          The caption below says so outright rather than leaving the reader to
          infer it from "وارد هذا الشهر" lacking a possessive while
          "حركاتي الأخيرة" has one. That inference is one people do not perform —
          they read a number under a label and believe it — and the failure is
          asymmetric: someone who mistakes these for their own figures sees a
          number far larger than their activity and has no way to discover the
          error. One caption covers both cards; putting it in the titles would
          lengthen them on a phone. */}
      <div className="flex flex-col gap-1">
        <div className="grid grid-cols-2 gap-3">
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
        <p className="text-xs text-gray-600">{t.dashboard.establishmentWideHint}</p>
      </div>

      <RecentTransactions rows={data.myRecent} title={t.dashboard.myRecent} />
    </div>
  );
}
