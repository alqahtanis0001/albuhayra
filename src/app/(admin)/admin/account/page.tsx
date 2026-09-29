import type { Metadata } from "next";

import { ChangePasswordForm } from "@/features/settings/components/ChangePasswordForm";
import { t } from "@/i18n/ar";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: t.nav.account };

export default async function AdminAccountPage() {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">{t.nav.account}</h1>
      <ChangePasswordForm />
    </div>
  );
}
