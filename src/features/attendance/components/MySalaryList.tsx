/**
 * «رواتبي» (X3): the linked employee's own salary months — month, due date,
 * amount, paid, remaining and the status in words (with the countdown while
 * open). A month of an archived plan (employment ended) reads «مؤرشفة»: its
 * unpaid remainder was written off, so no countdown runs on it.
 */
import { Badge } from "@/components/Badge";
import { DateText } from "@/components/DateText";
import { MoneyText } from "@/components/MoneyText";
import type { MySalaryInstalment } from "@/features/attendance/mine";
import { Countdown, InstalmentStatusBadge, periodLabel } from "@/features/plans/components/PlanBits";
import { t } from "@/i18n/ar";

export function MySalaryList({ rows }: { rows: MySalaryInstalment[] }) {
  return (
    <ul className="flex flex-col">
      {rows.map((row) => (
        <li key={`${row.periodYm ?? ""}:${row.dueDate}`} className="flex flex-col gap-2 border-b border-gray-200 p-3 last:border-b-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-gray-900">
              {row.periodYm ? periodLabel(row.periodYm) : <DateText date={row.dueDate} compact />}
            </span>
            <span className="flex flex-wrap items-center gap-2">
              {row.closed && row.remainingHalalas > 0 ? (
                <Badge tone="neutral">{t.planStatus.ARCHIVED}</Badge>
              ) : (
                <>
                  <Countdown dayOffset={row.dayOffset} status={row.status} />
                  <InstalmentStatusBadge status={row.status} />
                </>
              )}
            </span>
          </div>
          <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <div>
              <dt className="text-xs text-gray-600">{t.schedule.dueDate}</dt>
              <dd>
                <DateText date={row.dueDate} className="items-start" />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-600">{t.employees.net}</dt>
              <dd>
                <MoneyText halalas={row.amountDueHalalas} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-600">{t.employees.paid}</dt>
              <dd>
                <MoneyText halalas={row.paidHalalas} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-600">{t.employees.remaining}</dt>
              <dd>
                <MoneyText halalas={row.remainingHalalas} />
              </dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  );
}
