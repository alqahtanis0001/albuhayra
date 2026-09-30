import { describe, expect, it } from "vitest";

import {
  bucketByMonth,
  dailySeries,
  lastDays,
  monthOpenings,
  prevMonthToDateNet,
  type SeriesRow,
} from "./series";

const IN = (date: string, amountHalalas: number): SeriesRow => ({ date, direction: "IN", amountHalalas });
const OUT = (date: string, amountHalalas: number): SeriesRow => ({ date, direction: "OUT", amountHalalas });

describe("lastDays", () => {
  it("returns the days ending today, oldest first, across a month end", () => {
    expect(lastDays("2026-03-02", 4)).toEqual(["2026-02-27", "2026-02-28", "2026-03-01", "2026-03-02"]);
  });

  it("counts a leap day", () => {
    expect(lastDays("2028-03-01", 2)).toEqual(["2028-02-29", "2028-03-01"]);
  });
});

describe("dailySeries", () => {
  it("zero-fills every one of the 30 days, today last", () => {
    const s = dailySeries([], 0, "2026-09-30");
    expect(s).toHaveLength(30);
    expect(s[0]!.date).toBe("2026-09-01");
    expect(s[29]!.date).toBe("2026-09-30");
    expect(s.every((d) => d.inHalalas === 0 && d.outHalalas === 0 && d.balanceHalalas === 0)).toBe(true);
  });

  it("buckets by day and carries the running balance from the opening", () => {
    const s = dailySeries(
      [IN("2026-09-29", 500), OUT("2026-09-29", 200), OUT("2026-09-30", 50)],
      1_000,
      "2026-09-30",
      3,
    );
    expect(s).toEqual([
      { date: "2026-09-28", inHalalas: 0, outHalalas: 0, balanceHalalas: 1_000 },
      { date: "2026-09-29", inHalalas: 500, outHalalas: 200, balanceHalalas: 1_300 },
      { date: "2026-09-30", inHalalas: 0, outHalalas: 50, balanceHalalas: 1_250 },
    ]);
  });

  it("folds rows before the first day into the opening, and the first day's own rows into that day", () => {
    const s = dailySeries([IN("2026-09-01", 300), OUT("2026-09-27", 100), IN("2026-09-28", 7)], 50, "2026-09-30", 3);
    expect(s[0]).toEqual({ date: "2026-09-28", inHalalas: 7, outHalalas: 0, balanceHalalas: 257 });
  });

  it("ignores rows after today", () => {
    const s = dailySeries([IN("2026-10-01", 999)], 0, "2026-09-30", 2);
    expect(s.map((d) => d.balanceHalalas)).toEqual([0, 0]);
  });

  it("the last day's balance is the all-time balance", () => {
    const rows = [IN("2026-07-15", 10_000), OUT("2026-09-10", 2_500), IN("2026-09-30", 1)];
    const s = dailySeries(rows, -400, "2026-09-30");
    expect(s[29]!.balanceHalalas).toBe(-400 + 10_000 - 2_500 + 1);
  });
});

describe("bucketByMonth", () => {
  it("sums each direction per month, zero-fills and ignores rows outside the months", () => {
    const rows = [IN("2026-08-31", 10), OUT("2026-08-01", 4), IN("2026-09-01", 7), IN("2026-07-31", 99)];
    expect(bucketByMonth(rows, ["2026-08", "2026-09", "2026-10"])).toEqual([
      { ym: "2026-08", inHalalas: 10, outHalalas: 4 },
      { ym: "2026-09", inHalalas: 7, outHalalas: 0 },
      { ym: "2026-10", inHalalas: 0, outHalalas: 0 },
    ]);
  });
});

describe("monthOpenings", () => {
  it("starts at the balance before the window and adds each earlier month's net", () => {
    expect(
      monthOpenings(
        [
          { inHalalas: 100, outHalalas: 30 },
          { inHalalas: 0, outHalalas: 500 },
          { inHalalas: 5, outHalalas: 0 },
        ],
        1_000,
      ),
    ).toEqual([1_000, 1_070, 570]);
  });

  it("is empty for no months", () => {
    expect(monthOpenings([], 5)).toEqual([]);
  });
});

describe("prevMonthToDateNet", () => {
  const rows = [
    IN("2026-08-01", 100),
    OUT("2026-08-15", 30),
    IN("2026-08-16", 1_000),
    IN("2026-07-31", 7),
    IN("2026-09-01", 9),
  ];

  it("sums last month from the 1st to the same day, inclusive", () => {
    expect(prevMonthToDateNet(rows, "2026-09-15")).toBe(70);
    expect(prevMonthToDateNet(rows, "2026-09-16")).toBe(1_070);
  });

  it("clamps to the last day of a shorter month", () => {
    const feb = [IN("2026-02-28", 5), IN("2026-03-01", 99)];
    expect(prevMonthToDateNet(feb, "2026-03-31")).toBe(5);
    expect(prevMonthToDateNet(feb, "2026-03-27")).toBe(0);
  });

  it("crosses a year boundary", () => {
    expect(prevMonthToDateNet([OUT("2025-12-03", 40), OUT("2025-12-04", 1)], "2026-01-03")).toBe(-40);
  });
});
