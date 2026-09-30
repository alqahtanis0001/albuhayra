import { describe, expect, it } from "vitest";

import {
  categoryLedgerHref,
  countUpValue,
  donutSlices,
  fillText,
  formatSignedPercent,
  momentum,
  sparkSummaryText,
  summaryDate,
  waterfallBars,
  waterfallSteps,
} from "./visuals";

describe("momentum", () => {
  it("is null with no previous net (first month, or 0)", () => {
    expect(momentum(500, 0)).toEqual({ pct: null, trend: "flat", capped: false });
    expect(momentum(0, 0)).toEqual({ pct: null, trend: "flat", capped: false });
  });

  it("rounds the change to whole percent", () => {
    expect(momentum(1_120, 1_000)).toEqual({ pct: 12, trend: "up", capped: false });
    expect(momentum(880, 1_000)).toEqual({ pct: -12, trend: "down", capped: false });
    expect(momentum(1_125, 1_000)).toEqual({ pct: 13, trend: "up", capped: false });
  });

  it("divides by |previous|, so improving from a loss is up", () => {
    expect(momentum(-500, -1_000)).toEqual({ pct: 50, trend: "up", capped: false });
    expect(momentum(-1_500, -1_000)).toEqual({ pct: -50, trend: "down", capped: false });
    expect(momentum(1_000, -1_000)).toEqual({ pct: 200, trend: "up", capped: false });
  });

  it("is flat when the change rounds to 0", () => {
    expect(momentum(1_004, 1_000)).toEqual({ pct: 0, trend: "flat", capped: false });
    expect(momentum(1_000, 1_000)).toEqual({ pct: 0, trend: "flat", capped: false });
    expect(momentum(1_005, 1_000)).toEqual({ pct: 1, trend: "up", capped: false });
  });

  it("holds a change beyond ±999% at ±999, capped", () => {
    expect(momentum(10_990, 1_000)).toEqual({ pct: 999, trend: "up", capped: false });
    expect(momentum(109_940, 10_000)).toEqual({ pct: 999, trend: "up", capped: false });
    expect(momentum(109_950, 10_000)).toEqual({ pct: 999, trend: "up", capped: true });
    expect(momentum(-109_950, 10_000)).toEqual({ pct: -999, trend: "down", capped: true });
    expect(momentum(500, 1)).toEqual({ pct: 999, trend: "up", capped: true });
    expect(momentum(-500, -1)).toEqual({ pct: -999, trend: "down", capped: true });
  });

  it("guards non-finite input", () => {
    expect(momentum(Number.NaN, 5).pct).toBeNull();
  });
});

describe("formatSignedPercent", () => {
  it("uses + and the real minus sign", () => {
    expect(formatSignedPercent(12)).toBe("+12%");
    expect(formatSignedPercent(-12)).toBe("−12%");
    expect(formatSignedPercent(0)).toBe("0%");
    expect(formatSignedPercent(1_250)).toBe("+1,250%");
  });
});

describe("donutSlices", () => {
  const top = [
    { categoryId: "a", nameAr: "إيجار", totalHalalas: 500 },
    { categoryId: "b", nameAr: "رواتب", totalHalalas: 300 },
  ];

  it("adds «أخرى» for the rest of the month's OUT total", () => {
    const s = donutSlices(top, 1_000, "أخرى");
    expect(s.map((x) => [x.key, x.totalHalalas, x.share])).toEqual([
      ["a", 500, 50],
      ["b", 300, 30],
      ["other", 200, 20],
    ]);
  });

  it("leaves «أخرى» out when the top categories are the whole month", () => {
    expect(donutSlices(top, 800, "أخرى").map((x) => x.key)).toEqual(["a", "b"]);
  });

  it("is empty for a month with no OUT total", () => {
    expect(donutSlices(top, 0, "أخرى")).toEqual([]);
  });

  it("keeps at most `limit` named slices, the rest going to «أخرى»", () => {
    const six = Array.from({ length: 6 }, (_, i) => ({ categoryId: `c${i}`, nameAr: `${i}`, totalHalalas: 100 }));
    const s = donutSlices(six, 600, "أخرى");
    expect(s).toHaveLength(6);
    expect(s[5]).toMatchObject({ key: "other", totalHalalas: 100 });
  });

  it("drops a zero category", () => {
    expect(donutSlices([{ categoryId: "z", nameAr: "z", totalHalalas: 0 }], 10, "أخرى").map((x) => x.key)).toEqual([
      "other",
    ]);
  });
});

