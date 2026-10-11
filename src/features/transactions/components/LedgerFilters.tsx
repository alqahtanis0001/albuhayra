"use client";

/**
 * A plain GET form: the filters *are* the URL, so submitting navigates and
 * omits `page`, which resets to the first page — the right behaviour when the
 * filter changes. v1.4 part 3 (D29 R4): on phones the panel is collapsed
 * behind a «تصفية» button (open when a filter is active, so the clear link is
 * reachable); from md it is always open and the button is gone. The only
 * client state is that one boolean.
 */
import Link from "next/link";
import { useId, useState } from "react";

import { Button } from "@/components/Button";
import { DateField } from "@/components/DateField";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { t } from "@/i18n/ar";
import type { CategoryRow } from "@/features/settings/queries";
import type { TransactionFilter } from "@/lib/validation";

const METHODS = ["CASH", "BANK_TRANSFER", "MADA", "STC_PAY", "OTHER"] as const;

/** The form's classes by the phone-only collapse; md+ always shows it. */
export function panelClass(open: boolean): string {
  return `${open ? "flex" : "hidden md:flex"} flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4`;
}

export function LedgerFilters({
  filters,
  categories,
  basePath,
  showing,
}: {
  filters: TransactionFilter;
  categories: CategoryRow[];
  basePath: string;
  /** True when any filter is set: the clear link is offered and the panel starts open. */
  showing: boolean;
}) {
  const [open, setOpen] = useState(showing);
  const panelId = useId();

  return (
    <div className="no-print flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className={`inline-flex min-h-11 items-center self-start rounded-lg border bg-white px-4 text-sm md:hidden ${
          showing ? "border-accent font-semibold text-accent-dark" : "border-gray-300 font-medium text-gray-900"
        }`}
      >
        {t.common.filter}
      </button>

      <form id={panelId} method="get" action={basePath} className={panelClass(open)}>
        <div className="grid gap-3 sm:grid-cols-2">
          <DateField label={t.ledger.from} name="from" defaultValue={filters.from ?? ""} />
          <DateField label={t.ledger.to} name="to" defaultValue={filters.to ?? ""} />
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
    </div>
  );
}

export default LedgerFilters;
