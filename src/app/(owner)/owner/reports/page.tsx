import type { Metadata } from "next";

import { PrintButton } from "@/features/reports/components/PrintButton";
import { ReportRangePicker } from "@/features/reports/components/ReportRangePicker";
import { ReportTables } from "@/features/reports/components/ReportTables";
import { parseReportRange } from "@/features/reports/components/reportRange";
import { getReport } from "@/features/reports/queries";
import { t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";

export const metadata: Metadata = { title: t.reports.title };

const BASE = "/owner/reports";

export default async function OwnerReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user, establishmentId } = await requireOwner();
  const range = parseReportRange(await searchParams);
  const report = await getReport(establishmentId, range.from, range.to);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="no-print text-xl font-semibold text-gray-900">
        {t.reports.title}
      </h1>

      {/* Print only: the sheet has to say whose books these are and for when,
          because it leaves the screen where the nav answered both. */}
      <header className="print-only">
        <p className="text-lg font-semibold">
          {t.reports.printedFor}: {user.establishmentName}
        </p>
        <p className="text-sm">
          {t.reports.rangeLabel}: <bdi>{range.from}</bdi> — <bdi>{range.to}</bdi>
        </p>
      </header>

      <ReportRangePicker range={range} basePath={BASE} />

      <div className="no-print flex flex-wrap gap-2">
        {/* A plain link: the route streams a file, so it needs no client code. */}
        <a
          href={`/api/export?from=${range.from}&to=${range.to}`}
          className="inline-flex min-h-11 items-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-900 hover:bg-gray-50"
        >
          {t.common.exportExcel}
        </a>
        <PrintButton />
      </div>

      <ReportTables report={report} />
    </div>
  );
}
