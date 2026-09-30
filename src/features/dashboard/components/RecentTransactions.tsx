import { Card } from "@/components/Card";
import { DateText } from "@/components/DateText";
import { DirectionBadge } from "@/components/DirectionBadge";
import { EmptyState } from "@/components/EmptyState";
import { MoneyText } from "@/components/MoneyText";
import { t } from "@/i18n/ar";

import type { LedgerRow } from "./data";

/**
 * Stacked rows rather than a table: this list is read on a phone.
 *
 * The owner dashboard shows the establishment's last ten ("آخر الحركات") and the
 * staff dashboard shows the employee's own ("حركاتي الأخيرة"), so the title is a
 * prop — the rows render identically and only the heading differs.
 */
export function RecentTransactions({
  rows,
  title = t.dashboard.recent,
}: {
  rows: LedgerRow[];
  title?: string;
}) {
  return (
    <Card title={title} bodyClassName="">
      {rows.length === 0 ? (
        <EmptyState kind="ledger" title={t.ledger.emptyTitle} hint={t.ledger.emptyHint} />
      ) : (
        <ul>
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-start gap-3 border-b border-gray-200 p-3 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <DirectionBadge direction={row.direction} />
                  <span className="truncate text-sm font-medium text-gray-900">
                    {row.categoryNameAr}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-gray-600">
                  {t.paymentMethod[row.paymentMethod]}
                  {(row.partyName ?? row.counterparty) ? ` · ${row.partyName ?? row.counterparty}` : ""}
                </p>
                <p className="text-xs text-gray-500">
                  {t.transaction.addedBy}: {row.createdByName}
                </p>
              </div>

              <div className="flex flex-col items-end gap-1">
                <MoneyText halalas={row.amountHalalas} direction={row.direction} />
                <DateText date={row.date} className="text-xs" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default RecentTransactions;
