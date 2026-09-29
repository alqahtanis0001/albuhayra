/**
 * Two GET forms rather than one with a mode toggle: a month and a custom range
 * are different queries, and `?month=` versus `?from=&to=` keeps each URL
 * meaningful on its own. No client state.
 */
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { t } from "@/i18n/ar";

import { monthOptions, type ResolvedRange } from "./reportRange";

export function ReportRangePicker({
  range,
  basePath,
}: {
  range: ResolvedRange;
  basePath: string;
}) {
  return (
    <div className="no-print grid gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2">
      <form method="get" action={basePath} className="flex flex-col gap-3">
        <Select
          label={t.reports.month}
          name="month"
          options={monthOptions(range.month)}
          defaultValue={range.month ?? ""}
          placeholder={range.month ? undefined : t.common.none}
        />
        <Button type="submit">{t.common.apply}</Button>
      </form>

      <form method="get" action={basePath} className="flex flex-col gap-3">
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-medium text-gray-700">
            {t.reports.customRange}
          </legend>
          <Input
            label={t.ledger.from}
            name="from"
            type="date"
            defaultValue={range.rejected?.from ?? range.from}
          />
          <Input
            label={t.ledger.to}
            name="to"
            type="date"
            defaultValue={range.rejected?.to ?? range.to}
            error={range.rejected?.toError}
          />
        </fieldset>
        <Button type="submit" variant="secondary">
          {t.common.apply}
        </Button>
      </form>
    </div>
  );
}

export default ReportRangePicker;
