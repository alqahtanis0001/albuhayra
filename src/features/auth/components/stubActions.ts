"use server";

/**
 * Stand-ins for `src/features/auth/actions.ts` (task B1), with that file's exact
 * signatures: `(prevState, formData)` as `useActionState` calls them, a generic
 * `err.*` key on failure, and a server-side redirect on success. Nothing here
 * touches the database. Deleted by W1.
 */
import { redirect } from "next/navigation";

import type { ActionResult } from "@/lib/validation";

type AuthState = ActionResult<null> | null;

/** The real action starts a session and redirects to the role home. */
export async function login(
  _prev: AuthState,
  _formData: FormData,
): Promise<ActionResult<null>> {
  return { ok: false, error: "err.loginFailed" };
}

export async function logout(): Promise<void> {
  redirect("/login");
}

export async function signupOwner(
  _prev: AuthState,
  _formData: FormData,
): Promise<ActionResult<null>> {
  // B1 redirects with the role in the query, because /pending has no session to read.
  redirect("/pending?as=owner");
}

export async function signupStaff(
  _prev: AuthState,
  _formData: FormData,
): Promise<ActionResult<null>> {
  redirect("/pending?as=staff");
}
