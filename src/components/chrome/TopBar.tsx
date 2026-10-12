/**
 * The formal top bar, the same strip in all three role areas. In RTL the first
 * child sits on the right: the white Zakham wordmark and the establishment name
 * there (ADMIN: the admin-area label), then the user name and logout at the far
 * left. The user name links to that role's account screen, which is the only
 * way /staff/account and /admin/account are reachable.
 *
 * A filled green band carrying our own wordmark (docs/FRONTEND.md, Look and
 * feel). Everything on it is white or white-on-white, never grey or dark green:
 * `on-topbar` on `topbar` is 6.57:1 light, 9.11:1 dark (v1.5 D36 — the band
 * stays deep green with white text in both themes). The global focus ring is accent green, invisible
 * here, so the header switches it to white through --focus-ring.
 *
 * Height is exactly 69px (4px + h-16 + 1px): the side nav sticks at
 * md:top-[69px] beneath it.
 *
 * v1.5 (B1, D35): the wordmark is a link to the role's home, named «الرئيسية»
 * — the link carries the one accessible name, so the image's alt is empty.
 * The theme toggle (C2, `theme`'s component) sits between the establishment
 * name and the user link from 480px up; below 480px it hides itself and the
 * «المظهر» row in «المزيد» / «حسابي» replaces it (follow-up D46).
 */
import Link from "next/link";

import { logout } from "@/features/auth/components/actions";
import { t } from "@/i18n/ar";

import { Button } from "../Button";
import { LogoutIcon, UserIcon } from "../icons";
import { ThemeToggle } from "./ThemeToggle";

/**
 * The establishment name takes the room left over and truncates first. D46
 * retired D37's rule (hidden below 375px): below 480px the theme button
 * leaves the bar, so the name has its full width again at every size.
 * Exported for the pin in shell.test.ts.
 */
export const ESTABLISHMENT_NAME =
  "min-w-0 flex-1 truncate border-s border-on-topbar/40 ps-3 text-base font-bold text-on-topbar";

export type TopBarProps = {
  userName: string;
  /** Null for ADMIN, who belongs to no establishment. */
  establishmentName?: string | null;
  accountHref: string;
  /** The role's home (`homePathFor(role)`), where the wordmark links. */
  homeHref: string;
};

export function TopBar({ userName, establishmentName, accountHref, homeHref }: TopBarProps) {
  return (
    <header className="no-print sticky top-0 z-30 border-t-4 border-b border-t-topbar-dark border-b-topbar-dark bg-topbar [--focus-ring:var(--color-on-topbar)]">
      <div className="flex h-16 w-full items-center gap-2 px-4 sm:gap-3">
        {/* Served as-is from public/brand (no next/image: the file must not be
            re-encoded). The attributes carry the real 3897×707 ratio, so the
            bar does not shift while it loads. */}
        <Link
          href={homeHref}
          aria-label={t.nav.home}
          className="flex min-h-11 shrink-0 items-center rounded-lg"
        >
          <img
            src="/brand/zakham-brand/zakham-wordmark-white.png"
            alt=""
            width={3897}
            height={707}
            className="h-6 w-auto shrink-0 sm:h-9"
          />
        </Link>
        <p className={ESTABLISHMENT_NAME}>{establishmentName ?? t.app.adminArea}</p>

        {/* v1.5 (C2, D11; D45, D46): light ↔ dark, every role, from 480px up. */}
        <ThemeToggle />

        <Link
          href={accountHref}
          className="flex min-h-11 min-w-11 max-w-[10rem] shrink-0 items-center justify-center gap-1 rounded-lg px-2 text-sm text-on-topbar hover:bg-topbar-dark sm:shrink"
        >
          <UserIcon size={18} />
          {/* Icon only on phones, like the logout label, so the establishment
              name keeps its room at 360px; the name stays the accessible name. */}
          <span className="sr-only truncate sm:not-sr-only">{userName}</span>
        </Link>

        {/* logout() clears the cookie and redirects, so a plain form is enough. */}
        <form action={logout}>
          <Button type="submit" variant="secondary" size="sm" pendingLabel={t.common.signingOut}>
            <LogoutIcon size={18} className="rtl:-scale-x-100" />
            <span className="sr-only sm:not-sr-only">{t.common.logout}</span>
          </Button>
        </form>
      </div>
    </header>
  );
}

export default TopBar;
