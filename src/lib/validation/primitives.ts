/**
 * Field-level building blocks shared by every schema module in this folder.
 * Split out of index.ts in v1.2a so parties/projects/plans can use them
 * without importing the barrel (which re-exports them — a cycle).
 * Every message is an `err.*` key.
 */
import { z } from "zod";

import { todayISO } from "../dates";
import { MAX_AMOUNT_HALALAS } from "../money";

export const DirectionEnum = z.enum(["IN", "OUT"], { error: "err.invalidInput" });
export type DirectionValue = z.infer<typeof DirectionEnum>;

export const PaymentMethodEnum = z.enum(
  ["CASH", "BANK_TRANSFER", "MADA", "STC_PAY", "OTHER"],
  { error: "err.invalidInput" },
);
export type PaymentMethodValue = z.infer<typeof PaymentMethodEnum>;

/** ISO calendar date, not in the future (Riyadh "today"). */
export const pastOrTodayISODate = z
  .string({ error: "err.required" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "err.dateInvalid")
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), "err.dateInvalid")
  .refine((v) => v <= todayISO(), "err.dateFuture");

/** ISO calendar date, past or future. */
export const anyISODate = z
  .string({ error: "err.required" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "err.dateInvalid")
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), "err.dateInvalid");

export const amountHalalas = z
  .number({ error: "err.amountInvalid" })
  .int("err.amountInvalid")
  .positive("err.amountPositive")
  .max(MAX_AMOUNT_HALALAS, "err.amountTooLarge");

/** Trimmed; "" becomes undefined so an empty optional input means "not given". */
export const optionalText = (max: number) =>
  z
    .string({ error: "err.invalidInput" })
    .trim()
    .max(max, "err.tooLong")
    .transform((v) => (v === "" ? undefined : v))
    .optional();

export const cuid = z
  .string({ error: "err.required" })
  .trim()
  .min(1, "err.required")
  .max(64, "err.tooLong");

/** An optional id from a <select>: "" (the «none» option) means not given. */
export const optionalCuid = z
  .string({ error: "err.invalidInput" })
  .trim()
  .max(64, "err.tooLong")
  .transform((v) => (v === "" ? undefined : v))
  .optional();
