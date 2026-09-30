import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/EmptyState";
import { Pagination } from "@/components/Pagination";
import { PlusIcon } from "@/components/icons";
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

export const metadata: Metadata = { title: t.ledger.title };

const BASE = "/owner/transactions";

export default async function OwnerLedgerPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  // requireOwner gives the role and the scope; the URL gives only the filter,
  // and that goes through the same zod schema the query uses.
  const { user, establishmentId } = await requireOwner();
  const filters = parseLedgerFilters(await searchParams);

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
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-gray-900">{t.ledger.title}</h1>
        <Link
          href="/owner/transactions/new"
          className="no-print inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent px-4 font-medium text-white hover:bg-accent-dark"
        >
          <PlusIcon size={18} />
          {t.transaction.addButton}
        </Link>
      </div>

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
    </div>
  );
}
