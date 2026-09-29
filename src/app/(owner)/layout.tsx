import type { ReactNode } from "react";

import { AppShell } from "@/components/chrome/AppShell";
import { OWNER_NAV_GROUPS, OWNER_TAB_HREFS } from "@/components/chrome/nav";
import { requireOwner } from "@/lib/auth";

/**
 * Enforces OWNER for every page under /owner. Being a server component that
 * awaits requireOwner() is also what keeps the whole segment dynamic, so the
 * per-request CSP nonce reaches it.
 */
export default async function OwnerLayout({ children }: { children: ReactNode }) {
  const { user } = await requireOwner();
  // The المستحقات badge. CP1 has no agreements yet, so it stays 0 (hidden);
  // CP2 replaces this with getOverdueCount(establishmentId).
  const badges = { "/owner/dues": 0 };

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
