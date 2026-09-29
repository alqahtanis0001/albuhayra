import type { Metadata } from "next";

import { getJoinCode } from "@/features/establishments/queries";
import { JoinCodeTab } from "@/features/settings/components/JoinCodeTab";
import { t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";

export const metadata: Metadata = { title: t.navItem.joinCode };

export default async function JoinCodeSettingsPage() {
  const { establishmentId } = await requireOwner();
  const code = await getJoinCode(establishmentId);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">{t.navItem.joinCode}</h1>
      <JoinCodeTab code={code} />
    </div>
  );
}
