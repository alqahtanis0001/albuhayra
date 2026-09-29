import type { Metadata } from "next";

import { ComingSoon } from "@/components/ComingSoon";
import { t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";

export const metadata: Metadata = { title: t.navItem.dues };

/** «قريباً» until v1.2a CP2 replaces it; the nav item already points here. */
export default async function OwnerDuesPage() {
  await requireOwner();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">{t.navItem.dues}</h1>
      <ComingSoon body={t.comingSoon.body} />
    </div>
  );
}
