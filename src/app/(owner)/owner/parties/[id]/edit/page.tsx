import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Card } from "@/components/Card";
import { LinkButton } from "@/components/LinkButton";
import { updateParty } from "@/features/parties/actions";
import { PartyForm } from "@/features/parties/components/PartyForm";
import { getParty } from "@/features/parties/queries";
import { t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";

export const metadata: Metadata = { title: t.parties.editTitle };

export default async function EditPartyPage({ params }: { params: Promise<{ id: string }> }) {
  const { establishmentId } = await requireOwner();
  // The id comes from the route only; another establishment's reads as missing.
  const { id } = await params;
  const party = await getParty(establishmentId, id);
  if (!party) notFound();
  const { employeeId } = party;
  // D14: an employee's party is edited from the profile; say so and link there.
  if (employeeId) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold text-gray-900">{t.parties.editTitle}</h1>
        <Card>
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-gray-700">{t.err.partyIsEmployee}</p>
            <LinkButton href={`/owner/staff/${employeeId}/edit`} variant="secondary">
              {t.employees.openProfile}
            </LinkButton>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">{t.parties.editTitle}</h1>
      <PartyForm
        action={updateParty.bind(null, party.id)}
        partyId={party.id}
        initial={{
          name: party.name,
          type: party.type,
          phone: party.phone ?? "",
          email: party.email ?? "",
          notes: party.notes ?? "",
        }}
      />
    </div>
  );
}
