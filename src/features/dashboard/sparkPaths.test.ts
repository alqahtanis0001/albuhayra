import { describe, expect, it } from "vitest";

import { barsPath, linePath, r1 } from "./sparkPaths";

describe("r1", () => {
  it("rounds to one decimal without a trailing .0 or -0", () => {
    expect(r1(4.14)).toBe("4.1");
    expect(r1(4.15)).toBe("4.2");
    expect(r1(116)).toBe("116");
    expect(r1(-0.01)).toBe("0");
  });
});

describe("linePath", () => {
  it("starts at the right edge (oldest) and ends at the left (newest)", () => {
    expect(linePath([0, 10, 5], 100, 20)).toBe("M100 18L50 2L0 10");
  });

  it("draws a flat series across the middle", () => {
    expect(linePath([3, 3], 100, 20)).toBe("M100 10L0 10");
  });

  it("is empty with no points", () => {
    expect(linePath([])).toBe("");
  });
});

describe("barsPath", () => {
  it("one sub-path per non-zero bar, oldest at the right, tallest filling the height", () => {
    expect(barsPath([10, 0, 5], 30, 22)).toBe("M20.5 22v-20h9V22zM0.5 22v-10h9V22z");
  });

  it("treats negatives as 0 and is empty when nothing is above 0", () => {
    expect(barsPath([-5, 0])).toBe("");
    expect(barsPath([])).toBe("");
  });

  it("stays well under 1 KB for 30 awkward values", () => {
    const values = Array.from({ length: 30 }, (_, i) => 1_234_567 + i * 98_765.4321);
    expect(barsPath(values).length).toBeLessThan(700);
    expect(linePath(values).length).toBeLessThan(400);
  });
});
