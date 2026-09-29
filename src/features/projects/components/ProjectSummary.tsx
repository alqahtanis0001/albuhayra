/**
 * An إضافة's numbers: totals with the budget meter, then حسب التصنيف. Both are
 * `report-card`s, so the existing print sheet styles them (green header row,
 * zebra, break-inside) with nothing new in globals.css. Amounts by category
 * carry their direction's sign — colour is never the only signal.
 *
 * `ProjectPrintEntries` is the printed list of the current page's entries: the
 * screen's LedgerList is two layouts switched at md, which a printed page
 * cannot choose between, so the sheet gets one plain table instead, labelled
 * «صفحة X من N» because it holds one page of the entries only.
 */
import { Card } from "@/components/Card";
import { DateText } from "@/components/DateText";
import { DirectionBadge } from "@/components/DirectionBadge";
import { MoneyText } from "@/components/MoneyText";
import { TBody, Table, Td, Th, Tr } from "@/components/Table";
import type { ProjectDetail } from "@/features/projects/queries";
import type { LedgerRow } from "@/features/transactions/queries";
import { t } from "@/i18n/ar";

import { BudgetMeter } from "./ProjectBits";

export function ProjectTotals({ project }: { project: ProjectDetail }) {
  return (
    <Card className="report-card" bodyClassName="flex flex-col gap-3 p-4">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-gray-600">{t.projects.spent}</dt>
        <dd>
          <MoneyText halalas={project.spentHalalas} direction="OUT" />
        </dd>
        {project.incomeHalalas !== 0 ? (
          <>
            <dt className="text-gray-600">{t.projects.income}</dt>
            <dd>
              <MoneyText halalas={project.incomeHalalas} direction="IN" />
            </dd>
          </>
        ) : null}
      </dl>
      <BudgetMeter
        budgetHalalas={project.budgetHalalas}
        spentHalalas={project.spentHalalas}
        remainingHalalas={project.remainingHalalas}
      />
    </Card>
  );
}

export function ProjectByCategory({ project }: { project: ProjectDetail }) {
  if (project.byCategory.length === 0) return null;
  return (
    <Card title={t.projects.byCategory} className="report-card" bodyClassName="">
      <Table
        caption={t.projects.byCategory}
        head={
          <Tr>
            <Th>{t.transaction.category}</Th>
            <Th>{t.direction.label}</Th>
            <Th className="text-end">{t.transaction.amount}</Th>
          </Tr>
        }
      >
        <TBody>
          {project.byCategory.map((row) => (
            <Tr key={`${row.categoryId}-${row.direction}`}>
              <Td>{row.nameAr}</Td>
              <Td>
                <DirectionBadge direction={row.direction} />
              </Td>
              <Td className="text-end">
                <MoneyText halalas={row.totalHalalas} direction={row.direction} />
              </Td>
            </Tr>
          ))}
        </TBody>
      </Table>
    </Card>
  );
}

export function ProjectPrintEntries({
  rows,
  page,
  pageCount,
}: {
  rows: LedgerRow[];
  page: number;
  pageCount: number;
}) {
  if (rows.length === 0) return null;
  return (
    <section className="print-only">
      <div className="report-card rounded-xl border border-gray-200">
        <h2 className="px-3 py-2 text-base font-semibold">
          {t.projects.transactions} — {t.common.page} <bdi>{page}</bdi> {t.common.of}{" "}
          <bdi>{pageCount}</bdi>
        </h2>
        <Table
          head={
            <Tr>
              <Th>{t.transaction.date}</Th>
              <Th>{t.transaction.category}</Th>
              <Th>{t.transaction.party}</Th>
              <Th className="text-end">{t.transaction.amount}</Th>
            </Tr>
          }
        >
          <TBody>
            {rows.map((row) => (
              <Tr key={row.id}>
                <Td>
                  <DateText date={row.date} compact />
                </Td>
                <Td>{row.categoryNameAr}</Td>
                <Td>{row.partyName ?? row.counterparty ?? ""}</Td>
                <Td className="text-end">
                  <MoneyText halalas={row.amountHalalas} direction={row.direction} />
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </div>
    </section>
  );
}
