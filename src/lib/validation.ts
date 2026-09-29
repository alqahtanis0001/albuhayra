/**
 * The backend/frontend contract. Only the lead changes exported names here.
 * Every server action parses its input with one of these schemas; client-side
 * validation imports the same schema so the two can never drift.
 *
 * Every message is an i18n key from src/i18n/ar.ts, not Arabic text.
 */
import { z } from "zod";
import { MAX_AMOUNT_HALALAS } from "./money";
import { todayISO } from "./dates";

/* ---------------------------------------------------------------- primitives */

export const DirectionEnum = z.enum(["IN", "OUT"], { error: "err.invalidInput" });
export type DirectionValue = z.infer<typeof DirectionEnum>;

export const PaymentMethodEnum = z.enum(
  ["CASH", "BANK_TRANSFER", "MADA", "STC_PAY", "OTHER"],
  { error: "err.invalidInput" },
);
export type PaymentMethodValue = z.infer<typeof PaymentMethodEnum>;

export const MIN_PASSWORD_LENGTH = 10;
export const JOIN_CODE_LENGTH = 8;

const email = z
  .string({ error: "err.required" })
  .trim()
  .toLowerCase()
  .min(1, "err.required")
  .max(200, "err.tooLong")
  .pipe(z.email("err.emailInvalid"));

const password = z
  .string({ error: "err.required" })
  .min(MIN_PASSWORD_LENGTH, "err.passwordShort")
  .max(200, "err.tooLong");

const personName = z
  .string({ error: "err.required" })
  .trim()
  .min(2, "err.nameShort")
  .max(60, "err.nameLong");

const establishmentName = z
  .string({ error: "err.required" })
  .trim()
  .min(2, "err.establishmentNameShort")
  .max(80, "err.establishmentNameLong");

export const joinCode = z
  .string({ error: "err.required" })
  .trim()
  .toUpperCase()
  .length(JOIN_CODE_LENGTH, "err.joinCodeInvalid")
  .regex(/^[A-Z0-9]+$/, "err.joinCodeInvalid");

/** ISO calendar date, not in the future (Riyadh "today"). */
const pastOrTodayISODate = z
  .string({ error: "err.required" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "err.dateInvalid")
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), "err.dateInvalid")
  .refine((v) => v <= todayISO(), "err.dateFuture");

const anyISODate = z
  .string({ error: "err.required" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "err.dateInvalid")
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), "err.dateInvalid");

const amountHalalas = z
  .number({ error: "err.amountInvalid" })
  .int("err.amountInvalid")
  .positive("err.amountPositive")
  .max(MAX_AMOUNT_HALALAS, "err.amountTooLarge");

const optionalText = (max: number) =>
  z
    .string({ error: "err.invalidInput" })
    .trim()
    .max(max, "err.tooLong")
    .transform((v) => (v === "" ? undefined : v))
    .optional();

const cuid = z
  .string({ error: "err.required" })
  .trim()
  .min(1, "err.required")
  .max(64, "err.tooLong");

/* -------------------------------------------------------------------- schemas */

export const SignupOwnerSchema = z.object({
  name: personName,
  email,
  password,
  establishmentName,
});
export type SignupOwnerInput = z.infer<typeof SignupOwnerSchema>;

export const SignupStaffSchema = z.object({
  name: personName,
  email,
  password,
  joinCode,
});
export type SignupStaffInput = z.infer<typeof SignupStaffSchema>;

export const LoginSchema = z.object({
  email,
  password: z.string({ error: "err.required" }).min(1, "err.required").max(200, "err.tooLong"),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const TransactionInputSchema = z.object({
  date: pastOrTodayISODate,
  direction: DirectionEnum,
  amountHalalas,
  categoryId: cuid,
  paymentMethod: PaymentMethodEnum,
  counterparty: optionalText(200),
  note: optionalText(500),
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
    currentPassword: z
      .string({ error: "err.required" })
      .min(1, "err.required")
      .max(200, "err.tooLong"),
    newPassword: password,
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
  newPassword: password,
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
