"use client";

import { useActionState } from "react";
import Link from "next/link";

import { Button } from "@/components/Button";
import { FormToast } from "@/components/FormToast";
import { Input } from "@/components/Input";
import { t } from "@/i18n/ar";
import { LoginSchema } from "@/lib/validation";

import { AuthCard } from "./AuthCard";
import { login, type AuthState } from "./actions";

/**
 * The same schema the server uses, run on the client first so a malformed form
 * costs no round trip. A login never reports per-field errors — naming the wrong
 * field would say whether the address exists — so both sides return one generic
 * key. On success the action redirects; nothing comes back here.
 */
async function submit(prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = LoginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "err.loginFailed" };
  return login(prev, formData);
}

export function LoginForm() {
  const [state, action, pending] = useActionState(submit, null);

  return (
    <AuthCard
      title={t.auth.loginTitle}
      footer={
        <Link href="/signup" className="font-medium text-accent-dark underline">
          {t.auth.signupLink}
        </Link>
      }
    >
      <form action={action} className="flex flex-col gap-4" noValidate>
        <Input
          label={t.auth.email}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          dir="ltr"
          required
        />
        <Input
          label={t.auth.password}
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        <Button type="submit" block pending={pending} pendingLabel={t.common.loading}>
          {t.auth.loginSubmit}
        </Button>
      </form>

      <FormToast state={state} />
    </AuthCard>
  );
}

export default LoginForm;
