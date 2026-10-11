/**
 * v1.4 C2 — «اتفاقية جديدة» opens with two choice cards in the style of
 * `PlanDirectionCards`: «دفعات محددة» (today's scheduled form, `?kind=fixed`)
 * and «اتفاقية مفتوحة» (`?kind=open`). Plain links — a server component — and
 * a `?partyId=` from a party's page travels on to the chosen form.
 */
import Link from "next/link";

import { t } from "@/i18n/ar";

const CARDS = [
  { kind: "fixed", title: t.openPlan.kindFixed, hint: t.openPlan.kindFixedHint },
  { kind: "open", title: t.openPlan.kindOpen, hint: t.openPlan.kindOpenHint },
] as const;

export function PlanKindCards({ partyId }: { partyId?: string }) {
  const party = partyId ? `&partyId=${encodeURIComponent(partyId)}` : "";
  return (
    <section aria-labelledby="plan-kind" className="flex flex-col gap-2">
      <h2 id="plan-kind" className="text-sm font-medium text-gray-700">
        {t.openPlan.kindLabel}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {CARDS.map((card) => (
          <Link
            key={card.kind}
            href={`/owner/plans/new?kind=${card.kind}${party}`}
            className="flex min-h-24 flex-col justify-center gap-1 rounded-xl border border-gray-300 bg-white p-4 text-start transition-[scale,background-color] duration-[80ms] ease-out hover:bg-gray-50 active:scale-[0.98]"
          >
            <span className="text-base font-semibold text-gray-900">{card.title}</span>
            <span className="text-sm text-gray-600">{card.hint}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default PlanKindCards;
