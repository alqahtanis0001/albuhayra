"use client";

import { useActionState } from "react";
import Link from "next/link";

import { Button } from "@/components/Button";
import { FormToast } from "@/components/FormToast";
import { Input } from "@/components/Input";
import { t } from "@/i18n/ar";
import { SignupOwnerSchema, invalid } from "@/lib/validation";

import { AuthCard } from "./AuthCard";
import { signupOwner, type AuthState } from "./actions";

async function submit(prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = SignupOwnerSchema.safeParse(Object.fromEntries(formData));
  // Same generic key the server uses, so a client failure looks identical.
  if (!parsed.success) return invalid(parsed.error, "err.signupFailed");
  return signupOwner(prev, formData);
}

export function SignupOwnerForm() {
  const [state, action, pending] = useActionState(submit, null);

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <AuthCard
      title={t.auth.signupTitle}
      subtitle={t.auth.asOwnerHint}
      footer={
        <Link href="/signup" className="font-medium text-accent-dark underline">
          {t.common.back}
        </Link>
      }
    >
      <form action={action} className="flex flex-col gap-4" noValidate>
        <Input
          label={t.auth.name}
          name="name"
          autoComplete="name"
          required
          error={fieldErrors?.name}
        />
        <Input
          label={t.auth.email}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          dir="ltr"
          required
          error={fieldErrors?.email}
        />
        <Input
          label={t.auth.password}
          name="password"
          type="password"
          autoComplete="new-password"
          hint={t.auth.passwordHint}
          required
          error={fieldErrors?.password}
        />
        <Input
          label={t.auth.establishmentName}
          name="establishmentName"
          autoComplete="organization"
          required
          error={fieldErrors?.establishmentName}
        />
        <Button type="submit" block pending={pending}>
          {t.auth.signupTitle}
        </Button>
      </form>

      <FormToast state={state} />
    </AuthCard>
  );
}

export default SignupOwnerForm;
