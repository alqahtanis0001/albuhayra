/**
 * A plain GET form: the filters *are* the URL, so this needs no client
 * component, no state and no JavaScript. Submitting omits `page`, which resets
 * to the first page — the right behaviour when the filter changes.
 */
import Link from "next/link";

import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { t } from "@/i18n/ar";
import type { CategoryRow } from "@/features/settings/queries";
import type { TransactionFilter } from "@/lib/validation";

const METHODS = ["CASH", "BANK_TRANSFER", "MADA", "STC_PAY", "OTHER"] as const;

export function LedgerFilters({
  filters,
  categories,
  basePath,
  showing,
}: {
  filters: TransactionFilter;
  categories: CategoryRow[];
  basePath: string;
  /** True when any filter is set, so the clear link is only offered then. */
  showing: boolean;
}) {
  return (
    <form
      method="get"
      action={basePath}
      className="no-print flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label={t.ledger.from}
          name="from"
          type="date"
          defaultValue={filters.from ?? ""}
        />
        <Input
          label={t.ledger.to}
          name="to"
          type="date"
          defaultValue={filters.to ?? ""}
        />
        <Select
          label={t.direction.label}
          name="direction"
          placeholder={t.common.all}
          defaultValue={filters.direction ?? ""}
          options={[
            { value: "IN", label: t.direction.IN },
            { value: "OUT", label: t.direction.OUT },
          ]}
        />
        <Select
          label={t.transaction.category}
          name="categoryId"
          placeholder={t.common.all}
          defaultValue={filters.categoryId ?? ""}
          options={categories.map((c) => ({
            value: c.id,
            label: c.active ? c.nameAr : `${c.nameAr} (${t.status.DISABLED})`,
          }))}
        />
        <Select
          label={t.paymentMethod.label}
          name="paymentMethod"
          placeholder={t.common.all}
          defaultValue={filters.paymentMethod ?? ""}
          options={METHODS.map((m) => ({ value: m, label: t.paymentMethod[m] }))}
        />
        <Input
          label={t.common.search}
          name="q"
          type="search"
          placeholder={t.ledger.query}
          defaultValue={filters.q ?? ""}
          maxLength={200}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit">{t.common.apply}</Button>
        {showing ? (
          <Link
            href={basePath}
            className="inline-flex min-h-11 items-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-900 hover:bg-gray-50"
          >
            {t.common.clearFilters}
          </Link>
        ) : null}
      </div>
    </form>
  );
}

export default LedgerFilters;
