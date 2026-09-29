import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/features/auth/components/AuthCard";
import { VerifyForm } from "@/features/auth/components/VerifyForm";
import { getVerifyFlow } from "@/features/auth/queries";
import { t } from "@/i18n/ar";

export const metadata: Metadata = { title: t.verify.title };

/**
 * The flow cookie says which address the code went to; it grants nothing. With
 * no flow (expired after 30 minutes, or opened directly) there is no code to
 * enter, so the page says so and points back to /login, which re-enters it.
 */
export default async function VerifyPage() {
  const flow = await getVerifyFlow();

  if (!flow) {
    return (
      <AuthCard title={t.verify.title}>
        <div className="flex flex-col gap-4">
          <p role="alert" className="text-sm font-medium text-money-out">
            {t.err.verifySessionExpired}
          </p>
          <Link
            href="/login"
            className="flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 font-medium text-white hover:bg-accent-dark"
          >
            {t.auth.loginSubmit}
          </Link>
        </div>
      </AuthCard>
    );
  }

  return <VerifyForm email={flow.email} resendInSeconds={flow.resendInSeconds} />;
}
