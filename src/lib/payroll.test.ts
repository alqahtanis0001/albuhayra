import { describe, expect, it } from "vitest";

import { nowRiyadhHHMM, todayISO } from "./dates";
import {
  addMonthsYm,
  grossOf,
  payDateFor,
  salaryLinkedPlanWhere,
  salaryLinkedWhere,
  salaryMonthsToGenerate,
  salarySeq,
  ymOf,
} from "./payroll";

describe("payDateFor (D3)", () => {
  it("keeps a pay day the month has", () => {
    expect(payDateFor("2026-10", 25)).toBe("2026-10-25");
    expect(payDateFor("2026-10", 1)).toBe("2026-10-01");
    expect(payDateFor("2026-10", 31)).toBe("2026-10-31");
  });

  it("clamps 31 to the month's last day — Feb 28, Feb 29 in a leap year, Apr 30", () => {
    expect(payDateFor("2027-02", 31)).toBe("2027-02-28");
    expect(payDateFor("2028-02", 31)).toBe("2028-02-29");
    expect(payDateFor("2028-02", 30)).toBe("2028-02-29");
    expect(payDateFor("2026-04", 31)).toBe("2026-04-30");
  });
});

describe("month arithmetic", () => {
  it("ymOf and addMonthsYm cross a year both ways", () => {
    expect(ymOf("2026-12-31")).toBe("2026-12");
    expect(addMonthsYm("2026-12", 1)).toBe("2027-01");
    expect(addMonthsYm("2027-01", -1)).toBe("2026-12");
    expect(addMonthsYm("2026-10", 14)).toBe("2027-12");
  });

  it("salarySeq is monotone in calendar order across a year boundary", () => {
    expect(salarySeq("2026-12")).toBeLessThan(salarySeq("2027-01"));
    expect(salarySeq("2027-01") - salarySeq("2026-12")).toBe(1);
  });
});

describe("grossOf (D4)", () => {
  it("adds every allowance to the basic", () => {
    expect(grossOf(500000, [])).toBe(500000);
    expect(grossOf(500000, [{ amountHalalas: 125000 }, { amountHalalas: 50000 }])).toBe(675000);
  });
});

