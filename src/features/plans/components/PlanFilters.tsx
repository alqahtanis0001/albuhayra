/**
 * الاتفاقيات filters: a plain GET form, like the ledger's — the filters are
 * the URL. `parsePlanFilters` is the page's half: anything unrecognised is
 * dropped rather than an error, and a party id counts only if it is one of
 * this establishment's parties.
 */
import Link from "next/link";

import { Button } from "@/components/Button";
import { Select } from "@/components/Select";
import type { PartyOption } from "@/features/parties/queries";
import type { PlanFilter } from "@/features/plans/queries";
import { t } from "@/i18n/ar";
import type { PlanStatus } from "@/lib/instalments";
import { DirectionEnum } from "@/lib/validation";

const STATUSES: PlanStatus[] = ["UPCOMING", "ACTIVE", "COMPLETED", "ARCHIVED", "CANCELLED"];

type Raw = Record<string, string | string[] | undefined>;

export function parsePlanFilters(raw: Raw, parties: PartyOption[]): PlanFilter {
  const direction = DirectionEnum.safeParse(raw.direction);
  const status = STATUSES.find((s) => s === raw.status);
  const party = parties.find((p) => p.id === raw.partyId);
  return {
    ...(direction.success ? { direction: direction.data } : {}),
    ...(status ? { status } : {}),
    ...(party ? { partyId: party.id } : {}),
  };
}

export function PlanFilters({
  filter,
  parties,
}: {
  filter: PlanFilter;
  parties: PartyOption[];
}) {
  const showing = Boolean(filter.direction || filter.status || filter.partyId);
  return (
    <form
      method="get"
      action="/owner/plans"
      className="no-print flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Select
          label={t.planDirection.label}
          name="direction"
          placeholder={t.plans.allDirections}
          defaultValue={filter.direction ?? ""}
          options={(["IN", "OUT"] as const).map((d) => ({ value: d, label: t.planDirection[d] }))}
        />
        <Select
          label={t.planStatus.label}
          name="status"
          placeholder={t.plans.allStatuses}
          defaultValue={filter.status ?? ""}
          options={STATUSES.map((s) => ({ value: s, label: t.planStatus[s] }))}
        />
        <Select
          label={t.plans.party}
          name="partyId"
          placeholder={t.plans.allParties}
          defaultValue={filter.partyId ?? ""}
          options={parties.map((p) => ({
            value: p.id,
            label: p.active ? p.name : `${p.name} (${t.status.DISABLED})`,
          }))}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit">{t.common.apply}</Button>
        {showing ? (
          <Link
            href="/owner/plans"
            className="inline-flex min-h-11 items-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-900 hover:bg-gray-50"
          >
            {t.common.clearFilters}
          </Link>
        ) : null}
      </div>
    </form>
  );
}

export default PlanFilters;
