import type { Metadata } from "next";

import { createParty } from "@/features/parties/actions";
import { PartyForm } from "@/features/parties/components/PartyForm";
import { t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";

export const metadata: Metadata = { title: t.parties.newTitle };

export default async function NewPartyPage() {
  await requireOwner();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">{t.parties.newTitle}</h1>
      <PartyForm action={createParty} />
    </div>
  );
}
