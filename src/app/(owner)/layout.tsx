import type { ReactNode } from "react";

import { AppShell } from "@/components/chrome/AppShell";
import { OWNER_NAV } from "@/components/chrome/nav";
import { requireOwner } from "@/lib/auth";

/**
 * Enforces OWNER for every page under /owner. Being a server component that
 * awaits requireOwner() is also what keeps the whole segment dynamic, so the
 * per-request CSP nonce reaches it.
 */
export default async function OwnerLayout({ children }: { children: ReactNode }) {
  const { user } = await requireOwner();

  return (
    <AppShell
      items={OWNER_NAV}
      userName={user.displayName}
      establishmentName={user.establishmentName}
      accountHref="/owner/settings?tab=account"
    >
      {children}
    </AppShell>
  );
}
