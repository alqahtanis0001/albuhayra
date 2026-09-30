/**
 * v1.2b — employees, salaries, attendance. Contract: docs/V12B-DESIGN.md.
 * Authoritative spec: docs/V12-SPEC.md §3. Pure and client-safe; every message
 * is an `err.*` key. There is no field for national ID, iqama, IBAN, date of
 * birth, photos or documents (spec §3.1 — a later item needing encryption at
 * rest, masking and audited reveal). The salary category is not an input: it
 * is always the establishment's «رواتب» category (spec §3.2, X4).
 */
import { z } from "zod";

import { MAX_AMOUNT_HALALAS } from "../money";
import { normalizeText, toWesternDigits } from "./normalize";
import { partyEmailField, partyPhoneField } from "./parties";
import {
  amountHalalas,
  anyISODate,
  cuid,
  optionalCuid,
  optionalText,
  pastOrTodayISODate,
} from "./primitives";

export const AttendanceStatusEnum = z.enum(
  ["PRESENT", "LATE", "ABSENT", "LEAVE", "REMOTE", "HOLIDAY"],
  { error: "err.invalidInput" },
);
export type AttendanceStatusValue = z.infer<typeof AttendanceStatusEnum>;

export const AllowanceTypeEnum = z.enum(["HOUSING", "TRANSPORT", "OTHER"], {
  error: "err.invalidInput",
});
export type AllowanceTypeValue = z.infer<typeof AllowanceTypeEnum>;

/** Sun=1 … Sat=64; 31 = Sunday–Thursday (R5). */
export const DEFAULT_WORK_DAYS = 31;
export const MAX_ALLOWANCES = 10;
export const MAX_GRACE_MINUTES = 240;
export const MAX_ATTENDANCE_ROWS = 300;

/** "HH:MM", 24-hour; Arabic-Indic digits accepted and converted. */
export const hhmm = z
  .string({ error: "err.timeInvalid" })
  .transform((v) => toWesternDigits(v).trim())
  .pipe(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "err.timeInvalid"));

const optionalHhmm = z.preprocess(
  (v) => (v === "" || v === null ? undefined : v),
  hhmm.optional(),
);

/** A form number field: "" → undefined, else Number(). */
const optionalNumber = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === "" || v === undefined || v === null ? undefined : Number(v)), schema.optional());

export const AllowanceRowSchema = z
  .object({
    type: AllowanceTypeEnum,
    label: optionalText(60),
    amountHalalas,
  })
  .refine((a) => a.type !== "OTHER" || !!a.label, {
    path: ["label"],
    message: "err.allowanceLabelRequired",
  });
export type AllowanceRow = z.infer<typeof AllowanceRowSchema>;

/**
 * The employee profile. The form posts `allowances` as one JSON string field;
 * the action `JSON.parse`s it (failure → `err.allowancesInvalid`) before this schema.
 */
