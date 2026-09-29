import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Card } from "@/components/Card";
import { PartyActions } from "@/features/parties/components/PartyActions";
import {
  PartyBalance,
  PartyTypeBadge,
  partyLabel,
} from "@/features/parties/components/PartyBits";
import { getParty } from "@/features/parties/queries";
import { t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";

export const metadata: Metadata = { title: t.parties.title };

/**
 * A party's page: the contact card and its controls. CP2 adds the كشف حساب
 * below. An unknown id and another establishment's id both reach notFound().
 */
export default async function PartyPage({ params }: { params: Promise<{ id: string }> }) {
  const { establishmentId } = await requireOwner();
  const { id } = await params;
  const party = await getParty(establishmentId, id);
  if (!party) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold text-gray-900">
          {partyLabel(party.name, party.active)}
        </h1>
        <PartyTypeBadge type={party.type} />
      </div>

      <Card>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
          <dt className="text-gray-600">{t.parties.phone}</dt>
          <dd>
            {party.phone ? (
              <a href={`tel:${party.phone}`} dir="ltr" className="text-accent-dark tabular-nums underline-offset-2 hover:underline">
                {party.phone}
              </a>
            ) : (
              "—"
            )}
          </dd>
          <dt className="text-gray-600">{t.parties.email}</dt>
          <dd>
            {party.email ? (
              <a href={`mailto:${party.email}`} dir="ltr" className="break-all text-accent-dark underline-offset-2 hover:underline">
                {party.email}
              </a>
            ) : (
              "—"
            )}
          </dd>
          <dt className="text-gray-600">{t.statement.balance}</dt>
          <dd>
            <PartyBalance
              owedToUsHalalas={party.owedToUsHalalas}
              owedByUsHalalas={party.owedByUsHalalas}
            />
            <span className="text-xs text-gray-600">{t.parties.balanceHint}</span>
          </dd>
          {party.notes ? (
            <>
              <dt className="text-gray-600">{t.parties.notes}</dt>
              <dd className="whitespace-pre-line">{party.notes}</dd>
            </>
          ) : null}
        </dl>
      </Card>

      <PartyActions partyId={party.id} active={party.active} hasHistory={party.hasHistory} />
    </div>
  );
}
