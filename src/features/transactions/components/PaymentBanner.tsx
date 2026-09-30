/**
 * Payment mode of the entry form (docs/FRONTEND.md, Payment form; W1–W3, W10).
 * A server component handed to TransactionForm as `banner`: it states what the
 * payment is for, shows the locked direction and party, and posts them as
 * hidden fields (W3d — no control to change them; a forged value is refused by
 * the server). A new payment also posts `instalmentId`; an edit does not —
 * absent means "keep the link" (V12).
 *
 * Staff see only the party, this instalment's remaining and the rollover line
 * (W2): no plan title, no plan remaining, no link to owner pages. The staff
 * pages never fetch those fields, so they cannot be passed here by mistake.
 */
import Link from "next/link";

import { MoneyText } from "@/components/MoneyText";
import { periodLabel } from "@/features/plans/components/PlanBits";
import { t } from "@/i18n/ar";
import type { DirectionValue } from "@/lib/validation";

type Common = { direction: DirectionValue; partyId: string; partyName: string };

/** The owner's view of the plan; omitted on every staff page. */
type OwnerPlan = { planId: string; planTitle: string };

export type PaymentBannerProps =
  | (Common & {
      mode: "new";
      instalmentId: string;
      instalmentRemainingHalalas: number;
      /** `periodYm` is set on a salary month (S-L2a): named by its month, not its seq. */
      plan?: OwnerPlan & { seq: number; periodYm: string | null; planRemainingHalalas: number };
    })
  | (Common & { mode: "edit"; plan?: OwnerPlan });

export function PaymentBanner(props: PaymentBannerProps) {
  const { direction, partyId, partyName, plan } = props;
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-accent-line bg-accent-soft p-4 text-sm text-gray-900">
      <h2 className="text-base font-semibold text-accent-dark">
        {props.mode === "new" ? t.payment.title : t.payment.linkedNotice}
      </h2>
      {props.mode === "new" && props.plan ? (
        <p>
          {props.plan.periodYm
            ? `${props.plan.planTitle} · ${periodLabel(props.plan.periodYm)}`
            : t.payment.forInstalment
                .replace("{seq}", String(props.plan.seq))
                .replace("{title}", props.plan.planTitle)}
        </p>
      ) : null}

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="text-gray-700">{t.transaction.party}</dt>
        <dd className="font-medium">{partyName}</dd>
        <dt className="text-gray-700">{t.direction.label}</dt>
        <dd className="font-medium">
          {t.direction[direction]}
        </dd>
        {props.mode === "new" ? (
          <>
            <dt className="text-gray-700">{t.payment.remaining}</dt>
            <dd>
              <MoneyText halalas={props.instalmentRemainingHalalas} />
            </dd>
            {props.plan ? (
              <>
                <dt className="text-gray-700">{t.payment.planRemaining}</dt>
                <dd>
                  <MoneyText halalas={props.plan.planRemainingHalalas} />
                </dd>
              </>
            ) : null}
          </>
        ) : null}
      </dl>

      {props.mode === "new" ? <p className="text-xs text-gray-700">{t.payment.rollsOver}</p> : null}
      {plan ? (
        <Link
          href={`/owner/plans/${plan.planId}`}
          className="self-start text-accent-dark underline underline-offset-2"
        >
          {plan.planTitle} — {t.payment.viewPlan}
        </Link>
      ) : null}

      <input type="hidden" name="direction" value={direction} />
      <input type="hidden" name="partyId" value={partyId} />
      {props.mode === "new" ? (
        <input type="hidden" name="instalmentId" value={props.instalmentId} />
      ) : null}
    </section>
  );
}

export default PaymentBanner;
