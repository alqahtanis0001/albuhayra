/**
 * The formal top bar, the same strip in all three role areas. In RTL the first
 * child sits on the right: the white Zakham wordmark and the establishment name
 * there (ADMIN: the admin-area label), then the user name and logout at the far
 * left. The user name links to that role's account screen, which is the only
 * way /staff/account and /admin/account are reachable.
 *
 * A filled green band carrying our own wordmark (docs/FRONTEND.md, Look and
 * feel). Everything on it is white or white-on-white, never grey or dark green:
 * white on #006c35 is 6.57:1. The global focus ring is accent green, invisible
 * here, so the header switches it to white through --focus-ring.
 *
 * Height is exactly 69px (4px + h-16 + 1px): the side nav sticks at
 * md:top-[69px] beneath it.
 */
import Link from "next/link";

import { logout } from "@/features/auth/components/actions";
import { t } from "@/i18n/ar";

import { Button } from "../Button";
import { LogoutIcon, UserIcon } from "../icons";

export type TopBarProps = {
  userName: string;
  /** Null for ADMIN, who belongs to no establishment. */
  establishmentName?: string | null;
  accountHref: string;
};

export function TopBar({ userName, establishmentName, accountHref }: TopBarProps) {
  return (
    <header className="no-print sticky top-0 z-30 border-t-4 border-b border-t-accent-dark border-b-accent-dark bg-accent [--focus-ring:#fff]">
      <div className="flex h-16 w-full items-center gap-2 px-4 sm:gap-3">
        {/* Served as-is from public/brand (no next/image: the file must not be
            re-encoded). The attributes carry the real 3897×707 ratio, so the
            bar does not shift while it loads. */}
        <img
          src="/brand/zakham-brand/zakham-wordmark-white.png"
          alt={t.brand.logoAlt}
          width={3897}
          height={707}
          className="h-6 w-auto shrink-0 sm:h-9"
        />
        <p className="min-w-0 flex-1 truncate border-s border-white/40 ps-3 text-base font-bold text-white">
          {establishmentName ?? t.app.adminArea}
        </p>

        <Link
          href={accountHref}
          className="flex min-h-11 min-w-11 max-w-[10rem] shrink-0 items-center justify-center gap-1 rounded-lg px-2 text-sm text-white hover:bg-accent-dark sm:shrink"
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
