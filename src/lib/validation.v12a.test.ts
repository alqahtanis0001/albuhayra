import { describe, expect, it } from "vitest";

import { todayISO } from "./dates";
import {
  PartyInputSchema,
  ProjectInputSchema,
  TransactionFilterSchema,
  TransactionInputSchema,
  toFieldErrors,
} from "./validation";

/** v1.2a inputs (docs/BACKEND.md → v1.2a): parties, إضافة, transaction links. */

function errorsOf(result: { success: boolean; error?: unknown }): Record<string, string> {
  expect(result.success).toBe(false);
  return toFieldErrors(result.error as Parameters<typeof toFieldErrors>[0]);
}

describe("PartyInputSchema", () => {
  const party = (extra: Record<string, unknown> = {}) => ({ name: "مؤسسة النور", type: "CUSTOMER", ...extra });

  it("normalises the name and drops empty optional fields", () => {
    const parsed = PartyInputSchema.parse(party({ name: "  مؤسسة\u00A0 النور ", phone: "", email: "", notes: " " }));
    expect(parsed).toEqual({ name: "مؤسسة النور", type: "CUSTOMER" });
  });

  it("names are 2–80 characters after normalisation", () => {
    expect(errorsOf(PartyInputSchema.safeParse(party({ name: " ع " }))).name).toBe("err.entityNameShort");
    expect(errorsOf(PartyInputSchema.safeParse(party({ name: "ا".repeat(81) }))).name).toBe("err.entityNameLong");
    expect(PartyInputSchema.safeParse(party({ name: "ا".repeat(80) })).success).toBe(true);
  });

  it("refuses an unknown type", () => {
    expect(errorsOf(PartyInputSchema.safeParse(party({ type: "BANK" }))).type).toBe("err.invalidInput");
  });

  it("phone: Arabic-Indic digits converted, spaces and dashes dropped, 7–15 digits, optional +", () => {
    expect(PartyInputSchema.parse(party({ phone: "٠٥٠ ١٢٣-٤٥٦٧" })).phone).toBe("0501234567");
    expect(PartyInputSchema.parse(party({ phone: "+966 50 123 4567" })).phone).toBe("+966501234567");
    expect(PartyInputSchema.parse(party({ phone: "1234567" })).phone).toBe("1234567");
    for (const phone of ["123456", "1".repeat(16), "05O1234567", "++966501234567"]) {
      expect(errorsOf(PartyInputSchema.safeParse(party({ phone }))).phone, phone).toBe("err.phoneInvalid");
    }
  });

  it("email: lower-cased and shape-checked", () => {
    expect(PartyInputSchema.parse(party({ email: " Info@Example.COM " })).email).toBe("info@example.com");
    expect(errorsOf(PartyInputSchema.safeParse(party({ email: "not-an-email" }))).email).toBe("err.emailInvalid");
  });

  it("notes are at most 500 characters", () => {
    expect(errorsOf(PartyInputSchema.safeParse(party({ notes: "x".repeat(501) }))).notes).toBe("err.tooLong");
  });
});

describe("ProjectInputSchema", () => {
  const project = (extra: Record<string, unknown> = {}) => ({ name: "فرع الرياض", startDate: "2026-01-01", ...extra });

  it('"" budget and end date mean not given', () => {
    const parsed = ProjectInputSchema.parse(project({ budgetHalalas: "", endDate: "", description: "" }));
    expect(parsed.budgetHalalas).toBeUndefined();
    expect(parsed.endDate).toBeUndefined();
    expect(parsed.description).toBeUndefined();
  });

  it("budget arrives as integer text and shares the amount ceiling", () => {
    expect(ProjectInputSchema.parse(project({ budgetHalalas: "150000" })).budgetHalalas).toBe(150000);
    expect(errorsOf(ProjectInputSchema.safeParse(project({ budgetHalalas: "0" }))).budgetHalalas).toBe("err.amountPositive");
    expect(errorsOf(ProjectInputSchema.safeParse(project({ budgetHalalas: "2000000001" }))).budgetHalalas).toBe(
      "err.amountTooLarge",
    );
    expect(errorsOf(ProjectInputSchema.safeParse(project({ budgetHalalas: "abc" }))).budgetHalalas).toBe(
      "err.amountInvalid",
    );
  });

  it("the end may not precede the start; the same day is fine", () => {
    expect(errorsOf(ProjectInputSchema.safeParse(project({ endDate: "2025-12-31" }))).endDate).toBe("err.rangeInvalid");
    expect(ProjectInputSchema.safeParse(project({ endDate: "2026-01-01" })).success).toBe(true);
  });

  it("a start date may be in the future (a planned إضافة)", () => {
    expect(ProjectInputSchema.safeParse(project({ startDate: "2999-01-01" })).success).toBe(true);
  });

  it("refuses a malformed start date", () => {
    expect(errorsOf(ProjectInputSchema.safeParse(project({ startDate: "2026-13-01" }))).startDate).toBe("err.dateInvalid");
  });
});

describe("TransactionInputSchema — v1.2a links", () => {
  const entry = (extra: Record<string, unknown> = {}) => ({
    date: todayISO(),
    direction: "OUT",
    amountHalalas: 1000,
    categoryId: "cat_1",
    paymentMethod: "CASH",
    ...extra,
  });

  it('"" from each select means not given', () => {
    const parsed = TransactionInputSchema.parse(entry({ partyId: "", projectId: " ", instalmentId: "" }));
    expect(parsed.partyId).toBeUndefined();
    expect(parsed.projectId).toBeUndefined();
    expect(parsed.instalmentId).toBeUndefined();
  });

  it("keeps a given id, trimmed", () => {
    const parsed = TransactionInputSchema.parse(entry({ partyId: " p1 ", projectId: "j1", instalmentId: "i1" }));
    expect(parsed).toMatchObject({ partyId: "p1", projectId: "j1", instalmentId: "i1" });
  });

  it("refuses an over-long id", () => {
    expect(errorsOf(TransactionInputSchema.safeParse(entry({ partyId: "x".repeat(65) }))).partyId).toBe("err.tooLong");
  });

  it("still strips `intent` (the submit button) and any unknown field", () => {
    const parsed = TransactionInputSchema.parse(entry({ intent: "again", establishmentId: "est_other" }));
    expect(parsed).not.toHaveProperty("intent");
    expect(parsed).not.toHaveProperty("establishmentId");
  });

  it("the ledger filter accepts partyId and projectId", () => {
    expect(TransactionFilterSchema.parse({ partyId: "p1", projectId: "j1" })).toMatchObject({
      partyId: "p1",
      projectId: "j1",
      page: 1,
    });
  });
});
