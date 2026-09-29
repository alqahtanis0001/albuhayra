import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { COMMON_PASSWORDS } from "../passwords/common.generated";
import {
  emailTokens,
  passwordBaseError,
  passwordError,
  passwordPersonalError,
  passwordStrength,
} from "./password";

vi.mock("server-only", () => ({}));
const { commonPasswordError } = await import("../passwords/server");

/**
 * Password rules (docs/BACKEND.md v1.1e + A3, A11, A12). Each rule answers its
 * own key; the meter and the schema call the same functions. The common list
 * is passed in by the caller (A12 as amended, G-B1) — these rules never load it.
 */

const LIST = COMMON_PASSWORDS;
const ctx = { email: "salem.alshehri@example.com", names: ["سالم", "علي", "Alshehri"], common: LIST };

describe("passwordBaseError — the rules that need no account", () => {
  it.each([
    ["empty", "", "err.required"],
    ["9 characters", "abcdefgh1", "err.passwordShort"],
    ["73 ASCII bytes", `${"a1".repeat(36)}b`, "err.passwordLong"],
    ["37 Arabic letters and a digit = 75 bytes, though only 38 characters", `${"س".repeat(37)}1`, "err.passwordLong"],
    ["letters only", "onlyletterslong", "err.passwordLetterDigit"],
    ["digits only", "12345678901", "err.passwordLetterDigit"],
    ["symbols and digits, no letter", "!!!!----1234", "err.passwordLetterDigit"],
    ["a common password", "password123", "err.passwordCommon"],
    ["a common password in capitals", "PASSWORD123", "err.passwordCommon"],
    ["a common password in Arabic-Indic digits", "password١٢٣", "err.passwordCommon"],
    ["a common password with a trailing space", "liverpool1 ", "err.passwordCommon"],
    // E0-S1: the length rule reads the normalised copy too, so padding a
    // 9-character common password up to 10 no longer gets it through.
    ["9 characters and a trailing space", "password1 ", "err.passwordShort"],
    ["9 characters and a zero-width space", `password1${String.fromCodePoint(0x200b)}`, "err.passwordShort"],
  ])("%s → %s", (_label, password, key) => {
    expect(passwordBaseError(password, LIST)).toBe(key);
  });

  it("without the list the common rule is skipped — the server adds it", () => {
    expect(passwordBaseError("password123")).toBeNull();
    expect(commonPasswordError("password123")).toBe("err.passwordCommon");
    expect(commonPasswordError("PASSWORD١٢٣")).toBe("err.passwordCommon");
    expect(commonPasswordError("Bright-river42")).toBeNull();
  });

  it.each([
    ["exactly 10 characters", "abcdefghx1"],
    ["exactly 72 bytes", "a1".repeat(36)],
    ["Arabic letters with an Arabic-Indic digit", "كلمةسرقوية٧"],
    ["35 Arabic letters and a digit = 71 bytes", `${"س".repeat(35)}1`],
  ])("accepts %s", (_label, password) => {
    expect(passwordBaseError(password, LIST)).toBeNull();
  });

  it("measures bytes on the password as typed, not a normalised copy", () => {
    // U+FB01 "ﬁ" is 3 bytes and NFKC turns it into "fi" (2 bytes): 24 of them
    // are 72 bytes as typed. The hash sees the typed bytes, so that is the limit.
    const ligatures = `${String.fromCodePoint(0xfb01).repeat(24)}1`;
    expect(new TextEncoder().encode(ligatures).length).toBe(73);
    expect(passwordBaseError(ligatures)).toBe("err.passwordLong");
  });
});

describe("passwordPersonalError", () => {
  it("refuses an email local-part token of 3+ characters, case-insensitively", () => {
    expect(passwordPersonalError("xx-SALEM-2026", ctx)).toBe("err.passwordPersonal");
    expect(passwordPersonalError("alshehri#2026", ctx)).toBe("err.passwordPersonal");
  });

  it("ignores local-part tokens shorter than 3 (reviewer S9)", () => {
    expect(emailTokens("a.b+cd@example.com")).toEqual([]);
    expect(passwordPersonalError("a-b-cd-2026-xyz", { email: "a.b+cd@example.com" })).toBeNull();
  });

  it("refuses a name word of 3+ letters, ignoring harakat", () => {
    expect(passwordPersonalError("كلمة-سالم-2026", ctx)).toBe("err.passwordPersonal");
    expect(passwordPersonalError("كلمة-سالِم-2026", ctx)).toBe("err.passwordPersonal");
    expect(passwordPersonalError("xALSHEHRIx99", ctx)).toBe("err.passwordPersonal");
  });

  it("ignores a two-letter name and checks each word of a compound name", () => {
    expect(passwordPersonalError("Bright-river42", { names: ["Al"] })).toBeNull();
    expect(passwordPersonalError("xx-الله-2026", { names: ["عبد الله"] })).toBe("err.passwordPersonal");
  });

  it("is null with no context at all", () => {
    expect(passwordPersonalError("Bright-river42", {})).toBeNull();
  });
});

