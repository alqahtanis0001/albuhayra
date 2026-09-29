"use client";

/**
 * /forgot (docs/FRONTEND.md, v1.1e). Whatever the address, a well-formed
 * request answers the same sentence — «إن كان البريد مسجلاً…» — and then
 * offers the way on to /reset. Only the address's *shape* is ever reported
 * (under the field, before any request), never whether it is registered.
 */
import { useActionState, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/Button";
import { FormToast } from "@/components/FormToast";
import { Input } from "@/components/Input";
import { t } from "@/i18n/ar";
import { ForgotPasswordSchema, invalid } from "@/lib/validation";

import { AuthCard } from "./AuthCard";
import { requestPasswordReset, type AuthState } from "./actions";

async function submit(prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = ForgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return invalid(parsed.error);
  return requestPasswordReset(prev, formData);
}

export function ForgotForm() {
  const [state, action] = useActionState(submit, null);
  // Controlled so a failed submit does not empty the field.
  const [email, setEmail] = useState("");

  return (
    <AuthCard
      title={t.forgot.title}
      footer={
        <Link href="/login" className="font-medium text-accent-dark underline">
          {t.common.back}
        </Link>
      }
    >
      {state?.ok ? (
        <div className="flex flex-col gap-4">
          <p
            role="status"
            className="rounded-lg border border-money-in bg-money-in-soft p-3 text-sm font-medium text-money-in"
          >
            {t.forgot.sent}
          </p>
          <Link
            href="/reset"
            className="flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 font-medium text-white hover:bg-accent-dark"
          >
            {t.reset.title}
          </Link>
        </div>
      ) : (
        <form action={action} className="flex flex-col gap-4" noValidate>
          <p className="text-sm text-gray-700">{t.forgot.intro}</p>
          <Input
            label={t.auth.email}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            dir="ltr"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            hint={t.forgot.emailHelp}
            error={state && !state.ok ? state.fieldErrors?.email : undefined}
          />
          <Button type="submit" block pendingLabel={t.common.sending}>
            {t.forgot.submit}
          </Button>
        </form>
      )}

      <FormToast state={state} />
    </AuthCard>
  );
}

export default ForgotForm;
