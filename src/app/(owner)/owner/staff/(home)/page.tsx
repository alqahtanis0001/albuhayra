import type { Metadata } from "next";

import { ComingSoon } from "@/components/ComingSoon";
import { LinkButton } from "@/components/LinkButton";
import { t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";

export const metadata: Metadata = { title: t.navItem.staffList };

/** Staff records arrive in v1.2b; logins already live in حسابات الدخول. */
export default async function OwnerStaffPage() {
  await requireOwner();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">{t.navItem.staffList}</h1>
      <ComingSoon
        body={t.comingSoon.staffBody}
        action={
          <LinkButton href="/owner/staff/logins" variant="secondary">
            {t.comingSoon.toLogins}
          </LinkButton>
        }
      />
    </div>
  );
}
