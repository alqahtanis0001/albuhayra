"use client";

/**
 * New password + confirmation, shared by sign-up and /reset. The parent owns
 * both values and the strength (it needs them to disable its submit button);
 * this renders the two fields, the meter, and the live mismatch message.
 *
 * The mismatch shows once the confirmation is as long as the password or has
 * lost focus — not from its first character, which would flag every keystroke
 * of a correct entry as an error.
 */
import { useState } from "react";

import { Input } from "@/components/Input";
import { PasswordStrength, type StrengthLevel } from "@/components/PasswordStrength";
import { t } from "@/i18n/ar";
import { COMMON_PASSWORDS } from "@/lib/passwords/common.generated";
import { passwordError, passwordStrength } from "@/lib/validation";

export type Strength = { level: StrengthLevel; reason: string | null } | null;

/**
 * The meter's input: the shared level plus the first rule the password breaks
 * (the same functions the schema runs). `null` while the field is empty.
 *
 * The common-password list (~96 KB) is imported here and nowhere else on the
 * client, so it ships only with the pages that render this file — /signup and
 * /reset (user's constraint, docs/BACKEND.md A12). Do not move the import into
 * a shared module or use PasswordFields on another page.
 */
export function measurePassword(
  password: string,
  context: { email?: string; names?: string[] },
): Strength {
  if (!password) return null;
  const withList = { ...context, common: COMMON_PASSWORDS };
  return {
    level: passwordStrength(password, withList),
    reason: passwordError(password, withList),
  };
}

/** True once the password is at least fair and the confirmation matches. */
export function passwordReady(strength: Strength, password: string, confirm: string) {
  return strength !== null && strength.level !== "weak" && password === confirm;
}

export function PasswordFields({
  name,
  confirmName = "confirmPassword",
  label,
  password,
  confirm,
  onPassword,
  onConfirm,
  strength,
  errors,
}: {
  name: string;
  confirmName?: string;
  label: string;
  password: string;
  confirm: string;
  onPassword: (value: string) => void;
  onConfirm: (value: string) => void;
  strength: Strength;
  /** `err.*` keys from the action's fieldErrors. */
  errors?: { password?: string; confirm?: string };
}) {
  const [confirmLeft, setConfirmLeft] = useState(false);
  const meterId = `${name}-strength`;

  const liveMismatch =
    confirm !== "" &&
    confirm !== password &&
    (confirmLeft || confirm.length >= password.length)
      ? "err.passwordMismatch"
      : undefined;

  return (
    <>
      <Input
        label={label}
        name={name}
        type="password"
        autoComplete="new-password"
        required
        value={password}
        onChange={(event) => onPassword(event.target.value)}
        hint={t.signupForm.passwordHelp}
        error={errors?.password}
        describedBy={meterId}
      >
        {/* A server error already names the rule; the meter's reason would
            repeat it word for word. */}
        <PasswordStrength
          id={meterId}
          level={strength?.level ?? null}
          reason={errors?.password ? null : strength?.reason}
        />
      </Input>

      <Input
        label={t.auth.confirmPassword}
        name={confirmName}
        type="password"
        autoComplete="new-password"
        required
        value={confirm}
        onChange={(event) => onConfirm(event.target.value)}
        onBlur={() => setConfirmLeft(true)}
        hint={t.signupForm.confirmPasswordHelp}
        // The only server error here is a mismatch, stale once they match.
        error={liveMismatch ?? (confirm === password ? undefined : errors?.confirm)}
      />
    </>
  );
}

export default PasswordFields;
