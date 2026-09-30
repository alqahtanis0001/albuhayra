import type { Metadata } from "next";

import { EmptyState } from "@/components/EmptyState";
import { LinkButton } from "@/components/LinkButton";
import { PlusIcon } from "@/components/icons";
import { listPartyOptions } from "@/features/parties/queries";
import { ensureSalaryInstalments } from "@/features/payroll/generate";
import { PlanFilters, parsePlanFilters } from "@/features/plans/components/PlanFilters";
import { PlanList } from "@/features/plans/components/PlanList";
import { listPlans } from "@/features/plans/queries";
import { t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";

export const metadata: Metadata = { title: t.plans.title };

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { establishmentId } = await requireOwner();
  // D2: this month's salary rows exist before anything reads them (cached per request).
  await ensureSalaryInstalments(establishmentId);
  const parties = await listPartyOptions(establishmentId);
  const filter = parsePlanFilters(await searchParams, parties);
  const rows = await listPlans(establishmentId, filter);
  const filtered = Boolean(filter.direction || filter.status || filter.partyId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-gray-900">{t.plans.title}</h1>
        <LinkButton href="/owner/plans/new" className="no-print">
          <PlusIcon size={18} />
          {t.plans.add}
        </LinkButton>
      </div>

      <PlanFilters filter={filter} parties={parties} />

      {rows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white">
          <EmptyState
            title={filtered ? t.plans.emptyFiltered : t.plans.empty}
            hint={filtered ? undefined : t.plans.emptyHint}
          />
        </div>
      ) : (
        <PlanList rows={rows} />
      )}
    </div>
  );
}
