/**
 * الدفعات of one agreement: per instalment its number, due date (Hijri
 * beneath), amount, paid, remaining, status as a word, the countdown, and the
 * payments recorded against it (each linking to its entry). «تسجيل دفعة» sits
 * on every unpaid row while the agreement is open. One card per row at every
 * width: seven values plus nested payments do not survive a 360px table.
 */
import Link from "next/link";

import { DateText } from "@/components/DateText";
import { LinkButton } from "@/components/LinkButton";
import { MoneyText } from "@/components/MoneyText";
import type { PlanInstalment } from "@/features/plans/queries";
import { t } from "@/i18n/ar";

import { Countdown, InstalmentName, InstalmentStatusBadge } from "./PlanBits";

export function InstalmentList({
  instalments,
  open,
}: {
  instalments: PlanInstalment[];
  /** The agreement is OPEN: unpaid rows offer «تسجيل دفعة». */
  open: boolean;
}) {
  return (
    <ol className="flex flex-col">
      {instalments.map((row) => (
        <li key={row.id} className="report-card flex flex-col gap-2 border-b border-gray-200 p-3 last:border-b-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-gray-900">
              <InstalmentName seq={row.seq} periodYm={row.periodYm} />
            </span>
            <span className="flex flex-wrap items-center gap-2">
              <Countdown dayOffset={row.dayOffset} status={row.status} />
              <InstalmentStatusBadge status={row.status} />
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
              <dt className="text-xs text-gray-600">{t.schedule.amountDue}</dt>
              <dd>
                <MoneyText halalas={row.amountDueHalalas} />
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

          {row.payments.length > 0 ? (
            <div className="rounded-lg bg-gray-50 p-2">
              <p className="text-xs font-medium text-gray-700">{t.plans.payments}</p>
              <ul className="mt-1 flex flex-col gap-1">
                {row.payments.map((p) => (
                  <li key={p.transactionId}>
                    <Link
                      href={`/owner/transactions/${p.transactionId}/edit`}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-700 underline-offset-2 hover:underline"
                    >
                      <DateText date={p.date} compact />
                      <MoneyText halalas={p.amountHalalas} />
                      <span>
                        {t.transaction.addedBy}: {p.createdByName}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {open && row.remainingHalalas > 0 ? (
            <div className="no-print">
              <LinkButton href={`/owner/transactions/new?instalmentId=${row.id}`}>
                {t.plans.recordPayment}
              </LinkButton>
            </div>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

export default InstalmentList;
