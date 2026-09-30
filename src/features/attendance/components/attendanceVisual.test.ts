import { describe, expect, it } from "vitest";

import { attendanceRate, heatCells, heatStep, lastMonths, pctText, STATUS_TINT, type Totals } from "./attendanceVisual";
import { formatClock, graceLeft, riyadhSecondOfDay, ringDash } from "./clockMath";

const totals = (p: Partial<Totals>): Totals => ({ PRESENT: 0, LATE: 0, ABSENT: 0, LEAVE: 0, REMOTE: 0, HOLIDAY: 0, ...p });

describe("attendanceRate (v1.3 item 10)", () => {
  it("attended = حاضر + متأخر + عن بُعد over attended + غائب", () => {
    expect(attendanceRate(totals({ PRESENT: 6, LATE: 1, REMOTE: 1, ABSENT: 2 }))).toBe(0.8);
  });
  it("leaves out عطلة and إجازة", () => {
    expect(attendanceRate(totals({ PRESENT: 3, ABSENT: 1, HOLIDAY: 8, LEAVE: 5 }))).toBe(0.75);
  });
  it("null with nothing countable (no divide by zero)", () => {
    expect(attendanceRate(totals({ HOLIDAY: 4, LEAVE: 2 }))).toBeNull();
    expect(attendanceRate(totals({}))).toBeNull();
  });
  it("all absent is 0, not null", () => {
    expect(attendanceRate(totals({ ABSENT: 3 }))).toBe(0);
  });
});

describe("heatStep / pctText", () => {
  it("steps at 50 / 75 / 90%", () => {
    expect(heatStep(null)).toBe(0);
    expect(heatStep(0)).toBe(1);
    expect(heatStep(0.4999)).toBe(1);
    expect(heatStep(0.5)).toBe(2);
    expect(heatStep(0.7499)).toBe(2);
    expect(heatStep(0.75)).toBe(3);
    expect(heatStep(0.8999)).toBe(3);
    expect(heatStep(0.9)).toBe(4);
    expect(heatStep(1)).toBe(4);
  });
  it("rounds to a whole percent", () => {
    expect(pctText(0.874)).toBe("87%");
    expect(pctText(0.875)).toBe("88%");
    expect(pctText(1)).toBe("100%");
  });
  it("every status has a tint class", () => {
    expect(STATUS_TINT).toEqual({
      PRESENT: "bg-tint-in", LATE: "bg-tint-amber", ABSENT: "bg-tint-out",
      LEAVE: "bg-tint-blue", REMOTE: "bg-tint-teal", HOLIDAY: "bg-tint-grey",
    });
  });
});

describe("lastMonths / heatCells", () => {
  it("12 months ending at the given one, oldest first, across a year", () => {
    const m = lastMonths("2026-03");
    expect(m).toHaveLength(12);
    expect(m[0]).toBe("2025-04");
    expect(m[9]).toBe("2026-01");
    expect(m.at(-1)).toBe("2026-03");
  });

  it("groups by month; before the hire month; no data; a rate", () => {
    const cells = heatCells(
      [
        { date: "2026-02-01", status: "PRESENT" },
        { date: "2026-02-02", status: "ABSENT" },
        { date: "2026-03-01", status: "HOLIDAY" },
        { date: "2025-04-10", status: "PRESENT" },
      ],
      "2026-03",
      "2025-05-20",
    );
    expect(cells[0]).toMatchObject({ ym: "2025-04", state: "beforeHire", rate: null });
    expect(cells[1]).toMatchObject({ ym: "2025-05", state: "noData", rate: null });
    expect(cells[10]).toMatchObject({ ym: "2026-02", state: "rate", rate: 0.5 });
    expect(cells[10]!.totals).toEqual(totals({ PRESENT: 1, ABSENT: 1 }));
    expect(cells[11]).toMatchObject({ ym: "2026-03", state: "noData" });
    expect(cells[11]!.totals.HOLIDAY).toBe(1);
  });

  it("the hire month itself counts", () => {
    const cells = heatCells([{ date: "2026-03-30", status: "PRESENT" }], "2026-03", "2026-03-30");
    expect(cells.at(-1)).toMatchObject({ state: "rate", rate: 1 });
    expect(cells.at(-2)).toMatchObject({ state: "beforeHire" });
  });
});

/** Riyadh wall clock → epoch ms (UTC+3). */
const at = (hhmmss: string) => Date.parse(`2026-10-05T${hhmmss}+03:00`);

describe("graceLeft (v1.3 item 11; late iff HH:MM > start + grace)", () => {
  it("before the start: full ring, green, minutes to the late moment", () => {
    expect(graceLeft(at("07:30:00"), "08:00", 15)).toEqual({ leftSec: 46 * 60, fraction: 1, tone: "green", late: false, minutes: 46 });
  });
  it("at the start: exactly full", () => {
    expect(graceLeft(at("08:00:00"), "08:00", 15)).toMatchObject({ fraction: 1, minutes: 16 });
  });
  it("amber under 5 minutes, green at exactly 5", () => {
    expect(graceLeft(at("08:11:00"), "08:00", 15)).toMatchObject({ leftSec: 300, tone: "green", minutes: 5 });
    expect(graceLeft(at("08:11:01"), "08:00", 15)).toMatchObject({ leftSec: 299, tone: "amber", minutes: 4 });
  });
  it("the whole start + grace minute is still on time (less than a minute left)", () => {
    expect(graceLeft(at("08:15:00"), "08:00", 15)).toMatchObject({ late: false, minutes: 1, leftSec: 60 });
    expect(graceLeft(at("08:15:01"), "08:00", 15)).toMatchObject({ late: false, minutes: 0, leftSec: 59 });
    expect(graceLeft(at("08:15:59"), "08:00", 15)).toMatchObject({ late: false, leftSec: 1, tone: "amber" });
  });
  it("red and late from start + grace + 1:00", () => {
    expect(graceLeft(at("08:16:00"), "08:00", 15)).toEqual({ leftSec: 0, fraction: 0, tone: "red", late: true, minutes: 0 });
    expect(graceLeft(at("09:00:00"), "08:00", 15)).toMatchObject({ late: true, fraction: 0 });
  });
  it("grace 0: late after the start minute", () => {
    expect(graceLeft(at("08:00:30"), "08:00", 0)).toMatchObject({ late: false, fraction: 0.5 });
    expect(graceLeft(at("08:01:00"), "08:00", 0)).toMatchObject({ late: true });
  });
  it("the fraction falls through the window", () => {
    expect(graceLeft(at("08:08:00"), "08:00", 15).fraction).toBe(0.5);
  });
});

describe("riyadhSecondOfDay / formatClock", () => {
  it("is the Riyadh wall clock whatever the host TZ", () => {
    expect(riyadhSecondOfDay(at("00:00:05"))).toBe(5);
    expect(riyadhSecondOfDay(at("23:59:59"))).toBe(86_399);
    expect(formatClock(at("08:05:09"))).toBe("08:05:09");
    expect(formatClock(at("21:00:00"))).toBe("21:00:00");
  });
});

describe("ringDash (circumference units, no pathLength)", () => {
  it("arc = fraction × 2πr, gap = the whole circumference, rounded to 0.01", () => {
    expect(ringDash(1, 52)).toBe("326.73 326.73");
    expect(ringDash(0.5, 52)).toBe("163.36 326.73");
    expect(ringDash(0, 52)).toBe("0 326.73");
  });
  it("clamps outside 0..1", () => {
    expect(ringDash(1.5, 52)).toBe("326.73 326.73");
    expect(ringDash(-1, 52)).toBe("0 326.73");
  });
});
