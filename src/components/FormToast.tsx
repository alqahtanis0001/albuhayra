"use client";

/**
 * The generic failure strip: shown for `ok: false` with no fieldErrors, since
 * field-level errors already appear under their inputs (docs/FRONTEND.md).
 */
import { useState } from "react";

import { errorMessage } from "@/i18n/ar";
import type { ActionResult } from "@/lib/validation";

import { Toast } from "./Toast";

export function FormToast({ state }: { state: ActionResult<unknown> | null }) {
  // Remembering the dismissed result means a new failure shows up again.
  const [dismissed, setDismissed] = useState<unknown>(null);

  if (!state || state.ok) return null;
  if (state.fieldErrors && Object.keys(state.fieldErrors).length > 0) return null;
  if (dismissed === state) return null;

  return (
    <Toast message={errorMessage(state.error)} onDismiss={() => setDismissed(state)} />
  );
}

export default FormToast;
