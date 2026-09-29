/**
 * v1.2a (checkpoint 2) — الاتفاقيات and their schedule. Contract:
 * docs/BACKEND.md → v1.2a. Pure and client-safe.
 *
 * The schedule builder (src/lib/schedule.ts) is a client convenience that
 * produces rows; the server trusts only the rows, validated here.
 */
import { z } from "zod";

import { normalizeText } from "./normalize";
import { amountHalalas, anyISODate, cuid, DirectionEnum, optionalText } from "./primitives";

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
