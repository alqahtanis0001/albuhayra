import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Card } from "@/components/Card";
import { DateText } from "@/components/DateText";
import { MoneyText } from "@/components/MoneyText";
import { InstalmentList } from "@/features/plans/components/InstalmentList";
import { PlanActions } from "@/features/plans/components/PlanActions";
import {
  PlanStatusBadge,
  directionWording,
  progressText,
} from "@/features/plans/components/PlanBits";
import { getPlan } from "@/features/plans/queries";
import { t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";

export const metadata: Metadata = { title: t.plans.title };

/**
 * An agreement: who, which way, how much is paid and left, then every
 * instalment. Statuses and countdowns arrive computed from the server's today
 * (W8). An unknown id and another establishment's id both reach notFound().
 */
export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { establishmentId } = await requireOwner();
  const { id } = await params;
  const plan = await getPlan(establishmentId, id);
  if (!plan) notFound();
  const open = plan.status !== "ARCHIVED" && plan.status !== "CANCELLED";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold text-gray-900">{plan.title}</h1>
        <PlanStatusBadge status={plan.status} />
      </div>

      <Card>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-gray-600">{t.plans.party}</dt>
          <dd>
            <Link
              href={`/owner/parties/${plan.partyId}`}
              className="font-medium text-accent-dark underline-offset-2 hover:underline"
            >
              {plan.partyName}
            </Link>{" "}
            · {directionWording(plan.direction)}
          </dd>
          <dt className="text-gray-600">{t.plans.total}</dt>
          <dd>
            <MoneyText halalas={plan.totalHalalas} />
          </dd>
          <dt className="text-gray-600">{t.plans.paid}</dt>
          <dd>
            <MoneyText halalas={plan.paidHalalas} />{" "}
            <span className="text-xs text-gray-600">
              ({progressText(plan.paidCount, plan.instalmentCount)})
            </span>
          </dd>
          <dt className="text-gray-600">{t.plans.remaining}</dt>
          <dd>
            <MoneyText halalas={plan.remainingHalalas} />
          </dd>
          <dt className="text-gray-600">{t.plans.category}</dt>
          <dd>{plan.categoryNameAr}</dd>
          <dt className="text-gray-600">{t.plans.startDate}</dt>
          <dd>
            <DateText date={plan.startDate} className="items-start" />
          </dd>
          <dt className="text-gray-600">{t.plans.reminderDays}</dt>
          <dd>
            <bdi className="tabular-nums">{plan.reminderDays}</bdi>
          </dd>
          {plan.notes ? (
            <>
              <dt className="text-gray-600">{t.plans.notes}</dt>
              <dd className="whitespace-pre-line">{plan.notes}</dd>
            </>
          ) : null}
        </dl>
      </Card>

      {open ? <PlanActions planId={plan.id} canCancel={plan.canCancel} /> : null}

      {/* Only if a rule was bypassed: payments beyond the total (allocation's
          residue). Said in words, with the amount; amber is not the message. */}
      {plan.overpaidHalalas > 0 ? (
        <div
          role="status"
          className="flex flex-col gap-1 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
        >
          <p className="font-semibold">
            {t.plans.overpaidWarning}: <MoneyText halalas={plan.overpaidHalalas} inheritColor />
          </p>
          <p className="text-xs">{t.plans.overpaidHint}</p>
        </div>
      ) : null}

      <Card title={t.plans.instalments} bodyClassName="">
        <InstalmentList instalments={plan.instalments} open={open} />
      </Card>
    </div>
  );
}
