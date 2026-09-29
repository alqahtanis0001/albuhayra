"use client";

/**
 * Owner and staff sign-up (docs/FRONTEND.md, v1.1e). One form: they differ
 * only in the last field (اسم المنشأة / رمز الانضمام), the schema and the
 * action. Every field is controlled, for two reasons: the strength meter needs
 * the names and email as they are typed, and React resets uncontrolled fields
 * after a form action, which would empty the form on every validation error.
 *
 * Every field has a helper line that stays visible; an error appears under it
 * and names the exact rule (`err.*`). Submit is disabled while the password is
 * weak or the confirmation does not match — the meter says why.
 */
import { useActionState, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/Button";
import { FormError } from "@/components/FormError";
import { Input } from "@/components/Input";
import { t } from "@/i18n/ar";
import {
  JOIN_CODE_LENGTH,
  SignupOwnerSchema,
  SignupStaffSchema,
  invalid,
} from "@/lib/validation";

import { AuthCard } from "./AuthCard";
import { EmailField } from "./EmailField";
import { PasswordFields, measurePassword, passwordReady } from "./PasswordFields";
import { signupOwner, signupStaff, type AuthState } from "./actions";

type Role = "owner" | "staff";

const EMPTY = {
  firstName: "",
  middleName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  establishmentName: "",
  joinCode: "",
};
type Field = keyof typeof EMPTY;

async function submit(role: Role, prev: AuthState, formData: FormData): Promise<AuthState> {
  const schema = role === "owner" ? SignupOwnerSchema : SignupStaffSchema;
  const parsed = schema.safeParse(Object.fromEntries(formData));
  // Same generic key the server uses, so a client failure looks identical.
  if (!parsed.success) return invalid(parsed.error, "err.signupFailed");
  return role === "owner" ? signupOwner(prev, formData) : signupStaff(prev, formData);
}

const SUBMIT: Record<Role, (prev: AuthState, formData: FormData) => Promise<AuthState>> = {
  owner: (prev, formData) => submit("owner", prev, formData),
  staff: (prev, formData) => submit("staff", prev, formData),
};

export function SignupForm({ role }: { role: Role }) {
  const [v, setV] = useState(EMPTY);
  // What was last sent, so a server error can be hidden once its field no
  // longer holds the value it was about (the password fields have the meter).
  const [sent, setSent] = useState(EMPTY);
  const [state, action] = useActionState(async (prev: AuthState, formData: FormData) => {
    setSent({ ...EMPTY, ...(Object.fromEntries(formData) as Partial<typeof EMPTY>) });
    return SUBMIT[role](prev, formData);
  }, null);
  const set = (field: Field) => (value: string) => setV((old) => ({ ...old, [field]: value }));
  const text = (field: Field) => ({
    name: field,
    value: v[field],
    onChange: (event: { target: { value: string } }) => set(field)(event.target.value),
  });

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const err = (field: Field) => (v[field] === sent[field] ? fieldErrors?.[field] : undefined);
  const strength = measurePassword(v.password, {
    email: v.email,
    names: [v.firstName, v.middleName, v.lastName],
  });
  const ready = passwordReady(strength, v.password, v.confirmPassword);
  const title = role === "owner" ? t.auth.signupTitle : t.auth.staffSignupTitle;

  return (
    <AuthCard
      title={title}
      subtitle={role === "owner" ? t.auth.asOwnerHint : t.auth.asStaffHint}
      footer={
        <Link href="/signup" className="font-medium text-accent-dark underline">
          {t.common.back}
        </Link>
      }
    >
      <form action={action} className="flex flex-col gap-4" noValidate>
        <Input
          {...text("firstName")}
          label={t.signupForm.firstName}
          autoComplete="given-name"
          required
          hint={t.signupForm.firstNameHelp}
          error={err("firstName")}
        />
        <Input
          {...text("middleName")}
          label={t.signupForm.middleName}
          autoComplete="additional-name"
          hint={t.signupForm.middleNameHelp}
          error={err("middleName")}
        />
        <Input
          {...text("lastName")}
          label={t.signupForm.lastName}
          autoComplete="family-name"
          required
          hint={t.signupForm.lastNameHelp}
          error={err("lastName")}
        />
        <EmailField value={v.email} onChange={set("email")} error={err("email")} />
        <PasswordFields
          name="password"
          label={t.auth.password}
          password={v.password}
          confirm={v.confirmPassword}
          onPassword={set("password")}
          onConfirm={set("confirmPassword")}
          strength={strength}
          errors={{ password: fieldErrors?.password, confirm: fieldErrors?.confirmPassword }}
        />

        {role === "owner" ? (
          <Input
            {...text("establishmentName")}
            label={t.auth.establishmentName}
            autoComplete="organization"
            required
            hint={t.signupForm.establishmentNameHelp}
            error={err("establishmentName")}
          />
        ) : (
          // Stored uppercase, so the field uppercases as you type.
          <Input
            {...text("joinCode")}
            onChange={(event) => set("joinCode")(event.target.value.toUpperCase())}
            label={t.auth.joinCode}
            maxLength={JOIN_CODE_LENGTH}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            dir="ltr"
            className="font-mono tracking-[0.3em] uppercase"
            required
            hint={t.signupForm.joinCodeHelp}
            error={err("joinCode")}
          />
        )}

        {/* F2b: the "already have an account?" link sits with the form-level
            error (a bad join code, too many attempts), not merely somewhere
            on the page. */}
        <FormError state={state}>
          <Link href="/login" className="text-sm font-medium text-accent-dark underline">
            {t.auth.loginLink}
          </Link>
        </FormError>

        <Button type="submit" block disabled={!ready} pendingLabel={t.common.sending}>
          {title}
        </Button>
      </form>
    </AuthCard>
  );
}

export default SignupForm;
