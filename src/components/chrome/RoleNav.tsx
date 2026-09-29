"use client";

/**
 * Bottom tab bar on phones, side nav from md. Client-side only because they
 * read the current path (and, for the side nav, localStorage); they fetch
 * nothing.
 *
 * Three visible steps on every item and tile (docs/FRONTEND.md, Motion v1.1d):
 * pressed on pointer-down (`active:` — darker green, 0.97 scale); pending while
 * the route loads (<LinkPending> sets data-pending; the `has-data-pending:`
 * classes repeat the active look and `.nav-item:has([data-pending])` breathes
 * in globals.css); then the real active state once the route commits.
 * aria-current follows the real page only (activeHref over every item of the
 * role), so for a moment two items can look active — accepted.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { t } from "@/i18n/ar";

import { ChevronDownIcon } from "../icons";
import { NAV_ICONS } from "../navIcons";
import { LinkPending } from "../NavProgress";
import { MoreSheet } from "./MoreSheet";
import { NavBadge } from "./NavBadge";
import { NAV_PRESS, TAB_ACTIVE, TAB_CLASS, TAB_IDLE } from "./navClasses";
import { activeHref, groupOf, navItems, type NavGroup, type NavItem } from "./nav";
import { readUsedGroups, rememberUsedGroup } from "./usedGroups";

export type Badges = Record<string, number>;

function Tab({ item, active, badge }: { item: NavItem; active: boolean; badge: number }) {
  const Icon = NAV_ICONS[item.icon];
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`${TAB_CLASS} ${active ? TAB_ACTIVE : TAB_IDLE}`}
    >
      <span className="relative">
        <Icon size={22} />
        <NavBadge count={badge} className="absolute -top-1.5 -end-3" />
      </span>
      {item.label}
      <LinkPending />
    </Link>
  );
}

export function BottomTabs({
  groups,
  tabHrefs,
  badges = {},
  label,
}: {
  groups: NavGroup[];
  /** The tabs, in order; every other item goes to the المزيد sheet. Omit: all items are tabs. */
  tabHrefs?: string[];
  badges?: Badges;
  label: string;
}) {
  const pathname = usePathname();
  const all = navItems(groups);
  const active = activeHref(pathname, all);
  const tabs = tabHrefs
    ? tabHrefs.flatMap((href) => all.filter((i) => i.href === href))
    : all;

  return (
    <nav
      aria-label={label}
      className="no-print safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white md:hidden"
    >
      <ul className="flex">
        {tabs.map((item) => (
          <li key={item.href} className="flex-1">
            <Tab item={item} active={item.href === active} badge={badges[item.href] ?? 0} />
          </li>
        ))}
        {tabHrefs ? (
          <li className="flex-1">
            <MoreSheet
              groups={groups.map((g) => ({
                ...g,
                items: g.items.filter((i) => !tabHrefs.includes(i.href)),
              }))}
              active={active}
              badges={badges}
            />
          </li>
        ) : null}
      </ul>
    </nav>
  );
}

function SideItem({ item, active, badge }: { item: NavItem; active: boolean; badge: number }) {
  const Icon = NAV_ICONS[item.icon];
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`${NAV_PRESS} flex min-h-11 items-center gap-2 border-s-4 px-3 text-sm font-medium ${
          active
            ? "border-accent bg-accent-soft font-semibold text-accent-dark"
            : "border-transparent text-gray-700 hover:bg-gray-100 has-data-pending:border-accent has-data-pending:bg-accent-soft has-data-pending:font-semibold has-data-pending:text-accent-dark"
        }`}
      >
        <Icon size={20} />
        <span className="min-w-0 flex-1">{item.label}</span>
        <NavBadge count={badge} />
        <LinkPending />
      </Link>
    </li>
  );
}

/**
 * Headed groups. A collapsible group starts collapsed until the owner first
 * uses it — expands it, or visits one of its pages — and is remembered in
 * localStorage (usedGroups.ts). The group holding the current page opens on
 * every navigation. The server renders only that group open; remembered ones
 * open after mount, like the direction toggle.
 */
export function SideNav({
  groups,
  badges = {},
  label,
}: {
  groups: NavGroup[];
  badges?: Badges;
  label: string;
}) {
  const pathname = usePathname();
  const active = activeHref(pathname, navItems(groups));
  const activeGroup = groupOf(groups, active);
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    activeGroup ? { [activeGroup]: true } : {},
  );

  useEffect(() => {
    const used = readUsedGroups();
    setOpen((o) => ({ ...Object.fromEntries(used.map((k) => [k, true])), ...o }));
  }, []);

  useEffect(() => {
    if (!activeGroup || !groups.some((g) => g.key === activeGroup && g.collapsible)) return;
    rememberUsedGroup(activeGroup);
    setOpen((o) => ({ ...o, [activeGroup]: true }));
  }, [activeGroup, groups]);

  function toggle(key: string) {
    const next = !open[key];
    if (next) rememberUsedGroup(key);
    setOpen((o) => ({ ...o, [key]: next }));
  }

  return (
    <nav
      aria-label={label}
      className="no-print hidden shrink-0 border-e border-gray-300 bg-white md:block md:w-56"
    >
      {/* Sticks just under the top bar: 4px rule + h-16 + 1px border = 69px;
          scrolls on its own when the groups outgrow a short screen. */}
      <div className="flex flex-col gap-1 p-3 md:sticky md:top-[69px] md:max-h-[calc(100dvh-69px)] md:overflow-y-auto">
        {groups.map((group) => {
          const isOpen = !group.collapsible || open[group.key] === true;
          const listId = `nav-group-${group.key}`;
          const headingId = `${listId}-heading`;
          return (
            <div key={group.key} className="flex flex-col gap-1">
              {group.label && group.collapsible ? (
                <button
                  type="button"
                  id={headingId}
                  aria-expanded={isOpen}
                  aria-controls={listId}
                  title={isOpen ? t.navGroup.collapse : t.navGroup.expand}
                  onClick={() => toggle(group.key)}
                  className="mt-2 flex min-h-11 items-center justify-between gap-2 px-3 text-xs font-semibold text-gray-600 transition-[scale,background-color] duration-[80ms] ease-out hover:bg-gray-100 active:scale-[0.97]"
                >
                  {group.label}
                  <ChevronDownIcon
                    size={16}
                    className={`motion-safe:transition-[rotate] motion-safe:duration-200 ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
              ) : group.label ? (
                <p id={headingId} className="mt-2 px-3 pt-1 text-xs font-semibold text-gray-600">
                  {group.label}
                </p>
              ) : null}
              <ul
                id={listId}
                aria-labelledby={group.label ? headingId : undefined}
                hidden={!isOpen}
                className="flex flex-col gap-1"
              >
                {group.items.map((item) => (
                  <SideItem
                    key={item.href}
                    item={item}
                    active={item.href === active}
                    badge={badges[item.href] ?? 0}
                  />
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
