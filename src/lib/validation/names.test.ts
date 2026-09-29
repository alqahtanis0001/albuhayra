import { describe, expect, it } from "vitest";

import { nameError, namePart, optionalNamePart, sameName } from "./names";

/**
 * Every name rule answers its own key (docs/BACKEND.md v1.1e + A11), so the
 * form can say exactly which rule failed. Cases marked (S11) are the ones the
 * reviewer measured in Node 24 before any code existed.
 */

const ACCEPTED: Array<[string, string]> = [
  ["Arabic", "محمد"],
  ["Latin", "Sarah"],
  ["with harakat (S11 — marks are not Arabic-script letters)", "عليّ"],
  ["curly apostrophe", "O’Brien"],
  ["straight apostrophe", "O'Neil"],
  ["hyphen", "Jean-Luc"],
  ["a compound with a space", "عبد الله"],
  ["exactly 2 letters", "Al"],
  ["exactly 30 letters", "aabbcdefghijklmnopqrstuvwxyzab"],
  ["full harakat", "مُحَمَّدٌ"],
  ["tatweel is stripped, not a repeat (S11)", "محـــمد"],
  ["bidi marks are stripped (S11)", "\u200Fسالم\u200E"],
  ["NBSP collapses to a space", "عبد\u00A0الله"],
];

const REFUSED: Array<[string, string, string]> = [
  ["empty", "", "err.required"],
  ["spaces only", "   ", "err.required"],
  ["ASCII digit", "محمد2", "err.nameDigits"],
  ["Arabic-Indic digit", "محمد٢", "err.nameDigits"],
  ["digits only says digits, not length", "12", "err.nameDigits"],
  ["Cyrillic", "Иван", "err.nameChars"],
  ["CJK", "李雷", "err.nameChars"],
  ["mixed Latin and Cyrillic", "Ivаn", "err.nameChars"],
  ["a symbol", "Sara!", "err.nameChars"],
  ["an underscore", "sara_x", "err.nameChars"],
  ["an emoji", "سالم😀", "err.nameChars"],
  ["one letter", "a", "err.nameShort"],
  ["harakat only (S11)", "َُ", "err.nameShort"],
  ["hyphens only", "--", "err.nameShort"],
  ["one letter and a hyphen", "a-", "err.nameShort"],
  ["31 letters", "abcdefghijklmnopqrstuvwxyzabcde", "err.nameLong"],
  ["same letter three times", "Saaara", "err.nameRepeated"],
  ["repeat check ignores case", "SaAAra", "err.nameRepeated"],
  ["Arabic repeat", "ممممد", "err.nameRepeated"],
  ["junk", "asdf", "err.nameJunk"],
  ["junk in capitals", "TEST", "err.nameJunk"],
  ["Arabic junk", "تجربة", "err.nameJunk"],
  ["Arabic junk with harakat", "اِسْم", "err.nameJunk"],
];

describe("nameError", () => {
  it.each(ACCEPTED)("accepts %s", (_label, value) => {
    expect(nameError(value)).toBeNull();
  });

  it.each(REFUSED)("%s → %s", (_label, value, key) => {
    expect(nameError(value)).toBe(key);
  });

  it("counts letters, not characters: 30 letters with harakat pass, 31 do not", () => {
    expect(nameError("بَتَ".repeat(15))).toBeNull();
    expect(nameError(`${"بَتَ".repeat(15)}ث`)).toBe("err.nameLong");
  });
});

describe("sameName", () => {
  it("compares after normalising, ignoring case and harakat", () => {
    expect(sameName("Sara", " sara ")).toBe(true);
    expect(sameName("عليّ", "علي")).toBe(true);
    expect(sameName("سالم", "الشهري")).toBe(false);
    expect(sameName("", "")).toBe(false);
  });
});

describe("the zod parts", () => {
  it("namePart outputs the normalised value", () => {
    expect(namePart.parse("  عبد\u00A0\u00A0الله\u200F ")).toBe("عبد الله");
  });

  it("an empty middle name becomes undefined; a bad one is still refused", () => {
    expect(optionalNamePart.parse("  ")).toBeUndefined();
    expect(optionalNamePart.parse(undefined)).toBeUndefined();
    expect(optionalNamePart.safeParse("x1").error?.issues[0]?.message).toBe("err.nameDigits");
  });
});
