/**
 * The backend/frontend contract. Only the lead changes exported names here.
 * Every server action parses its input with one of these schemas; client-side
 * validation imports the same schema so the two can never drift.
 *
 * Every message is an i18n key from src/i18n/ar.ts, not Arabic text.
 *
 * v1.1e split by concern (docs/BACKEND.md A14): the auth schemas and the name,
 * password and email rules live beside this file and are re-exported here, so
 * `@/lib/validation` stays the one import path.
 */
import { z } from "zod";
import { enteredPassword } from "./auth";
import { newPassword } from "./password";

export * from "./auth";
export {
  emailError,
  emailTypoSuggestion,
  normalizeEmail,
  MAX_EMAIL_LENGTH,
} from "./email";
export {
  nameError,
  nameKey,
  sameName,
  NAME_MAX_LETTERS,
  NAME_MIN_LETTERS,
} from "./names";
export { normalizeText, toWesternDigits } from "./normalize";
export {
  emailTokens,
  nameTokens,
  passwordBaseError,
  passwordError,
  passwordPersonalError,
  passwordStrength,
  MAX_PASSWORD_BYTES,
  MIN_PASSWORD_LENGTH,
  STRONG_PASSWORD_LENGTH,
  type PasswordContext,
  type PasswordStrength,
} from "./password";

/* ---------------------------------------------------------------- primitives */

import {
  amountHalalas,
  anyISODate,
  cuid,
  DirectionEnum,
  optionalCuid,
  optionalText,
  pastOrTodayISODate,
  PaymentMethodEnum,
} from "./primitives";

export {
  DirectionEnum,
  PaymentMethodEnum,
  type DirectionValue,
  type PaymentMethodValue,
} from "./primitives";

// v1.2a
export * from "./parties";
export * from "./plans";

/* -------------------------------------------------------------------- schemas */

export const TransactionInputSchema = z.object({
  date: pastOrTodayISODate,
  direction: DirectionEnum,
  amountHalalas,
  categoryId: cuid,
  paymentMethod: PaymentMethodEnum,
  counterparty: optionalText(200),
  note: optionalText(500),
  // v1.2a links — each optional; "" from a select's «none» option = not given.
  // The action checks every id against the session's establishment.
  partyId: optionalCuid,
  projectId: optionalCuid,
  /** Set only by «تسجيل دفعة»; requires canEdit (docs/BACKEND.md v1.2a). */
  instalmentId: optionalCuid,
});
export type TransactionInput = z.infer<typeof TransactionInputSchema>;

export const CategoryInputSchema = z.object({
  nameAr: z.string({ error: "err.required" }).trim().min(2, "err.nameShort").max(60, "err.nameLong"),
  type: DirectionEnum,
});
export type CategoryInput = z.infer<typeof CategoryInputSchema>;

export const LockInputSchema = z.object({
  year: z
    .number({ error: "err.dateInvalid" })
    .int("err.dateInvalid")
    .min(2000, "err.dateInvalid")
    .max(2100, "err.dateInvalid"),
  month: z
    .number({ error: "err.dateInvalid" })
    .int("err.dateInvalid")
    .min(1, "err.dateInvalid")
    .max(12, "err.dateInvalid"),
});
export type LockInput = z.infer<typeof LockInputSchema>;

export const ChangePasswordSchema = z
  .object({
    currentPassword: enteredPassword,
    newPassword,
    confirmPassword: z
      .string({ error: "err.required" })
      .min(1, "err.required")
      .max(200, "err.tooLong"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "err.passwordMismatch",
  });
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

/** OWNER/ADMIN setting someone else's password: no current password to compare. */
export const SetPasswordSchema = z.object({
  userId: cuid,
  newPassword,
});
export type SetPasswordInput = z.infer<typeof SetPasswordSchema>;

/** Ledger list filters. Every field is optional; they arrive as URL search params. */
export const TransactionFilterSchema = z
  .object({
    from: anyISODate.optional(),
    to: anyISODate.optional(),
    direction: DirectionEnum.optional(),
    categoryId: cuid.optional(),
    paymentMethod: PaymentMethodEnum.optional(),
    // v1.2a — reached through links (a party's or an إضافة's page), not filter controls.
    partyId: cuid.optional(),
    projectId: cuid.optional(),
    q: z.string({ error: "err.invalidInput" }).trim().max(200, "err.tooLong").optional(),
    page: z.coerce
      .number({ error: "err.invalidInput" })
      .int("err.invalidInput")
      .min(1, "err.invalidInput")
      .max(10_000, "err.invalidInput")
      .default(1),
  })
  .refine((v) => !v.from || !v.to || v.from <= v.to, {
    path: ["to"],
    message: "err.rangeInvalid",
  });
export type TransactionFilter = z.infer<typeof TransactionFilterSchema>;

/** One year. The export builds the whole workbook in memory, so an unbounded
 *  span is a timeout rather than a slow download. An owner needing more
 *  exports year by year. */
export const MAX_REPORT_SPAN_DAYS = 366;

export const ReportRangeSchema = z
  .object({
    from: anyISODate,
    to: anyISODate,
  })
  .refine((v) => v.from <= v.to, { path: ["to"], message: "err.rangeInvalid" })
  .refine(
    (v) =>
      (Date.parse(`${v.to}T00:00:00Z`) - Date.parse(`${v.from}T00:00:00Z`)) /
        86_400_000 <=
      MAX_REPORT_SPAN_DAYS,
    { path: ["to"], message: "err.rangeTooLong" },
  );
export type ReportRange = z.infer<typeof ReportRangeSchema>;

/* --------------------------------------------------------------- action result */

export type FieldErrors = Record<string, string>;

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

/** First error per field, as i18n keys — matches the `fieldErrors` contract. */
export function toFieldErrors(error: z.ZodError<unknown>): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? String(issue.path[0]) : "_form";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

/**
 * The single place actions turn a failed parse into an ActionResult, so every
 * action returns the same shape. `error` is a generic key; details go in fieldErrors.
 */
export function invalid(
  error: z.ZodError<unknown>,
  formError = "err.invalidInput",
): { ok: false; error: string; fieldErrors: FieldErrors } {
  return { ok: false, error: formError, fieldErrors: toFieldErrors(error) };
}

export const PAGE_SIZE = 50;
