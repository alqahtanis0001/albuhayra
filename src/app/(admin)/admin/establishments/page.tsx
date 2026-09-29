import type { Metadata } from "next";

import { Card } from "@/components/Card";
import { EstablishmentsTable } from "@/features/admin/components/EstablishmentsTable";
import { getAdminOverview } from "@/features/admin/queries";
import { t } from "@/i18n/ar";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: t.admin.establishmentsTitle };

const BASE = "/admin/establishments";

/** Counts and statuses only — never an amount. */
export default async function AdminEstablishmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const raw = (await searchParams).q;
  const q = typeof raw === "string" ? raw.trim().slice(0, 200) : "";

  const { establishments } = await getAdminOverview();

  // Filtered here rather than in the query: the admin list is the whole platform
  // and small, and `getAdminOverview` takes no arguments by design — it is the
  // one query with no establishment scope, so giving it a caller-supplied
  // parameter is a door worth not opening.
  const needle = q.toLowerCase();
  const rows = needle
    ? establishments.filter(
        (e) =>
          e.name.toLowerCase().includes(needle) ||
          e.ownerName.toLowerCase().includes(needle) ||
          e.ownerEmail.toLowerCase().includes(needle),
      )
    : establishments;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">
        {t.admin.establishmentsTitle}
      </h1>

      <form method="get" action={BASE} className="flex flex-wrap items-end gap-2">
        <div className="min-w-48 flex-1">
          <label htmlFor="q" className="text-sm font-medium text-gray-700">
            {t.common.search}
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            maxLength={200}
            placeholder={t.admin.searchEstablishments}
            className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900"
          />
        </div>
        <button
          type="submit"
          className="min-h-11 rounded-lg bg-accent px-4 font-medium text-white hover:bg-accent-dark"
        >
          {t.common.search}
        </button>
      </form>

      <Card bodyClassName="">
        <EstablishmentsTable rows={rows} />
      </Card>
    </div>
  );
}
