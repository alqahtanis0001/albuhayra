import { describe, expect, it } from "vitest";

import { todayISO } from "./dates";
import { MAX_AMOUNT_HALALAS } from "./money";
import {
  AttendanceDaySchema,
  AttendanceRowSchema,
  DeductionInputSchema,
  EmployeeInputSchema,
  EndEmploymentSchema,
  toFieldErrors,
} from "./validation";

/** v1.2b inputs (docs/V12B-DESIGN.md; `src/lib/validation/employees.ts`). */

function errorsOf(result: { success: boolean; error?: unknown }): Record<string, string> {
  expect(result.success).toBe(false);
  return toFieldErrors(result.error as Parameters<typeof toFieldErrors>[0]);
}

const employee = (extra: Record<string, unknown> = {}) => ({ name: "أحمد سالم", startDate: "2026-09-01", ...extra });
const salaried = (extra: Record<string, unknown> = {}) =>
  employee({ basicSalaryHalalas: "500000", payDay: "27", ...extra });

describe("EmployeeInputSchema", () => {
  it("a bare profile parses: default work days, no salary, empty optionals dropped", () => {
    const parsed = EmployeeInputSchema.parse(employee({ jobTitle: "", workStart: "", userId: "", partyId: "", graceMinutes: "" }));
    expect(parsed).toEqual({ name: "أحمد سالم", startDate: "2026-09-01", workDays: 31, allowances: [] });
  });

  it("stores no identity, iqama, IBAN, birth date or document field — unknown keys are stripped (spec §3.1)", () => {
    const parsed = EmployeeInputSchema.parse(
      employee({ iqama: "2123456789", nationalId: "1", iban: "SA03800000006080101675", dateOfBirth: "1990-01-01", photo: "x" }),
    );
    expect(Object.keys(parsed).sort()).toEqual(["allowances", "name", "startDate", "workDays"]);
  });

  it("times: HH:MM 24-hour, Arabic-Indic digits converted; the end after the start", () => {
    expect(EmployeeInputSchema.parse(employee({ workStart: "٠٨:٣٠", workEnd: "17:00" }))).toMatchObject({
      workStart: "08:30", workEnd: "17:00",
    });
    for (const bad of ["24:00", "8:30", "08:60", "0830"]) {
      expect(errorsOf(EmployeeInputSchema.safeParse(employee({ workStart: bad }))).workStart, bad).toBe("err.timeInvalid");
    }
    expect(errorsOf(EmployeeInputSchema.safeParse(employee({ workStart: "17:00", workEnd: "17:00" }))).workEnd).toBe("err.timeOrder");
  });

  it("grace needs a start time and stays within 0–240", () => {
    expect(errorsOf(EmployeeInputSchema.safeParse(employee({ graceMinutes: "10" }))).graceMinutes).toBe("err.graceNeedsStart");
    expect(EmployeeInputSchema.parse(employee({ workStart: "08:00", graceMinutes: "0" })).graceMinutes).toBe(0);
    expect(errorsOf(EmployeeInputSchema.safeParse(employee({ workStart: "08:00", graceMinutes: "241" }))).graceMinutes).toBe("err.invalidInput");
  });

  it("work days: 1–127, never none", () => {
    expect(errorsOf(EmployeeInputSchema.safeParse(employee({ workDays: "0" }))).workDays).toBe("err.workDaysEmpty");
    expect(errorsOf(EmployeeInputSchema.safeParse(employee({ workDays: "128" }))).workDays).toBe("err.invalidInput");
    expect(EmployeeInputSchema.parse(employee({ workDays: "127" })).workDays).toBe(127);
  });

  it("a salary needs a pay day of 1–31", () => {
    expect(errorsOf(EmployeeInputSchema.safeParse(employee({ basicSalaryHalalas: "500000" }))).payDay).toBe("err.payDayRequired");
    for (const bad of ["0", "32", "1.5"]) {
      expect(errorsOf(EmployeeInputSchema.safeParse(salaried({ payDay: bad }))).payDay, bad).toBe("err.payDayInvalid");
    }
    expect(EmployeeInputSchema.parse(salaried({ payDay: "31" })).payDay).toBe(31);
  });

  it("allowances need a basic; «أخرى» needs a label; at most 10", () => {
    const housing = { type: "HOUSING", amountHalalas: 100000 };
    expect(errorsOf(EmployeeInputSchema.safeParse(employee({ allowances: [housing] }))).allowances).toBe("err.allowancesNeedBasic");
    const other = errorsOf(EmployeeInputSchema.safeParse(salaried({ allowances: [{ type: "OTHER", amountHalalas: 1 }] })));
    expect(other.allowances).toBe("err.allowanceLabelRequired");
    expect(EmployeeInputSchema.parse(salaried({ allowances: [{ type: "OTHER", label: "بدل هاتف", amountHalalas: 1 }] })).allowances)
      .toEqual([{ type: "OTHER", label: "بدل هاتف", amountHalalas: 1 }]);
    const eleven = Array.from({ length: 11 }, () => housing);
    expect(errorsOf(EmployeeInputSchema.safeParse(salaried({ allowances: eleven }))).allowances).toBe("err.allowancesInvalid");
  });

  it("S7: the gross (basic + allowances) may not exceed the per-entry ceiling", () => {
    const edge = salaried({ basicSalaryHalalas: String(MAX_AMOUNT_HALALAS - 1), allowances: [{ type: "HOUSING", amountHalalas: 1 }] });
    expect(EmployeeInputSchema.safeParse(edge).success).toBe(true);
    const over = salaried({ basicSalaryHalalas: String(MAX_AMOUNT_HALALAS - 1), allowances: [{ type: "HOUSING", amountHalalas: 2 }] });
    expect(errorsOf(EmployeeInputSchema.safeParse(over)).allowances).toBe("err.amountTooLarge");
  });

  it("names are 2–80 characters", () => {
    expect(errorsOf(EmployeeInputSchema.safeParse(employee({ name: " ع " }))).name).toBe("err.entityNameShort");
    expect(errorsOf(EmployeeInputSchema.safeParse(employee({ name: "ا".repeat(81) }))).name).toBe("err.entityNameLong");
  });

  it("the end date is any valid ISO date", () => {
    expect(EndEmploymentSchema.parse({ endDate: "2030-01-31" })).toEqual({ endDate: "2030-01-31" });
    expect(errorsOf(EndEmploymentSchema.safeParse({ endDate: "31/01/2030" })).endDate).toBe("err.dateInvalid");
  });
});

