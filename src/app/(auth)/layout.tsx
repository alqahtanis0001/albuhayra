import type { ReactNode } from "react";

/**
 * The CSP carries a per-request nonce, and a statically prerendered page never
 * receives one — it would silently fail to hydrate (PROGRESS.md, Known issues).
 * The role areas are dynamic because their layouts call requireX(); these three
 * pages have no such call, so they say it out loud.
 */
export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