describe("salaryMonthsToGenerate (D2 + Y1)", () => {
  const base = { endDate: null, payDay: 27, existing: [] as string[] };

  it("generates this month and next, nothing after", () => {
    const months = salaryMonthsToGenerate({ ...base, startDate: "2026-10-01", todayISO: "2026-10-01" });
    expect(months).toEqual([
      { periodYm: "2026-10", dueDate: "2026-10-27", seq: salarySeq("2026-10") },
      { periodYm: "2026-11", dueDate: "2026-11-27", seq: salarySeq("2026-11") },
    ]);
  });

  it("never before the start date: this month's pay date already passed → next month only", () => {
    const months = salaryMonthsToGenerate({ ...base, startDate: "2026-10-28", todayISO: "2026-10-28" });
    expect(months.map((m) => m.periodYm)).toEqual(["2026-11"]);
  });

  it("a start date on the pay date itself includes that month", () => {
    const months = salaryMonthsToGenerate({ ...base, startDate: "2026-10-27", todayISO: "2026-10-27" });
    expect(months.map((m) => m.periodYm)).toEqual(["2026-10", "2026-11"]);
  });

  it("an end date on the pay date itself includes that month; a day earlier excludes it", () => {
    const on = salaryMonthsToGenerate({ ...base, startDate: "2026-10-01", endDate: "2026-11-27", todayISO: "2026-10-01" });
    expect(on.map((m) => m.periodYm)).toEqual(["2026-10", "2026-11"]);
    const before = salaryMonthsToGenerate({ ...base, startDate: "2026-10-01", endDate: "2026-11-26", todayISO: "2026-10-01" });
    expect(before.map((m) => m.periodYm)).toEqual(["2026-10"]);
  });

  it("today on the last day of a month still reaches only the end of next month", () => {
    const months = salaryMonthsToGenerate({ ...base, payDay: 31, startDate: "2027-01-31", todayISO: "2027-01-31" });
    expect(months).toEqual([
      { periodYm: "2027-01", dueDate: "2027-01-31", seq: salarySeq("2027-01") },
      { periodYm: "2027-02", dueDate: "2027-02-28", seq: salarySeq("2027-02") },
    ]);
  });

  it("December rolls into January", () => {
    const months = salaryMonthsToGenerate({ ...base, startDate: "2026-12-01", todayISO: "2026-12-15" });
    expect(months.map((m) => m.periodYm)).toEqual(["2026-12", "2027-01"]);
  });

  it("skips months that already have a period (idempotent), and later runs fill the gap forward", () => {
    const first = salaryMonthsToGenerate({ ...base, startDate: "2026-10-01", todayISO: "2026-10-01" });
    const again = salaryMonthsToGenerate({
      ...base, startDate: "2026-10-01", todayISO: "2026-10-01", existing: first.map((m) => m.periodYm),
    });
    expect(again).toEqual([]);
    const aMonthLater = salaryMonthsToGenerate({
      ...base, startDate: "2026-10-01", todayISO: "2026-11-02", existing: first.map((m) => m.periodYm),
    });
    expect(aMonthLater.map((m) => m.periodYm)).toEqual(["2026-12"]);
  });

  it("catch-up after a long gap: every missed month through next month, oldest first", () => {
    const months = salaryMonthsToGenerate({ ...base, startDate: "2026-10-01", todayISO: "2027-03-10", existing: ["2026-10"] });
    expect(months.map((m) => m.periodYm)).toEqual(["2026-11", "2026-12", "2027-01", "2027-02", "2027-03", "2027-04"]);
  });

  it("a start date in the future past next month generates nothing yet", () => {
    expect(salaryMonthsToGenerate({ ...base, startDate: "2027-03-01", todayISO: "2026-10-01" })).toEqual([]);
  });

  it("an end date before the start generates nothing", () => {
    expect(
      salaryMonthsToGenerate({ ...base, startDate: "2026-10-01", endDate: "2026-09-30", todayISO: "2026-10-01" }),
    ).toEqual([]);
  });
});

describe("nowRiyadhHHMM (D11)", () => {
  it("is the Riyadh wall clock, 24-hour, and agrees with todayISO on the same instant", () => {
    const justAfterMidnight = new Date("2026-09-28T21:05:00Z");
    expect(nowRiyadhHHMM(justAfterMidnight)).toBe("00:05");
    expect(todayISO(justAfterMidnight)).toBe("2026-09-29");
    expect(nowRiyadhHHMM(new Date("2026-09-29T05:30:00Z"))).toBe("08:30");
    expect(nowRiyadhHHMM(new Date("2026-09-29T20:59:00Z"))).toBe("23:59");
  });
});

describe("salaryLinkedWhere (Y3)", () => {
  it("each branch requires its foreign key, so the negation keeps unlinked rows", () => {
    const where = salaryLinkedWhere(["cat_sal"]) as { OR: Array<Record<string, unknown>> };
    expect(where.OR).toHaveLength(2);
    expect(where.OR[0]).toMatchObject({ instalmentId: { not: null }, instalment: { plan: salaryLinkedPlanWhere(["cat_sal"]) } });
    expect(where.OR[1]).toMatchObject({
      partyId: { not: null },
      party: { type: "EMPLOYEE" },
      OR: [{ category: { nameAr: "رواتب" } }, { categoryId: { in: ["cat_sal"] } }],
    });
  });
});

describe("salaryLinkedPlanWhere (ruling 2)", () => {
  it("a SALARY plan, or an EMPLOYEE party's plan in a salary category", () => {
    expect(salaryLinkedPlanWhere(["cat_sal"])).toEqual({
      OR: [
        { kind: "SALARY" },
        { party: { type: "EMPLOYEE" }, OR: [{ category: { nameAr: "رواتب" } }, { categoryId: { in: ["cat_sal"] } }] },
      ],
    });
  });
});
