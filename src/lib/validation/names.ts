/**
 * Name-part rules (docs/BACKEND.md v1.1e "Validation" + A11). Each rule answers
 * its own `err.*` key so the form can name the exact rule broken. Pure and
 * client-safe: the sign-up form runs these same functions.
 */
import { z } from "zod";

import { normalizeText } from "./normalize";

export const NAME_MIN_LETTERS = 2;
export const NAME_MAX_LETTERS = 30;

/** Only letters and marks, plus space, hyphen and the two apostrophes. */
const NAME_SHAPE = /^[\p{L}\p{M} '\-’]+$/u;
/** A letter from any script other than Arabic or Latin. */
const OTHER_SCRIPT_LETTER = /[^\p{sc=Arabic}\p{sc=Latin}\P{L}]/u;

/**
 * Compared whole, case-insensitively, after normalising. Placeholder text people
 * type to get past a form — not a list of rude words.
 */
const JUNK_NAMES: ReadonlySet<string> = new Set([
  "asd", "asdf", "asdfg", "test", "tester", "testing", "qwe", "qwer", "qwerty",
  "aaa", "xxx", "abc", "abcd", "zzz", "name", "user", "admin", "none", "null",
  "foo", "sss", "ddd", "xyz",
  "تجربة", "تجربه", "اختبار", "اسم", "مستخدم", "لا يوجد", "بدون",
]);

/** Harakat and other combining marks removed — for comparisons only, never stored. */
function withoutMarks(value: string): string {
  return value.replace(/\p{M}/gu, "");
}

/** The form two name parts are compared in: normalised, unmarked, lower-case. */
export function nameKey(value: string): string {
  return withoutMarks(normalizeText(value)).toLowerCase();
}

function letterCount(value: string): number {
  return value.match(/\p{L}/gu)?.length ?? 0;
}

/**
 * The first rule a (normalised) name part breaks, or null. Order: digits, then
 * characters, then length, so "12" says "no digits" rather than "too short".
 */
export function nameError(raw: string): string | null {
  const value = normalizeText(raw);
  if (value === "") return "err.required";
  if (/\p{Nd}/u.test(value)) return "err.nameDigits";
  if (!NAME_SHAPE.test(value) || OTHER_SCRIPT_LETTER.test(value)) return "err.nameChars";
  const letters = letterCount(value);
  if (letters < NAME_MIN_LETTERS) return "err.nameShort";
  if (letters > NAME_MAX_LETTERS) return "err.nameLong";
  if (/(.)\1\1/u.test(nameKey(value))) return "err.nameRepeated";
  if (JUNK_NAMES.has(nameKey(value))) return "err.nameJunk";
  return null;
}

/** True when first and last name are the same name. */
export function sameName(first: string, last: string): boolean {
  const a = nameKey(first);
  return a !== "" && a === nameKey(last);
}

/** A required name part. Outputs the normalised value. */
export const namePart = z
  .string({ error: "err.required" })
  .max(200, "err.nameLong")
  .transform(normalizeText)
  .superRefine((value, ctx) => {
    const error = nameError(value);
    if (error) ctx.addIssue({ code: "custom", message: error });
  });

/** The optional middle name: blank becomes `undefined`, anything else must pass. */
export const optionalNamePart = z
  .string({ error: "err.invalidInput" })
  .max(200, "err.nameLong")
  .transform(normalizeText)
  .superRefine((value, ctx) => {
    if (value === "") return;
    const error = nameError(value);
    if (error) ctx.addIssue({ code: "custom", message: error });
  })
  .transform((value) => (value === "" ? undefined : value))
  .optional();
