import Link from "next/link";

import { t } from "@/i18n/ar";

import { Badge } from "./Badge";
import { LockIcon } from "./icons";

/**
 * Marks a row or month whose entries can no longer be changed. v1.4 (D17 c4):
 * with `href` — the owner's ledger — a link «إقفال الأشهر» follows the badge;
 * without it (staff) the badge renders as before, no <a> at all. v1.4 part 3
 * (R15): the badge looked tappable, so each arm carries a `title` — the owner's
 * says where to unlock and is also written out beside the link; staff's says
 * only that the month is locked.
 */
export function LockBadge({ href }: { href?: string }) {
  const badge = (
    <Badge tone="neutral" icon={<LockIcon size={14} />}>
      {t.lock.badge}
    </Badge>
  );
  if (!href) return <span title={t.lock.badgeHintStaff}>{badge}</span>;
  return (
    <span title={t.lock.badgeHintOwner} className="inline-flex flex-wrap items-center gap-2">
      {badge}
      {/* Reviewer R1 S1: the line is a screen hint, not content — never printed on a locked row. */}
      <span className="no-print text-xs text-gray-600">{t.lock.badgeHintOwner}</span>
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
