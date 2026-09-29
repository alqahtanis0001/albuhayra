"use client";

/**
 * /reset (docs/FRONTEND.md, v1.1e): the emailed code, a new password with the
 * same meter as sign-up, and its confirmation. Every code failure is the one
 * generic `err.codeInvalidOrExpired` (no existence oracle). On success the
 * action redirects to /login?reset=1.
 *
 * The page does not know whose account this is, so the meter checks the rules
 * that need no account; the server adds the name/email rule once the code is
 * proven (docs/BACKEND.md, A3).
 */
import { useActionState, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/Button";
import { CodeInput } from "@/components/CodeInput";
import { FormToast } from "@/components/FormToast";
import { t } from "@/i18n/ar";
import { VerifyCodeSchema } from "@/lib/validation";

import { AuthCard } from "./AuthCard";
import { PasswordFields, measurePassword, passwordReady } from "./PasswordFields";
import { resetPassword, type AuthState } from "./actions";

const CODE_FAILED = "err.codeInvalidOrExpired";

async function submit(prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!VerifyCodeSchema.safeParse({ code: formData.get("code") }).success) {
    return { ok: false, error: "err.codeFormat", fieldErrors: { code: "err.codeFormat" } };
  }
  return resetPassword(prev, formData);
}

export function ResetForm() {
  const [state, action] = useActionState(submit, null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const failed = state && !state.ok ? state : null;
  // Every code failure is this one key, returned without fieldErrors; it
  // belongs under the code field, not in a toast.
  const codeFailed = failed?.error === CODE_FAILED;
  const strength = measurePassword(password, {});
  const ready = passwordReady(strength, password, confirm);

  return (
    <AuthCard
      title={t.reset.title}
      footer={
        <Link href="/forgot" className="font-medium text-accent-dark underline">
          {t.verify.resend}
        </Link>
      }
    >
      <form action={action} className="flex flex-col gap-4" noValidate>
        <CodeInput
          label={t.verify.codeLabel}
          name="code"
          required
          hint={t.verify.codeHelp}
          error={failed?.fieldErrors?.code ?? (codeFailed ? CODE_FAILED : undefined)}
        />
        <PasswordFields
          name="newPassword"
          label={t.auth.newPassword}
          password={password}
          confirm={confirm}
          onPassword={setPassword}
          onConfirm={setConfirm}
          strength={strength}
          errors={{
            password: failed?.fieldErrors?.newPassword,
            confirm: failed?.fieldErrors?.confirmPassword,
          }}
        />
        <Button type="submit" block disabled={!ready} pendingLabel={t.common.verifying}>
          {t.reset.submit}
        </Button>
      </form>

      {/* Anything else with no field to sit under (too many attempts). */}
      <FormToast state={codeFailed ? null : state} />
    </AuthCard>
  );
}

export default ResetForm;