describe("passwordStrength — the meter", () => {
  it("is weak while any rule fails", () => {
    expect(passwordStrength("short1")).toBe("weak");
    expect(passwordStrength("password123", { common: LIST })).toBe("weak");
    expect(passwordStrength("salem-rules-2026", ctx)).toBe("weak");
  });

  it("is fair when every rule passes but it is short and plain", () => {
    expect(passwordStrength("brightriver4")).toBe("fair");
  });

  it("is strong at 14+ characters, or with 3+ kinds of character", () => {
    expect(passwordStrength("brightriverrun4")).toBe("strong");
    expect(passwordStrength("Brightriver4")).toBe("strong");
    expect(passwordStrength("bright-rive4")).toBe("strong");
    expect(passwordStrength("كلمةسرقوية٧a")).toBe("strong");
  });

  it("agrees with passwordError: weak exactly when a rule fails", () => {
    for (const pw of ["", "abc", "charlie123", "Bright-river42", "salem-1234567", "onlyletterslong"]) {
      expect(passwordStrength(pw, ctx) === "weak", pw).toBe(passwordError(pw, ctx) !== null);
    }
  });
});

/**
 * A12: the shipped module holds only the entries that could pass every other
 * rule. This proves that is *exactly* equivalent to checking the full list —
 * including for padded and invisible-character variants (E0-S1) — and that
 * the module has not drifted from what generate.mjs would write.
 */
describe("the common-password list", () => {
  const full = readFileSync(join(process.cwd(), "src/lib/passwords/common.txt"), "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim().toLowerCase())
    .filter(Boolean);

  /** Must match `filterCommon` in generate.mjs. */
  function commonCandidates(entries: string[]): string[] {
    return [
      ...new Set(entries.filter((e) => [...e].length >= 10 && /\p{L}/u.test(e) && /\p{Nd}/u.test(e))),
    ].sort();
  }

  it("ships the full SecLists NCSC 100k list", () => {
    expect(full.length).toBeGreaterThanOrEqual(99_000);
  });

  it("the module is exactly what the generator derives from common.txt", () => {
    expect([...LIST].sort()).toEqual(commonCandidates(full));
  });

  it("refuses every entry of the full list, and every padded variant of one, by one rule or another", () => {
    const zwsp = String.fromCodePoint(0x200b);
    const allowed: string[] = [];
    for (const entry of full) {
      for (const variant of [entry, entry.toUpperCase(), `${entry} `, ` ${entry}`, `${entry}${zwsp}`]) {
        if (passwordBaseError(variant, LIST) === null) allowed.push(variant);
      }
    }
    expect(allowed).toEqual([]);
  });

  it("…and the full list refuses nothing more than the shipped set does", () => {
    const fullSet = new Set(full);
    for (const entry of full) {
      expect(passwordBaseError(entry, LIST) === null, entry).toBe(passwordBaseError(entry, fullSet) === null);
    }
  });
});

/**
 * G-B1: `@/lib/validation` is imported by nearly every client bundle, so no
 * file under it may import the list — not even for a default parameter. The
 * sign-up and reset forms import it themselves; the server uses server.ts.
 */
describe("the list stays out of the shared validation code", () => {
  function files(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? files(path) : [path];
    });
  }

  const sources = files(join(process.cwd(), "src/lib/validation")).filter(
    (f) => f.endsWith(".ts") && !f.endsWith(".test.ts"),
  );

  it("finds the validation sources", () => {
    expect(sources.length).toBeGreaterThanOrEqual(5);
  });

  it.each(sources.map((f) => [f.slice(f.indexOf("validation"))]))("%s imports no passwords module", (rel) => {
    const source = readFileSync(join(process.cwd(), "src/lib", rel), "utf8");
    expect(source).not.toMatch(/(?:from|import\()\s*["'][^"']*passwords\//);
  });
});
