import type { ReactNode } from "react";

import { AppShell } from "@/components/chrome/AppShell";
import { OWNER_NAV_GROUPS, OWNER_TAB_HREFS } from "@/components/chrome/nav";
import { countPendingStaff } from "@/features/establishments/queries";
import { ensureSalaryInstalments } from "@/features/payroll/generate";
import { getOverdueCount } from "@/features/plans/dues";
import { requireOwner } from "@/lib/auth";

/**
 * Enforces OWNER for every page under /owner. Being a server component that
 * awaits requireOwner() is also what keeps the whole segment dynamic, so the
 * per-request CSP nonce reaches it.
 */
export default async function OwnerLayout({ children }: { children: ReactNode }) {
  const { user, establishmentId } = await requireOwner();
  // Salary months first (D2, cached per request), so the badge counts them.
  await ensureSalaryInstalments(establishmentId);
  // The المستحقات badge: overdue instalments, from the server's today; the
  // حسابات الدخول badge (v1.4 c10): pending join requests, a count only. Fresh
  // on every navigation; stale in between (accepted, V12).
  const [overdue, pendingStaff] = await Promise.all([
    getOverdueCount(establishmentId),
    countPendingStaff(establishmentId),
  ]);
  const badges = { "/owner/dues": overdue, "/owner/staff/logins": pendingStaff };

  return (
    <AppShell
      groups={OWNER_NAV_GROUPS}
      tabHrefs={OWNER_TAB_HREFS}
      badges={badges}
      userName={user.displayName}
      establishmentName={user.establishmentName}
      accountHref="/owner/settings/account"
    >
      {children}
    </AppShell>
  );
}
