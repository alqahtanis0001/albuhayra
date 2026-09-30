import { describe, expect, it } from "vitest";

import { todayISO } from "./dates";
import { dayOffset, instalmentStatus, planStatus } from "./instalments";

const row = (dueDate: string, amountDueHalalas = 1000, paidHalalas = 0) => ({ dueDate, amountDueHalalas, paidHalalas });

describe("dayOffset", () => {
  it("is due − today in whole days", () => {
    expect(dayOffset("2026-10-01", "2026-10-01")).toBe(0);
    expect(dayOffset("2026-10-02", "2026-10-01")).toBe(1);
    expect(dayOffset("2026-09-30", "2026-10-01")).toBe(-1);
    expect(dayOffset("2027-01-01", "2026-12-31")).toBe(1);
    expect(dayOffset("2028-03-01", "2028-02-28")).toBe(2);
  });
});

describe("instalmentStatus — precedence, first match wins", () => {
  const today = "2026-10-01";

  it("PAID beats everything, even overdue", () => {
    expect(instalmentStatus(row("2026-09-01", 1000, 1000), today, 3)).toBe("PAID");
  });

  it("OVERDUE beats PARTIAL: due yesterday, part paid", () => {
    expect(instalmentStatus(row("2026-09-30", 1000, 400), today, 3)).toBe("OVERDUE");
  });

  it("due today is not overdue", () => {
    expect(instalmentStatus(row("2026-10-01"), today, 3)).toBe("DUE");
    expect(instalmentStatus(row("2026-10-01"), today, 0)).toBe("DUE");
  });

  it("PARTIAL when part paid and not yet late, even outside the reminder window", () => {
    expect(instalmentStatus(row("2026-12-01", 1000, 1), today, 3)).toBe("PARTIAL");
  });

  it("DUE at the reminder edge, UPCOMING one day beyond it", () => {
    expect(instalmentStatus(row("2026-10-04"), today, 3)).toBe("DUE");
    expect(instalmentStatus(row("2026-10-05"), today, 3)).toBe("UPCOMING");
  });
});

describe("the day boundary is Riyadh midnight, via todayISO(instant)", () => {
  // 20:59 UTC = 23:59 Riyadh (UTC+3); 21:00 UTC = 00:00 the next day in Riyadh.
  const at2359 = todayISO(new Date("2026-10-01T20:59:00Z"));
  const at0000 = todayISO(new Date("2026-10-01T21:00:00Z"));

  it("the two instants are two different Riyadh days", () => {
    expect([at2359, at0000]).toEqual(["2026-10-01", "2026-10-02"]);
  });

  it("an instalment due 1 October is due at 23:59 and overdue at 00:00", () => {
    expect(instalmentStatus(row("2026-10-01"), at2359, 3)).toBe("DUE");
    expect(instalmentStatus(row("2026-10-01"), at0000, 3)).toBe("OVERDUE");
    expect(dayOffset("2026-10-01", at0000)).toBe(-1);
  });
});

describe("planStatus", () => {
  const paid = { amountDueHalalas: 500, paidHalalas: 500 };
  const unpaid = { amountDueHalalas: 500, paidHalalas: 0 };
  const plan = (state: "OPEN" | "ARCHIVED" | "CANCELLED", instalments = [unpaid], startDate = "2026-09-01") => ({
    state,
    startDate,
    instalments,
  });

  it("CANCELLED and ARCHIVED come from the stored state", () => {
    expect(planStatus(plan("CANCELLED", [paid]), "2026-10-01")).toBe("CANCELLED");
    expect(planStatus(plan("ARCHIVED", [paid]), "2026-10-01")).toBe("ARCHIVED");
  });

  it("every instalment paid → COMPLETED, even before the start date", () => {
    expect(planStatus(plan("OPEN", [paid, paid], "2026-12-01"), "2026-10-01")).toBe("COMPLETED");
  });

  it("before the start with nothing paid → UPCOMING; on the start day → ACTIVE", () => {
    expect(planStatus(plan("OPEN", [unpaid], "2026-10-02"), "2026-10-01")).toBe("UPCOMING");
    expect(planStatus(plan("OPEN", [unpaid], "2026-10-01"), "2026-10-01")).toBe("ACTIVE");
  });

  it("before the start but something paid → ACTIVE", () => {
    expect(planStatus(plan("OPEN", [paid, unpaid], "2026-10-02"), "2026-10-01")).toBe("ACTIVE");
  });
});
