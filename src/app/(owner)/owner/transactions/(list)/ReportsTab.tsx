/**
 * The «التقارير» tab of /owner/transactions (docs/V15-SPEC.md B2, D14, D24):
 * the former /owner/reports and /owner/reports/aging page bodies, unchanged in
 * content, filters, print header/footer, «طباعة» and «تصدير Excel» (the export
 * route and its query are untouched). The reads run in `loadReportsTab`, so the
 * view is a plain component and the page stays one server render.
 *
 * Print: only the report's own PrintHeader prints — the ledger h1 above it is
 * `no-print` on this tab, and the tab strips are `no-print` (Tabs).
 */
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { listPartyOptions } from "@/features/parties/queries";
import { ensureSalaryInstalments } from "@/features/payroll/generate";
import { getAgingReport } from "@/features/reports/aging";
import { AgingTable } from "@/features/reports/components/AgingTable";
import { PrintButton } from "@/features/reports/components/PrintButton";
import { PrintFooter } from "@/features/reports/components/PrintFooter";
import { PrintHeader } from "@/features/reports/components/PrintHeader";
import { ReportFilters } from "@/features/reports/components/ReportFilters";
import { ReportTables } from "@/features/reports/components/ReportTables";
import { ReportTabs } from "@/features/reports/components/ReportTabs";
import { parseReportRange, type ResolvedRange } from "@/features/reports/components/reportRange";
import { getReport } from "@/features/reports/queries";
import { t } from "@/i18n/ar";
import { todayISO } from "@/lib/dates";
import { ReportPartyFilterSchema } from "@/lib/validation";

import { reportKind } from "./ledgerTab";

const BASE = "/owner/transactions";

type RawQuery = Record<string, string | string[] | undefined>;

export type ReportsTabData =
  | {
      kind: "category";
      range: ResolvedRange;
      rawParty: string;
      partyId: string | undefined;
      parties: Awaited<ReturnType<typeof listPartyOptions>>;
      report: Awaited<ReturnType<typeof getReport>> | null;
    }
  | { kind: "aging"; report: Awaited<ReturnType<typeof getAgingReport>> };

/**
 * The reads of the chosen report, scoped by the caller's `establishmentId`
 * (from requireOwner). C16: a party id that is malformed, unknown or another
 * establishment's shows `invalidParty` and no report — never the unfiltered one.
 */
export async function loadReportsTab(establishmentId: string, raw: RawQuery): Promise<ReportsTabData> {
  if (reportKind(raw.report) === "aging") {
    // D2: this month's salary rows exist before anything reads them (cached per request).
    await ensureSalaryInstalments(establishmentId);
    return { kind: "aging", report: await getAgingReport(establishmentId) };
  }
  const range = parseReportRange(raw);
  const rawParty = typeof raw.partyId === "string" ? raw.partyId : "";
  const filter = ReportPartyFilterSchema.safeParse({ partyId: rawParty });
  const partyId = filter.success ? filter.data.partyId : undefined;
  const [parties, report] = await Promise.all([
    listPartyOptions(establishmentId),
    filter.success ? getReport(establishmentId, range.from, range.to, partyId) : null,
  ]);
  return { kind: "category", range, rawParty, partyId, parties, report };
}

export function ReportsTab({ data, establishmentName }: { data: ReportsTabData; establishmentName: string | null }) {
  return (
    <>
      <ReportTabs active={data.kind} />
      {data.kind === "aging" ? (
        <AgingReport report={data.report} establishmentName={establishmentName} />
      ) : (
        <CategoryReport data={data} establishmentName={establishmentName} />
      )}
      <PrintFooter />
    </>
  );
}

function CategoryReport({
  data,
  establishmentName,
}: {
  data: Extract<ReportsTabData, { kind: "category" }>;
  establishmentName: string | null;
}) {
  const { range, rawParty, partyId, parties, report } = data;
  const exportHref = `/api/export?from=${range.from}&to=${range.to}${
    partyId ? `&partyId=${encodeURIComponent(partyId)}` : ""
  }`;

  return (
    <>
      <PrintHeader
        establishmentName={establishmentName}
        from={range.from}
        to={range.to}
        subject={report?.party?.name}
        printedAt={todayISO()}
      />

      {/* R11: one GET form; on phones the report renders first (order-last), from md the DOM order holds. */}
      <div className="no-print order-last md:order-none">
        <ReportFilters
          range={range}
          basePath={BASE}
          hiddenFields={[["tab", "reports"]]}
          parties={parties}
          partyId={rawParty}
        />
      </div>

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
    </>
  );
}

/**
 * أعمار المستحقات (spec §4.3, C13): overdue unpaid instalments of open
 * agreements by days past due, لنا first, then علينا. "Today" is the server's
 * (the report carries it).
 */
function AgingReport({
  report,
  establishmentName,
}: {
  report: Extract<ReportsTabData, { kind: "aging" }>["report"];
  establishmentName: string | null;
}) {
  const empty = report.toUs.rows.length === 0 && report.fromUs.rows.length === 0;
  return (
    <>
      <PrintHeader establishmentName={establishmentName} title={t.aging.printTitle} printedAt={report.today} />

      <p className="no-print text-sm text-gray-700">{t.aging.help}</p>

      {empty ? (
        <Card>
          <EmptyState title={t.aging.empty} />
        </Card>
      ) : (
        <>
          <div className="no-print">
            <PrintButton />
          </div>
          <AgingTable title={t.aging.toUs} side={report.toUs} />
          <AgingTable title={t.aging.fromUs} side={report.fromUs} />
        </>
      )}
    </>
  );
}
