/**
 * Owner home, above the stat cards (docs/FRONTEND.md, CP2 Home): a red
 * متأخرات strip whenever anything is overdue — how many (plural) and the لنا /
 * علينا totals — linking to المستحقات; then «مستحقات هذا الأسبوع» with its range
 * «من اليوم حتى …», the two totals and up to five rows. Everything is computed
 * from the server's today (W8).
 */
import Link from "next/link";

import { Card } from "@/components/Card";
import { DateText } from "@/components/DateText";
import { EmptyState } from "@/components/EmptyState";
import { MoneyText } from "@/components/MoneyText";
import { fillTemplate } from "@/components/fillTemplate";
import { AlertIcon, ChevronEndIcon } from "@/components/icons";
import { DueRows } from "@/features/dues/components/DueList";
import type { Dues } from "@/features/plans/dues";
import { t } from "@/i18n/ar";
import { plural } from "@/lib/plural";

function Totals({
  inHalalas,
  outHalalas,
  onColour = false,
}: {
  inHalalas: number;
  outHalalas: number;
  onColour?: boolean;
}) {
  return (
    <span className="flex flex-wrap gap-x-4 gap-y-1">
      <span>
        {t.dues.toUs}: <MoneyText halalas={inHalalas} inheritColor={onColour} />
      </span>
      <span>
        {t.dues.fromUs}: <MoneyText halalas={outHalalas} inheritColor={onColour} />
      </span>
    </span>
  );
}

export function OverdueStrip({ dues }: { dues: Dues }) {
  if (dues.overdue.length === 0) return null;
  return (
    <Link
      href="/owner/dues"
      className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-money-out p-4 text-sm text-white transition-[scale] duration-[80ms] ease-out hover:bg-red-800 active:scale-[0.99]"
    >
      <span className="flex items-center gap-2 font-semibold">
        <AlertIcon size={18} />
        {t.dues.overdue}: {plural(t.dues.overdueStrip, dues.overdue.length)}
      </span>
      <span className="flex items-center gap-2">
        <Totals inHalalas={dues.totals.overdueInHalalas} outHalalas={dues.totals.overdueOutHalalas} onColour />
        <ChevronEndIcon size={18} />
      </span>
    </Link>
  );
}

export function WeekDues({ dues }: { dues: Dues }) {
  return (
    <Card
      title={t.dues.thisWeek}
      action={
        <Link href="/owner/dues" className="text-sm text-accent-dark underline-offset-2 hover:underline">
          {t.dues.viewAll}
        </Link>
      }
      bodyClassName=""
    >
      <div className="flex flex-col gap-1 border-b border-gray-200 px-4 py-3 text-sm text-gray-700">
        <span className="flex items-center gap-1 text-xs text-gray-600">
          {fillTemplate(t.dues.weekRange, { date: <DateText date={dues.weekEnd} compact /> })}
        </span>
        <Totals inHalalas={dues.totals.weekInHalalas} outHalalas={dues.totals.weekOutHalalas} />
      </div>
      {dues.thisWeek.length === 0 ? (
        <EmptyState kind="dues" title={t.dues.empty} />
      ) : (
        <DueRows rows={dues.thisWeek} limit={5} />
      )}
    </Card>
  );
}
