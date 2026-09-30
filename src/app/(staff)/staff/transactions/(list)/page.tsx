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
import { requireStaff } from "@/lib/auth";

export const metadata: Metadata = { title: t.ledger.title };

const BASE = "/staff/transactions";

export default async function StaffLedgerPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const { user, establishmentId } = await requireStaff();
  const filters = parseLedgerFilters(await searchParams);

  const [page, categories, locks] = await Promise.all([
    // Spec §3.5: salary-linked entries leave the staff ledger — rows, search and totals.
    listTransactions(establishmentId, filters, { hideSalary: true }),
    listCategories(establishmentId),
    listLocks(establishmentId),
  ]);
  const lockedMonths = locks.filter((l) => l.locked).map((l) => l.ym);

  // Still decided on the server, even though `canDelete` is a constant here:
  // STAFF never delete, and `canEdit` follows the owner's switch, re-read from
  // the database on this request. The absent button is not the control — the
  // action re-checks — and computing either here would invite the next reader to
  // think it is.
  const permissions = { canEdit: user.canEdit, canDelete: false };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-gray-900">{t.ledger.title}</h1>
        <Link
          href={`${BASE}/new`}
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