describe("categoryLedgerHref", () => {
  it("uses the ledger's own filter names", () => {
    expect(categoryLedgerHref("cat_1", "2026-09-01", "2026-09-30")).toBe(
      "/owner/transactions?direction=OUT&categoryId=cat_1&from=2026-09-01&to=2026-09-30",
    );
  });
});

describe("waterfallSteps", () => {
  it("stacks income up from the opening and expenses down to the closing", () => {
    const w = waterfallSteps(1_000, 500, 800);
    expect(w.steps).toEqual([
      { key: "opening", from: 0, to: 1_000 },
      { key: "income", from: 1_000, to: 1_500 },
      { key: "expenses", from: 1_500, to: 700 },
      { key: "closing", from: 0, to: 700 },
    ]);
    expect([w.min, w.max]).toEqual([0, 1_500]);
  });

  it("spans below zero when the balance goes negative", () => {
    const w = waterfallSteps(100, 0, 400);
    expect(w.steps[3]).toEqual({ key: "closing", from: 0, to: -300 });
    expect([w.min, w.max]).toEqual([-300, 100]);
  });

  it("an all-zero month has a zero span", () => {
    const w = waterfallSteps(0, 0, 0);
    expect([w.min, w.max]).toEqual([0, 0]);
  });
});

describe("countUpValue", () => {
  it("starts at 0 and ends exactly at the target", () => {
    expect(countUpValue(12_345, 0, 600)).toBe(0);
    expect(countUpValue(12_345, 600, 600)).toBe(12_345);
    expect(countUpValue(12_345, 9_999, 600)).toBe(12_345);
  });

  it("eases out: past half-way at half the time", () => {
    expect(countUpValue(1_000, 300, 600)).toBe(875);
    expect(countUpValue(-1_000, 300, 600)).toBe(-875);
  });

  it("jumps to the target with no duration", () => {
    expect(countUpValue(7, 0, 0)).toBe(7);
  });
});

describe("fillText / sparkSummaryText", () => {
  it("fills every placeholder once and keeps unknown ones", () => {
    expect(fillText("{a}-{b}-{a}-{c}", { a: "{b}", b: "2" })).toBe("{b}-2-{b}-{c}");
  });

  it("names the first and last date and the extremes, signed", () => {
    const points = [
      { date: "2026-09-01", value: 150 },
      { date: "2026-09-02", value: -2_500 },
      { date: "2026-09-03", value: 100_000 },
    ];
    expect(sparkSummaryText("{from}|{to}|{max}|{min}", points)).toBe(
      `${summaryDate("2026-09-01")}|${summaryDate("2026-09-03")}|1,000.00 ر.س|−25.00 ر.س`,
    );
  });

  it("summaryDate is DateText's Gregorian with the Hijri in brackets", () => {
    expect(summaryDate("2026-09-29")).toMatch(/^2026-09-29 \(\d{4}\/\d{2}\/\d{2} هـ\)$/);
    expect(summaryDate("2026-09-29")).not.toBe(summaryDate("2026-09-30"));
  });

  it("is empty with no points", () => {
    expect(sparkSummaryText("{from}", [])).toBe("");
  });
});

describe("waterfallBars", () => {
  it("places the opening at the right and scales bars between min and max", () => {
    const { bars, zeroY } = waterfallBars(waterfallSteps(100, 100, 150), 400, 108);
    expect(bars.map((b) => [b.key, b.x, b.y, b.h])).toEqual([
      ["opening", 320, 54, 50],
      ["income", 220, 4, 50],
      ["expenses", 120, 4, 75],
      ["closing", 20, 79, 25],
    ]);
    expect(bars[0]!.w).toBe(60);
    expect(zeroY).toBe(104);
  });

  it("draws negative bars below the zero line", () => {
    const { bars, zeroY } = waterfallBars(waterfallSteps(0, 0, 100), 400, 108);
    expect(zeroY).toBe(4);
    expect(bars[3]).toMatchObject({ key: "closing", y: 4, h: 100 });
  });

  it("gives an all-zero month 1-unit bars on the baseline", () => {
    const { bars, zeroY } = waterfallBars(waterfallSteps(0, 0, 0), 400, 108);
    expect(zeroY).toBe(104);
    expect(bars.every((b) => b.h === 1 && b.y === 104)).toBe(true);
  });
});
