import { describe, expect, it } from "vitest";

import { isoToDate, toHijri } from "@/lib/dates";

import { buildRibbon, daysBetween, sumRows, tileDate, weekdayAr } from "./ribbon";

const row = (dueDate: string, direction: "IN" | "OUT", remainingHalalas: number) => ({
  dueDate,
  direction,
  remainingHalalas,
});

describe("sumRows", () => {
  it("counts every row and keeps لنا and علينا apart", () => {
    expect(sumRows([row("2026-10-01", "IN", 500), row("2026-10-01", "OUT", 200), row("2026-10-02", "IN", 1)]))
      .toEqual({ count: 3, inHalalas: 501, outHalalas: 200 });
  });
  it("is zero for no rows", () => {
    expect(sumRows([])).toEqual({ count: 0, inHalalas: 0, outHalalas: 0 });
  });
});

describe("daysBetween", () => {
  it("includes both ends and crosses a month end", () => {
    expect(daysBetween("2026-09-28", "2026-10-04")).toEqual([
      "2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04",
    ]);
  });
  it("is one day when from = to", () => {
    expect(daysBetween("2026-10-01", "2026-10-01")).toEqual(["2026-10-01"]);
  });
});

describe("buildRibbon", () => {
  const ribbon = buildRibbon({
    today: "2026-09-30",
    weekEnd: "2026-10-06",
    overdue: [row("2026-09-20", "IN", 1000), row("2026-09-29", "OUT", 300)],
    thisWeek: [row("2026-09-30", "IN", 50), row("2026-10-02", "OUT", 70), row("2026-10-02", "OUT", 30), row("2026-10-06", "IN", 9)],
  });

  it("puts every overdue row in one tile", () => {
    expect(ribbon.overdue).toEqual({ count: 2, inHalalas: 1000, outHalalas: 300 });
  });

  it("has seven days from today, empty ones included, today marked", () => {
    expect(ribbon.days.map((d) => d.date)).toEqual(daysBetween("2026-09-30", "2026-10-06"));
    expect(ribbon.days.map((d) => d.isToday)).toEqual([true, false, false, false, false, false, false]);
    expect(ribbon.days[0]).toMatchObject({ count: 1, inHalalas: 50, outHalalas: 0 });
    expect(ribbon.days[1]).toMatchObject({ count: 0, inHalalas: 0, outHalalas: 0 });
    expect(ribbon.days[2]).toMatchObject({ count: 2, inHalalas: 0, outHalalas: 100 });
    expect(ribbon.days[6]).toMatchObject({ count: 1, inHalalas: 9, outHalalas: 0 });
  });
});

describe("tileDate", () => {
  it("reads Gregorian then Hijri, exactly as DateText shows the day", () => {
    const hijri = toHijri(isoToDate("2026-10-01")); // the same path DateText takes
    expect(tileDate("2026-10-01")).toBe(`2026-10-01 (${hijri})`);
    expect(tileDate("2026-10-01")).toBe("2026-10-01 (1448/04/20 هـ)");
  });
});

describe("weekdayAr", () => {
  it("names the day of the date itself", () => {
    expect(weekdayAr("2026-10-01")).toBe("الخميس");
    expect(weekdayAr("2026-10-02")).toBe("الجمعة");
  });
});