describe("DeductionInputSchema", () => {
  it("a month key, a positive amount (form strings accepted) and a 2–200 character reason", () => {
    expect(DeductionInputSchema.parse({ periodYm: "2026-10", amountHalalas: "5000", reason: " غياب يومين " }))
      .toEqual({ periodYm: "2026-10", amountHalalas: 5000, reason: "غياب يومين" });
    expect(errorsOf(DeductionInputSchema.safeParse({ periodYm: "2026-13", amountHalalas: 1, reason: "غياب" })).periodYm).toBe("err.invalidInput");
    expect(errorsOf(DeductionInputSchema.safeParse({ periodYm: "2026-10", amountHalalas: 1, reason: "غ" })).reason).toBe("err.reasonShort");
    expect(DeductionInputSchema.safeParse({ periodYm: "2026-10", amountHalalas: 0, reason: "غياب" }).success).toBe(false);
  });
});

describe("AttendanceDaySchema / AttendanceRowSchema", () => {
  const row = (extra: Record<string, unknown> = {}) => ({ employeeId: "emp_1", status: "PRESENT", ...extra });

  it("a row: optional times and updatedAt (Y6); an override flag from the client is stripped (Z1)", () => {
    const parsed = AttendanceRowSchema.parse(row({ statusOverridden: "true", checkIn: "08:05", updatedAt: "2026-10-01T05:00:00.000Z" }));
    expect(parsed).toMatchObject({ checkIn: "08:05", updatedAt: "2026-10-01T05:00:00.000Z" });
    expect(parsed).not.toHaveProperty("statusOverridden");
    expect(errorsOf(AttendanceRowSchema.safeParse(row({ status: "SICK" }))).status).toBe("err.invalidInput");
  });

  it("check-out strictly after check-in (N1: the same minute is refused) and never without a check-in", () => {
    expect(errorsOf(AttendanceRowSchema.safeParse(row({ checkIn: "08:00", checkOut: "08:00" }))).checkOut).toBe("err.timeOrder");
    expect(errorsOf(AttendanceRowSchema.safeParse(row({ checkOut: "17:00" }))).checkOut).toBe("err.notCheckedIn");
  });

  it("a day: not in the future, each employee once, at most 300 rows", () => {
    expect(AttendanceDaySchema.safeParse({ date: todayISO(), rows: [row()] }).success).toBe(true);
    expect(errorsOf(AttendanceDaySchema.safeParse({ date: "2999-01-01", rows: [] })).date).toBe("err.dateFuture");
    expect(errorsOf(AttendanceDaySchema.safeParse({ date: todayISO(), rows: [row(), row()] })).rows).toBe("err.attendanceDuplicateEmployee");
    const many = Array.from({ length: 301 }, (_, i) => row({ employeeId: `emp_${i}` }));
    expect(errorsOf(AttendanceDaySchema.safeParse({ date: todayISO(), rows: many })).rows).toBe("err.invalidInput");
  });
});
