import type { ReactNode } from "react";

import { errorMessage, t } from "@/i18n/ar";
import type { ActionResult } from "@/lib/validation";

import { AlertIcon } from "./icons";

/**
 * Inline form-level error. Used where the message needs something *attached* to
 * it — sign-up's "already have an account?" link — because a floating <Toast>
 * can be dismissed or missed, and the link is the whole point there.
 *
 * Field-level failures render under their inputs instead, so this stays silent
 * when `fieldErrors` is populated, exactly like <FormToast>.
 */
export function FormError({
  state,
  children,
}: {
  state: ActionResult<unknown> | null;
  /** Rendered under the message — a link or a hint. */
  children?: ReactNode;
}) {
  if (!state || state.ok) return null;
  if (state.fieldErrors && Object.keys(state.fieldErrors).length > 0) return null;

  return (
    <div
      role="alert"
      className="flex flex-col gap-2 rounded-lg border border-money-out bg-money-out-soft p-3 text-start"
    >
      <p className="flex items-start gap-2 text-sm font-medium text-money-out">
        <span className="mt-0.5 shrink-0">
          <AlertIcon size={18} />
        </span>
        <span>{errorMessage(state.error)}</span>
      </p>
      {children}
    </div>
  );
}

export default FormError;
