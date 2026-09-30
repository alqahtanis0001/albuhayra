import { describe, expect, it } from "vitest";

import { budgetFill, budgetPct, budgetTone, categorySlices, ringArcs, ringCircumference } from "./budgetVisual";

describe("budgetTone (79.99 / 80 / 100 / 100.01%)", () => {
  it("is green below 80%, gold from 80% to 100%, red above", () => {
    expect(budgetTone(7_999, 10_000)).toBe("green");
    expect(budgetTone(8_000, 10_000)).toBe("gold");
    expect(budgetTone(10_000, 10_000)).toBe("gold");
    expect(budgetTone(10_001, 10_000)).toBe("red");
    expect(budgetTone(0, 10_000)).toBe("green");
  });
  it("has no tone without a budget", () => {
    expect(budgetTone(500, null)).toBeNull();
  });
  it("with a budget of 0: nothing spent reads as used up (gold), anything spent is red", () => {
    expect(budgetTone(0, 0)).toBe("gold");
    expect(budgetTone(1, 0)).toBe("red");
  });
});

describe("budgetPct", () => {
  it("never contradicts the tone", () => {
    expect(budgetPct(7_999, 10_000)).toBe(79);
    expect(budgetPct(8_000, 10_000)).toBe(80);
    expect(budgetPct(10_000, 10_000)).toBe(100);
    expect(budgetPct(10_001, 10_000)).toBe(101);
    expect(budgetPct(25_000, 10_000)).toBe(250);
  });
  it("is null without a positive budget", () => {
    expect(budgetPct(1, null)).toBeNull();
    expect(budgetPct(1, 0)).toBeNull();
  });
});

describe("budgetFill", () => {
  it("is the rounded share, capped at 100", () => {
    expect(budgetFill(5_000, 10_000)).toBe(50);
    expect(budgetFill(10_000, 10_000)).toBe(100);
    expect(budgetFill(30_000, 10_000)).toBe(100);
    expect(budgetFill(0, 0)).toBe(0);
    expect(budgetFill(1, 0)).toBe(100);
  });
});

const cat = (id: string, total: number, direction: "IN" | "OUT" = "OUT") => ({
  categoryId: id,
  nameAr: id,
  direction,
  totalHalalas: total,
});

describe("categorySlices", () => {
  it("keeps costs only, largest first, shares of the cost total", () => {
    const slices = categorySlices([cat("a", 100), cat("b", 300), cat("inc", 999, "IN")]);
    expect(slices.map((s) => [s.key, s.totalHalalas, s.share])).toEqual([
      ["b", 300, 75],
      ["a", 100, 25],
    ]);
  });
  it("folds everything after the top 5 into «أخرى»", () => {
    const slices = categorySlices([cat("a", 60), cat("b", 50), cat("c", 40), cat("d", 30), cat("e", 20), cat("f", 7), cat("g", 3)]);
    expect(slices.map((s) => s.key)).toEqual(["a", "b", "c", "d", "e", "other"]);
    expect(slices[5]).toMatchObject({ nameAr: null, totalHalalas: 10 });
    expect(slices.reduce((s, x) => s + x.share, 0)).toBeCloseTo(100);
  });
  it("has no «أخرى» with exactly five, and nothing without costs", () => {
    expect(categorySlices([cat("a", 5), cat("b", 4), cat("c", 3), cat("d", 2), cat("e", 1)]).map((s) => s.key))
      .not.toContain("other");
    expect(categorySlices([cat("inc", 10, "IN")])).toEqual([]);
  });
});

describe("ringArcs (real circumference units)", () => {
  // r = 16 → C = 100.53
  it("starts each arc where the previous one ended", () => {
    expect(ringArcs([50, 30, 20], 16)).toEqual([
      { length: 50.27, offset: 0 },
      { length: 30.16, offset: 50.27 },
      { length: 20.11, offset: 80.42 },
    ]);
  });
  it("offsets sum unrounded lengths, so the last arc ends at the full circle", () => {
    const thirds = ringArcs([100 / 3, 100 / 3, 100 / 3], 16);
    expect(thirds.map((a) => a.offset)).toEqual([0, 33.51, 67.02]);
    expect(thirds[2]!.offset + thirds[2]!.length).toBeCloseTo(ringCircumference(16), 1);
  });
  it("C = 2πr, rounded to 2 decimals", () => {
    expect(ringCircumference(16)).toBe(100.53);
    expect(ringCircumference(10)).toBe(62.83);
  });
});
