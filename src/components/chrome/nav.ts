/**
 * Navigation per role, from docs/FRONTEND.md. Items cross into a client
 * component, so an item names its icon instead of carrying the component.
 *
 * The owner's navigation is grouped (v1.2a): headed groups in the side nav,
 * five fixed tabs plus المزيد on phones. Staff and admin keep a flat list, which
 * AppShell receives as a single unheaded group.
 */
import { t } from "@/i18n/ar";
import type { NavIconName } from "../navIcons";

export type NavItem = { href: string; label: string; icon: NavIconName };

export type NavGroup = {
  key: string;
  /** Null: no heading (الرئيسية, and the staff/admin lists). */
  label: string | null;
  /** New in v1.2a: collapsed in the side nav until the owner first uses it. */
  collapsible: boolean;
  items: NavItem[];
};

export const OWNER_NAV_GROUPS: NavGroup[] = [
  {
    key: "home",
    label: null,
    collapsible: false,
    items: [{ href: "/owner", label: t.nav.home, icon: "home" }],
  },
  {
    key: "finance",
    label: t.navGroup.finance,
    collapsible: false,
    items: [
      { href: "/owner/transactions/new", label: t.navItem.newEntry, icon: "add" },
      { href: "/owner/transactions", label: t.nav.ledger, icon: "ledger" },
      { href: "/owner/reports", label: t.nav.reports, icon: "reports" },
    ],
  },
  {
    key: "additions",
    label: t.navGroup.additions,
    collapsible: true,
    items: [
      { href: "/owner/projects", label: t.navItem.projectsList, icon: "projects" },
      { href: "/owner/projects/new", label: t.navItem.projectNew, icon: "projectNew" },
    ],
  },
  {
    key: "partiesAndCommitments",
    label: t.navGroup.partiesAndCommitments,
    collapsible: true,
    items: [
      { href: "/owner/parties", label: t.navItem.parties, icon: "parties" },
      { href: "/owner/plans", label: t.navItem.plans, icon: "plans" },
      { href: "/owner/dues", label: t.navItem.dues, icon: "dues" },
    ],
  },
  {
    key: "staff",
    label: t.navGroup.staff,
    collapsible: true,
    items: [
      { href: "/owner/staff", label: t.navItem.staffList, icon: "staff" },
      { href: "/owner/staff/attendance", label: t.navItem.attendance, icon: "attendance" },
      { href: "/owner/staff/logins", label: t.navItem.logins, icon: "logins" },
    ],
  },
  {
    key: "settings",
    label: t.navGroup.settings,
    collapsible: false,
    items: [
      { href: "/owner/settings/categories", label: t.navItem.categories, icon: "categories" },
      { href: "/owner/settings/join-code", label: t.navItem.joinCode, icon: "joinCode" },
      { href: "/owner/settings/locks", label: t.navItem.locks, icon: "locks" },
      { href: "/owner/settings/account", label: t.navItem.account, icon: "account" },
    ],
  },
];

/**
 * The owner's phone tab bar, in order, before المزيد. Every other owner item
 * lives in the المزيد sheet.
 */
export const OWNER_TAB_HREFS = [
  "/owner",
  "/owner/transactions/new",
  "/owner/transactions",
  "/owner/dues",
];

/**
 * Spec §1: الرئيسية | حركة جديدة | السجل | حضوري | حسابي, where «حضوري» is
 * only for a staff login linked to an employee (the staff layout looks the link
 * up; the /staff/me pages re-check it — hiding the item is not the control).
 */
export function staffNav(linked: boolean): NavItem[] {
  return [
    { href: "/staff", label: t.nav.home, icon: "home" },
    { href: "/staff/transactions/new", label: t.navItem.newEntry, icon: "add" },
    { href: "/staff/transactions", label: t.nav.ledger, icon: "ledger" },
    ...(linked ? [{ href: "/staff/me", label: t.myAttendance.title, icon: "attendance" as const }] : []),
    { href: "/staff/account", label: t.nav.account, icon: "account" },
  ];
}

/** An unlinked staff login's nav. */
export const STAFF_NAV: NavItem[] = staffNav(false);

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: t.nav.requests, icon: "requests" },
  { href: "/admin/establishments", label: t.nav.establishments, icon: "establishments" },
  { href: "/admin/account", label: t.nav.account, icon: "account" },
];

/** A flat list as one unheaded, always-open group. */
export function singleGroup(items: NavItem[]): NavGroup[] {
  return [{ key: "main", label: null, collapsible: false, items }];
}

export function navItems(groups: NavGroup[]): NavItem[] {
  return groups.flatMap((g) => g.items);
}

/**
 * The longest matching href wins, so /owner/transactions/new highlights حركة
 * جديدة rather than both it and السجل. Run it over every item of a role
 * (`navItems(groups)`), never group by group, or each group would get its own
 * winner.
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

/** The key of the group holding `href`, or null. */
export function groupOf(groups: NavGroup[], href: string | null): string | null {
  if (href === null) return null;
  return groups.find((g) => g.items.some((i) => i.href === href))?.key ?? null;
}
