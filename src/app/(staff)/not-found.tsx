import type { Metadata } from "next";
import Link from "next/link";

import { t } from "@/i18n/ar";
import { homePathFor } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: t.notFound.title };

/**
 * notFound() from a staff page (an entry id that is missing or not in this
 * establishment — the two are indistinguishable by design). Rendered inside the
 * group layout, so the top bar and nav stay. The layout has already gated the
 * role; the cookie is read here only to choose the link, as in the root file.
 */
export default async function StaffNotFound() {
  const session = await getSession();
  const role = session.userId ? session.role : undefined;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 text-start">
      <p className="text-sm font-semibold tabular-nums text-accent-dark">404</p>
      <h1 className="mt-1 text-xl font-semibold text-gray-900">{t.notFound.title}</h1>
      <p className="mt-2 text-sm text-gray-600">{t.notFound.body}</p>
      <Link
        href={role ? homePathFor(role) : "/login"}
        className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-accent px-4 font-medium text-white hover:bg-accent-dark"
      >
        {role ? t.notFound.backHome : t.notFound.toLogin}
      </Link>
    </section>
  );
}
