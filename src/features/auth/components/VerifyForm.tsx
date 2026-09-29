"use client";

/**
 * /verify (docs/FRONTEND.md, v1.1e): where the code went, the 6-digit field,
 * تأكيد, the resend countdown and the spam note. On success the action
 * redirects (to /pending?…&verified=1 or /login); nothing comes back here.
 *
 * The code is the only field, so every code error shows under it. The one
 * exception is an expired flow: no code can help then, and the way out is
 * signing in again, so that error gets the banner with the /login link.
 */
import { useActionState, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/Button";
import { CodeInput } from "@/components/CodeInput";
import { FormError } from "@/components/FormError";
import { t } from "@/i18n/ar";
import { VerifyCodeSchema } from "@/lib/validation";

import { AuthCard } from "./AuthCard";
import { ResendCode } from "./ResendCode";
import { verifyEmail, type AuthState } from "./actions";

const EXPIRED = "err.verifySessionExpired";

async function submit(prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!VerifyCodeSchema.safeParse({ code: formData.get("code") }).success) {
    return { ok: false, error: "err.codeFormat", fieldErrors: { code: "err.codeFormat" } };
  }
  return verifyEmail(prev, formData);
}

export function VerifyForm({
  email,
  resendInSeconds,
}: {
  email: string;
  resendInSeconds: number;
}) {
  const [state, action] = useActionState(submit, null);
  // A wrong-code error is about the old code; once a new one is sent it is
  // stale, so it is hidden until the next submit replaces `state`.
  const [dismissed, setDismissed] = useState<AuthState>(null);

  const failed = state && !state.ok && state !== dismissed ? state : null;
  const expired = failed?.error === EXPIRED;
  const codeError = failed?.fieldErrors?.code ?? (failed && !expired ? failed.error : undefined);

  return (
    <AuthCard title={t.verify.title}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-700">
          {t.verify.sentTo}{" "}
          <bdi dir="ltr" className="font-semibold text-gray-900">
            {email}
          </bdi>
        </p>

        <form action={action} className="flex flex-col gap-4" noValidate>
          <CodeInput
            label={t.verify.codeLabel}
            name="code"
            required
            hint={t.verify.codeHelp}
            error={codeError}
          />
          {expired ? (
            <FormError state={failed}>
              <Link href="/login" className="text-sm font-medium text-accent-dark underline">
                {t.auth.loginSubmit}
              </Link>
            </FormError>
          ) : null}
          <Button type="submit" block pendingLabel={t.common.verifying}>
            {t.verify.submit}
          </Button>
        </form>

        <ResendCode initialSeconds={resendInSeconds} onResent={() => setDismissed(state)} />

        <p className="border-t border-gray-200 pt-3 text-xs text-gray-600">{t.verify.spamNote}</p>
      </div>
    </AuthCard>
  );
}

export default VerifyForm;
