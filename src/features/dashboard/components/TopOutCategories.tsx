import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { MoneyText } from "@/components/MoneyText";
import { TBody, Table, Td, Th, Tr } from "@/components/Table";
import { t } from "@/i18n/ar";
import { currentMonthKey, dateToISO, monthEnd, monthStart } from "@/lib/dates";

import { categoryLedgerHref, donutSlices } from "../visuals";
import type { CategoryTotal } from "./data";
import { ExpenseDonut } from "./ExpenseDonut";
import { formatPercent, percentOfTotal } from "./percent";

/**
 * v1.3 (docs/V13-SPEC.md item 4): the donut is the screen view; the table it
 * replaced stays as the text equivalent — sr-only on screen, visible in print
 * (`.sr-only-screen`), where the donut is not drawn.
 */
export function TopOutCategories({
  rows,
  monthOutHalalas,
}: {
  rows: CategoryTotal[];
  /** The denominator. Zero in a month with no OUT entries at all. */
  monthOutHalalas: number;
}) {
  const { year, month } = currentMonthKey();
  const from = dateToISO(monthStart(year, month));
  const to = dateToISO(monthEnd(year, month));
  const slices = donutSlices(rows, monthOutHalalas, t.dashVisual.donutOther).map((s) => ({
    ...s,
    href: s.key === "other" ? null : categoryLedgerHref(s.key, from, to),
  }));
  const other = slices.find((s) => s.key === "other");

  return (
    <Card title={t.dashVisual.donutTitle} bodyClassName="">
      {rows.length === 0 || slices.length === 0 ? (
        <EmptyState title={t.ledger.emptyFiltered} />
      ) : (
        <>
          <ExpenseDonut slices={slices} totalHalalas={monthOutHalalas} />
          <div className="sr-only-screen">
            <Table caption={t.dashVisual.donutTable}>
              <thead className="bg-gray-50">
                <Tr>
                  <Th>{t.transaction.category}</Th>
                  <Th className="text-end">{t.transaction.amount}</Th>
                  <Th className="text-end">{t.dashboard.percentOfMonthOut}</Th>
                </Tr>
              </thead>
              <TBody>
                {rows.map((row) => {
                  const share = percentOfTotal(row.totalHalalas, monthOutHalalas);
                  return (
                    <Tr key={row.categoryId}>
                      <Td>{row.nameAr}</Td>
                      <Td className="text-end">
                        <MoneyText halalas={row.totalHalalas} direction="OUT" />
                      </Td>
                      <Td className="text-end tabular-nums text-gray-700">
                        {share === null ? "—" : formatPercent(share)}
                      </Td>
                    </Tr>
                  );
                })}
                {other ? (
                  <Tr>
                    <Td>{other.name}</Td>
                    <Td className="text-end">
                      <MoneyText halalas={other.totalHalalas} direction="OUT" />
                    </Td>
                    <Td className="text-end tabular-nums text-gray-700">{formatPercent(other.share)}</Td>
                  </Tr>
                ) : null}
              </TBody>
            </Table>
          </div>
        </>
      )}
    </Card>
  );
}

export default TopOutCategories;
