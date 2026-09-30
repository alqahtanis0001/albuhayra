import type { Metadata } from "next";

import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { ensureSalaryInstalments } from "@/features/payroll/generate";
import { AgingTable } from "@/features/reports/components/AgingTable";
import { PrintButton } from "@/features/reports/components/PrintButton";
import { PrintFooter } from "@/features/reports/components/PrintFooter";
import { PrintHeader } from "@/features/reports/components/PrintHeader";
import { ReportTabs } from "@/features/reports/components/ReportTabs";
import { getAgingReport } from "@/features/reports/aging";
import { t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";

export const metadata: Metadata = { title: t.aging.title };

/**
 * أعمار المستحقات (spec §4.3, C13): overdue unpaid instalments of open
 * agreements by days past due, لنا first, then علينا. "Today" is the server's
 * (the report carries it). Printable through the one print block.
 */
export default async function AgingReportPage() {
  const { user, establishmentId } = await requireOwner();
  // D2: this month's salary rows exist before anything reads them (cached per request).
  await ensureSalaryInstalments(establishmentId);
  const report = await getAgingReport(establishmentId);
  const empty = report.toUs.rows.length === 0 && report.fromUs.rows.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="no-print text-xl font-semibold text-gray-900">{t.reports.title}</h1>
      <ReportTabs active="aging" />

      <PrintHeader
        establishmentName={user.establishmentName}
        title={t.aging.printTitle}
        printedAt={report.today}
      />

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

      <PrintFooter />
    </div>
  );
}
