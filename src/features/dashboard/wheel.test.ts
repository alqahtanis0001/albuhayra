import { describe, expect, it } from "vitest";

import {
  DIAL_DAYS,
  GAP,
  HIT_RADIUS,
  MAX_MARKS,
  MIN_ARC,
  clusterDots,
  dayAngle,
  dotRadius,
  overdueAngles,
  ringArcs,
  type DialEvent,
  type OverdueSummary,
} from "./wheel";
import { COMMITMENT_HREF, categoryHref, dayHref, directionHref, dueHref, monthBounds } from "./wheelHrefs";

/** v1.5 (docs/V15-SPEC.md A1 tests, D3, D4, D18, D23): the wheel's pure geometry. */

const span = (a: [number, number] | null) => (a ? a[1] - a[0] : 0);
const sumSpans = (arcs: Array<[number, number] | null>) => arcs.reduce((s, a) => s + span(a), 0);

function ev(over: Partial<DialEvent> & { dayOffset: number }): DialEvent {
  return {
    instalmentId: `inst_${over.dayOffset}_${Math.random().toString(36).slice(2, 7)}`,
    planId: "plan_1",
    employeeId: null,
    partyName: "شركة النور",
    kind: "IN",
    remainingHalalas: 100_000,
    dueDate: "2026-10-11",
    ...over,
  };
}

const NO_OVERDUE: OverdueSummary = { recent: [], count: 0, totalHalalas: 0 };

describe("ringArcs", () => {
  it("spans add up to 360 − 2·gap·n, proportional, in order with a gap at each end", () => {
    const arcs = ringArcs([820_000, 510_000]);
    expect(sumSpans(arcs)).toBeCloseTo(360 - 2 * GAP * 2, 9);
    expect(span(arcs[0]) / span(arcs[1])).toBeCloseTo(820 / 510, 9);
    expect(arcs[0]![0]).toBe(GAP);
    expect(arcs[1]![0]).toBeCloseTo(arcs[0]![1] + 2 * GAP, 9);
    expect(arcs[1]![1]).toBeCloseTo(360 - GAP, 9);
  });

  it("a zero value gets no arc and does not count towards the gaps", () => {
    const arcs = ringArcs([0, 500, 0, 300]);
    expect(arcs[0]).toBeNull();
    expect(arcs[2]).toBeNull();
    expect(sumSpans(arcs)).toBeCloseTo(360 - 2 * GAP * 2, 9);
  });

  it("all zero → every entry null (the empty --track ring)", () => {
    expect(ringArcs([0, 0, 0])).toEqual([null, null, null]);
    expect(ringArcs([])).toEqual([]);
  });

  it("a tiny non-zero value still gets the minimum visible arc, borrowed from the others", () => {
    const arcs = ringArcs([1_000_000, 1, 2]);
    expect(span(arcs[1])).toBeCloseTo(MIN_ARC, 9);
    expect(span(arcs[2])).toBeCloseTo(MIN_ARC, 9);
    expect(sumSpans(arcs)).toBeCloseTo(360 - 2 * GAP * 3, 9);
    for (const a of arcs) expect(span(a)).toBeGreaterThanOrEqual(MIN_ARC - 1e-9);
  });

  it("a single value is one arc of 360 − 2·gap", () => {
    expect(ringArcs([5])).toEqual([[GAP, 360 - GAP]]);
  });
});

