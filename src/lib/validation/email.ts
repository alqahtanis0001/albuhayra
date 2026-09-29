/**
 * Email rules shared by the sign-up forms and the server (docs/BACKEND.md v1.1e
 * + A11). The disposable-domain check is server-only and lives in
 * `src/lib/emails/disposable.ts`; everything here is pure and client-safe.
 */
import { z } from "zod";

import { stripInvisibles } from "./normalize";

export const MAX_EMAIL_LENGTH = 200;

export function normalizeEmail(raw: string): string {
  return stripInvisibles(raw.normalize("NFKC")).trim().toLowerCase();
}

const shape = z.email();

/**
 * The first rule a (normalised) address breaks, or null. `..` and a dot-less
 * domain run before the general shape check, because zod's `z.email()` rejects
 * both first and would otherwise hide the specific key (reviewer N3).
 */
export function emailError(value: string): string | null {
  if (value === "") return "err.required";
  if (value.length > MAX_EMAIL_LENGTH) return "err.tooLong";
  if (value.includes("..")) return "err.emailDots";
  const at = value.lastIndexOf("@");
  if (at > 0 && at < value.length - 1 && !value.slice(at + 1).includes(".")) {
    return "err.emailDomain";
  }
  if (!shape.safeParse(value).success) return "err.emailInvalid";
  return null;
}

/** Sign-up email: every rule above. Outputs the normalised address. */
export const signupEmail = z
  .string({ error: "err.required" })
  .transform(normalizeEmail)
  .superRefine((value, ctx) => {
    const error = emailError(value);
    if (error) ctx.addIssue({ code: "custom", message: error });
  });

/** Frequent misspellings of the big providers → the intended domain. */
const DOMAIN_TYPOS: Readonly<Record<string, string>> = {
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmail.om": "gmail.com",
  "hotmial.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "outlok.com": "outlook.com",
  "outloo.com": "outlook.com",
  "outlook.co": "outlook.com",
  "outlook.con": "outlook.com",
  "yahooo.com": "yahoo.com",
  "yaho.com": "yahoo.com",
  "yahoo.co": "yahoo.com",
  "yahoo.con": "yahoo.com",
  "icloud.co": "icloud.com",
  "icloud.con": "icloud.com",
  "iclod.com": "icloud.com",
  "icoud.com": "icloud.com",
};

/**
 * The corrected address when the domain is a known misspelling, else null.
 * A hint for the form only — never a reason to refuse an address.
 */
export function emailTypoSuggestion(email: string): string | null {
  const value = normalizeEmail(email);
  const at = value.lastIndexOf("@");
  if (at <= 0) return null;
  const fixed = DOMAIN_TYPOS[value.slice(at + 1)];
  return fixed ? `${value.slice(0, at)}@${fixed}` : null;
}
