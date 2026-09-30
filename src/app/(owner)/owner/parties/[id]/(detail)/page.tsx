import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Card } from "@/components/Card";
import { LinkButton } from "@/components/LinkButton";
import { PartyActions } from "@/features/parties/components/PartyActions";
import {
  PartyBalance,
  PartyTypeBadge,
  partyLabel,
} from "@/features/parties/components/PartyBits";
import { PartyStatementView } from "@/features/parties/components/PartyStatementView";
import { getPartyStatement } from "@/features/parties/statement";
import { ensureSalaryInstalments } from "@/features/payroll/generate";
import { PrintButton } from "@/features/reports/components/PrintButton";
import { PrintFooter } from "@/features/reports/components/PrintFooter";
import { PrintHeader } from "@/features/reports/components/PrintHeader";
import { t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";
import { todayISO } from "@/lib/dates";

export const metadata: Metadata = { title: t.parties.title };

/**
 * A party's page: the contact card and its controls, then its كشف حساب —
 * printable on its own (the card and controls stay off the sheet). An unknown
 * id and another establishment's id both reach notFound().
 */
export default async function PartyPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, establishmentId } = await requireOwner();
  // D2: this month's salary rows exist before anything reads them (cached per request).
  await ensureSalaryInstalments(establishmentId);
  const { id } = await params;
  const statement = await getPartyStatement(establishmentId, id);
  if (!statement) notFound();
  const { party } = statement;
  const { employeeId } = party;

  return (
    <div className="flex flex-col gap-4">
      <PrintHeader
        establishmentName={user.establishmentName}
        title={t.print.statementTitle}
        subject={party.name}
        printedAt={todayISO()}
      />

      <div className="no-print flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold text-gray-900">
          {partyLabel(party.name, party.active)}
        </h1>
        <PartyTypeBadge type={party.type} />
      </div>

      <Card className="no-print">
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

      {employeeId ? (
        // D14: an employee's party is managed from the profile.
        <div className="no-print flex flex-col items-start gap-2">
          <LinkButton href={`/owner/staff/${employeeId}`} variant="secondary">
            {t.employees.openProfile}
          </LinkButton>
          <p className="text-xs text-gray-600">{t.err.partyIsEmployee}</p>
        </div>
      ) : (
        <PartyActions partyId={party.id} active={party.active} hasHistory={party.hasHistory} />
      )}

      <PartyStatementView statement={statement} />
      <div className="no-print">
        <PrintButton label={t.statement.print} />
      </div>
      <PrintFooter />
    </div>
  );
}
