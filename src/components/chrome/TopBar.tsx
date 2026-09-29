/**
 * App name, establishment name, user name and logout — the same strip in all
 * three role areas. The user name links to that role's account screen, which is
 * the only way /staff/account and /admin/account are reachable.
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
    <header className="no-print sticky top-0 z-30 border-b border-gray-200 bg-white">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-accent-dark">
            {t.app.name}
          </p>
          {establishmentName ? (
            <p className="truncate text-xs text-gray-600">{establishmentName}</p>
          ) : null}
        </div>

        <Link
          href={accountHref}
          className="flex min-h-11 max-w-[8rem] items-center gap-1 rounded-lg px-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <UserIcon size={18} />
          <span className="truncate">{userName}</span>
        </Link>

        {/* logout() clears the cookie and redirects, so a plain form is enough. */}
        <form action={logout}>
          <Button type="submit" variant="secondary" size="sm">
            <LogoutIcon size={18} className="rtl:-scale-x-100" />
            <span className="sr-only sm:not-sr-only">{t.common.logout}</span>
          </Button>
        </form>
      </div>
    </header>
  );
}

export default TopBar;
