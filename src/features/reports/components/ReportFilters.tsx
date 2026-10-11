"use client";

/**
 * v1.4 part 3 (D29 R11, D31c): the report's one GET form — month, custom
 * range and party — with one «عرض». Choosing a month fills from/to with that
 * month; typing a date selects «فترة مخصصة». The server parser is untouched
 * and prefers a valid `?month=`, so a hand-typed URL behaves as before. No
 * validation import (D32 B1): the zod barrel stays out of this route.
 */
import { useState } from "react";

import { Button } from "@/components/Button";
import { DateField } from "@/components/DateField";
import { Select } from "@/components/Select";
import { partyLabel } from "@/features/parties/components/PartyBits";
import { t } from "@/i18n/ar";

import { afterDateTyped, afterMonthChoice, monthOptions, type PeriodState } from "./reportMonths";

export type ReportFiltersRange = {
  from: string;
  to: string;
  month: string | null;
  rejected?: { from: string; to: string; toError: string };
};

export function ReportFilters({
  range,
  basePath,
  parties,
  partyId,
}: {
  range: ReportFiltersRange;
  basePath: string;
  parties: { id: string; name: string; active: boolean }[];
  /** The id in the URL, echoed back even when refused, so the select shows it. */
  partyId: string;
}) {
  const [period, setPeriod] = useState<PeriodState>({
    month: range.month ?? "",
    from: range.rejected?.from ?? range.from,
    to: range.rejected?.to ?? range.to,
  });
  const [party, setParty] = useState(partyId);

  return (
    <form method="get" action={basePath} className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label={t.reports.month}
          name="month"
          value={period.month}
          onChange={(e) => setPeriod((s) => afterMonthChoice(s, e.target.value))}
          options={[{ value: "", label: t.reports.customRange }, ...monthOptions(period.month || range.month)]}
        />
        <Select
          label={t.reportFilter.byParty}
          name="partyId"
          value={party}
          onChange={(e) => setParty(e.target.value)}
          options={[
            { value: "", label: t.reportFilter.allParties },
            ...parties.map((p) => ({ value: p.id, label: partyLabel(p.name, p.active) })),
          ]}
        />
        <DateField
          label={t.ledger.from}
          name="from"
          value={period.from}
          onChange={(e) => setPeriod((s) => afterDateTyped(s, "from", e.target.value))}
        />
        <DateField
          label={t.ledger.to}
          name="to"
          value={period.to}
          onChange={(e) => setPeriod((s) => afterDateTyped(s, "to", e.target.value))}
          error={range.rejected?.toError}
        />
      </div>
      <div>
        <Button type="submit">{t.common.apply}</Button>
      </div>
    </form>
  );
}

export default ReportFilters;
