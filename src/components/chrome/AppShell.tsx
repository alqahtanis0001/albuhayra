/**
 * Per-role chrome: skip link, top bar, side nav from md, bottom tab bar below.
 * Content is capped at max-w-3xl and centred (docs/FRONTEND.md).
 */
import type { ReactNode } from "react";

import { t } from "@/i18n/ar";

import { BottomTabs, SideNav } from "./RoleNav";
import { TopBar } from "./TopBar";
import type { NavItem } from "./nav";

export type AppShellProps = {
  items: NavItem[];
  userName: string;
  establishmentName?: string | null;
  accountHref: string;
  children: ReactNode;
};

export function AppShell({
  items,
  userName,
  establishmentName,
  accountHref,
  children,
}: AppShellProps) {
  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:start-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2"
      >
        {t.a11y.skipToContent}
      </a>

      <SideNav items={items} label={t.nav.menu} />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          userName={userName}
          establishmentName={establishmentName}
          accountHref={accountHref}
        />
        <main
          id="main"
          className="safe-bottom-space mx-auto w-full max-w-3xl flex-1 p-4 md:pb-6"
        >
          {children}
        </main>
      </div>

      <BottomTabs items={items} label={t.nav.menu} />
    </div>
  );
}

export default AppShell;
