/**
 * Small pieces the parties screens share. Server components.
 *
 * Balances are agreements only (Decision 7): لنا = what the party still owes us
 * on OPEN agreements, علينا = what we still owe them. The word is always shown
 * with the amount — never colour alone — and both zero reads «لا رصيد».
 */
import { Badge } from "@/components/Badge";
import { MoneyText } from "@/components/MoneyText";
import { t } from "@/i18n/ar";
import { formatSAR } from "@/lib/money";
import type { PartyTypeValue } from "@/lib/validation";

export function PartyTypeBadge({ type }: { type: PartyTypeValue }) {
  return <Badge>{t.partyType[type]}</Badge>;
}

/** The name, with «(موقوف)» after an inactive one. */
export function partyLabel(name: string, active: boolean): string {
  return active ? name : `${name} (${t.status.DISABLED})`;
}

/**
 * v1.4 (D10, D17 c6): «اتفاقيات مفتوحة: المتبقي X» — informational, outside
 * the balance; rendered only when the party has an OPEN open-ended plan with
 * a ceiling (null hides it). Hidden in print like the statement header.
 */
export function OpenPlansRemainingLine({ halalas, className = "" }: { halalas: number | null; className?: string }) {
  if (halalas === null) return null;
  return (
    <span className={`no-print text-xs text-gray-600 ${className}`}>
      {t.openPlan.statementRemaining.replace("{amount}", formatSAR(halalas))}
    </span>
  );
}

export function PartyBalance({
  owedToUsHalalas,
  owedByUsHalalas,
  openPlansRemainingHalalas = null,
  className = "",
}: {
  owedToUsHalalas: number;
  owedByUsHalalas: number;
  /** v1.4 c6: the open-agreement line under لنا / علينا / لا رصيد. */
  openPlansRemainingHalalas?: number | null;
  className?: string;
}) {
  if (owedToUsHalalas === 0 && owedByUsHalalas === 0) {
    return (
      <span className={`flex flex-col gap-0.5 text-sm text-gray-600 ${className}`}>
        <span>{t.parties.settled}</span>
        <OpenPlansRemainingLine halalas={openPlansRemainingHalalas} />
      </span>
    );
  }
  return (
    <span className={`flex flex-col gap-0.5 text-sm ${className}`}>
      {owedToUsHalalas !== 0 ? (
        <span>
          <span className="text-gray-600">{t.parties.owedToUs}: </span>
          <MoneyText halalas={owedToUsHalalas} />
        </span>
      ) : null}
      {owedByUsHalalas !== 0 ? (
        <span>
          <span className="text-gray-600">{t.parties.owedByUs}: </span>
          <MoneyText halalas={owedByUsHalalas} />
        </span>
      ) : null}
      <OpenPlansRemainingLine halalas={openPlansRemainingHalalas} />
    </span>
  );
}
