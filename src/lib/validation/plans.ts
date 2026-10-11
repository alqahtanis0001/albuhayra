/**
 * v1.2a (checkpoint 2) — الاتفاقيات and their schedule. Contract:
 * docs/BACKEND.md → v1.2a. Pure and client-safe.
 *
 * The schedule builder (src/lib/schedule.ts) is a client convenience that
 * produces rows; the server trusts only the rows, validated here.
 */
import { z } from "zod";

import { normalizeText } from "./normalize";
import {
  amountHalalas,
  anyISODate,
  cuid,
  DirectionEnum,
  optionalText,
  pastOrTodayISODate,
  PaymentMethodEnum,
} from "./primitives";

export const MAX_INSTALMENTS = 120;
export const MAX_REMINDER_DAYS = 60;

export const ScheduleFrequencyEnum = z.enum(["WEEKLY", "MONTHLY", "EVERY_N_DAYS"], {
  error: "err.invalidInput",
});
export type ScheduleFrequency = z.infer<typeof ScheduleFrequencyEnum>;

export const InstalmentRowSchema = z.object({
  /** Present for a row that already exists (plan edit); absent for a new row. */
  id: cuid.optional(),
  dueDate: anyISODate,
  amountDueHalalas: amountHalalas,
});
export type InstalmentRow = z.infer<typeof InstalmentRowSchema>;

/**
 * The form posts the rows as one JSON string in the `instalments` field;
 * the action `JSON.parse`s it (a parse failure → `err.scheduleInvalid`) before
 * handing the object to this schema.
 */
export const PlanInputSchema = z
  .object({
    partyId: cuid,
    direction: DirectionEnum,
    title: z
      .string({ error: "err.required" })
      .transform(normalizeText)
      .pipe(z.string().min(2, "err.entityNameShort").max(80, "err.entityNameLong")),
    totalHalalas: z.preprocess((v) => (typeof v === "string" ? Number(v) : v), amountHalalas),
    categoryId: cuid,
    startDate: anyISODate,
    reminderDays: z.preprocess(
      (v) => (v === "" || v === undefined ? 3 : Number(v)),
      z
        .number({ error: "err.invalidInput" })
        .int("err.invalidInput")
        .min(0, "err.invalidInput")
        .max(MAX_REMINDER_DAYS, "err.invalidInput"),
    ),
    notes: optionalText(500),
    instalments: z
      .array(InstalmentRowSchema, { error: "err.scheduleInvalid" })
      .min(1, "err.scheduleEmpty")
      .max(MAX_INSTALMENTS, "err.scheduleTooLong"),
  })
  .refine(
    (v) => v.instalments.reduce((s, r) => s + r.amountDueHalalas, 0) === v.totalHalalas,
    { path: ["instalments"], message: "err.scheduleSum" },
  )
  .refine((v) => v.instalments.every((r) => r.dueDate >= v.startDate), {
    path: ["instalments"],
    message: "err.scheduleBeforeStart",
  });
export type PlanInput = z.infer<typeof PlanInputSchema>;

/* ------------------------------------------------ v1.4: open-ended agreements */

/** The same title rule as `PlanInputSchema` (kept textually untouched above, D6). */
const planTitle = z
  .string({ error: "err.required" })
  .transform(normalizeText)
  .pipe(z.string().min(2, "err.entityNameShort").max(80, "err.entityNameLong"));

/** «إجمالي المبلغ (اختياري)»: "" or absent → not given; otherwise the `amountHalalas` rules. */
const optionalTotal = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? undefined : typeof v === "string" ? Number(v) : v),
  amountHalalas.optional(),
);

/** An optional calendar date from a date input: "" → not given. */
const optionalDate = z.preprocess((v) => (v === "" || v === null ? undefined : v), anyISODate.optional());

const openPlanFields = {
  partyId: cuid,
  direction: DirectionEnum,
  title: planTitle,
  categoryId: cuid,
  /** D8 (amended): «تاريخ البداية», default today, never in the future. */
  startDate: pastOrTodayISODate,
  totalHalalas: optionalTotal,
  expectedEndDate: optionalDate,
  notes: optionalText(500),
};

const expectedEndAfterStart = <T extends { startDate: string; expectedEndDate?: string | undefined }>(v: T) =>
  v.expectedEndDate === undefined || v.expectedEndDate >= v.startDate;

/**
 * docs/V14-SPEC.md C2, D8. No schedule; the total is a ceiling that may be
 * unknown. `kind` and `employeeId` are not fields: the action writes
 * `OPEN_ENDED` / `null` whatever was posted (P16).
 */
export const OpenPlanInputSchema = z
  .object(openPlanFields)
  .refine(expectedEndAfterStart, { path: ["expectedEndDate"], message: "err.expectedEndBeforeStart" });
export type OpenPlanInput = z.infer<typeof OpenPlanInputSchema>;

/**
 * C6 / P10: the same fields — party, direction, category and start date are
 * editable until the first payment; the action enforces the lock
 * (`err.planPartyLocked` / `err.paymentLinkFixed`), never the schema.
 */
export const OpenPlanEditSchema = z
  .object(openPlanFields)
  .refine(expectedEndAfterStart, { path: ["expectedEndDate"], message: "err.expectedEndBeforeStart" });
export type OpenPlanEdit = z.infer<typeof OpenPlanEditSchema>;

/**
 * C3: the inline payment form. No link, party, category or direction fields —
 * they are the plan's and are stripped if sent (zod strips unknown keys).
 */
export const OpenPlanPaymentSchema = z.object({
  amountHalalas: z.preprocess((v) => (typeof v === "string" ? Number(v) : v), amountHalalas),
  date: pastOrTodayISODate,
  paymentMethod: PaymentMethodEnum,
  note: optionalText(500),
});
export type OpenPlanPaymentInput = z.infer<typeof OpenPlanPaymentSchema>;
