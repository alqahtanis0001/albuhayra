"use client";

/**
 * Bottom tab bar on phones, side nav from md. Client-side only because it reads
 * the current path to mark the active tab; it fetches nothing.
 *
 * A tapped item takes the active *look* at once, while its navigation is
 * pending: <LinkPending> inside the Link sets data-pending, and the
 * `has-data-pending:` classes repeat the active style. aria-current still
 * follows the real page (activeHref), so for a moment two items can look
 * active — accepted (docs/FRONTEND.md, Transitions v1.1c).
 */
import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ICONS } from "../icons";
import { LinkPending } from "../NavProgress";
import { activeHref, type NavItem } from "./nav";

export function BottomTabs({ items, label }: { items: NavItem[]; label: string }) {
  const pathname = usePathname();
  const active = activeHref(pathname, items);

  return (
    <nav
      aria-label={label}
      className="no-print safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white md:hidden"
    >
      <ul className="flex">
        {items.map((item) => {
          const Icon = NAV_ICONS[item.icon];
          const isActive = item.href === active;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 border-t-2 px-1 py-2 text-xs font-medium ${
                  isActive
                    ? "border-accent bg-accent-soft text-accent-dark"
                    : "border-transparent text-gray-600 has-data-pending:border-accent has-data-pending:bg-accent-soft has-data-pending:text-accent-dark"
                }`}
              >
                <Icon size={22} />
                {item.label}
                <LinkPending />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SideNav({ items, label }: { items: NavItem[]; label: string }) {
  const pathname = usePathname();
  const active = activeHref(pathname, items);

  return (
    <nav
      aria-label={label}
      className="no-print hidden shrink-0 border-e border-gray-300 bg-white md:block md:w-56"
    >
      {/* Sticks just under the top bar: 4px rule + h-16 + 1px border = 69px. */}
      <ul className="flex flex-col gap-1 p-3 md:sticky md:top-[69px]">
        {items.map((item) => {
          const Icon = NAV_ICONS[item.icon];
          const isActive = item.href === active;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-11 items-center gap-2 border-s-4 px-3 text-sm font-medium ${
                  isActive
                    ? "border-accent bg-accent-soft font-semibold text-accent-dark"
                    : "border-transparent text-gray-700 hover:bg-gray-100 has-data-pending:border-accent has-data-pending:bg-accent-soft has-data-pending:font-semibold has-data-pending:text-accent-dark"
                }`}
              >
                <Icon size={20} />
                {item.label}
                <LinkPending />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
