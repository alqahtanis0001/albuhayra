import type { Metadata } from "next";

import { ThemeSegmentedServer } from "@/components/chrome/ThemeSegmentedServer";
import { ChangePasswordForm } from "@/features/settings/components/ChangePasswordForm";
import { t } from "@/i18n/ar";
import { requireStaff } from "@/lib/auth";

export const metadata: Metadata = { title: t.nav.account };

export default async function StaffAccountPage() {
  // `changeOwnPassword` uses requireUser() and acts on the caller's own row, so
  // the same form serves every role without a staff-specific variant.
  await requireStaff();

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
