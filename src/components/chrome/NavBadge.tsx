/**
 * The count badge on a nav item (v1.2a: overdue instalments on المستحقات).
 * Hidden at 0; «99+» above 99. White on money-out (6.47:1). Never colour
 * alone: the visible number is aria-hidden and the item's accessible name gets
 * the full counted phrase instead, e.g. «3 دفعات متأخرة».
 */
import { t } from "@/i18n/ar";
import { plural } from "@/lib/plural";

export function badgeText(count: number): string | null {
  if (!Number.isFinite(count) || count <= 0) return null;
  return count > 99 ? "99+" : String(Math.floor(count));
}

export function NavBadge({ count, className = "" }: { count: number; className?: string }) {
  const text = badgeText(count);
  if (text === null) return null;
  return (
    <>
      <span
        aria-hidden="true"
        className={`inline-flex min-w-5 items-center justify-center rounded-full bg-money-out px-1.5 text-xs leading-5 font-semibold text-white ${className}`}
      >
        {text}
      </span>
      <span className="sr-only">{plural(t.navItem.overdueBadge, Math.floor(count))}</span>
    </>
  );
}
