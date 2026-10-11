import { describe, expect, it } from "vitest";

import { asScheduled, scheduledKind, scheduledTotal } from "./kind";

/**
 * v1.4 D6: the read boundary fails loud. A scheduled plan without a total, or
 * an open-ended row inside scheduled code, is corruption — never `?? 0`.
 */
describe("v1.4 D6: scheduledTotal", () => {
  it("passes a total through, zero included (a generated SALARY plan with no months yet)", () => {
    expect(scheduledTotal(3000, "p1")).toBe(3000);
    expect(scheduledTotal(0, "p1")).toBe(0);
  });

  it("throws on null, naming the plan — never defaults to 0", () => {
    expect(() => scheduledTotal(null, "plan_x")).toThrow(/plan plan_x: scheduled plan without a total/);
  });
});

describe("v1.4 D6: scheduledKind", () => {
  it("passes STANDARD and SALARY through", () => {
    expect(scheduledKind("STANDARD", "p1")).toBe("STANDARD");
    expect(scheduledKind("SALARY", "p1")).toBe("SALARY");
  });

  it("throws on OPEN_ENDED, naming the plan", () => {
    expect(() => scheduledKind("OPEN_ENDED", "plan_o")).toThrow(/plan plan_o: open-ended plan in scheduled code/);
  });
});

describe("v1.4 D6: asScheduled", () => {
  it("narrows both fields and keeps the rest of the row", () => {
    const row = asScheduled({ id: "p1", kind: "SALARY" as const, totalHalalas: 500, title: "x", extra: [1] });
    expect(row).toEqual({ id: "p1", kind: "SALARY", totalHalalas: 500, title: "x", extra: [1] });
  });

  it("throws for a null total and for an open-ended kind", () => {
    expect(() => asScheduled({ id: "p2", kind: "STANDARD", totalHalalas: null })).toThrow(/without a total/);
    expect(() => asScheduled({ id: "p3", kind: "OPEN_ENDED", totalHalalas: 100 })).toThrow(/open-ended plan/);
  });
});
