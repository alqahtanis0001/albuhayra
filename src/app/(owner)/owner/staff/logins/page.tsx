import type { Metadata } from "next";

import { listStaff } from "@/features/establishments/queries";
import { StaffTab } from "@/features/settings/components/StaffTab";
import { t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";

export const metadata: Metadata = { title: t.navItem.logins };

export default async function StaffLoginsPage() {
  const { establishmentId } = await requireOwner();
  const staff = await listStaff(establishmentId);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">{t.navItem.logins}</h1>
      <StaffTab staff={staff} />
    </div>
  );
}
