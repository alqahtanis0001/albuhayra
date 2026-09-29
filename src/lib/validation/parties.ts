/**
 * v1.2a — الجهات and إضافة (Project) inputs. Contract: docs/BACKEND.md → v1.2a.
 * Pure and client-safe; the forms run these before submitting.
 */
import { z } from "zod";

import { normalizeText, toWesternDigits } from "./normalize";
import { amountHalalas, anyISODate, optionalText } from "./primitives";

export const PartyTypeEnum = z.enum(["CUSTOMER", "SUPPLIER", "EMPLOYEE", "OTHER"], {
  error: "err.invalidInput",
});
export type PartyTypeValue = z.infer<typeof PartyTypeEnum>;

export const ProjectStatusEnum = z.enum(["ACTIVE", "COMPLETED", "CANCELLED"], {
  error: "err.invalidInput",
});
export type ProjectStatusValue = z.infer<typeof ProjectStatusEnum>;

/** A display name for a party or an إضافة: normalised, 2–80 characters. */
const entityName = z
  .string({ error: "err.required" })
  .transform(normalizeText)
  .pipe(z.string().min(2, "err.entityNameShort").max(80, "err.entityNameLong"));

/**
 * Phone: optional. Arabic-Indic digits are converted, spaces and dashes are
 * dropped, then 7–15 digits with an optional leading "+". Stored in that
 * compact form. No country rule — suppliers can be abroad.
 */
const phone = z
  .string({ error: "err.invalidInput" })
  .transform((v) => toWesternDigits(v).replace(/[\s\-()]/g, ""))
  .pipe(
    z
      .string()
      .refine((v) => v === "" || /^\+?\d{7,15}$/.test(v), "err.phoneInvalid"),
  )
  .transform((v) => (v === "" ? undefined : v))
  .optional();

/** Optional contact email: shape only (no disposable/typo rules — it is not a login). */
const contactEmail = z
  .string({ error: "err.invalidInput" })
  .trim()
  .toLowerCase()
  .pipe(z.union([z.literal(""), z.email("err.emailInvalid").max(254, "err.tooLong")]))
  .transform((v) => (v === "" ? undefined : v))
  .optional();

export const PartyInputSchema = z.object({
  name: entityName,
  type: PartyTypeEnum,
  phone,
  email: contactEmail,
  notes: optionalText(500),
});
export type PartyInput = z.infer<typeof PartyInputSchema>;

/** `budgetHalalas` arrives as the integer text the AmountField computes; "" = no budget. */
const optionalBudget = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? undefined : Number(v)),
  amountHalalas.optional(),
);

export const ProjectInputSchema = z
  .object({
    name: entityName,
    description: optionalText(1000),
    budgetHalalas: optionalBudget,
    startDate: anyISODate,
    endDate: z.preprocess((v) => (v === "" ? undefined : v), anyISODate.optional()),
  })
  .refine((v) => !v.endDate || v.endDate >= v.startDate, {
    path: ["endDate"],
    message: "err.rangeInvalid",
  });
export type ProjectInput = z.infer<typeof ProjectInputSchema>;
