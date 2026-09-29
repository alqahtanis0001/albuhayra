/**
 * Per-role chrome: skip link, full-width top bar, then side nav from md and the
 * content column, with the footer under the content; bottom tab bar below md.
 * Content is capped at max-w-3xl and centred (docs/FRONTEND.md).
 */
import type { ReactNode } from "react";

import { t } from "@/i18n/ar";

import { Footer } from "./Footer";
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
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:start-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2"
      >
        {t.a11y.skipToContent}
      </a>

      <TopBar
        userName={userName}
        establishmentName={establishmentName}
        accountHref={accountHref}
      />

      <div className="flex flex-1">
        <SideNav items={items} label={t.nav.menu} />

        <div className="flex min-w-0 flex-1 flex-col">
          <main id="main" className="mx-auto w-full max-w-3xl flex-1 p-4 md:pb-6">
            {children}
          </main>
          {/* The room the tab bar needs on phones now sits under the footer,
              so the footer stays readable above the bar. */}
          <Footer className="safe-bottom-space" />
        </div>
      </div>

      <BottomTabs items={items} label={t.nav.menu} />
    </div>
  );
}

export default AppShell;
