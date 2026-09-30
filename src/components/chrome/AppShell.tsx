/**
 * Per-role chrome: skip link, full-width top bar, then side nav from md and the
 * content column, with the footer under the content; bottom tab bar below md.
 * Content is capped at max-w-3xl and centred (docs/FRONTEND.md). The
 * navigation progress bar is mounted once here, outside the nav and #main, so
 * no stacking context or the fade's transform can hide or move it.
 */
import type { ReactNode } from "react";

import { t } from "@/i18n/ar";

import { NavProgress, NavProgressProvider } from "../NavProgress";
import { Footer } from "./Footer";
import { BottomTabs, SideNav, type Badges } from "./RoleNav";
import { RouteTransition } from "./RouteTransition";
import { TopBar } from "./TopBar";
import type { NavGroup } from "./nav";

export type AppShellProps = {
  groups: NavGroup[];
  /** Phone tab bar hrefs; the rest go to المزيد. Omit: every item is a tab. */
  tabHrefs?: string[];
  /** Count badges by item href (v1.2a: overdue on /owner/dues); 0 hides one. */
  badges?: Badges;
  userName: string;
  establishmentName?: string | null;
  accountHref: string;
  children: ReactNode;
};

export function AppShell({
  groups,
  tabHrefs,
  badges,
  userName,
  establishmentName,
  accountHref,
  children,
}: AppShellProps) {
  return (
    <NavProgressProvider>
      <div className="flex min-h-dvh flex-col">
        <NavProgress />

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
          <SideNav groups={groups} badges={badges} label={t.nav.menu} />

          {/* The page art (v1.3) sits behind this column only; the side nav,
              top bar, footer and every card keep their own solid fills. */}
          <div className="app-bg flex min-w-0 flex-1 flex-col">
            <main id="main" className="mx-auto w-full max-w-3xl flex-1 p-4 md:pb-6">
              <RouteTransition>{children}</RouteTransition>
            </main>
            {/* The room the tab bar needs on phones now sits under the footer,
                so the footer stays readable above the bar. */}
            <Footer className="safe-bottom-space" />
          </div>
        </div>

        <BottomTabs groups={groups} tabHrefs={tabHrefs} badges={badges} label={t.nav.menu} />
      </div>
    </NavProgressProvider>
  );
}

export default AppShell;
