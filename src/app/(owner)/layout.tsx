import type { ReactNode } from "react";

import { AppShell } from "@/components/chrome/AppShell";
import { OWNER_TAB_HREFS, ownerNavGroups } from "@/components/chrome/nav";
import { hasSalaryEmployees } from "@/features/employees/salaryPick";
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
  // on every navigation; stale in between (accepted, V12). v1.5 (D15, D21):
  // whether the «+» sheet offers «صرف راتب» — one scoped boolean.
  const [overdue, pendingStaff, salaried] = await Promise.all([
    getOverdueCount(establishmentId),
    countPendingStaff(establishmentId),
    hasSalaryEmployees(establishmentId),
  ]);
  const badges = { "/owner/dues": overdue, "/owner/staff/logins": pendingStaff };

  return (
    <AppShell
      groups={ownerNavGroups({ hasSalaryEmployees: salaried })}
      tabHrefs={OWNER_TAB_HREFS}
      badges={badges}
      userName={user.displayName}
      establishmentName={user.establishmentName}
      accountHref="/owner/settings/account"
      role="OWNER"
    >
      {children}
    </AppShell>
  );
}
