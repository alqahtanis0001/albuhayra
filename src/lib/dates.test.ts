import { describe, expect, it } from "vitest";

import {
  currentMonthKey,
  dateToISO,
  isoToDate,
  lastMonths,
  monthEnd,
  monthKey,
  monthNameAr,
  monthStart,
  todayISO,
  toHijri,
  ymString,
} from "./dates";

describe("todayISO", () => {
  it("uses the Riyadh calendar day, not UTC", () => {
    // 21:30 UTC on 28 Sep is already 00:30 on 29 Sep in Riyadh (UTC+3).
    expect(todayISO(new Date("2026-09-28T21:30:00Z"))).toBe("2026-09-29");
    expect(todayISO(new Date("2026-09-28T20:59:00Z"))).toBe("2026-09-28");
  });
});

describe("isoToDate / dateToISO", () => {
  it("round-trips a calendar day without shifting it", () => {
    for (const iso of ["2026-01-01", "2026-09-29", "2026-12-31"]) {
      expect(dateToISO(isoToDate(iso))).toBe(iso);
    }
  });

  it("builds a UTC-midnight Date, which is what @db.Date stores", () => {
    expect(isoToDate("2026-09-29").toISOString()).toBe("2026-09-29T00:00:00.000Z");
  });
});

describe("monthKey", () => {
  it("reads the month in UTC so a stored date never slips a month", () => {
    expect(monthKey(isoToDate("2026-01-01"))).toEqual({ year: 2026, month: 1 });
    expect(monthKey(isoToDate("2026-12-31"))).toEqual({ year: 2026, month: 12 });
  });
});

describe("currentMonthKey", () => {
  it("follows the Riyadh day boundary", () => {
    expect(currentMonthKey(new Date("2026-09-30T21:30:00Z"))).toEqual({
      year: 2026,
      month: 10,
    });
  });
});

describe("monthStart / monthEnd", () => {
  it("covers the whole month inclusively", () => {
    expect(dateToISO(monthStart(2026, 2))).toBe("2026-02-01");
    expect(dateToISO(monthEnd(2026, 2))).toBe("2026-02-28");
    expect(dateToISO(monthEnd(2028, 2))).toBe("2028-02-29");
    expect(dateToISO(monthEnd(2026, 12))).toBe("2026-12-31");
  });
});

describe("lastMonths", () => {
  it("returns the window oldest first, ending with the given month", () => {
    expect(lastMonths(6, { year: 2026, month: 3 })).toEqual([
      { year: 2025, month: 10 },
      { year: 2025, month: 11 },
      { year: 2025, month: 12 },
      { year: 2026, month: 1 },
      { year: 2026, month: 2 },
      { year: 2026, month: 3 },
    ]);
  });

  it("returns exactly the requested count", () => {
    expect(lastMonths(24, { year: 2026, month: 9 })).toHaveLength(24);
  });
});

describe("ymString", () => {
  it("zero-pads the month", () => {
    expect(ymString(2026, 9)).toBe("2026-09");
    expect(ymString(2026, 12)).toBe("2026-12");
  });
});

describe("toHijri", () => {
  it("renders a Hijri date with Western digits and the Arabic marker", () => {
    const hijri = toHijri(isoToDate("2026-09-29"));
    expect(hijri).toMatch(/^\d{4}\/\d{2}\/\d{2} هـ$/);
    expect(hijri).not.toMatch(/[٠-٩]/);
  });

  it("is monotonic with the Gregorian date", () => {
    expect(toHijri(isoToDate("2026-01-01"))).not.toBe(toHijri(isoToDate("2026-06-01")));
  });
});

describe("monthNameAr", () => {
  it("maps 1-12 and nothing else", () => {
    expect(monthNameAr(1)).toBe("يناير");
    expect(monthNameAr(12)).toBe("ديسمبر");
    expect(monthNameAr(13)).toBe("");
    expect(monthNameAr(0)).toBe("");
  });
});
