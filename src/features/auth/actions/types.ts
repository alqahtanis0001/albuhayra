import type { ActionResult } from "@/lib/validation";

/** `useActionState` state for the auth forms. */
export type AuthState = ActionResult<null> | null;

/** `useActionState` state for «أعد الإرسال». */
export type ResendState = ActionResult<{ retryAfterSeconds: number }> | null;
