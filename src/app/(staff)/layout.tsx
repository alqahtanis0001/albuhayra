import type { ReactNode } from "react";

import { AppShell } from "@/components/chrome/AppShell";
import { singleGroup, staffNav } from "@/components/chrome/nav";
import { hasEmployeeLink } from "@/features/attendance/own";
import { requireStaff } from "@/lib/auth";

/** Enforces STAFF for every page under /staff, and keeps the segment dynamic. */
export default async function StaffLayout({ children }: { children: ReactNode }) {
  const { user, establishmentId } = await requireStaff();
  // «حضوري» only for a login linked to an employee (spec §1). Showing the item
  // is not the control: every /staff/me page re-checks the link itself.
  const linked = await hasEmployeeLink(establishmentId, user.id);

  return (
    <AppShell
      groups={singleGroup(staffNav(linked))}
      userName={user.displayName}
      establishmentName={user.establishmentName}
      accountHref="/staff/account"
    >
      {children}
    </AppShell>
  );
}
