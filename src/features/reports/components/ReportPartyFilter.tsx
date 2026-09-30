/**
 * «بحسب الجهة» (v1.2c, C16): a GET form like the range picker, carrying the
 * range it was opened on in hidden fields so choosing a party keeps the period.
 * "" = all parties. No client state.
 */
import { Button } from "@/components/Button";
import { Select } from "@/components/Select";
import { partyLabel } from "@/features/parties/components/PartyBits";
import type { PartyOption } from "@/features/parties/queries";
import { t } from "@/i18n/ar";

import type { ResolvedRange } from "./reportRange";

/** The range as query fields: `?month=` when it is one month, else `?from=&to=`. */
export function rangeFields(range: ResolvedRange): Record<string, string> {
  return range.month ? { month: range.month } : { from: range.from, to: range.to };
}

export function ReportPartyFilter({
  range,
  basePath,
  parties,
  partyId,
}: {
  range: ResolvedRange;
  basePath: string;
  parties: PartyOption[];
  /** The id in the URL, echoed back even when refused, so the select shows it. */
  partyId: string;
}) {
  return (
    <form
      method="get"
      action={basePath}
      className="no-print flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-end"
    >
      {Object.entries(rangeFields(range)).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <div className="grow">
        <Select
          label={t.reportFilter.byParty}
          name="partyId"
          defaultValue={partyId}
          options={[
            { value: "", label: t.reportFilter.allParties },
            ...parties.map((p) => ({ value: p.id, label: partyLabel(p.name, p.active) })),
          ]}
        />
      </div>
      <Button type="submit" variant="secondary">
        {t.common.apply}
      </Button>
    </form>
  );
}

export default ReportPartyFilter;
