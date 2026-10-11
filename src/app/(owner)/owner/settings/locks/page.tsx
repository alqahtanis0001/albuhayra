import type { Metadata } from "next";
import Link from "next/link";

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
      {/* v1.4 (D17 c4): the ledger's «شهر مقفل» links here, so the way back is one tap. */}
      <Link
        href="/owner/transactions"
        className="no-print inline-flex min-h-11 items-center self-start text-sm font-medium text-accent-dark hover:underline"
      >
        {t.settings.backToLedger}
      </Link>
      <LocksTab locks={locks} />
    </div>
  );
}
