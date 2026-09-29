import type { Metadata } from "next";

import { Button } from "@/components/Button";
import { LogoutIcon } from "@/components/icons";
import { AuthCard } from "@/features/auth/components/AuthCard";
import { logout } from "@/features/auth/components/actions";
import { t } from "@/i18n/ar";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: t.pending.title };

/**
 * Informational only. A PENDING account never gets a session cookie (B1), so
 * this page cannot look the visitor up and there is nothing to poll: sign-up and
 * login redirect here with the role in `?as=`, and an ACTIVE visitor who lands
 * here has a session to read instead. With neither, the who-approves line is
 * left out rather than guessed.
 */
export default async function PendingPage({
  searchParams,
}: {
  searchParams: Promise<{ as?: string }>;
}) {
  const { as } = await searchParams;
  const role =
    as === "owner" ? "OWNER" : as === "staff" ? "STAFF" : (await getSession()).role;

  return (
    <AuthCard title={t.pending.title}>
      <div className="flex flex-col gap-4">
        {role === "OWNER" || role === "STAFF" ? (
          <p className="text-sm text-gray-700">
            {role === "OWNER" ? t.pending.byAdmin : t.pending.byOwner}
          </p>
        ) : null}
        <p className="text-sm text-gray-500">{t.pending.hint}</p>

        <form action={logout}>
          <Button type="submit" variant="secondary" block>
            <LogoutIcon size={18} className="rtl:-scale-x-100" />
            {t.common.logout}
          </Button>
        </form>
      </div>
    </AuthCard>
  );
}
