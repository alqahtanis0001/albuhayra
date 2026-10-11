import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * v1.5 (docs/V15-SPEC.md A1 ring 3 and dial, D18, D22, D35): `getOwnerOverview`
 * on one fixture. Ring 3 reuses `listParties()` balances, so the identity
 * «علينا + رواتب = Σ owedByUs, لنا = Σ owedToUs» holds by construction; the
 * dial reads the 30-day window with getDues' clauses, and overdue is two rows
 * plus a count/sum aggregate.
 */

const calls: Array<{ method: string; args: Record<string, unknown> }> = [];
const responses = new Map<string, unknown>();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => {
  const instalment = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === "fields") return { amountDueHalalas: { fieldRef: "instalment.amountDueHalalas" } };
        return async (args: Record<string, unknown>) => {
          calls.push({ method: String(prop), args });
          const key = `${String(prop)}:${calls.filter((c) => c.method === String(prop)).length}`;
          return responses.get(key) ?? (prop === "findMany" ? [] : {});
        };
      },
    },
  );
  return { db: { instalment } };
});

const PARTIES = [
  { id: "c1", type: "CUSTOMER", owedToUsHalalas: 600_000, owedByUsHalalas: 0 },
  { id: "c2", type: "OTHER", owedToUsHalalas: 350_000, owedByUsHalalas: 50_000 },
  { id: "s1", type: "SUPPLIER", owedToUsHalalas: 0, owedByUsHalalas: 300_000 },
  // An employee: 1,200 of salary due this month (and arrears), 600 of NEXT month's salary (D39), plus a
  // non-salary OUT plan of 70 — that stays in علينا (D22).
  { id: "e1", type: "EMPLOYEE", owedToUsHalalas: 0, owedByUsHalalas: 1_870_000 },
];
vi.mock("@/features/parties/queries", () => ({ listParties: vi.fn(async () => PARTIES) }));

const { getOwnerOverview, commitmentsOf } = await import("./overviewReads");
const { listParties } = await import("@/features/parties/queries");

function row(id: string, due: string, kind: string, direction: "IN" | "OUT", amount: number, paid = 0) {
  return {
    id, planId: `plan_${id}`, dueDate: new Date(`${due}T00:00:00Z`), amountDueHalalas: amount, paidHalalas: paid,
    plan: { direction, kind, employeeId: kind === "SALARY" ? "emp_1" : null, party: { name: `جهة ${id}` } },
  };
}

beforeEach(() => {
  calls.length = 0;
  responses.clear();
  // Promise.all order: salaries ≤ month end, all salaries, dial findMany, overdue findMany, overdue aggregate.
  responses.set("aggregate:1", { _sum: { amountDueHalalas: 1_300_000, paidHalalas: 100_000 } });
  responses.set("aggregate:2", { _sum: { amountDueHalalas: 1_900_000, paidHalalas: 100_000 } });
  responses.set("findMany:1", [row("a", "2026-10-11", "STANDARD", "IN", 250_000), row("b", "2026-10-26", "SALARY", "OUT", 1_200_000, 0)]);
  responses.set("findMany:2", [row("o1", "2026-10-08", "STANDARD", "OUT", 200_000, 50_000)]);
  responses.set("aggregate:3", { _count: { _all: 4 }, _sum: { amountDueHalalas: BigInt(900_000), paidHalalas: BigInt(50_000) } });
});

describe("getOwnerOverview", () => {
  it("ring 3 = listParties totals: لنا = Σ owedToUs; علينا + رواتب + later salaries = Σ owedByUs (D39)", async () => {
    const { commitments } = await getOwnerOverview("est_1", "2026-10-11");
    expect(listParties).toHaveBeenCalledWith("est_1");
    const toUs = PARTIES.reduce((s, p) => s + p.owedToUsHalalas, 0);
    const byUs = PARTIES.reduce((s, p) => s + p.owedByUsHalalas, 0);
    const laterSalaries = 600_000; // next month's row: in owedByUs, in neither ring part
    expect(commitments.toUsHalalas).toBe(toUs);
    expect(commitments.salariesHalalas).toBe(1_200_000);
    expect(commitments.fromUsHalalas + commitments.salariesHalalas + laterSalaries).toBe(byUs);
    expect(commitments.fromUsHalalas).toBe(420_000);
  });

  it("D39: the all-salaries read has no due-date bound", async () => {
    await getOwnerOverview("est_1", "2026-10-11");
    const all = calls.filter((c) => c.method === "aggregate")[1]!.args;
    expect(all.where).toMatchObject({ establishmentId: "est_1", plan: { state: "OPEN", kind: "SALARY" } });
    expect(all.where).not.toHaveProperty("dueDate");
    expect(Object.keys(all.where as object)[0]).toBe("establishmentId");
  });

  it("the salary read: OPEN SALARY plans, unpaid, due ≤ the month's end (arrears included)", async () => {
    await getOwnerOverview("est_1", "2026-10-11");
    const where = calls.find((c) => c.method === "aggregate")!.args.where as Record<string, unknown>;
    expect(Object.keys(where)[0]).toBe("establishmentId");
    expect(where).toMatchObject({
      establishmentId: "est_1",
      dueDate: { lte: new Date("2026-10-31T00:00:00Z") },
      paidHalalas: { lt: { fieldRef: "instalment.amountDueHalalas" } },
      plan: { state: "OPEN", kind: "SALARY" },
    });
    expect(where.dueDate).not.toHaveProperty("gte");
  });

  it("the dial: today … today + 29, OPEN non-OPEN_ENDED plans, unpaid; mapped to events", async () => {
    const { dial } = await getOwnerOverview("est_1", "2026-10-11");
    const where = calls.find((c) => c.method === "findMany")!.args.where as Record<string, unknown>;
    expect(Object.keys(where)[0]).toBe("establishmentId");
    expect(where).toMatchObject({
      dueDate: { gte: new Date("2026-10-11T00:00:00Z"), lte: new Date("2026-11-09T00:00:00Z") },
      plan: { state: "OPEN", kind: { not: "OPEN_ENDED" } },
    });
    expect(dial).toEqual([
      { instalmentId: "a", planId: "plan_a", employeeId: null, partyName: "جهة a", kind: "IN", remainingHalalas: 250_000, dueDate: "2026-10-11", dayOffset: 0 },
      { instalmentId: "b", planId: "plan_b", employeeId: "emp_1", partyName: "جهة b", kind: "SALARY", remainingHalalas: 1_200_000, dueDate: "2026-10-26", dayOffset: 15 },
    ]);
  });

  it("D35 overdue: the two most recent rows plus the count and sum — never the history", async () => {
    const { overdue } = await getOwnerOverview("est_1", "2026-10-11");
    const recent = calls.filter((c) => c.method === "findMany")[1]!.args;
    expect(recent).toMatchObject({ take: 2, orderBy: [{ dueDate: "desc" }, { id: "desc" }] });
    expect(recent.where).toMatchObject({ dueDate: { lt: new Date("2026-10-11T00:00:00Z") }, plan: { state: "OPEN", kind: { not: "OPEN_ENDED" } } });
    expect(overdue).toEqual({
      recent: [expect.objectContaining({ instalmentId: "o1", remainingHalalas: 150_000, dayOffset: -3, kind: "OUT" })],
      count: 4,
      totalHalalas: 850_000,
    });
  });

  it("commitmentsOf never goes below zero on a corrupt row", () => {
    expect(commitmentsOf([{ owedToUsHalalas: 0, owedByUsHalalas: 10 }], 50, 50).fromUsHalalas).toBe(0);
  });
});
