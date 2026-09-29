import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { MoneyText } from "@/components/MoneyText";
import { TBody, TFoot, Table, Td, Th, Tr } from "@/components/Table";
import { t } from "@/i18n/ar";
import type { Report, ReportCategoryRow } from "@/features/reports/queries";

export function ReportTables({ report }: { report: Report }) {
  const empty =
    report.byCategoryIn.length === 0 && report.byCategoryOut.length === 0;

  if (empty) {
    return (
      <Card>
        <EmptyState title={t.reports.empty} />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <CategoryTable
        title={t.reports.inByCategory}
        rows={report.byCategoryIn}
        totalHalalas={report.totalInHalalas}
        totalLabel={t.reports.totalIn}
        direction="IN"
      />
      <CategoryTable
        title={t.reports.outByCategory}
        rows={report.byCategoryOut}
        totalHalalas={report.totalOutHalalas}
        totalLabel={t.reports.totalOut}
        direction="OUT"
      />

      {/* report-net / report-card are hooks for the print sheet in globals.css;
          on screen they change nothing. */}
      <Card className="report-net">
        <div className="flex items-center justify-between gap-2">
          <span className="text-base font-semibold text-gray-900">
            {t.reports.net}
          </span>
          <MoneyText halalas={report.netHalalas} signed className="text-lg" />
        </div>
      </Card>
    </div>
  );
}

function CategoryTable({
  title,
  rows,
  totalHalalas,
  totalLabel,
  direction,
}: {
  title: string;
  rows: ReportCategoryRow[];
  totalHalalas: number;
  totalLabel: string;
  direction: "IN" | "OUT";
}) {
  return (
    <Card title={title} bodyClassName="" className="report-card">
      {rows.length === 0 ? (
        <EmptyState title={t.reports.empty} />
      ) : (
        <Table
          caption={title}
          head={
            <Tr>
              <Th>{t.transaction.category}</Th>
              <Th className="text-end">{t.transaction.amount}</Th>
            </Tr>
          }
        >
          <TBody>
            {rows.map((row) => (
              <Tr key={row.categoryId}>
                <Td>{row.nameAr}</Td>
                <Td className="text-end">
                  <MoneyText halalas={row.totalHalalas} direction={direction} />
                </Td>
              </Tr>
            ))}
          </TBody>
          {/* Must stay after TBody: print sets tfoot to a plain row group
              (globals.css) so the total prints once, last — in DOM order. */}
          <TFoot>
            <Tr>
              <Td>{totalLabel}</Td>
              <Td className="text-end">
                <MoneyText halalas={totalHalalas} direction={direction} />
              </Td>
            </Tr>
          </TFoot>
        </Table>
      )}
    </Card>
  );
}

export default ReportTables;
