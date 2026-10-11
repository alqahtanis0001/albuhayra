import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/EmptyState";
import { Pagination } from "@/components/Pagination";
import { Tabs } from "@/components/Tabs";
import { PlusIcon } from "@/components/icons";
import { SavedNotice } from "@/components/SavedNotice";
import { listProjects } from "@/features/projects/queries";
import { PrintButton } from "@/features/reports/components/PrintButton";
import { PrintFooter } from "@/features/reports/components/PrintFooter";
import { PrintHeader } from "@/features/reports/components/PrintHeader";
import { LedgerFilters } from "@/features/transactions/components/LedgerFilters";
import { LedgerList } from "@/features/transactions/components/LedgerList";
import { LedgerTotals } from "@/features/transactions/components/LedgerTotals";
import {
  filterParams,
  hasAnyFilter,
  parseLedgerFilters,
  type RawSearchParams,
} from "@/features/transactions/components/ledgerParams";
import { listLocks } from "@/features/locks/queries";
import { listCategories } from "@/features/settings/queries";
import { listTransactions } from "@/features/transactions/queries";
import { t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";
import { todayISO } from "@/lib/dates";

import { ActivitiesTab } from "./ActivitiesTab";
import { ACTIVITIES_HREF, ledgerTab, parseActivitiesStatus, type LedgerTab } from "./ledgerTab";

const BASE = "/owner/transactions";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}): Promise<Metadata> {
  const tab = ledgerTab((await searchParams).tab);
  return { title: tab === "activities" ? t.projects.listTitle : t.ledger.title };
}

/** The h1, the tab's add button (and R11's «طباعة» on the entries tab) and the two-tab strip (v1.4 B3). */
function Header({ tab }: { tab: LedgerTab }) {
  const add =
    tab === "activities"
      ? { href: "/owner/projects/new", label: t.projects.add }
      : { href: "/owner/transactions/new", label: t.transaction.addButton };
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-gray-900">{t.ledger.title}</h1>
        <div className="no-print flex flex-wrap items-center gap-2">
          {tab === "entries" ? <PrintButton /> : null}
          <Link
            href={add.href}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent px-4 font-medium text-white hover:bg-accent-dark"
          >
            <PlusIcon size={18} />
            {add.label}
          </Link>
        </div>
      </div>
      <Tabs
        label={t.ledger.title}
        active={tab}
        tabs={[
          { key: "entries", label: t.ledgerTabs.entries, href: BASE },
          { key: "activities", label: t.ledgerTabs.activities, href: ACTIVITIES_HREF },
        ]}
      />
    </>
  );
}

export default async function OwnerLedgerPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  // requireOwner gives the role and the scope; the URL gives only the filter,
  // and that goes through the same zod schema the query uses.
  const { user, establishmentId } = await requireOwner();
  const raw = await searchParams;
  const tab = ledgerTab(raw.tab);

  if (tab === "activities") {
    // B3: the former /owner/projects page, inside the tab; no ledger query runs.
    const status = parseActivitiesStatus(raw.status);
    const rows = await listProjects(establishmentId, { status });
    return (
      <div className="flex flex-col gap-4">
        <Header tab={tab} />
        <ActivitiesTab rows={rows} status={status} />
      </div>
    );
  }

  const filters = parseLedgerFilters(raw);
  const [page, categories, locks] = await Promise.all([
    listTransactions(establishmentId, filters),
    listCategories(establishmentId),
    listLocks(establishmentId),
  ]);
  const lockedMonths = locks.filter((l) => l.locked).map((l) => l.ym);

  // Decided here, from the session, never in the browser: an OWNER may always
  // edit and is the only role that may delete. The action re-checks both.
  const permissions = {
    canEdit: user.role === "OWNER" || user.canEdit,
    canDelete: user.role === "OWNER",
  };

  return (
    <div className="flex flex-col gap-4">
      {/* R11 / D31d: print-only — the screen is unchanged; the staff ledger prints as before. */}
      <PrintHeader
        establishmentName={user.establishmentName}
        from={filters.from}
        to={filters.to}
        title={t.ledger.title}
        printedAt={todayISO()}
      />
      <Header tab={tab} />
      {/* R4: a save lands here with ?saved=1; the notice drops it again. */}
      <SavedNotice saved={raw.saved === "1"} />

      <LedgerFilters
        filters={filters}
        categories={categories}
        basePath={BASE}
        showing={hasAnyFilter(filters)}
      />

      <LedgerTotals totals={page.filterTotals} count={page.total} />

      <div className="rounded-xl border border-gray-200 bg-white">
        {page.rows.length === 0 ? (
          <EmptyState
            title={hasAnyFilter(filters) ? t.ledger.emptyFiltered : t.ledger.emptyTitle}
            hint={hasAnyFilter(filters) ? undefined : t.ledger.emptyHint}
            kind={hasAnyFilter(filters) ? undefined : "ledger"}
          />
        ) : (
          <LedgerList
            page={page}
            lockedMonths={lockedMonths}
            permissions={permissions}
            basePath={BASE}
          />
        )}
      </div>

      <Pagination
        page={filters.page}
        total={page.total}
        basePath={BASE}
        params={filterParams(filters)}
      />
      <PrintFooter />
    </div>
  );
}
