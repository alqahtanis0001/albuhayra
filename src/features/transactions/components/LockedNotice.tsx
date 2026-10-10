import Link from "next/link";

import { LockBadge } from "@/components/LockBadge";
import { t } from "@/i18n/ar";

/**
 * Shown above the form when the month in play is closed. v1.4 (D17 c4): owner
 * pages pass `href` and get a link to «إقفال الأشهر»; staff pages pass nothing
 * and render no link at all.
 */
export function LockedNotice({ hint, href }: { hint?: string; href?: string }) {
  return (
    <div
      role="status"
      className="flex flex-col gap-1 rounded-lg border border-amber-300 bg-amber-50 p-3"
    >
      <div className="flex items-center gap-2">
        <LockBadge />
        <p className="text-sm font-semibold text-amber-900">
          {t.lock.blockedTitle}
        </p>
      </div>
      <p className="text-sm text-amber-800">{hint ?? t.lock.blockedHint}</p>
      {href ? (
        <Link
          href={href}
          className="inline-flex min-h-11 items-center self-start text-sm font-medium text-accent-dark underline"
        >
          {t.navItem.locks}
        </Link>
      ) : null}
    </div>
  );
}

export default LockedNotice;
