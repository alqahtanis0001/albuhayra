"use client";

/**
 * Bottom tab bar on phones, side nav from md. Client-side only because it reads
 * the current path to mark the active tab; it fetches nothing.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ICONS } from "../icons";
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
                    : "border-transparent text-gray-600"
                }`}
              >
                <Icon size={22} />
                {item.label}
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
                    : "border-transparent text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon size={20} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
