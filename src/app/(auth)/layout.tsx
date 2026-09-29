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
    <div className="flex min-h-dvh flex-col border-t-4 border-t-accent">
      <main className="flex flex-1 items-center justify-center p-4">
        <div id="main" className="w-full max-w-md">
          <RouteTransition>{children}</RouteTransition>
        </div>
      </main>
      <Footer />
    </div>
  );
}
