"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/Button";
import { FormError } from "@/components/FormError";
import { Input } from "@/components/Input";
import { t } from "@/i18n/ar";
import { JOIN_CODE_LENGTH, SignupStaffSchema, invalid } from "@/lib/validation";

import { AuthCard } from "./AuthCard";
import { signupStaff, type AuthState } from "./actions";

async function submit(prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = SignupStaffSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, "err.signupFailed");
  return signupStaff(prev, formData);
}

export function SignupStaffForm() {
  const [state, action, pending] = useActionState(submit, null);
  // The join code is stored uppercase, so the field uppercases as you type.
  const [code, setCode] = useState("");

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <AuthCard
      title={t.auth.staffSignupTitle}
      subtitle={t.auth.asStaffHint}
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
          label={t.auth.joinCode}
          name="joinCode"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          maxLength={JOIN_CODE_LENGTH}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          dir="ltr"
          className="font-mono tracking-[0.3em] uppercase"
          hint={t.auth.joinCodeHint}
          required
          error={fieldErrors?.joinCode}
        />
        {/* F2b: an owner or employee whose email is already registered is told
            only that sign-up failed — the generic key is deliberate. This link
            is the route out for that person, so it must appear *with* the
            error, not merely somewhere on the page. */}
        <FormError state={state}>
          <Link href="/login" className="text-sm font-medium text-accent-dark underline">
            {t.auth.loginLink}
          </Link>
        </FormError>

        <Button type="submit" block pending={pending}>
          {t.auth.staffSignupTitle}
        </Button>
      </form>
    </AuthCard>
  );
}

export default SignupStaffForm;