describe("the dial", () => {
  it("D18: day d sits at 6 + 11·d degrees — 6° today, 325° on day 29; never on the marker", () => {
    expect(dayAngle(0)).toBe(6);
    expect(dayAngle(1)).toBe(17);
    expect(dayAngle(DIAL_DAYS - 1)).toBe(325);
  });

  it("D18: overdue dots sit in [−26°, −6°], the most overdue furthest from today", () => {
    expect(overdueAngles(0)).toEqual([]);
    expect(overdueAngles(1)).toEqual([-16]);
    expect(overdueAngles(2)).toEqual([-6, -26]);
  });

  it("D3: dot radius 4 + 6·√(amount/max), clamped to [4, 10]; hit circle r = 14", () => {
    expect(dotRadius(100, 100)).toBe(10);
    expect(dotRadius(25, 100)).toBe(7);
    expect(dotRadius(0, 100)).toBe(4);
    expect(dotRadius(1, 1_000_000_000)).toBeGreaterThanOrEqual(4);
    expect(dotRadius(500, 100)).toBe(10);
    expect(dotRadius(5, 0)).toBe(4);
    expect(dotRadius(-5, 100)).toBe(4);
    expect(HIT_RADIUS).toBe(14);
  });

  it("D18: a day with one due is that due's dot; same-day dues merge (count, sum, largest kind)", () => {
    const marks = clusterDots(
      [
        ev({ dayOffset: 4, instalmentId: "a" }),
        ev({ dayOffset: 9, instalmentId: "b", kind: "OUT", remainingHalalas: 300 }),
        ev({ dayOffset: 9, instalmentId: "c", kind: "SALARY", remainingHalalas: 500, planId: "plan_2" }),
        ev({ dayOffset: 9, instalmentId: "d", kind: "OUT", remainingHalalas: 400 }),
      ],
      NO_OVERDUE,
    );
    expect(marks).toHaveLength(2);
    expect(marks[0]).toMatchObject({ id: "i:a", count: 1, angle: dayAngle(4), partyName: "شركة النور" });
    expect(marks[1]).toMatchObject({ id: "d:9", count: 3, totalHalalas: 1200, kind: "OUT", angle: dayAngle(9), partyName: null });
  });

  it("dues outside the 30-day window are not drawn", () => {
    expect(clusterDots([ev({ dayOffset: 30 }), ev({ dayOffset: -1 })], NO_OVERDUE)).toEqual([]);
  });

  it("D18: ≤ 2 overdue → hollow dots each; ≥ 3 → one hollow cluster → المستحقات", () => {
    const recent = [ev({ dayOffset: -2, instalmentId: "o1" }), ev({ dayOffset: -9, instalmentId: "o2" })];
    const two = clusterDots([], { recent, count: 2, totalHalalas: 200_000 });
    expect(two.map((m) => [m.id, m.overdue, m.angle])).toEqual([
      ["i:o1", true, -6],
      ["i:o2", true, -26],
    ]);
    const three = clusterDots([], { recent, count: 3, totalHalalas: 300_000 });
    expect(three).toHaveLength(1);
    expect(three[0]).toMatchObject({ id: "overdue", overdue: true, count: 3, totalHalalas: 300_000, href: "/owner/dues" });
  });

  it("the 40-mark cap: 40 marks pass untouched, a 41st folds into the last mark", () => {
    // Day merging bounds the real dial at 30 + 2 marks; the guard is pinned with a small max.
    const busy = Array.from({ length: 41 }, (_, i) => ev({ dayOffset: i % DIAL_DAYS, instalmentId: `x${i}` }));
    const real = clusterDots(busy, { recent: [ev({ dayOffset: -1 }), ev({ dayOffset: -2 })], count: 2, totalHalalas: 2 });
    expect(real.length).toBeLessThanOrEqual(MAX_MARKS);
    expect(real.reduce((s, m) => s + m.count, 0)).toBe(43);

    const four = [1, 2, 3, 4].map((d) => ev({ dayOffset: d, instalmentId: `y${d}`, remainingHalalas: d }));
    expect(clusterDots(four, NO_OVERDUE, 4)).toHaveLength(4);
    const capped = clusterDots(four, NO_OVERDUE, 3);
    expect(capped).toHaveLength(3);
    expect(capped[2]).toMatchObject({ count: 2, totalHalalas: 7, href: "/owner/dues" });
  });
});

describe("navigation targets (D4, D23)", () => {
  const today = "2026-10-11";

  it("ring 1: the ledger by direction, this month's from/to", () => {
    expect(monthBounds(today)).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(monthBounds("2028-02-10").to).toBe("2028-02-29");
    expect(directionHref("IN", today)).toBe("/owner/transactions?direction=IN&from=2026-10-01&to=2026-10-31");
    expect(directionHref("OUT", today)).toBe("/owner/transactions?direction=OUT&from=2026-10-01&to=2026-10-31");
  });

  it("ring 2: a category → that category this month; «أخرى» → this month's OUT", () => {
    expect(categoryHref("cat_1", today)).toBe(
      "/owner/transactions?direction=OUT&categoryId=cat_1&from=2026-10-01&to=2026-10-31",
    );
    expect(categoryHref("other", today)).toBe("/owner/transactions?direction=OUT&from=2026-10-01&to=2026-10-31");
  });

  it("ring 3: لنا → customers, علينا → suppliers, رواتب → staff", () => {
    expect(COMMITMENT_HREF).toEqual({
      toUs: "/owner/parties?type=CUSTOMER",
      fromUs: "/owner/parties?type=SUPPLIER",
      salaries: "/owner/staff",
    });
  });

  it("a dot → its plan; a salary dot → the employee page", () => {
    expect(dueHref({ kind: "IN", employeeId: null, planId: "p1" })).toBe("/owner/plans/p1");
    expect(dueHref({ kind: "SALARY", employeeId: "e1", planId: "p2" })).toBe("/owner/staff/e1");
  });

  it("D23: a multi-due day → المستحقات when ≤ 6, else its one plan, else the plan list", () => {
    const one = [ev({ dayOffset: 7, planId: "p1" }), ev({ dayOffset: 7, planId: "p1" })];
    const many = [ev({ dayOffset: 7, planId: "p1" }), ev({ dayOffset: 7, planId: "p2" })];
    const salary = [1, 2].map(() => ev({ dayOffset: 12, planId: "ps", kind: "SALARY", employeeId: "e9" }));
    expect(dayHref(one, 6)).toBe("/owner/dues");
    expect(dayHref(one, 7)).toBe("/owner/plans/p1");
    expect(dayHref(many, 7)).toBe("/owner/plans");
    expect(dayHref(salary, 12)).toBe("/owner/staff/e9");
  });
});
