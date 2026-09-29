/**
 * The single import point for the auth actions the forms use. Wired to the real
 * actions by W1; the stubs it used to point at are gone. Kept as one module so a
 * form never reaches into a feature's `actions.ts` directly, and so the
 * names live in one place if they ever move.
 */
import type { ActionResult } from "@/lib/validation";

/** `useActionState` state for every auth form — the same shape B1 exports. */
export type AuthState = ActionResult<null> | null;

/** The resend button's state: success carries the next countdown (v1.1e). */
export type ResendState = ActionResult<{ retryAfterSeconds: number }> | null;

// `getVerifyFlow` is deliberately absent: it lives in the server-only
// `@/features/auth/queries`, and the client forms import this file.
export {
  login,
  logout,
  requestPasswordReset,
  resendVerification,
  resetPassword,
  signupOwner,
  signupStaff,
  verifyEmail,
} from "@/features/auth/actions";
