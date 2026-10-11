/**
 * Navigation per role, from docs/FRONTEND.md and docs/V14-SPEC.md §B. Items
 * cross into a client component, so an item names its icon instead of carrying
 * the component.
 *
 * The owner's navigation is grouped (v1.2a): headed groups in the side nav,
 * five fixed tabs plus المزيد on phones. Staff and admin keep a flat list, which
 * AppShell receives as a single unheaded group.
 *
 * v1.4: the entry model (links and the «+» add entry) and the sheet / tab-slot
 * helpers live in navSlots.ts and are re-exported here.
 */
import { t } from "@/i18n/ar";

import { ADD_SLOT, addEntry, addRows, isLink, type NavEntry, type NavGroup, type NavItem, type TabSlot } from "./navSlots";

export * from "./navSlots";

/**
 * The owner's groups. v1.5 (B2, D14): التقارير lives inside السجل as a tab, so
 * it is no longer an item — السجل highlights for /owner/reports* instead. (D15)
 * `hasSalaryEmployees` adds the «صرف راتب» row to the «+»; the links are the
 * same either way. The owner layout calls this with its one scoped read.
 */
export function ownerNavGroups({ hasSalaryEmployees }: { hasSalaryEmployees: boolean }): NavGroup[] {
  return [
    {
      key: "home",
      label: null,
      collapsible: false,
      items: [{ href: "/owner", label: t.nav.home, icon: "home", exact: true }],
    },
    {
      key: "add",
      label: null,
      collapsible: false,
      items: [addEntry(addRows("OWNER", { hasSalaryEmployees }))],
    },
    // D16 (a): السجل is top-level, no heading; v1.5 folds التقارير into it.
    {
      key: "ledger",
      label: null,
      collapsible: false,
      items: [
        { href: "/owner/transactions", label: t.nav.ledger, icon: "ledger", also: ["/owner/projects", "/owner/reports"] },
      ],
    },
    {
      key: "partiesAndCommitments",
      label: t.navGroup.partiesAndCommitments,
      collapsible: true,
      items: [
        { href: "/owner/parties", label: t.navItem.parties, icon: "parties" },
        { href: "/owner/plans", label: t.navItem.plans, icon: "plans" },
        { href: "/owner/dues", label: t.navItem.dues, icon: "dues", badge: t.navItem.overdueBadge },
      ],
    },
    {
      key: "staff",
      label: t.navGroup.staff,
      collapsible: true,
      items: [
        { href: "/owner/staff", label: t.navItem.staffList, icon: "staff" },
        { href: "/owner/staff/attendance", label: t.navItem.attendance, icon: "attendance" },
        { href: "/owner/staff/logins", label: t.navItem.logins, icon: "logins", badge: t.navItem.pendingBadge },
      ],
    },
    {
      key: "settings",
      label: t.navGroup.settings,
      collapsible: false,
      items: [
        { href: "/owner/settings/join-code", label: t.navItem.joinCode, icon: "joinCode" },
        { href: "/owner/settings/locks", label: t.navItem.locks, icon: "locks" },
        { href: "/owner/settings/reminders", label: t.navItem.reminders, icon: "reminders" },
        { href: "/owner/settings/account", label: t.navItem.account, icon: "account" },
      ],
    },
  ];
}

/** The owner's groups without the salary row — what tests and link-only callers read. */
export const OWNER_NAV_GROUPS: NavGroup[] = ownerNavGroups({ hasSalaryEmployees: false });

/**
 * The owner's phone tab bar, in order, before المزيد (B2, D13: the «+» sits
 * where «حركة جديدة» was). Every other owner item lives in the المزيد sheet.
 */
export const OWNER_TAB_HREFS: TabSlot[] = ["/owner", ADD_SLOT, "/owner/transactions", "/owner/dues"];

/**
 * B2: الرئيسية | + | السجل | [حضوري] | حسابي, where «حضوري» is only for a staff
 * login linked to an employee (the staff layout looks the link up; the
 * /staff/me pages re-check it — hiding the item is not the control).
 */
export function staffNav(linked: boolean): NavEntry[] {
  return [
    { href: "/staff", label: t.nav.home, icon: "home" },
    addEntry(addRows("STAFF", { linked })),
    { href: "/staff/transactions", label: t.nav.ledger, icon: "ledger" },
    ...(linked ? [{ href: "/staff/me", label: t.myAttendance.title, icon: "attendance" as const }] : []),
    { href: "/staff/account", label: t.nav.account, icon: "account" },
  ];
}

/** An unlinked staff login's nav. */
export const STAFF_NAV: NavEntry[] = staffNav(false);

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: t.nav.requests, icon: "requests" },
  { href: "/admin/establishments", label: t.nav.establishments, icon: "establishments" },
  { href: "/admin/account", label: t.nav.account, icon: "account" },
];

/** A flat list as one unheaded, always-open group. */
export function singleGroup(items: NavEntry[]): NavGroup[] {
  return [{ key: "main", label: null, collapsible: false, items }];
}

/** Every link of a role, in order — never an add entry. */
export function navItems(groups: NavGroup[]): NavItem[] {
  return groups.flatMap((g) => g.items.filter(isLink));
}

function prefixMatch(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** The length of the longest prefix of `item` that `pathname` falls under, or -1. */
function matchLength(pathname: string, item: NavItem): number {
  if (item.exact) return pathname === item.href ? item.href.length : -1;
  let best = prefixMatch(pathname, item.href) ? item.href.length : -1;
  for (const also of item.also ?? []) {
    if (prefixMatch(pathname, also) && also.length > best) best = also.length;
  }
  return best;
}

/**
 * The longest matching href wins, so /owner/transactions/abc/edit highlights
 * السجل alone. Run it over every link of a role (`navItems(groups)`), never
 * group by group, or each group would get its own winner. It only ever sees
 * links, so the «+» can never come back from it.
 */
export function activeHref(pathname: string, items: NavItem[]): string | null {
  let best: string | null = null;
  let bestLength = -1;
  for (const item of items) {
    const length = matchLength(pathname, item);
    if (length > bestLength) {
      best = item.href;
      bestLength = length;
    }
  }
  return best;
}

/** The key of the group holding the link `href`, or null. */
export function groupOf(groups: NavGroup[], href: string | null): string | null {
  if (href === null) return null;
  return groups.find((g) => g.items.some((i) => isLink(i) && i.href === href))?.key ?? null;
}
