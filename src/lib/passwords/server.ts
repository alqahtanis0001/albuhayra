import "server-only";

import { passwordCheckCopy } from "../validation/password";
import { COMMON_PASSWORDS } from "./common.generated";

/**
 * The common-password rule, server side (docs/BACKEND.md A12 as amended, G-B1).
 * The shared schemas cannot carry it without shipping the list to every client
 * bundle, so every action that sets a password calls this after its schema
 * passes: both sign-ups, `/reset`, change password, owner-resets-staff and
 * admin-resets-owner.
 */
export function commonPasswordError(password: string): "err.passwordCommon" | null {
  return COMMON_PASSWORDS.has(passwordCheckCopy(password)) ? "err.passwordCommon" : null;
}
