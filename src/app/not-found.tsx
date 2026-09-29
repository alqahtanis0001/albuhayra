import type { Metadata } from "next";
import Link from "next/link";

import { t } from "@/i18n/ar";
import { homePathFor } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: t.notFound.title };

/**
 * Every unmatched URL, outside any role chrome. The cookie is read only to
 * choose the one link — the role's home, else /login — exactly as the root
 * page does. It authorises nothing (the link target enforces access) and never
 * calls requireX(), which would redirect instead of answering 404. Reading the
 * cookie also keeps this page dynamic, so it receives the CSP nonce.
 */
export default async function NotFound() {
  const session = await getSession();
  const role = session.userId ? session.role : undefined;

  return (
    <main id="main" className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          {/* Served as-is from public/brand; the attributes carry the real
              3897×707 ratio so nothing shifts on load. */}
          <img
            src="/brand/zakham-brand/zakham-wordmark-green.png"
            alt={t.brand.logoAlt}
            width={3897}
            height={707}
            className="h-10 w-auto shrink-0"
          />
        </div>

        <section className="rounded-lg border border-t-4 border-gray-300 border-t-accent bg-white p-5 text-start">
          <p className="text-sm font-semibold tabular-nums text-accent-dark">404</p>
          <h1 className="mt-1 text-lg font-bold text-gray-900">{t.notFound.title}</h1>
          <p className="mt-2 text-sm text-gray-600">{t.notFound.body}</p>
          <Link
            href={role ? homePathFor(role) : "/login"}
            className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-accent px-4 font-medium text-white hover:bg-accent-dark"
          >
            {role ? t.notFound.backHome : t.notFound.toLogin}
          </Link>
        </section>
      </div>
    </main>
  );
}
