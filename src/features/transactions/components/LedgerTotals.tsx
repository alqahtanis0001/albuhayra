import { MoneyText } from "@/components/MoneyText";
import { t } from "@/i18n/ar";

import type { LedgerPage } from "@/features/transactions/queries";

/**
 * Totals for the **whole filtered set**, not the visible page — that is what
 * `listTransactions` returns, and it is the reason this takes `filterTotals`
 * rather than summing `rows`. Summing the rows would look right on page 1 and
 * be silently wrong from page 2 onward.
 *
 * Outside the table on purpose: the table is desktop-only, and a phone needs the
 * totals just as much.
 */
export function LedgerTotals({
  totals,
  count,
}: {
  totals: LedgerPage["filterTotals"];
  /** Rows matching the filter, across every page. */
  count: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-4">
      <Cell label={t.ledger.totalIn}>
        <MoneyText halalas={totals.inHalalas} direction="IN" />
      </Cell>
      <Cell label={t.ledger.totalOut}>
        <MoneyText halalas={totals.outHalalas} direction="OUT" />
      </Cell>
      <Cell label={t.ledger.net}>
        <MoneyText halalas={totals.netHalalas} signed />
      </Cell>
      <Cell label={t.common.rowsCount}>
        <bdi className="tabular-nums font-medium text-gray-900">{count}</bdi>
      </Cell>
    </div>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="text-start">
      <p className="text-xs text-gray-600">{label}</p>
      <p className="mt-0.5">{children}</p>
    </div>
  );
}

export default LedgerTotals;
