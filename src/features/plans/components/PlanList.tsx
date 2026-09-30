/**
 * الاتفاقيات: one card per agreement — title and status, the party with the
 * direction worded from its side, total / paid / remaining, «سُدّد X من N»,
 * and the next instalment with its countdown. The card leads to the plan.
 * Amounts are neutral (no sign): the direction is stated in words beside them.
 */
import Link from "next/link";

import { DateText } from "@/components/DateText";
import { MoneyText } from "@/components/MoneyText";
import type { PlanRow } from "@/features/plans/queries";
import { t } from "@/i18n/ar";

import {
  Countdown,
  PlanStatusBadge,
  directionWording,
  progressText,
} from "./PlanBits";

export function PlanList({ rows }: { rows: PlanRow[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <li key={row.id}>
          <Link
            href={`/owner/plans/${row.id}`}
            className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 transition-[scale,background-color] duration-[80ms] ease-out hover:bg-gray-50 active:scale-[0.99]"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="min-w-0 font-semibold text-gray-900">{row.title}</span>
              <PlanStatusBadge status={row.status} />
            </div>
            <p className="text-sm text-gray-700">
              {row.partyName} · {directionWording(row.direction)}
            </p>
            <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-gray-600">{t.plans.total}</dt>
                <dd>
                  <MoneyText halalas={row.totalHalalas} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-600">{t.plans.paid}</dt>
                <dd>
                  <MoneyText halalas={row.paidHalalas} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-600">{t.plans.remaining}</dt>
                <dd>
                  <MoneyText halalas={row.remainingHalalas} />
                </dd>
              </div>
            </dl>
            <p className="text-xs text-gray-600">{progressText(row.paidCount, row.instalmentCount)}</p>
            {row.nextDue ? (
              <div className="flex flex-wrap items-start gap-x-3 gap-y-1 border-t border-gray-200 pt-2 text-sm">
                <span className="text-gray-600">{t.plans.nextDue}:</span>
                <DateText date={row.nextDue.dueDate} className="items-start" />
                <MoneyText halalas={row.nextDue.remainingHalalas} />
                <Countdown dayOffset={row.nextDue.dayOffset} status={row.nextDue.status} />
              </div>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default PlanList;
