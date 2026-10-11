/**
 * v1.4 C5 — the open agreement's card on الاتفاقيات: the «مفتوحة» tag, the
 * party with the direction in words, then either total / received / remaining
 * with the plain progress bar (a ceiling exists) or the running «المستلم: X»
 * line (none). Amounts are neutral; the words carry the direction.
 */
import Link from "next/link";

import { Badge } from "@/components/Badge";
import { MoneyText } from "@/components/MoneyText";
import { t } from "@/i18n/ar";
import { formatSAR } from "@/lib/money";

import { OpenProgress } from "./OpenProgress";
import { PlanStatusBadge, directionWording } from "./PlanBits";
import type { OpenPlanRow } from "../types";

/** «المستلم حتى الآن» for a receivable, «المدفوع حتى الآن» for a payable. */
export function receivedLabel(direction: OpenPlanRow["direction"]): string {
  return direction === "IN" ? t.openPlan.receivedSoFar : t.openPlan.paidSoFar;
}

/** The archived state of an open agreement reads «منتهية» (C3). */
export function OpenPlanStatus({ status }: { status: OpenPlanRow["status"] }) {
  return status === "ARCHIVED" ? <Badge>{t.openPlan.closed}</Badge> : <PlanStatusBadge status={status} />;
}

export function OpenPlanCard({ row, href }: { row: OpenPlanRow; href: string }) {
  const shortLine = (row.direction === "IN" ? t.openPlan.receivedShort : t.openPlan.paidShort).replace(
    "{amount}",
    formatSAR(row.receivedHalalas),
  );
  return (
    <Link
      href={href}
      className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 transition-[scale,background-color] duration-[80ms] ease-out hover:bg-gray-50 active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 font-semibold text-gray-900">{row.title}</span>
        <span className="flex shrink-0 items-center gap-1">
          <Badge tone="accent">{t.openPlan.tag}</Badge>
          <OpenPlanStatus status={row.status} />
        </span>
      </div>
      <p className="text-sm text-gray-700">
        {row.partyName} · {directionWording(row.direction)}
      </p>
      {row.totalHalalas !== null ? (
        <>
          <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <div>
              <dt className="text-xs text-gray-600">{t.plans.total}</dt>
              <dd>
                <MoneyText halalas={row.totalHalalas} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-600">{receivedLabel(row.direction)}</dt>
              <dd>
                <MoneyText halalas={row.receivedHalalas} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-600">{t.openPlan.remaining}</dt>
              <dd>
                <MoneyText halalas={Math.max(0, row.remainingHalalas ?? 0)} />
              </dd>
            </div>
          </dl>
          <OpenProgress receivedHalalas={row.receivedHalalas} totalHalalas={row.totalHalalas} direction={row.direction} />
        </>
      ) : (
        <p className="text-sm text-gray-900">{shortLine}</p>
      )}
    </Link>
  );
}

export default OpenPlanCard;
