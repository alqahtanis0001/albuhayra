import type { Metadata } from "next";

import { ThemeSegmentedServer } from "@/components/chrome/ThemeSegmentedServer";
import { ChangePasswordForm } from "@/features/settings/components/ChangePasswordForm";
import { t } from "@/i18n/ar";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: t.nav.account };

export default async function AdminAccountPage() {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">{t.nav.account}</h1>
      {/* v1.5 follow-up (D46): no «المزيد» here, so below 480 px the theme
          control sits at the top of «حسابي»; it hides itself from 480 px. */}
      <ThemeSegmentedServer />
      <ChangePasswordForm />
    </div>
  );
}
