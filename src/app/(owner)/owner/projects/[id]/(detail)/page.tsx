import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/EmptyState";
import { Pagination } from "@/components/Pagination";
import { listLocks } from "@/features/locks/queries";
import { CategoryRing } from "@/features/projects/components/CategoryRing";
import { ProjectActions } from "@/features/projects/components/ProjectActions";
import { ProjectDates, ProjectStatusBadge } from "@/features/projects/components/ProjectBits";
import {
  ProjectByCategory,
  ProjectPrintEntries,
  ProjectTotals,
} from "@/features/projects/components/ProjectSummary";
import { getProject } from "@/features/projects/queries";
import { PrintFooter } from "@/features/reports/components/PrintFooter";
import { PrintHeader } from "@/features/reports/components/PrintHeader";
import { LedgerList } from "@/features/transactions/components/LedgerList";
import {
  parseLedgerFilters,
  type RawSearchParams,
} from "@/features/transactions/components/ledgerParams";
import { listTransactions } from "@/features/transactions/queries";
import { t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { PAGE_SIZE } from "@/lib/validation";

export const metadata: Metadata = { title: t.projects.title };

/**
 * An إضافة's page: its numbers, its own ledger (the ordinary ledger query
 * filtered by the route's id — never by a search param), its controls, and a
 * printable summary through the existing print sheet.
 */
export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const { user, establishmentId } = await requireOwner();
  const { id } = await params;
  const project = await getProject(establishmentId, id);
  if (!project) notFound();

  // Only the page number is taken from the URL.
  const { page } = parseLedgerFilters(await searchParams);
  const [ledger, locks] = await Promise.all([
    listTransactions(establishmentId, { projectId: project.id, page }),
    listLocks(establishmentId),
  ]);
  const lockedMonths = locks.filter((l) => l.locked).map((l) => l.ym);
  const pageCount = Math.max(1, Math.ceil(ledger.total / PAGE_SIZE));
  const basePath = `/owner/projects/${project.id}`;

  return (
    <div className="flex flex-col gap-4">
      <PrintHeader
        establishmentName={user.establishmentName}
        title={t.print.projectSummaryTitle}
        subject={project.name}
        printedAt={todayISO()}
      />

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold text-gray-900">{project.name}</h1>
          <ProjectStatusBadge status={project.status} />
        </div>
        <ProjectDates startDate={project.startDate} endDate={project.endDate} />
        {project.description ? (
          <p className="whitespace-pre-line text-sm text-gray-700">{project.description}</p>
        ) : null}
      </div>

      <ProjectActions
        projectId={project.id}
        status={project.status}
        hasHistory={project.hasHistory}
      />

      <ProjectTotals project={project} />
      <CategoryRing rows={project.byCategory} />
      <ProjectByCategory project={project} />

      <section className="no-print flex flex-col gap-2">
        <h2 className="text-base font-semibold text-gray-900">{t.projects.transactions}</h2>
        <div className="rounded-xl border border-gray-200 bg-white">
          {ledger.rows.length === 0 ? (
            <EmptyState title={t.projects.emptyTransactions} />
          ) : (
            <LedgerList
              page={ledger}
              lockedMonths={lockedMonths}
              permissions={{ canEdit: true, canDelete: true }}
              basePath="/owner/transactions"
            />
          )}
        </div>
        <Pagination page={page} total={ledger.total} basePath={basePath} />
      </section>

      <ProjectPrintEntries rows={ledger.rows} page={page} pageCount={pageCount} />
      <PrintFooter />
    </div>
  );
}
