/**
 * Navigation items per role, from docs/FRONTEND.md. They cross into a client
 * component, so an item names its icon instead of carrying the component.
 */
import { t } from "@/i18n/ar";
import type { NavIconName } from "../icons";

export type NavItem = { href: string; label: string; icon: NavIconName };

export const OWNER_NAV: NavItem[] = [
  { href: "/owner", label: t.nav.home, icon: "home" },
  { href: "/owner/transactions/new", label: t.nav.add, icon: "add" },
  { href: "/owner/transactions", label: t.nav.ledger, icon: "ledger" },
  { href: "/owner/reports", label: t.nav.reports, icon: "reports" },
  { href: "/owner/settings", label: t.nav.settings, icon: "settings" },
];

export const STAFF_NAV: NavItem[] = [
  { href: "/staff", label: t.nav.home, icon: "home" },
  { href: "/staff/transactions/new", label: t.nav.add, icon: "add" },
  { href: "/staff/transactions", label: t.nav.ledger, icon: "ledger" },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: t.nav.requests, icon: "requests" },
  { href: "/admin/establishments", label: t.nav.establishments, icon: "establishments" },
  { href: "/admin/account", label: t.nav.account, icon: "account" },
];

/**
 * The longest matching href wins, so /owner/transactions/new highlights إضافة
 * rather than both إضافة and السجل.
 */
export function activeHref(pathname: string, items: NavItem[]): string | null {
  let best: string | null = null;
  for (const item of items) {
    const matches =
      pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (matches && (best === null || item.href.length > best.length)) {
      best = item.href;
    }
  }
  return best;
}
