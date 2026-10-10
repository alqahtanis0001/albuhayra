/**
 * v1.4 C3 — the open agreement's page (a server component): the facts card
 * with the large running total — «المستلم حتى الآن» / «المدفوع حتى الآن» —
 * the plain progress bar and «المتبقي» when a ceiling exists; the inline
 * payment form (`#pay`, the pick-mode anchor) while open; «إنهاء» / «إعادة
 * فتح»; then the payments, newest first, each with its edit link. Print shows
 * the facts and the payments table, never the bar or the forms.
 */
import Link from "next/link";

import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { DateText } from "@/components/DateText";
import { EmptyState } from "@/components/EmptyState";
import { MoneyText } from "@/components/MoneyText";
import { TBody, Table, Td, Th, Tr } from "@/components/Table";
import { t } from "@/i18n/ar";

import { OpenPaymentForm } from "./OpenPaymentForm";
import { OpenPlanActions } from "./OpenPlanActions";
import { OpenPlanStatus, receivedLabel } from "./OpenPlanCard";
import { OpenProgress } from "./OpenProgress";
import { PaymentRecorded } from "./PaymentRecorded";
import { directionWording } from "./PlanBits";
import type { OpenPlanDetail as Detail } from "../types";

export function OpenPlanDetail({
  plan,
  today,
  paidId,
  autoClosed = false,
}: {
  plan: Detail;
  today: string;
  /** `?paid=` — one of this plan's payments, washed green once. */
  paidId?: string;
  /** `?closed=1` — that payment completed the total (C4). */
  autoClosed?: boolean;
}) {
  const remaining = plan.remainingHalalas === null ? null : Math.max(0, plan.remainingHalalas);
  const over = plan.remainingHalalas !== null && plan.remainingHalalas < 0 ? -plan.remainingHalalas : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold text-gray-900">{plan.title}</h1>
        <Badge tone="accent">{t.openPlan.tag}</Badge>
        <OpenPlanStatus status={plan.status} />
      </div>

      <Card>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-gray-600">{t.plans.party}</dt>
          <dd>
            <Link href={`/owner/parties/${plan.partyId}`} className="font-medium text-accent-dark underline-offset-2 hover:underline">
              {plan.partyName}
            </Link>{" "}
            · {directionWording(plan.direction)}
          </dd>
          <dt className="text-gray-600">{t.plans.category}</dt>
          <dd>{plan.categoryNameAr}</dd>
          <dt className="text-gray-600">{t.plans.startDate}</dt>
          <dd>
            <DateText date={plan.startDate} className="items-start" />
          </dd>
          <dt className="text-gray-600">{t.openPlan.expectedEndShort}</dt>
          <dd>{plan.expectedEndDate ? <DateText date={plan.expectedEndDate} className="items-start" /> : t.openPlan.noExpectedEnd}</dd>
          {plan.closedAt ? (
            <>
              <dt className="text-gray-600">{t.openPlan.closed}</dt>
              <dd>
                <DateText date={plan.closedAt} className="items-start" />
              </dd>
            </>
          ) : null}
          {plan.notes ? (
            <>
              <dt className="text-gray-600">{t.plans.notes}</dt>
              <dd className="whitespace-pre-line">{plan.notes}</dd>
            </>
          ) : null}
        </dl>
        <div className="mt-4 flex flex-col gap-3 border-t border-gray-200 pt-3">
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-sm text-gray-600">{receivedLabel(plan.direction)}</span>
            <MoneyText halalas={plan.receivedHalalas} className="text-2xl font-semibold" />
          </p>
          {plan.totalHalalas !== null && remaining !== null ? (
            <>
              <OpenProgress receivedHalalas={plan.receivedHalalas} totalHalalas={plan.totalHalalas} direction={plan.direction} grow />
              <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <div>
                  <dt className="text-xs text-gray-600">{t.plans.total}</dt>
                  <dd>
                    <MoneyText halalas={plan.totalHalalas} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-600">{t.openPlan.remaining}</dt>
                  <dd>
                    <MoneyText halalas={remaining} />
                  </dd>
                </div>
              </dl>
            </>
          ) : null}
        </div>
      </Card>

      {/* R2-2: the sr-only announcement says «recorded» once; the visible strip below carries the auto-close. */}
      {paidId ? <PaymentRecorded message={t.openPlan.recorded} /> : null}
      {autoClosed ? (
        <p role="status" className="no-print rounded-xl border border-accent-line bg-accent-soft p-3 text-sm text-accent-dark">
          {t.openPlan.autoClosed}
        </p>
      ) : null}
      {over > 0 ? (
        <div role="status" className="flex flex-col gap-1 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-semibold">
            {t.plans.overpaidWarning}: <MoneyText halalas={over} inheritColor />
          </p>
        </div>
      ) : null}

      {plan.canClose ? (
        <Card title={t.plans.recordPayment} className="no-print">
          <section id="pay" aria-label={t.plans.recordPayment}>
            <OpenPaymentForm planId={plan.id} today={today} />
          </section>
        </Card>
      ) : null}

      <OpenPlanActions planId={plan.id} canClose={plan.canClose} canReopen={plan.canReopen} />

      <Card title={t.openPlan.payments} bodyClassName="">
        {plan.payments.length === 0 ? (
          <EmptyState title={t.openPlan.noPayments} />
        ) : (
          <Table
            caption={t.openPlan.payments}
            head={
              <Tr>
                <Th>{t.transaction.date}</Th>
                <Th className="text-end">{t.transaction.amount}</Th>
                <Th>{t.paymentMethod.label}</Th>
                <Th className="hidden md:table-cell">{t.openPlan.byWhom}</Th>
                <Th className="no-print">
                  <span className="sr-only">{t.openPlan.editPayment}</span>
                </Th>
              </Tr>
            }
          >
            <TBody>
              {plan.payments.map((p) => (
                <Tr key={p.transactionId} className={p.transactionId === paidId ? "v13-paid" : ""}>
                  <Td className="whitespace-nowrap">
                    <DateText date={p.date} className="items-start" />
                  </Td>
                  <Td className="text-end">
                    <MoneyText halalas={p.amountHalalas} direction={plan.direction} />
                  </Td>
                  <Td>{t.paymentMethod[p.paymentMethod]}</Td>
                  <Td className="hidden md:table-cell">{p.createdByName}</Td>
                  <Td className="no-print whitespace-nowrap">
                    <Link
                      href={`/owner/transactions/${p.transactionId}/edit`}
                      className="inline-flex min-h-11 items-center text-sm font-medium text-accent-dark underline-offset-2 hover:underline"
                    >
                      {t.openPlan.editPayment}
                    </Link>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

export default OpenPlanDetail;
