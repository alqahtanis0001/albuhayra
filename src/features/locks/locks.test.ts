import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The month lock, which is the only thing standing between a closed book and a
 * silent edit to it.
 *
 * The case worth the most attention is `updateTransaction` passing **two**
 * months. Moving an entry *out* of a locked month changes that month's totals
 * just as much as moving one in, and a single-month check reads as correct right
 * up until someone drags a September expense into October.
 */

const stub = vi.hoisted(() => ({
  lock: null as unknown,
  calls: [] as Array<Record<string, unknown>>,
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  db: {
    periodLock: {
      findFirst: async (args: Record<string, unknown>) => {
        stub.calls.push(args);
        return stub.lock;
      },
    },
  },
}));

const { assertUnlocked, isClosedMonth } = await import("./assertUnlocked");

beforeEach(() => {
  stub.lock = null;
  stub.calls = [];
});

describe("assertUnlocked", () => {
  it("passes when no lock covers the month", async () => {
    expect(await assertUnlocked("est_1", [{ year: 2026, month: 8 }])).toBeNull();
  });

  it("refuses when a lock is found", async () => {
    stub.lock = { id: "lock_1" };
    expect(await assertUnlocked("est_1", [{ year: 2026, month: 8 }])).toBe(
      "err.monthLocked",
    );
  });

  it("scopes the lookup by establishmentId from the caller", async () => {
    await assertUnlocked("est_1", [{ year: 2026, month: 8 }]);
    const where = stub.calls[0]!.where as Record<string, unknown>;
    expect(where.establishmentId).toBe("est_1");
  });

  it("asks about both months at once when given two", async () => {
    await assertUnlocked("est_1", [
      { year: 2026, month: 8 },
      { year: 2026, month: 9 },
    ]);

    expect(stub.calls).toHaveLength(1);
    const where = stub.calls[0]!.where as { OR: unknown[] };
    expect(where.OR).toEqual([
      { year: 2026, month: 8 },
      { year: 2026, month: 9 },
    ]);
  });

  it("refuses a move when either end is locked, not only the destination", async () => {
    // One `findFirst` with an OR answers for both months, so a lock on the
    // origin refuses the move exactly as a lock on the destination does.
    stub.lock = { id: "lock_on_the_origin" };
    expect(
      await assertUnlocked("est_1", [
        { year: 2026, month: 8 },
        { year: 2026, month: 9 },
      ]),
    ).toBe("err.monthLocked");
  });

  it("does not touch the database for an empty list", async () => {
    expect(await assertUnlocked("est_1", [])).toBeNull();
    expect(stub.calls).toHaveLength(0);
  });
});

describe("isClosedMonth", () => {
  const now = { year: 2026, month: 9 };

  it("accepts a month that has ended", () => {
    expect(isClosedMonth(2026, 8, now)).toBe(true);
    expect(isClosedMonth(2025, 12, now)).toBe(true);
  });

  it("refuses the open month", () => {
    expect(isClosedMonth(2026, 9, now)).toBe(false);
  });

  it("refuses a future month", () => {
    expect(isClosedMonth(2026, 10, now)).toBe(false);
    expect(isClosedMonth(2027, 1, now)).toBe(false);
  });

  it("compares by month, not by number, across a year boundary", () => {
    // A naive `month < now.month` would call December 2025 open in January 2026.
    expect(isClosedMonth(2025, 12, { year: 2026, month: 1 })).toBe(true);
    expect(isClosedMonth(2026, 1, { year: 2026, month: 1 })).toBe(false);
  });
});
