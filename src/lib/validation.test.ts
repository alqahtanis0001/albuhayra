import { describe, expect, it } from "vitest";

import { todayISO } from "./dates";
import {
  CategoryInputSchema,
  ChangePasswordSchema,
  LockInputSchema,
  LoginSchema,
  ReportRangeSchema,
  SetPasswordSchema,
  SignupOwnerSchema,
  SignupStaffSchema,
  TransactionFilterSchema,
  TransactionInputSchema,
  toFieldErrors,
} from "./validation";

const today = todayISO();

function validTransaction() {
  return {
    date: today,
    direction: "OUT" as const,
    amountHalalas: 50000,
    categoryId: "cat_1",
    paymentMethod: "CASH" as const,
  };
}

describe("SignupOwnerSchema", () => {
  it("normalises the email and trims the names", () => {
    const parsed = SignupOwnerSchema.parse({
      name: "  عبدالله  ",
      email: "  Owner@Example.COM ",
      password: "averylongpassword",
      establishmentName: "  مؤسسة البحيرة  ",
    });
    expect(parsed.email).toBe("owner@example.com");
    expect(parsed.name).toBe("عبدالله");
    expect(parsed.establishmentName).toBe("مؤسسة البحيرة");
  });

  it("rejects a short password with the i18n key", () => {
    const result = SignupOwnerSchema.safeParse({
      name: "عبدالله",
      email: "owner@example.com",
      password: "short",
      establishmentName: "مؤسسة",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(toFieldErrors(result.error).password).toBe("err.passwordShort");
    }
  });

  it("rejects an invalid email", () => {
    const result = SignupOwnerSchema.safeParse({
      name: "عبدالله",
      email: "not-an-email",
      password: "averylongpassword",
      establishmentName: "مؤسسة",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(toFieldErrors(result.error).email).toBe("err.emailInvalid");
    }
  });

  it("strips unknown fields so a client cannot inject a role", () => {
    const parsed = SignupOwnerSchema.parse({
      name: "عبدالله",
      email: "owner@example.com",
      password: "averylongpassword",
      establishmentName: "مؤسسة",
      role: "ADMIN",
      status: "ACTIVE",
    } as Record<string, unknown>);
    expect(parsed).not.toHaveProperty("role");
    expect(parsed).not.toHaveProperty("status");
  });
});

describe("SignupStaffSchema", () => {
  it("uppercases the join code", () => {
    const parsed = SignupStaffSchema.parse({
      name: "سالم",
      email: "staff@example.com",
      password: "averylongpassword",
      joinCode: " ab23cd45 ",
    });
    expect(parsed.joinCode).toBe("AB23CD45");
  });

  it("rejects a join code that is not 8 alphanumerics", () => {
    for (const code of ["ABC", "ABCDEFGHI", "ABCD-234", "ABCD 234"]) {
      const result = SignupStaffSchema.safeParse({
        name: "سالم",
        email: "staff@example.com",
        password: "averylongpassword",
        joinCode: code,
      });
      expect(result.success, code).toBe(false);
      if (!result.success) {
        expect(toFieldErrors(result.error).joinCode).toBe("err.joinCodeInvalid");
      }
    }
  });
});

describe("LoginSchema", () => {
  it("accepts any non-empty password so the generic error comes from the action", () => {
    const parsed = LoginSchema.parse({ email: "A@B.com", password: "x" });
    expect(parsed.email).toBe("a@b.com");
  });
});

describe("TransactionInputSchema", () => {
  it("accepts a valid entry and drops empty optional text", () => {
    const parsed = TransactionInputSchema.parse({
      ...validTransaction(),
      counterparty: "   ",
      note: "",
    });
    expect(parsed.counterparty).toBeUndefined();
    expect(parsed.note).toBeUndefined();
  });

  it("rejects a future date", () => {
    const result = TransactionInputSchema.safeParse({
      ...validTransaction(),
      date: "2999-01-01",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(toFieldErrors(result.error).date).toBe("err.dateFuture");
    }
  });

  it("rejects a malformed date", () => {
    const result = TransactionInputSchema.safeParse({
      ...validTransaction(),
      date: "2026-13-45",
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero, negative and non-integer amounts", () => {
    for (const amountHalalas of [0, -1, 1.5]) {
      const result = TransactionInputSchema.safeParse({
        ...validTransaction(),
        amountHalalas,
      });
      expect(result.success, String(amountHalalas)).toBe(false);
    }
  });

  it("rejects an amount above the ceiling", () => {
    const result = TransactionInputSchema.safeParse({
      ...validTransaction(),
      amountHalalas: 10_000_000_001,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(toFieldErrors(result.error).amountHalalas).toBe("err.amountTooLarge");
    }
  });

  it("rejects unknown directions and payment methods", () => {
    expect(
      TransactionInputSchema.safeParse({ ...validTransaction(), direction: "BOTH" }).success,
    ).toBe(false);
    expect(
      TransactionInputSchema.safeParse({ ...validTransaction(), paymentMethod: "CRYPTO" })
        .success,
    ).toBe(false);
  });

  it("rejects over-long free text", () => {
    expect(
      TransactionInputSchema.safeParse({
        ...validTransaction(),
        counterparty: "x".repeat(201),
      }).success,
    ).toBe(false);
    expect(
      TransactionInputSchema.safeParse({
        ...validTransaction(),
        note: "x".repeat(501),
      }).success,
    ).toBe(false);
  });
});

describe("ChangePasswordSchema", () => {
  it("requires the confirmation to match", () => {
    const result = ChangePasswordSchema.safeParse({
      currentPassword: "oldpassword",
      newPassword: "averylongpassword",
      confirmPassword: "averylongpasswordx",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(toFieldErrors(result.error).confirmPassword).toBe("err.passwordMismatch");
    }
  });

  it("accepts a matching pair", () => {
    expect(
      ChangePasswordSchema.safeParse({
        currentPassword: "oldpassword",
        newPassword: "averylongpassword",
        confirmPassword: "averylongpassword",
      }).success,
    ).toBe(true);
  });
});

describe("TransactionFilterSchema", () => {
  it("defaults to page 1 with everything optional", () => {
    const parsed = TransactionFilterSchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.direction).toBeUndefined();
  });

  it("coerces page from a URL search param string", () => {
    expect(TransactionFilterSchema.parse({ page: "3" }).page).toBe(3);
  });

  it("rejects a reversed range", () => {
    const result = TransactionFilterSchema.safeParse({
      from: "2026-03-01",
      to: "2026-02-01",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(toFieldErrors(result.error).to).toBe("err.rangeInvalid");
    }
  });

  it("allows a future range, unlike a transaction date", () => {
    expect(
      TransactionFilterSchema.safeParse({ from: "2026-01-01", to: "2999-01-01" }).success,
    ).toBe(true);
  });
});

describe("ReportRangeSchema", () => {
  it("requires both ends and a forward range", () => {
    expect(ReportRangeSchema.safeParse({ from: "2026-01-01" }).success).toBe(false);
    expect(
      ReportRangeSchema.safeParse({ from: "2026-01-01", to: "2026-01-31" }).success,
    ).toBe(true);
    expect(
      ReportRangeSchema.safeParse({ from: "2026-01-01", to: "2026-01-01" }).success,
    ).toBe(true);
  });
});

describe("toFieldErrors", () => {
  it("keeps only the first error per field", () => {
    const result = SignupOwnerSchema.safeParse({
      name: "x",
      email: "nope",
      password: "s",
      establishmentName: "y",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = toFieldErrors(result.error);
      expect(Object.keys(errors).sort()).toEqual([
        "email",
        "establishmentName",
        "name",
        "password",
      ]);
      expect(Object.values(errors).every((v) => v.startsWith("err."))).toBe(true);
    }
  });
});

/**
 * Every message in validation.ts is an i18n key, never zod's English default:
 * errorMessage() would otherwise fall back to "حدث خطأ غير متوقع" and the user
 * would be told nothing. A bare `z.string()` or `z.enum()` is the usual way one
 * slips in, so each case below feeds a schema the *wrong type*, not just a bad
 * value, which is what triggers those defaults.
 */
describe("every zod message is an err.* i18n key", () => {
  const long = "x".repeat(201);

  const cases: Array<[string, { safeParse: (input: unknown) => unknown }, unknown]> = [
    ["Login/longPassword", LoginSchema, { email: "a@b.com", password: long }],
    ["Login/wrongTypes", LoginSchema, { email: 1, password: true }],
    [
      "ChangePassword/long",
      ChangePasswordSchema,
      { currentPassword: long, newPassword: long, confirmPassword: long },
    ],
    ["ChangePassword/empty", ChangePasswordSchema, {}],
    ["Filter/pageZero", TransactionFilterSchema, { page: "0" }],
    ["Filter/pageFraction", TransactionFilterSchema, { page: "1.5" }],
    ["Filter/pageText", TransactionFilterSchema, { page: "abc" }],
    ["Filter/direction", TransactionFilterSchema, { direction: "BOTH" }],
    ["Filter/method", TransactionFilterSchema, { paymentMethod: "CRYPTO" }],
    ["Filter/qWrongType", TransactionFilterSchema, { q: 5 }],
    ["Lock/fraction", LockInputSchema, { year: 1999.5, month: 13 }],
    ["Lock/wrongTypes", LockInputSchema, { year: "x", month: null }],
    [
      "Transaction/enums",
      TransactionInputSchema,
      {
        date: today,
        direction: "X",
        amountHalalas: 1,
        categoryId: "c",
        paymentMethod: "Y",
      },
    ],
    ["Transaction/empty", TransactionInputSchema, {}],
    [
      "Transaction/optionalWrongType",
      TransactionInputSchema,
      { ...validTransaction(), counterparty: 7, note: {} },
    ],
    ["SignupOwner/empty", SignupOwnerSchema, {}],
    ["SignupStaff/empty", SignupStaffSchema, {}],
    ["Category/bad", CategoryInputSchema, { nameAr: "", type: "Z" }],
    ["Report/bad", ReportRangeSchema, { from: "bad", to: "worse" }],
    ["SetPassword/bad", SetPasswordSchema, { userId: "", newPassword: "s" }],
    ["SetPassword/wrongTypes", SetPasswordSchema, { userId: 3, newPassword: null }],
  ];

  it.each(cases)("%s", (_label, schema, input) => {
    const result = schema.safeParse(input) as {
      success: boolean;
      error?: { issues: Array<{ message: string; path: PropertyKey[] }> };
    };

    expect(result.success).toBe(false);
    for (const issue of result.error!.issues) {
      expect(issue.message, `${String(issue.path)} → ${issue.message}`).toMatch(
        /^err\./,
      );
    }
  });
});
