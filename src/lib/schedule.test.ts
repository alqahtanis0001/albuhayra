import { describe, expect, it } from "vitest";

import { buildSchedule, type ScheduleInput } from "./schedule";

const sum = (rows: { amountDueHalalas: number }[]) => rows.reduce((s, r) => s + r.amountDueHalalas, 0);
const dates = (rows: { dueDate: string }[] | null) => rows!.map((r) => r.dueDate);
const monthly = (firstDueDate: string, count: number): ScheduleInput => ({
  totalHalalas: 100_00 * count,
  count,
  frequency: "MONTHLY",
  firstDueDate,
});

describe("buildSchedule — amounts", () => {
  it("splits equally and puts the remainder on the last row", () => {
    const rows = buildSchedule({ totalHalalas: 1000, count: 3, frequency: "WEEKLY", firstDueDate: "2026-10-01" })!;
    expect(rows.map((r) => r.amountDueHalalas)).toEqual([333, 333, 334]);
  });

  it("3 halalas × 3 is three rows of 1 (V6)", () => {
    const rows = buildSchedule({ totalHalalas: 3, count: 3, frequency: "WEEKLY", firstDueDate: "2026-10-01" })!;
    expect(rows.map((r) => r.amountDueHalalas)).toEqual([1, 1, 1]);
  });

  it("2 halalas × 3 has no valid schedule — a row would be zero (V6)", () => {
    expect(buildSchedule({ totalHalalas: 2, count: 3, frequency: "WEEKLY", firstDueDate: "2026-10-01" })).toBeNull();
  });

  it("100,000.01 SAR ÷ 7 sums exactly", () => {
    const rows = buildSchedule({ totalHalalas: 10_000_001, count: 7, frequency: "MONTHLY", firstDueDate: "2026-10-01" })!;
    expect(sum(rows)).toBe(10_000_001);
    expect(rows.slice(0, 6).every((r) => r.amountDueHalalas === 1_428_571)).toBe(true);
    expect(rows[6]!.amountDueHalalas).toBe(1_428_575);
  });

  it("the ceiling over the maximum count sums exactly", () => {
    const rows = buildSchedule({ totalHalalas: 2_000_000_000, count: 120, frequency: "WEEKLY", firstDueDate: "2026-10-01" })!;
    expect(rows).toHaveLength(120);
    expect(sum(rows)).toBe(2_000_000_000);
  });

  it("refuses a count outside 1–120, a non-integer count or a non-positive total", () => {
    const base = { totalHalalas: 100_000, frequency: "WEEKLY" as const, firstDueDate: "2026-10-01" };
    for (const count of [0, 121, 2.5]) expect(buildSchedule({ ...base, count }), String(count)).toBeNull();
    expect(buildSchedule({ ...base, count: 1, totalHalalas: 0 })).toBeNull();
    expect(buildSchedule({ ...base, count: 1, totalHalalas: 1.5 })).toBeNull();
    expect(buildSchedule({ ...base, count: 120 })).toHaveLength(120);
  });
});

describe("buildSchedule — dates", () => {
  it("WEEKLY adds 7 days per row, across a month and a year", () => {
    expect(dates(buildSchedule({ totalHalalas: 300, count: 3, frequency: "WEEKLY", firstDueDate: "2026-12-25" }))).toEqual([
      "2026-12-25",
      "2027-01-01",
      "2027-01-08",
    ]);
  });

  it("EVERY_N_DAYS adds n days per row", () => {
    expect(
      dates(buildSchedule({ totalHalalas: 300, count: 3, frequency: "EVERY_N_DAYS", everyDays: 10, firstDueDate: "2026-02-20" })),
    ).toEqual(["2026-02-20", "2026-03-02", "2026-03-12"]);
  });

  it("EVERY_N_DAYS needs an integer interval of 1–365", () => {
    const base = { totalHalalas: 300, count: 3, frequency: "EVERY_N_DAYS" as const, firstDueDate: "2026-02-20" };
    for (const everyDays of [undefined, 0, 366, 1.5]) {
      expect(buildSchedule({ ...base, everyDays }), String(everyDays)).toBeNull();
    }
    expect(buildSchedule({ ...base, everyDays: 365 })).not.toBeNull();
  });

  it("MONTHLY keeps the anchor day and clamps per month — never drifting to the 28th", () => {
    expect(dates(buildSchedule(monthly("2026-01-31", 5)))).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
      "2026-05-31",
    ]);
  });

  it("MONTHLY clamps to 29 February in a leap year", () => {
    expect(dates(buildSchedule(monthly("2028-01-30", 3)))).toEqual(["2028-01-30", "2028-02-29", "2028-03-30"]);
  });

  it("MONTHLY crosses a year end", () => {
    expect(dates(buildSchedule(monthly("2026-11-15", 3)))).toEqual(["2026-11-15", "2026-12-15", "2027-01-15"]);
  });

  it("refuses a malformed or impossible first date", () => {
    for (const firstDueDate of ["2026-2-01", "2026-02-30", "not a date"]) {
      expect(buildSchedule(monthly(firstDueDate, 2)), firstDueDate).toBeNull();
    }
  });
});
