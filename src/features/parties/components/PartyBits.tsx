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
import type { PartyTypeValue } from "@/lib/validation";

export function PartyTypeBadge({ type }: { type: PartyTypeValue }) {
  return <Badge>{t.partyType[type]}</Badge>;
}

/** The name, with «(موقوف)» after an inactive one. */
export function partyLabel(name: string, active: boolean): string {
  return active ? name : `${name} (${t.status.DISABLED})`;
}

export function PartyBalance({
  owedToUsHalalas,
  owedByUsHalalas,
  className = "",
}: {
  owedToUsHalalas: number;
  owedByUsHalalas: number;
  className?: string;
}) {
  if (owedToUsHalalas === 0 && owedByUsHalalas === 0) {
    return <span className={`text-sm text-gray-600 ${className}`}>{t.parties.settled}</span>;
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
    </span>
  );
}
