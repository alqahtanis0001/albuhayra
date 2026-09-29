/**
 * Password rules and the strength meter (docs/BACKEND.md v1.1e + A3, A11, A12).
 * Pure and client-safe: the sign-up and reset forms run the same functions the
 * server does, so the meter and the schema cannot disagree.
 *
 * **This file must never import the common-password list** (A12 as amended,
 * G-B1): `@/lib/validation` re-exports it and nearly every client bundle
 * reaches that barrel, so even a default parameter would ship ~100 KB to
 * every route. Callers that want the list pass it as `common` — the sign-up
 * and reset forms import it themselves, and the server checks it with
 * `commonPasswordError()` from `src/lib/passwords/server.ts` in every action
 * that sets a password. `password.test.ts` fails if an import creeps in.
 *
 * The password that gets hashed is never normalised. Only the copy used for
 * the checks is (NFKC, invisibles out, spaces collapsed, Western digits,
 * lower-case) — and every rule except the byte limit reads that same copy, so
 * trailing spaces or invisible characters cannot lengthen a common password
 * past the length rule (reviewer E0-S1).
 */
import { z } from "zod";

import { nameKey } from "./names";
import { normalizeText, toWesternDigits } from "./normalize";

const NO_LIST: ReadonlySet<string> = new Set();

export const MIN_PASSWORD_LENGTH = 10;
/** bcrypt ignores every byte past 72, and an Arabic letter is 2 bytes. */
export const MAX_PASSWORD_BYTES = 72;
/** A password this long (and passing every rule) is `strong` whatever its mix. */
export const STRONG_PASSWORD_LENGTH = 14;

export type PasswordContext = {
  /** The account's email; only its local-part tokens of 3+ characters are used. */
  email?: string | null;
  /** Name parts (first, middle, last); each word of 3+ letters is used. */
  names?: ReadonlyArray<string | null | undefined>;
  /**
   * The common-password list, passed by a caller that has loaded it (only the
   * sign-up and reset forms, and the server). Without it the common rule is
   * skipped here — the server still enforces it.
   */
  common?: ReadonlySet<string>;
};

function utf8Length(value: string): number {
  return new TextEncoder().encode(value).length;
}

/** The copy the rules look at (and the form the common list is stored in). */
export function passwordCheckCopy(password: string): string {
  return toWesternDigits(normalizeText(password)).toLowerCase();
}

/**
 * The rules that need no account: length, bytes, letter + digit, common list.
 * These apply to every place a password is set (A11), and in `resetPassword`
 * they are the only rules checked before the code is proven (A3).
 */
export function passwordBaseError(
  password: string,
  common: ReadonlySet<string> = NO_LIST,
): string | null {
  if (password === "") return "err.required";
  const copy = passwordCheckCopy(password);
  if ([...password].length < MIN_PASSWORD_LENGTH || [...copy].length < MIN_PASSWORD_LENGTH) {
    return "err.passwordShort";
  }
  if (utf8Length(password) > MAX_PASSWORD_BYTES) return "err.passwordLong";
  if (!/\p{L}/u.test(copy) || !/\p{Nd}/u.test(copy)) return "err.passwordLetterDigit";
  if (common.has(copy)) return "err.passwordCommon";
  return null;
}

/** Local-part tokens of 3+ characters: `a.b@x.com` contributes nothing (reviewer S9). */
export function emailTokens(email: string | null | undefined): string[] {
  const local = (email ?? "").toLowerCase().split("@")[0] ?? "";
  return local.split(/[._+-]+/).filter((token) => [...token].length >= 3);
}

/** Words of 3+ letters from the name parts, in comparison form. */
export function nameTokens(names: PasswordContext["names"]): string[] {
  return (names ?? [])
    .flatMap((part) => nameKey(part ?? "").split(" "))
    .filter((word) => (word.match(/\p{L}/gu)?.length ?? 0) >= 3);
}

/** `err.passwordPersonal` when the password contains the email or a name. */
export function passwordPersonalError(
  password: string,
  context: Pick<PasswordContext, "email" | "names">,
): string | null {
  const copy = passwordCheckCopy(password).replace(/\p{M}/gu, "");
  const tokens = [...emailTokens(context.email), ...nameTokens(context.names)];
  return tokens.some((token) => copy.includes(token)) ? "err.passwordPersonal" : null;
}

/** Every rule, in the order the form reports them. */
export function passwordError(password: string, context: PasswordContext = {}): string | null {
  return passwordBaseError(password, context.common) ?? passwordPersonalError(password, context);
}

export type PasswordStrength = "weak" | "fair" | "strong";

/**
 * `weak` while any rule fails; `strong` when every rule passes and the password
 * is 14+ characters or mixes 3+ kinds of character; `fair` otherwise.
 */
export function passwordStrength(password: string, context: PasswordContext = {}): PasswordStrength {
  if (passwordError(password, context) !== null) return "weak";
  if ([...password].length >= STRONG_PASSWORD_LENGTH) return "strong";
  const kinds = [
    /\p{Ll}/u, // lower-case Latin (and other cased scripts)
    /\p{Lu}/u, // upper-case
    /\p{Lo}/u, // letters without case — Arabic
    /\p{Nd}/u, // digits
    /[^\p{L}\p{Nd}]/u, // everything else: symbols, spaces
  ].filter((kind) => kind.test(password)).length;
  return kinds >= 3 ? "strong" : "fair";
}

/**
 * Every new password, wherever it is set: the account-free rules (A11) except
 * the common list, which the server adds with `commonPasswordError()` so the
 * list stays out of the shared schema's bundle.
 */
export const newPassword = z
  .string({ error: "err.required" })
  .superRefine((value, ctx) => {
    const error = passwordBaseError(value);
    if (error) ctx.addIssue({ code: "custom", message: error });
  });
