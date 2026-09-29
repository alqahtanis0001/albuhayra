import type { ReactNode } from "react";

import { AppShell } from "@/components/chrome/AppShell";
import { STAFF_NAV, singleGroup } from "@/components/chrome/nav";
import { requireStaff } from "@/lib/auth";

/** Enforces STAFF for every page under /staff, and keeps the segment dynamic. */
export default async function StaffLayout({ children }: { children: ReactNode }) {
  const { user } = await requireStaff();

  return (
    <AppShell
      groups={singleGroup(STAFF_NAV)}
      userName={user.displayName}
      establishmentName={user.establishmentName}
      accountHref="/staff/account"
    >
      {children}
    </AppShell>
  );
}
