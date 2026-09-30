import type { Metadata } from "next";

import { listPartyOptions } from "@/features/parties/queries";
import { PrintButton } from "@/features/reports/components/PrintButton";
import { PrintFooter } from "@/features/reports/components/PrintFooter";
import { PrintHeader } from "@/features/reports/components/PrintHeader";
import { ReportPartyFilter } from "@/features/reports/components/ReportPartyFilter";
import { ReportRangePicker } from "@/features/reports/components/ReportRangePicker";
import { ReportTables } from "@/features/reports/components/ReportTables";
import { ReportTabs } from "@/features/reports/components/ReportTabs";
import { parseReportRange } from "@/features/reports/components/reportRange";
import { getReport } from "@/features/reports/queries";
import { t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { ReportPartyFilterSchema } from "@/lib/validation";

export const metadata: Metadata = { title: t.reports.title };

const BASE = "/owner/reports";

/**
 * The report by category, optionally for one party (C16). A party id that is
 * malformed, unknown or another establishment's shows `invalidParty` and no
 * report at all — never the unfiltered one in its place.
 */
export default async function OwnerReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user, establishmentId } = await requireOwner();
  const raw = await searchParams;
  const range = parseReportRange(raw);
  const rawParty = typeof raw.partyId === "string" ? raw.partyId : "";
  const filter = ReportPartyFilterSchema.safeParse({ partyId: rawParty });
  const partyId = filter.success ? filter.data.partyId : undefined;

  const [parties, report] = await Promise.all([
    listPartyOptions(establishmentId),
    filter.success ? getReport(establishmentId, range.from, range.to, partyId) : null,
  ]);

  const exportHref = `/api/export?from=${range.from}&to=${range.to}${
    partyId ? `&partyId=${encodeURIComponent(partyId)}` : ""
  }`;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="no-print text-xl font-semibold text-gray-900">
        {t.reports.title}
      </h1>
      <ReportTabs active="category" />

      <PrintHeader
        establishmentName={user.establishmentName}
        from={range.from}
        to={range.to}
        subject={report?.party?.name}
        printedAt={todayISO()}
      />

      <ReportRangePicker range={range} basePath={BASE} partyId={partyId} />
      <ReportPartyFilter range={range} basePath={BASE} parties={parties} partyId={rawParty} />

      {report ? (
        <>
          <div className="no-print flex flex-wrap gap-2">
            {/* A plain link: the route streams a file, so it needs no client code. */}
            <a
              href={exportHref}
              className="inline-flex min-h-11 items-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-900 hover:bg-gray-50"
            >
              {t.common.exportExcel}
            </a>
            <PrintButton />
          </div>

          <ReportTables report={report} />
        </>
      ) : (
        <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {t.reportFilter.invalidParty}
        </p>
      )}

      <PrintFooter />
    </div>
  );
}
