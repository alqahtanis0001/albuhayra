import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { MoneyText } from "@/components/MoneyText";
import { TBody, Table, Td, Th, Tr } from "@/components/Table";
import { t } from "@/i18n/ar";

import type { CategoryTotal } from "./data";
import { formatPercent, percentOfTotal } from "./percent";

export function TopOutCategories({
  rows,
  monthOutHalalas,
}: {
  rows: CategoryTotal[];
  /** The denominator. Zero in a month with no OUT entries at all. */
  monthOutHalalas: number;
}) {
  return (
    <Card title={t.dashboard.topOutCategories} bodyClassName="">
      {rows.length === 0 ? (
        <EmptyState title={t.ledger.emptyFiltered} />
      ) : (
        <Table caption={t.dashboard.topOutCategories}>
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
          </TBody>
        </Table>
      )}
    </Card>
  );
}

export default TopOutCategories;
