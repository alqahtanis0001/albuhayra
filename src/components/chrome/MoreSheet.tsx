"use client";

/**
 * المزيد (docs/FRONTEND.md, Owner navigation v1.2a): the fifth tab opens a
 * bottom sheet holding every owner item that is not a tab, as large tiles under
 * their group headings. A native <dialog> + showModal() supplies the focus trap,
 * Escape and focus return, like ConfirmDialog. Unlike a destructive confirm, a
 * backdrop tap closes it.
 *
 * A tapped tile keeps the sheet open while its route loads, so the tile shows
 * the v1.1d pending look; the sheet closes when the path changes. Tapping the
 * page you are already on closes it at once. The slide-up lives in globals.css
 * (.nav-sheet), fade only under reduced motion; nothing here prints.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { t } from "@/i18n/ar";

import { CloseIcon } from "../icons";
import { NAV_ICONS } from "../navIcons";
import { LinkPending } from "../NavProgress";
import { NavBadge } from "./NavBadge";
import type { NavGroup } from "./nav";
import { NAV_PRESS, TAB_ACTIVE, TAB_CLASS } from "./navClasses";

export function MoreSheet({
  groups,
  active,
  badges,
}: {
  /** Already stripped of the tab-bar items. */
  groups: NavGroup[];
  active: string | null;
  badges: Record<string, number>;
}) {
  const pathname = usePathname();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const shown = groups.filter((g) => g.items.length > 0);
  const holdsActive = shown.some((g) => g.items.some((i) => i.href === active));

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // A tile's navigation committed: put the sheet away.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={`${TAB_CLASS} ${
          holdsActive ? TAB_ACTIVE : "border-transparent text-gray-600"
        }`}
      >
        <NAV_ICONS.more size={22} />
        {t.navItem.more}
      </button>

      <dialog
        ref={ref}
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
        className="nav-sheet no-print mx-0 mt-auto mb-0 max-h-[85dvh] w-full max-w-full overflow-y-auto rounded-t-xl border-0 border-t border-gray-200 bg-white p-0 text-gray-900"
      >
        <div className="safe-bottom flex flex-col gap-4 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 id={titleId} className="text-base font-semibold">
              {t.navItem.moreTitle}
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t.common.close}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100"
            >
              <CloseIcon size={22} />
            </button>
          </div>

          {shown.map((group) => (
            <section key={group.key} className="flex flex-col gap-2">
              {group.label ? (
                <h3 className="text-xs font-semibold text-gray-600">{group.label}</h3>
              ) : null}
              <ul className="grid grid-cols-3 gap-2">
                {group.items.map((item) => {
                  const Icon = NAV_ICONS[item.icon];
                  const isActive = item.href === active;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={isActive ? "page" : undefined}
                        onClick={() => {
                          if (item.href === pathname) setOpen(false);
                        }}
                        className={`${NAV_PRESS} flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-lg border px-1 py-2 text-center text-xs font-medium ${
                          isActive
                            ? "border-accent bg-accent-soft text-accent-dark"
                            : "border-gray-200 text-gray-700 hover:bg-gray-100 has-data-pending:border-accent has-data-pending:bg-accent-soft has-data-pending:text-accent-dark"
                        }`}
                      >
                        <span className="relative">
                          <Icon size={24} />
                          <NavBadge
                            count={badges[item.href] ?? 0}
                            className="absolute -top-1.5 -end-3"
                          />
                        </span>
                        {item.label}
                        <LinkPending />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </dialog>
    </>
  );
}
