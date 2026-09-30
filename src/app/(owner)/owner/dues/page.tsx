import type { Metadata } from "next";

import { Card } from "@/components/Card";
import { DateText } from "@/components/DateText";
import { EmptyState } from "@/components/EmptyState";
import { fillTemplate } from "@/components/fillTemplate";
import { AlertIcon } from "@/components/icons";
import { DueSplit } from "@/features/dues/components/DueList";
import { ensureSalaryInstalments } from "@/features/payroll/generate";
import { getDues } from "@/features/plans/dues";
import { t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";
import { plural } from "@/lib/plural";

export const metadata: Metadata = { title: t.dues.title };

/**
 * المستحقات: what is late first (a red strip that says how many), then what
 * falls due in the next 7 days including today — the range stated on screen
 * (Decision 8). Both come from the server's today (W8).
 */
export default async function DuesPage() {
  const { establishmentId } = await requireOwner();
  // D2: this month's salary rows exist before anything reads them (cached per request).
  await ensureSalaryInstalments(establishmentId);
  const dues = await getDues(establishmentId);
  const { totals } = dues;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">{t.dues.title}</h1>

      <section className="overflow-hidden rounded-xl border border-money-out bg-white">
        <h2 className="flex items-center gap-2 bg-money-out px-4 py-3 text-base font-semibold text-white">
          <AlertIcon size={18} />
          {t.dues.overdue}
          {dues.overdue.length > 0 ? (
            <span className="text-sm font-normal">— {plural(t.dues.overdueStrip, dues.overdue.length)}</span>
          ) : null}
        </h2>
        {dues.overdue.length === 0 ? (
          <EmptyState title={t.dues.noOverdue} />
        ) : (
          <DueSplit
            rows={dues.overdue}
            inHalalas={totals.overdueInHalalas}
            outHalalas={totals.overdueOutHalalas}
          />
        )}
      </section>

      <Card
        title={t.dues.thisWeek}
        action={
          <span className="flex items-center gap-1 text-xs text-gray-600">
            {fillTemplate(t.dues.weekRange, { date: <DateText date={dues.weekEnd} compact /> })}
          </span>
        }
        bodyClassName=""
      >
        {dues.thisWeek.length === 0 ? (
          <EmptyState title={t.dues.empty} />
        ) : (
          <DueSplit
            rows={dues.thisWeek}
            inHalalas={totals.weekInHalalas}
            outHalalas={totals.weekOutHalalas}
          />
        )}
      </Card>
    </div>
  );
}
