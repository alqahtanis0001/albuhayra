"use client";

import { useActionState, useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { FormToast } from "@/components/FormToast";
import { Input } from "@/components/Input";
import { Toast } from "@/components/Toast";
import { t } from "@/i18n/ar";
import { ChangePasswordSchema, invalid, type ActionResult } from "@/lib/validation";
import { changeOwnPassword } from "@/features/settings/actions";

type State = ActionResult<null> | null;

async function submit(prev: State, formData: FormData): Promise<State> {
  // The same schema the action runs, so the confirmation mismatch is caught here
  // without a round trip and reported on the same field either way.
  const parsed = ChangePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  return changeOwnPassword(prev, formData);
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(submit, null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (state?.ok) setDone(true);
  }, [state]);

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={action} className="flex max-w-sm flex-col gap-4" noValidate>
      <Input
        label={t.auth.currentPassword}
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        required
        error={fieldErrors?.currentPassword}
      />
      <Input
        label={t.auth.newPassword}
        name="newPassword"
        type="password"
        autoComplete="new-password"
        hint={t.auth.passwordHint}
        required
        error={fieldErrors?.newPassword}
      />
      <Input
        label={t.auth.confirmPassword}
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        error={fieldErrors?.confirmPassword}
      />
      <Button type="submit" pending={pending}>
        {t.auth.changePassword}
      </Button>

      <FormToast state={state} />
      {done ? (
        <Toast
          message={t.auth.passwordChanged}
          tone="success"
          onDismiss={() => setDone(false)}
        />
      ) : null}
    </form>
  );
}

export default ChangePasswordForm;
