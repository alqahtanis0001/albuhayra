/**
 * The formal top bar, the same strip in all three role areas. In RTL the first
 * child sits on the right: the mark and the establishment name there, then the
 * user name and logout at the far left. The user name links to that role's
 * account screen, which is the only way /staff/account and /admin/account are
 * reachable. A thin green rule on top instead of a filled green band, which
 * keeps it clear of a gov.sa-style header.
 */
import Link from "next/link";

import { logout } from "@/features/auth/components/actions";
import { t } from "@/i18n/ar";

import { Button } from "../Button";
import { LogoutIcon, UserIcon } from "../icons";
import { BrandMark } from "./BrandMark";

export type TopBarProps = {
  userName: string;
  /** Null for ADMIN, who belongs to no establishment. */
  establishmentName?: string | null;
  accountHref: string;
};

export function TopBar({ userName, establishmentName, accountHref }: TopBarProps) {
  return (
    <header className="no-print sticky top-0 z-30 border-t-4 border-b border-t-accent border-b-gray-300 bg-white">
      <div className="flex h-16 w-full items-center gap-3 px-4">
        <BrandMark size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-gray-900">
            {establishmentName ?? t.app.name}
          </p>
          <p className="truncate text-xs text-accent-dark">
            {establishmentName ? t.app.name : t.app.adminArea}
          </p>
        </div>

        <Link
          href={accountHref}
          className="flex min-h-11 max-w-[10rem] items-center gap-1 rounded-lg px-2 text-sm text-gray-700 hover:bg-gray-100"
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
