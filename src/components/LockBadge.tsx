import Link from "next/link";

import { t } from "@/i18n/ar";

import { Badge } from "./Badge";
import { LockIcon } from "./icons";

/**
 * Marks a row or month whose entries can no longer be changed. v1.4 (D17 c4):
 * with `href` — the owner's ledger — a link «إقفال الأشهر» follows the badge;
 * without it (staff) the badge renders exactly as before, no <a> at all.
 */
export function LockBadge({ href }: { href?: string }) {
  const badge = (
    <Badge tone="neutral" icon={<LockIcon size={14} />}>
      {t.lock.badge}
    </Badge>
  );
  if (!href) return badge;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {badge}
      <Link
        href={href}
        className="no-print inline-flex min-h-11 items-center text-sm font-medium text-accent-dark underline"
      >
        {t.navItem.locks}
      </Link>
    </span>
  );
}

export default LockBadge;
