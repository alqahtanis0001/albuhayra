import type { ReactNode } from "react";

import { AppShell } from "@/components/chrome/AppShell";
import { ADMIN_NAV } from "@/components/chrome/nav";
import { requireAdmin } from "@/lib/auth";

/**
 * Enforces ADMIN for every page under /admin, and keeps the segment dynamic.
 * The ADMIN belongs to no establishment, so the top bar shows no name here —
 * and no page in this area ever renders an amount.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user } = await requireAdmin();

  return (
    <AppShell
      items={ADMIN_NAV}
      userName={user.displayName}
      establishmentName={null}
      accountHref="/admin/account"
    >
      {children}
    </AppShell>
  );
}
