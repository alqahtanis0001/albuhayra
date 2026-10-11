/**
 * v1.4 (docs/V14-SPEC.md §B): the nav's entry model and the «+» / tab-slot
 * helpers, split out of nav.ts (reviewer round 1) and re-exported from it, so
 * every import of `./nav` still holds. Pure; no component code.
 *
 * Every "add" action lives behind one «+» entry — a primary-styled control that
 * opens AddSheet, never a link. It is a separate entry kind with no `href`, so
 * `activeHref()` structurally cannot return it: everything that wants links goes
 * through `navItems()` (nav.ts).
 */
import { t } from "@/i18n/ar";
import type { Role } from "@/lib/permissions";
import type { PluralForms } from "@/lib/plural";

import type { NavIconName } from "../navIcons";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIconName;
  /** Extra path prefixes this item also highlights for (v1.4: السجل ← /owner/projects/*). */
  also?: string[];
  /** Match the path exactly, never as a prefix (v1.4 A2: the role root /owner). */
  exact?: boolean;
  /** Accessible phrase for a count badge on this item; default: the overdue phrase. */
  badge?: PluralForms;
};

/** One row of the «+» sheet (B1). `hint` (v1.4 part 3 R16): a second, smaller line under the label. */
export type AddRow = { href: string; label: string; icon: NavIconName; hint?: string };

/** The «+» entry: opens AddSheet. No `href` by construction. */
export type AddEntry = { kind: "add"; label: string; rows: AddRow[] };

export type NavEntry = NavItem | AddEntry;

export function isAdd(entry: NavEntry): entry is AddEntry {
  return "kind" in entry && entry.kind === "add";
}

export function isLink(entry: NavEntry): entry is NavItem {
  return !isAdd(entry);
}

export type NavGroup = {
  key: string;
  /** Null: no heading (الرئيسية, السجل/التقارير, and the staff/admin lists). */
  label: string | null;
  /** New in v1.2a: collapsed in the side nav until the owner first uses it. */
  collapsible: boolean;
  items: NavEntry[];
};

/** A group after the add entries are gone — what the المزيد sheet renders. */
export type LinkGroup = Omit<NavGroup, "items"> & { items: NavItem[] };

/** B3 row 3: the employees list in salary pick mode. */
export const SALARY_PICK_HREF = "/owner/staff?pick=salary";

/** What decides the optional rows: the staff login's employee link, the owner's salaried employees. */
export type AddRowFlags = {
  /** STAFF: linked to an employee → «تسجيل حضوري». */
  linked?: boolean;
  /** OWNER (v1.5 D15, D21): an ACTIVE employee with an OPEN salary plan → «صرف راتب». */
  hasSalaryEmployees?: boolean;
};

/**
 * The «+» sheet's rows, in spec order (v1.5 B3: seven owner rows, each with a
 * caption). `linked` is the staff login's employee link and
 * `hasSalaryEmployees` the owner layout's one scoped read; the pages behind the
 * rows re-check their own access — hiding a row is not the control. Admin has
 * no «+».
 */
export function addRows(role: Role, flags: AddRowFlags = {}): AddRow[] {
  if (role === "OWNER") {
    return [
      { href: "/owner/transactions/new", label: t.addSheet.newEntry, icon: "add", hint: t.addHints.newEntry },
      { href: "/owner/plans?pick=payment", label: t.addSheet.recordPayment, icon: "dues", hint: t.addHints.recordPayment },
      ...(flags.hasSalaryEmployees
        ? [{ href: SALARY_PICK_HREF, label: t.employees.paySalary, icon: "salary" as const, hint: t.addHints.paySalary }]
        : []),
      { href: "/owner/plans/new", label: t.plans.add, icon: "plans", hint: t.addHints.newPlan },
      { href: "/owner/parties/new", label: t.addSheet.newParty, icon: "parties", hint: t.addHints.newParty },
      { href: "/owner/staff/new", label: t.addSheet.newEmployee, icon: "staff", hint: t.addHints.newEmployee },
      { href: "/owner/projects/new", label: t.addSheet.newProject, icon: "projectNew", hint: t.addSheet.newProjectHint },
    ];
  }
  if (role === "STAFF") {
    return [
      { href: "/staff/transactions/new", label: t.addSheet.newEntry, icon: "add", hint: t.addHints.newEntry },
      ...(flags.linked
        ? [{ href: "/staff/me", label: t.addSheet.myCheckIn, icon: "attendance" as const, hint: t.addHints.myCheckIn }]
        : []),
    ];
  }
  return [];
}

/** The «+» entry holding `rows`. */
export function addEntry(rows: AddRow[]): AddEntry {
  return { kind: "add", label: t.addSheet.tab, rows };
}

/** The add entry of a role's groups, if it has one. */
export function addEntryOf(groups: NavGroup[]): AddEntry | null {
  return groups.flatMap((g) => g.items.filter(isAdd))[0] ?? null;
}

/** The tab-bar slot that holds the «+». No leading slash, so it can never equal an href. */
export const ADD_SLOT = "+";

/** A tab-bar slot: an item's href, or ADD_SLOT. */
export type TabSlot = string;

/**
 * The tab bar's slots, in order. Without `tabHrefs` every entry is a tab (staff,
 * admin); with them, each slot is the link it names or the role's add entry.
 */
export function tabEntries(groups: NavGroup[], tabHrefs?: TabSlot[]): NavEntry[] {
  const all = groups.flatMap((g) => g.items);
  if (!tabHrefs) return all;
  return tabHrefs.flatMap((slot): NavEntry[] => {
    if (slot === ADD_SLOT) {
      const entry = addEntryOf(groups);
      return entry ? [entry] : [];
    }
    return all.filter((e) => isLink(e) && e.href === slot);
  });
}

/** The groups the المزيد sheet shows: links not in the tab bar; never an add entry; no empty group. */
export function moreGroups(groups: NavGroup[], tabHrefs: TabSlot[]): LinkGroup[] {
  return groups
    .map((g) => ({ ...g, items: g.items.filter(isLink).filter((i) => !tabHrefs.includes(i.href)) }))
    .filter((g) => g.items.length > 0);
}

/** D21 M2: the المزيد trigger shows the sum of its tiles' badges. */
export function moreBadgeTotal(groups: LinkGroup[], badges: Record<string, number>): number {
  let total = 0;
  for (const g of groups) for (const i of g.items) total += badges[i.href] ?? 0;
  return total;
}

/** True when `href` points at the page `pathname` already shows (query and hash aside). */
export function samePath(href: string, pathname: string): boolean {
  const end = href.search(/[?#]/);
  return (end === -1 ? href : href.slice(0, end)) === pathname;
}
