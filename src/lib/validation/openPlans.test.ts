import { describe, expect, it } from "vitest";

import { todayISO } from "@/lib/dates";
import { MAX_AMOUNT_HALALAS } from "@/lib/money";

import { OpenPlanEditSchema, OpenPlanInputSchema, OpenPlanPaymentSchema } from "./plans";

/**
 * v1.4 C7 / D8: the open-agreement schemas. Every message is an `err.*` key;
 * the total is optional (a ceiling may be unknown) but, when given, follows
 * the amount rules; the expected end never precedes the start; the start is
 * required and never in the future; the payment schema carries no link field.
 */

const today = todayISO();
const shift = (days: number) => new Date(Date.parse(`${today}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

const base = {
  partyId: "party_1", direction: "IN", title: "عقد مفتوح", categoryId: "cat_1", startDate: today,
  totalHalalas: "100000", expectedEndDate: "", notes: "",
};

const firstError = (schema: typeof OpenPlanInputSchema, input: Record<string, unknown>) => {
  const r = schema.safeParse(input);
  return r.success ? null : Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message]));
};

describe("v1.4: OpenPlanInputSchema", () => {
  it("accepts the full form; the total is a number, the empty end and notes are undefined", () => {
    const r = OpenPlanInputSchema.safeParse(base);
    expect(r.success).toBe(true);
    expect(r.success && r.data).toMatchObject({ totalHalalas: 100000, expectedEndDate: undefined, notes: undefined });
  });

  it("the total is optional: '' and absent both read as undefined", () => {
    for (const total of ["", undefined]) {
      const r = OpenPlanInputSchema.safeParse({ ...base, totalHalalas: total });
      expect(r.success, String(total)).toBe(true);
      expect(r.success && r.data.totalHalalas).toBeUndefined();
    }
  });

  it("a given total follows the amount rules: 0, negative, fractional, over the cap, text", () => {
    expect(firstError(OpenPlanInputSchema, { ...base, totalHalalas: "0" })).toEqual({ totalHalalas: "err.amountPositive" });
    expect(firstError(OpenPlanInputSchema, { ...base, totalHalalas: "-5" })).toEqual({ totalHalalas: "err.amountPositive" });
    expect(firstError(OpenPlanInputSchema, { ...base, totalHalalas: "10.5" })).toEqual({ totalHalalas: "err.amountInvalid" });
    expect(firstError(OpenPlanInputSchema, { ...base, totalHalalas: String(MAX_AMOUNT_HALALAS + 1) })).toEqual({ totalHalalas: "err.amountTooLarge" });
    expect(firstError(OpenPlanInputSchema, { ...base, totalHalalas: "abc" })).toEqual({ totalHalalas: "err.amountInvalid" });
  });

  it("D8: the start date is required and never in the future", () => {
    expect(firstError(OpenPlanInputSchema, { ...base, startDate: undefined })).toEqual({ startDate: "err.required" });
    expect(firstError(OpenPlanInputSchema, { ...base, startDate: shift(1) })).toEqual({ startDate: "err.dateFuture" });
    expect(OpenPlanInputSchema.safeParse({ ...base, startDate: shift(-400) }).success).toBe(true);
  });

  it("D8: the expected end may equal the start but never precede it; '' is not given", () => {
    expect(OpenPlanInputSchema.safeParse({ ...base, expectedEndDate: today }).success).toBe(true);
    expect(OpenPlanInputSchema.safeParse({ ...base, expectedEndDate: shift(30) }).success).toBe(true);
    expect(firstError(OpenPlanInputSchema, { ...base, startDate: shift(-1), expectedEndDate: shift(-2) })).toEqual({
      expectedEndDate: "err.expectedEndBeforeStart",
    });
    expect(firstError(OpenPlanInputSchema, { ...base, expectedEndDate: "not-a-date" })).toEqual({ expectedEndDate: "err.dateInvalid" });
  });

  it("the title follows the plan rule; party, category and direction are required", () => {
    expect(firstError(OpenPlanInputSchema, { ...base, title: "x" })).toEqual({ title: "err.entityNameShort" });
    expect(firstError(OpenPlanInputSchema, { ...base, title: "ع".repeat(81) })).toEqual({ title: "err.entityNameLong" });
    expect(firstError(OpenPlanInputSchema, { ...base, partyId: "" })).toEqual({ partyId: "err.required" });
    expect(firstError(OpenPlanInputSchema, { ...base, categoryId: undefined })).toEqual({ categoryId: "err.required" });
    expect(firstError(OpenPlanInputSchema, { ...base, direction: "SIDEWAYS" })).toEqual({ direction: "err.invalidInput" });
  });

  it("P16: posted kind / employeeId are stripped", () => {
    const r = OpenPlanInputSchema.safeParse({ ...base, kind: "SALARY", employeeId: "emp_1" });
    expect(r.success).toBe(true);
    expect(r.success && Object.keys(r.data)).not.toEqual(expect.arrayContaining(["kind", "employeeId"]));
  });

  it("the edit schema has the same fields and the same end ≥ start rule (P10)", () => {
    expect(OpenPlanEditSchema.safeParse(base).success).toBe(true);
    expect(firstError(OpenPlanEditSchema, { ...base, startDate: shift(-1), expectedEndDate: shift(-2) })).toEqual({
      expectedEndDate: "err.expectedEndBeforeStart",
    });
    expect(firstError(OpenPlanEditSchema, { ...base, totalHalalas: "0" })).toEqual({ totalHalalas: "err.amountPositive" });
  });
});

describe("v1.4: OpenPlanPaymentSchema", () => {
  const pay = { amountHalalas: "500", date: today, paymentMethod: "CASH", note: "" };

  it("accepts amount, date, method and an empty note", () => {
    const r = OpenPlanPaymentSchema.safeParse(pay);
    expect(r.success).toBe(true);
    expect(r.success && r.data).toEqual({ amountHalalas: 500, date: today, paymentMethod: "CASH", note: undefined });
  });

  it("refuses a future date, a zero amount and an unknown method", () => {
    expect(firstError(OpenPlanPaymentSchema as never, { ...pay, date: shift(1) })).toEqual({ date: "err.dateFuture" });
    expect(firstError(OpenPlanPaymentSchema as never, { ...pay, amountHalalas: "0" })).toEqual({ amountHalalas: "err.amountPositive" });
    expect(firstError(OpenPlanPaymentSchema as never, { ...pay, paymentMethod: "GOLD" })).toEqual({ paymentMethod: "err.invalidInput" });
  });

  it("strips every link and inheritance field — they are the plan's", () => {
    const r = OpenPlanPaymentSchema.safeParse({
      ...pay, instalmentId: "i1", planId: "p1", partyId: "x", categoryId: "y", direction: "OUT", projectId: "z",
    });
    expect(r.success).toBe(true);
    expect(r.success && Object.keys(r.data).sort()).toEqual(["amountHalalas", "date", "note", "paymentMethod"]);
  });
});
