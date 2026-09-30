/**
 * Staff home «المستحقات» (user's ruling, option a — "nothing more"): rendered
 * only for a member with canEdit, and fed only when they have it. One row per
 * instalment with exactly الجهة · المبلغ المستحق (no direction sign — the
 * payment form states the direction) · تاريخ الاستحقاق, and «تسجيل دفعة» to
 * the staff payment form. No plan titles, no totals, no links to owner pages.
 */
import { Card } from "@/components/Card";
import { DateText } from "@/components/DateText";
import { EmptyState } from "@/components/EmptyState";
import { LinkButton } from "@/components/LinkButton";
import { MoneyText } from "@/components/MoneyText";
import type { StaffDueRow } from "@/features/plans/dues";
import { t } from "@/i18n/ar";

export function StaffDuesCard({ rows }: { rows: StaffDueRow[] }) {
  return (
    <Card title={t.staffDues.title} bodyClassName="">
      <p className="border-b border-gray-200 px-4 py-2 text-xs text-gray-600">{t.staffDues.hint}</p>
      {rows.length === 0 ? (
        <EmptyState title={t.staffDues.empty} />
      ) : (
        <ul>
          {rows.map((row) => (
            <li
              key={row.instalmentId}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-3 last:border-b-0"
            >
              <dl className="grid min-w-0 flex-1 grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                <dt className="text-gray-600">{t.staffDues.party}</dt>
                <dd className="truncate font-medium text-gray-900">{row.partyName}</dd>
                <dt className="text-gray-600">{t.staffDues.amountDue}</dt>
                <dd>
                  <MoneyText halalas={row.remainingHalalas} />
                </dd>
                <dt className="text-gray-600">{t.staffDues.dueDate}</dt>
                <dd>
                  <DateText date={row.dueDate} className="items-start" />
                </dd>
              </dl>
              <LinkButton href={`/staff/transactions/new?instalmentId=${row.instalmentId}`}>
                {t.plans.recordPayment}
              </LinkButton>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default StaffDuesCard;
