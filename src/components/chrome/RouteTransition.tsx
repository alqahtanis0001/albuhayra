"use client";

/**
 * Route transitions (docs/FRONTEND.md, Motion v1.1d). Wraps the content area
 * only — never the top bar or the nav, which stay still.
 *
 * A layout persists across navigations, so a plain <ViewTransition> here would
 * never see an enter or exit. Keying it on the pathname makes each route change
 * an exit of the old content and an enter of the new; a search-param change
 * (ledger filters, report range) keeps the key, so it does not animate.
 *
 * Division of labour, so browsers without the View Transitions API still move:
 * - the *outgoing* fade is the view transition's `route-exit` class;
 * - the *incoming* slide + fade is a plain CSS animation on `#main > *`, which
 *   also plays when a loading skeleton is replaced by the real page (a Suspense
 *   reveal the keyed transition cannot see). `route-enter` therefore sets no
 *   animation of its own; the live snapshot shows the element's CSS animation.
 * Everything else is `none`: no morphs, no animation on unrelated transitions
 * such as a form action updating the page.
 */
import { ViewTransition, type ReactNode } from "react";
import { usePathname } from "next/navigation";

export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <ViewTransition key={pathname} enter="route-enter" exit="route-exit" default="none">
      {children}
    </ViewTransition>
  );
}

export default RouteTransition;
