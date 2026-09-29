import type { Metadata } from "next";

import { listLocks } from "@/features/locks/queries";
import { LocksTab } from "@/features/settings/components/LocksTab";
import { t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";

export const metadata: Metadata = { title: t.navItem.locks };

export default async function LocksSettingsPage() {
  const { establishmentId } = await requireOwner();
  const locks = await listLocks(establishmentId);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">{t.navItem.locks}</h1>
      <LocksTab locks={locks} />
    </div>
  );
}
