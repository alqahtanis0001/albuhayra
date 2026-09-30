import { describe, expect, it } from "vitest";

import {
  daysOfMonth,
  derivedStatus,
  employedOn,
  expectedStatus,
  isWorkDay,
  minutesBetween,
  prefillStatus,
  settleStatus,
  weekdayBit,
} from "./attendance";

// 2026-10-04 is a Sunday; 2026-10-09 a Friday; 2026-10-10 a Saturday.
const SUN = "2026-10-04";
const THU = "2026-10-08";
const FRI = "2026-10-09";
const SUN_THU = 31;

describe("work days (R5 bitmask)", () => {
  it("Sun=1 … Sat=64 from the UTC weekday of the ISO date", () => {
    expect(weekdayBit(SUN)).toBe(1);
    expect(weekdayBit(THU)).toBe(16);
    expect(weekdayBit("2026-10-10")).toBe(64);
  });

  it("the default mask is Sunday–Thursday", () => {
    expect(isWorkDay(SUN_THU, SUN)).toBe(true);
    expect(isWorkDay(SUN_THU, THU)).toBe(true);
    expect(isWorkDay(SUN_THU, FRI)).toBe(false);
    expect(prefillStatus(SUN_THU, FRI)).toBe("HOLIDAY");
    expect(prefillStatus(SUN_THU, SUN)).toBeNull();
  });
});

describe("derivedStatus (Y5, D11)", () => {
  const withGrace = (graceMinutes: number | null) => ({ workDays: SUN_THU, workStart: "08:00", graceMinutes });

  it("start + grace exactly is PRESENT; one minute later is LATE", () => {
    expect(derivedStatus("08:10", withGrace(10), SUN)).toBe("PRESENT");
    expect(derivedStatus("08:11", withGrace(10), SUN)).toBe("LATE");
  });

  it("a null grace never computes late; grace 0 is late after the start minute", () => {
    expect(derivedStatus("11:00", withGrace(null), SUN)).toBe("PRESENT");
    expect(derivedStatus("08:00", withGrace(0), SUN)).toBe("PRESENT");
    expect(derivedStatus("08:01", withGrace(0), SUN)).toBe("LATE");
  });

  it("no start time → PRESENT; a non-work day → PRESENT, never late; no check-in → null", () => {
    expect(derivedStatus("11:00", { workDays: SUN_THU, workStart: null, graceMinutes: null }, SUN)).toBe("PRESENT");
    expect(derivedStatus("11:00", withGrace(0), FRI)).toBe("PRESENT");
    expect(derivedStatus(null, withGrace(0), SUN)).toBeNull();
  });
});

describe("minutesBetween", () => {
  it("out strictly later; the same minute or earlier is null (N1)", () => {
    expect(minutesBetween("08:00", "16:30")).toBe(510);
    expect(minutesBetween("08:00", "08:00")).toBeNull();
    expect(minutesBetween("09:00", "08:00")).toBeNull();
    expect(minutesBetween("08:00", null)).toBeNull();
  });
});

describe("settleStatus (Z1 — overrides decided on the server)", () => {
  const schedule = { workDays: SUN_THU, workStart: "08:00", graceMinutes: 10 };

  it("ABSENT / LEAVE / REMOTE always override", () => {
    for (const posted of ["ABSENT", "LEAVE", "REMOTE"] as const) {
      expect(settleStatus(posted, null, schedule, SUN)).toEqual({ status: posted, statusOverridden: true });
      expect(settleStatus(posted, "08:30", schedule, FRI)).toEqual({ status: posted, statusOverridden: true });
    }
  });

  it("HOLIDAY overrides unless the day expects it", () => {
    expect(settleStatus("HOLIDAY", null, schedule, FRI)).toEqual({ status: "HOLIDAY", statusOverridden: false });
    expect(settleStatus("HOLIDAY", null, schedule, SUN)).toEqual({ status: "HOLIDAY", statusOverridden: true });
    expect(settleStatus("HOLIDAY", "08:05", schedule, SUN)).toEqual({ status: "HOLIDAY", statusOverridden: true });
  });

  it("PRESENT / LATE with a check-in override only when they differ from the derived status", () => {
    expect(settleStatus("LATE", "08:30", schedule, SUN)).toEqual({ status: "LATE", statusOverridden: false });
    expect(settleStatus("PRESENT", "08:30", schedule, SUN)).toEqual({ status: "PRESENT", statusOverridden: true });
    expect(settleStatus("LATE", "08:05", schedule, SUN)).toEqual({ status: "LATE", statusOverridden: true });
  });

  it("lead's Z1 ruling: «حاضر» with no check-in stays open to a later late on a work day; on a Friday it is an override", () => {
    expect(settleStatus("PRESENT", null, schedule, SUN)).toEqual({ status: "PRESENT", statusOverridden: false });
    expect(settleStatus("LATE", null, schedule, SUN)).toEqual({ status: "LATE", statusOverridden: false });
    expect(settleStatus("PRESENT", null, schedule, FRI)).toEqual({ status: "PRESENT", statusOverridden: true });
  });

  it("expectedStatus is derived with a check-in, عطلة on a non-work day, else none", () => {
    expect(expectedStatus("08:30", schedule, SUN)).toBe("LATE");
    expect(expectedStatus(null, schedule, FRI)).toBe("HOLIDAY");
    expect(expectedStatus(null, schedule, SUN)).toBeNull();
  });
});

describe("calendar helpers", () => {
  it("daysOfMonth covers the month, February included", () => {
    expect(daysOfMonth("2026-10")).toHaveLength(31);
    expect(daysOfMonth("2028-02").at(-1)).toBe("2028-02-29");
    expect(daysOfMonth("2027-02").at(-1)).toBe("2027-02-28");
  });

  it("Z2: employed on a day — hire ≤ date ≤ end, inclusive both ends", () => {
    expect(employedOn("2026-10-01", "2026-10-01", null)).toBe(true);
    expect(employedOn("2026-09-30", "2026-10-01", null)).toBe(false);
    expect(employedOn("2026-10-31", "2026-10-01", "2026-10-31")).toBe(true);
    expect(employedOn("2026-11-01", "2026-10-01", "2026-10-31")).toBe(false);
  });
});
