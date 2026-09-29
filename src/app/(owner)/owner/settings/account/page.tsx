import type { Metadata } from "next";

import { ChangePasswordForm } from "@/features/settings/components/ChangePasswordForm";
import { t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";

export const metadata: Metadata = { title: t.navItem.account };

export default async function OwnerAccountPage() {
  // changeOwnPassword acts on the caller's own row; this call gates the page.
  await requireOwner();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">{t.navItem.account}</h1>
      <ChangePasswordForm />
    </div>
  );
}
