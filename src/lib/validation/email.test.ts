import { describe, expect, it, vi } from "vitest";

import { emailError, emailTypoSuggestion, normalizeEmail, signupEmail } from "./email";

vi.mock("server-only", () => ({}));
const { isDisposableEmail } = await import("../emails/disposable");

/**
 * Email rules (docs/BACKEND.md v1.1e + A11, A12). `emailDots` and
 * `emailDomain` must run before the general shape check: zod 4's `z.email()`
 * rejects both itself and would hide the specific key (reviewer N3).
 */

const RLM = String.fromCodePoint(0x200f);

describe("emailError", () => {
  it.each([
    ["empty", "", "err.required"],
    ["too long", `${"a".repeat(195)}@x.com`, "err.tooLong"],
    ["two dots in the local part", "salem..ali@example.com", "err.emailDots"],
    ["two dots in the domain", "salem@example..com", "err.emailDots"],
    ["a domain with no dot", "salem@localhost", "err.emailDomain"],
    ["no @", "salem.example.com", "err.emailInvalid"],
    ["nothing after @", "salem@", "err.emailInvalid"],
    ["a space", "sa lem@example.com", "err.emailInvalid"],
  ])("%s → %s", (_label, value, key) => {
    expect(emailError(value)).toBe(key);
  });

  it("accepts ordinary addresses", () => {
    for (const ok of ["salem@example.com", "s.ali+ledger@mail.example.sa", "a@b.co"]) {
      expect(emailError(ok), ok).toBeNull();
    }
  });
});

describe("normalizeEmail / signupEmail", () => {
  it("trims, lower-cases and strips bidi marks", () => {
    expect(normalizeEmail(`  ${RLM}Salem@Example.COM `)).toBe("salem@example.com");
    expect(signupEmail.parse(` ${RLM}Salem@Example.COM`)).toBe("salem@example.com");
  });

  it("reports the specific key through the schema", () => {
    expect(signupEmail.safeParse("a..b@example.com").error?.issues[0]?.message).toBe("err.emailDots");
  });
});

describe("emailTypoSuggestion — a hint, never a refusal", () => {
  it.each([
    ["salem@gmial.com", "salem@gmail.com"],
    ["salem@gmai.com", "salem@gmail.com"],
    ["salem@gmail.co", "salem@gmail.com"],
    ["salem@gmail.con", "salem@gmail.com"],
    ["salem@hotmial.com", "salem@hotmail.com"],
    ["salem@hotmail.co", "salem@hotmail.com"],
    ["salem@outlok.com", "salem@outlook.com"],
    ["salem@yahooo.com", "salem@yahoo.com"],
    ["salem@icloud.co", "salem@icloud.com"],
    [" Salem@GMIAL.com ", "salem@gmail.com"],
  ])("%s → %s", (typed, fixed) => {
    expect(emailTypoSuggestion(typed)).toBe(fixed);
  });

  it("is null for a correct or unknown domain, or no address at all", () => {
    for (const value of ["salem@gmail.com", "salem@company.sa", "salem", "@gmial.com", ""]) {
      expect(emailTypoSuggestion(value), value).toBeNull();
    }
  });

  it("a suggested domain is not an error", () => {
    expect(emailError("salem@gmial.com")).toBeNull();
  });
});

describe("isDisposableEmail (server-only)", () => {
  it("matches a listed domain and every subdomain of one", () => {
    expect(isDisposableEmail("x@mailinator.com")).toBe(true);
    expect(isDisposableEmail("x@inbox.mailinator.com")).toBe(true);
    expect(isDisposableEmail("x@a.b.yopmail.com")).toBe(true);
  });

  it("does not match a domain that merely ends with the same letters", () => {
    expect(isDisposableEmail("x@notmailinator.com")).toBe(false);
  });

  it("leaves ordinary providers alone", () => {
    for (const ok of ["gmail.com", "outlook.com", "icloud.com", "yahoo.com", "hotmail.com", "company.com.sa"]) {
      expect(isDisposableEmail(`x@${ok}`), ok).toBe(false);
    }
  });

  it("does not treat a bare top-level domain as a match", () => {
    expect(isDisposableEmail("x@com")).toBe(false);
  });
});
