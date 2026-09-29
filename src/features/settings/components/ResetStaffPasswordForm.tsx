"use client";

/**
 * The owner sets a staff password directly — there is no old password to compare,
 * so this is not `ChangePasswordSchema`. The user id is **bound on the server**
 * by the caller, so it is never a form field a client could point elsewhere.
 */
import { useActionState, useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { FormToast } from "@/components/FormToast";
import { Input } from "@/components/Input";
import { Toast } from "@/components/Toast";
import { t } from "@/i18n/ar";
import { MIN_PASSWORD_LENGTH, type ActionResult } from "@/lib/validation";

type State = ActionResult<null> | null;

export type BoundResetAction = (
  prev: State,
  formData: FormData,
) => Promise<ActionResult<null>>;

export function ResetStaffPasswordForm({
  action,
  inputId,
  label = t.settings.resetPasswordFor,
  submitLabel = t.settings.resetPassword,
}: {
  action: BoundResetAction;
  /** Unique per row: several of these forms share one page. */
  inputId: string;
  /** The admin screen resets an *owner's* password and says so. */
  label?: string;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (state?.ok) setDone(true);
  }, [state]);

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2" noValidate>
      <div className="min-w-48 flex-1">
        <Input
          label={label}
          name="newPassword"
          id={inputId}
          type="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
          error={fieldErrors?.newPassword}
        />
      </div>
      <Button type="submit" variant="secondary" size="sm" pending={pending}>
        {submitLabel}
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

export default ResetStaffPasswordForm;
