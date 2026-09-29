import type { Metadata } from "next";

import { ComingSoon } from "@/components/ComingSoon";
import { t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";

export const metadata: Metadata = { title: t.navItem.attendance };

/** Attendance arrives in v1.2b. */
export default async function OwnerAttendancePage() {
  await requireOwner();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">{t.navItem.attendance}</h1>
      <ComingSoon body={t.comingSoon.attendanceBody} />
    </div>
  );
}
