/**
 * The single import point for the auth actions the forms use. W1 changes the
 * last line to "@/features/auth/actions" and deletes stubActions.ts; nothing
 * else in the UI changes. `AuthState` is the name B1 exports, so the swap is a
 * no-op typewise.
 */
import type { ActionResult } from "@/lib/validation";

/** `useActionState` state for every auth form. */
export type AuthState = ActionResult<null> | null;

export { login, logout, signupOwner, signupStaff } from "./stubActions";
