/**
 * The two GET forms of الحضور: the day for the daily sheet (capped at the
 * server's today — a future day is refused by the save too) and the month for
 * the grid. URLs, not client state: `?date=` and `?view=monthly&ym=`.
 */
import { Button } from "@/components/Button";
import { DateField } from "@/components/DateField";
import { Select } from "@/components/Select";
import { monthOptions } from "@/features/reports/components/reportMonths";
import { t } from "@/i18n/ar";

const BASE = "/owner/staff/attendance";

export function DayPicker({ date, today }: { date: string; today: string }) {
  return (
    <form method="get" action={BASE} className="no-print flex flex-wrap items-end gap-3">
      <div className="min-w-44 flex-1">
        <DateField label={t.attendance.date} name="date" defaultValue={date} max={today} required />
      </div>
      <Button type="submit" variant="secondary">
        {t.common.apply}
      </Button>
    </form>
  );
}

export function MonthPicker({ ym }: { ym: string }) {
  return (
    <form method="get" action={BASE} className="no-print flex flex-wrap items-end gap-3">
      <input type="hidden" name="view" value="monthly" />
      <div className="min-w-44 flex-1">
        <Select label={t.reports.month} name="ym" options={monthOptions(ym)} defaultValue={ym} />
      </div>
      <Button type="submit" variant="secondary">
        {t.common.apply}
      </Button>
    </form>
  );
}
