/**
 * المستحقات rows (docs/FRONTEND.md, /owner/dues): one section per direction —
 * لنا (IN: they pay us) and علينا (OUT: we pay them) — each with its total, then
 * a row per instalment: party, agreement, instalment no., due date, remaining,
 * countdown and a quick «تسجيل دفعة» — plus «تذكير» (v1.2c, C10) when `remind`
 * is on, for IN rows of an opted-in party. The word says the direction; the amount
 * stays neutral. Statuses and countdowns are the server's (W8). Each row carries
 * `data-due-date` for the week ribbon's jump (v1.3 item 6).
 */
import Link from "next/link";

import { DateText } from "@/components/DateText";
import { LinkButton } from "@/components/LinkButton";
import { MoneyText } from "@/components/MoneyText";
import { Countdown, InstalmentName } from "@/features/plans/components/PlanBits";
import type { DueRow } from "@/features/plans/dues";
import { RemindButton } from "@/features/reminders/components/RemindButton";
import { t } from "@/i18n/ar";

export function DueRows({
  rows,
  limit,
  remind = false,
}: {
  rows: DueRow[];
  limit?: number;
  /** v1.2c: the المستحقات page only (not the home widget). */
  remind?: boolean;
}) {
  return (
    <ul className="flex flex-col">
      {rows.slice(0, limit).map((row) => (
        <li
          key={row.instalmentId}
          data-due-date={row.dueDate}
          className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-3 last:border-b-0"
        >
          <div className="flex min-w-0 flex-col gap-0.5">
            <Link
              href={`/owner/plans/${row.planId}`}
              className="truncate font-medium text-gray-900 underline-offset-2 hover:underline"
            >
              {row.partyName}
            </Link>
            <span className="truncate text-xs text-gray-600">
              {row.planTitle} · <InstalmentName seq={row.seq} periodYm={row.periodYm} />
            </span>
            <Countdown dayOffset={row.dayOffset} status={row.status} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col items-end gap-0.5 text-end">
              <MoneyText halalas={row.remainingHalalas} />
              <DateText date={row.dueDate} className="items-end text-xs" />
            </div>
            <LinkButton
              href={`/owner/transactions/new?instalmentId=${row.instalmentId}`}
              className="no-print px-3 text-sm"
            >
              {t.plans.recordPayment}
            </LinkButton>
            {remind && row.direction === "IN" && row.partyRemindersOptIn ? (
              <RemindButton
                instalmentId={row.instalmentId}
                partyName={row.partyName}
                hasEmail={row.partyHasEmail}
              />
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** One direction's block: heading with its total, then its rows. */
export function DueGroup({
  label,
  totalHalalas,
  rows,
  remind,
}: {
  label: string;
  totalHalalas: number;
  rows: DueRow[];
  remind?: boolean;
}) {
  if (rows.length === 0) return null;
  return (
    <div>
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2 text-sm">
        <span className="font-semibold text-gray-800">{label}</span>
        <span>
          {t.common.total}: <MoneyText halalas={totalHalalas} />
        </span>
      </div>
      <DueRows rows={rows} remind={remind} />
    </div>
  );
}

/** A section (متأخرات or this week) split into لنا and علينا. */
export function DueSplit({
  rows,
  inHalalas,
  outHalalas,
  remind,
}: {
  rows: DueRow[];
  inHalalas: number;
  outHalalas: number;
  remind?: boolean;
}) {
  return (
    <>
      <DueGroup label={t.dues.toUs} totalHalalas={inHalalas} rows={rows.filter((r) => r.direction === "IN")} remind={remind} />
      <DueGroup label={t.dues.fromUs} totalHalalas={outHalalas} rows={rows.filter((r) => r.direction === "OUT")} />
    </>
  );
}
