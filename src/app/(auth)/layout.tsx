import type { ReactNode } from "react";

import { Footer } from "@/components/chrome/Footer";
import { RouteTransition } from "@/components/chrome/RouteTransition";

/**
 * The CSP carries a per-request nonce, and a statically prerendered page never
 * receives one — it would silently fail to hydrate (PROGRESS.md, Known issues).
 * The role areas are dynamic because their layouts call requireX(); these three
 * pages have no such call, so they say it out loud.
 */
export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    // The art carries its own gold top rule, so the old green border-top is gone.
    // The card starts on the green band and overlaps its lower edge; everything
    // readable sits inside the white card (AuthCard), so no text lands on green.
    <div className="auth-bg flex min-h-dvh flex-col">
      <main className="flex flex-1 justify-center px-4 pt-20 pb-10 sm:pt-32 md:pt-44">
        <div id="main" className="w-full max-w-md">
          <RouteTransition>{children}</RouteTransition>
        </div>
      </main>
      <Footer />
    </div>
  );
}
