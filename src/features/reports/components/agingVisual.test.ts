import { describe, expect, it } from "vitest";

import { bucketShares, SEGMENT_FILL, TILE_TINT } from "./agingVisual";

const row = (a: number, b: number, c: number, d: number) => ({
  upTo30Halalas: a, upTo60Halalas: b, upTo90Halalas: c, over90Halalas: d,
});
const sum = (s: Record<string, number>) => Math.round(Object.values(s).reduce((x, y) => x + y, 0) * 100);

describe("bucketShares (v1.3 item 14)", () => {
  it("shares of the row's total", () => {
    expect(bucketShares(row(300, 1200, 4800, 19200))).toEqual({
      upTo30Halalas: 1.18, upTo60Halalas: 4.71, upTo90Halalas: 18.82, over90Halalas: 75.29,
    });
  });

  it("a single bucket is 100", () => {
    expect(bucketShares(row(0, 0, 500, 0))).toEqual(row(0, 0, 100, 0));
  });

  it("thirds sum to exactly 100 (largest remainder goes to the first)", () => {
    const s = bucketShares(row(1, 1, 1, 0));
    expect(s).toEqual(row(33.34, 33.33, 33.33, 0));
    expect(sum(s)).toBe(10_000);
  });

  it("always sums to 100 on awkward rows", () => {
    for (const r of [row(1, 2, 3, 4), row(7, 7, 7, 7), row(1, 0, 0, 2), row(99999, 1, 1, 1)]) {
      expect(sum(bucketShares(r))).toBe(10_000);
    }
  });

  it("zero-safe: an empty row is all zeros", () => {
    expect(bucketShares(row(0, 0, 0, 0))).toEqual(row(0, 0, 0, 0));
  });

  it("tints and fills cover every bucket, youngest first", () => {
    expect(Object.keys(TILE_TINT)).toEqual(["upTo30Halalas", "upTo60Halalas", "upTo90Halalas", "over90Halalas"]);
    expect(Object.keys(SEGMENT_FILL)).toEqual(Object.keys(TILE_TINT));
  });
});