export const EmployeeInputSchema = z
  .object({
    // On the Party (R1)
    name: z
      .string({ error: "err.required" })
      .transform(normalizeText)
      .pipe(z.string().min(2, "err.entityNameShort").max(80, "err.entityNameLong")),
    phone: partyPhoneField,
    email: partyEmailField,
    // Employment
    jobTitle: optionalText(80),
    startDate: anyISODate,
    notes: optionalText(500),
    // Schedule (R3/R5)
    workDays: z.preprocess(
      (v) => (v === "" || v === undefined ? DEFAULT_WORK_DAYS : Number(v)),
      z.number({ error: "err.invalidInput" }).int("err.invalidInput").min(1, "err.workDaysEmpty").max(127, "err.invalidInput"),
    ),
    workStart: optionalHhmm,
    workEnd: optionalHhmm,
    graceMinutes: optionalNumber(
      z.number({ error: "err.invalidInput" }).int("err.invalidInput").min(0, "err.invalidInput").max(MAX_GRACE_MINUTES, "err.invalidInput"),
    ),
    // Salary (R3) — all-or-nothing, see the refinements
    basicSalaryHalalas: optionalNumber(amountHalalas),
    payDay: optionalNumber(
      z.number({ error: "err.payDayInvalid" }).int("err.payDayInvalid").min(1, "err.payDayInvalid").max(31, "err.payDayInvalid"),
    ),
    allowances: z
      .array(AllowanceRowSchema, { error: "err.allowancesInvalid" })
      .max(MAX_ALLOWANCES, "err.allowancesInvalid")
      .default([]),
    // Login link (spec §3.1)
    userId: optionalCuid,
    /** Adopt an existing موظف party with no employee (D14); absent = create one. */
    partyId: optionalCuid,
  })
  .refine((v) => !v.workStart || !v.workEnd || v.workEnd > v.workStart, {
    path: ["workEnd"],
    message: "err.timeOrder",
  })
  .refine((v) => v.graceMinutes === undefined || !!v.workStart, {
    path: ["graceMinutes"],
    message: "err.graceNeedsStart",
  })
  .refine((v) => v.basicSalaryHalalas === undefined || v.payDay !== undefined, {
    path: ["payDay"],
    message: "err.payDayRequired",
  })
  .refine(
    (v) =>
      v.basicSalaryHalalas === undefined ||
      v.basicSalaryHalalas + v.allowances.reduce((s, a) => s + a.amountHalalas, 0) <=
        MAX_AMOUNT_HALALAS,
    { path: ["allowances"], message: "err.amountTooLarge" },
  )
  .refine((v) => v.basicSalaryHalalas !== undefined || v.allowances.length === 0, {
    path: ["allowances"],
    message: "err.allowancesNeedBasic",
  });
export type EmployeeInput = z.infer<typeof EmployeeInputSchema>;

/** Ending employment (D6). The date may be past, today or future. */
export const EndEmploymentSchema = z.object({ endDate: anyISODate });

export const AttendanceRowSchema = z
  .object({
    employeeId: cuid,
    status: AttendanceStatusEnum,
    /** true when the owner chose the status by hand (D10). */
    statusOverridden: z.preprocess((v) => v === true || v === "true", z.boolean()),
    checkIn: optionalHhmm,
    checkOut: optionalHhmm,
    note: optionalText(200),
    /** The row's `updatedAt` as loaded (ISO instant); a mismatch → err.concurrentChange (Y6). */
    updatedAt: z.string({ error: "err.invalidInput" }).max(40, "err.invalidInput").optional(),
  })
  .refine((r) => !r.checkIn || !r.checkOut || r.checkOut > r.checkIn, {
    path: ["checkOut"],
    message: "err.timeOrder",
  })
  .refine((r) => !r.checkOut || !!r.checkIn, {
    path: ["checkOut"],
    message: "err.notCheckedIn",
  });
export type AttendanceRowInput = z.infer<typeof AttendanceRowSchema>;

/** The owner's day sheet; posted as one JSON `rows` field plus `date`. */
export const AttendanceDaySchema = z
  .object({
    date: pastOrTodayISODate,
    rows: z
      .array(AttendanceRowSchema, { error: "err.invalidInput" })
      .max(MAX_ATTENDANCE_ROWS, "err.invalidInput"),
  })
  .refine((v) => new Set(v.rows.map((r) => r.employeeId)).size === v.rows.length, {
    path: ["rows"],
    message: "err.attendanceDuplicateEmployee",
  });
export type AttendanceDayInput = z.infer<typeof AttendanceDaySchema>;

export const PeriodYmSchema = z
  .string({ error: "err.invalidInput" })
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "err.invalidInput");

export const DeductionInputSchema = z.object({
  periodYm: PeriodYmSchema,
  amountHalalas: z.preprocess((v) => (typeof v === "string" ? Number(v) : v), amountHalalas),
  reason: z
    .string({ error: "err.required" })
    .transform(normalizeText)
    .pipe(z.string().min(2, "err.reasonShort").max(200, "err.tooLong")),
});
export type DeductionInput = z.infer<typeof DeductionInputSchema>;
