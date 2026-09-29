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
  locks: [] as unknown[],
  calls: [] as Array<Record<string, unknown>>,
  writes: [] as Array<{ method: string; args: Record<string, unknown> }>,
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/lib/audit", () => ({
  writeAudit: async (args: Record<string, unknown>) => {
    stub.writes.push({ method: "audit", args });
  },
}));
vi.mock("@/lib/auth", () => ({
  requireOwner: async () => ({
    user: { id: "owner_1", firstName: "مالك", middleName: null, lastName: "", displayName: "مالك", establishmentId: "est_1" },
    establishmentId: "est_1",
  }),
}));
vi.mock("@/lib/db", () => {
  const periodLock = {
    findFirst: async (args: Record<string, unknown>) => {
      stub.calls.push(args);
      return stub.lock;
    },
    findMany: async (args: Record<string, unknown>) => {
      stub.calls.push(args);
      return stub.locks;
    },
    create: async (args: Record<string, unknown>) => {
      stub.writes.push({ method: "create", args });
      return { id: "lock_new" };
    },
    deleteMany: async (args: Record<string, unknown>) => {
      stub.writes.push({ method: "deleteMany", args });
      return { count: 1 };
    },
  };
  return {
    db: {
      periodLock,
      $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({ periodLock, auditLog: { create: async () => ({ id: "a" }) } }),
    },
  };
});

const { assertUnlocked, isClosedMonth } = await import("./assertUnlocked");
const { lockMonth, unlockMonth } = await import("./actions");
const { listLocks } = await import("./queries");
const { currentMonthKey, lastMonths } = await import("@/lib/dates");

beforeEach(() => {
  stub.lock = null;
  stub.locks = [];
  stub.calls = [];
  stub.writes = [];
});

/** A month that has certainly ended, and the one that certainly has not. */
const CLOSED = { year: 2020, month: 1 };
const OPEN = currentMonthKey();

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

/**
 * `lockMonth` / `unlockMonth`. Each case is written to fail on its own when one
 * clause is dropped, so a future red build names the rule that broke rather than
 * reporting "locking is broken".
 */
describe("lockMonth", () => {
  it("locks a month that has ended", async () => {
    expect(await lockMonth(CLOSED.year, CLOSED.month)).toEqual({
      ok: true,
      data: null,
    });
    expect(stub.writes.some((w) => w.method === "create")).toBe(true);
  });

  it("refuses the open month", async () => {
    expect(await lockMonth(OPEN.year, OPEN.month)).toEqual({
      ok: false,
      error: "err.cannotLockCurrentMonth",
    });
    expect(stub.writes).toEqual([]);
  });

  it("refuses a future month", async () => {
    const next = OPEN.month === 12 ? { year: OPEN.year + 1, month: 1 } : { year: OPEN.year, month: OPEN.month + 1 };
    expect(await lockMonth(next.year, next.month)).toEqual({
      ok: false,
      error: "err.cannotLockCurrentMonth",
    });
    expect(stub.writes).toEqual([]);
  });

  it("rejects a month outside 1-12 before consulting the database", async () => {
    const result = await lockMonth(CLOSED.year, 13);
    expect(result.ok).toBe(false);
    expect(stub.calls).toEqual([]);
  });

  it("is idempotent: an already-locked month succeeds and writes nothing", async () => {
    stub.lock = { id: "lock_existing" };
    expect(await lockMonth(CLOSED.year, CLOSED.month)).toEqual({
      ok: true,
      data: null,
    });
    // A second click on the grid is the state the owner asked for, not an error —
    // but it must not insert a duplicate lock either.
    expect(stub.writes).toEqual([]);
  });

  it("scopes both the check and the insert to the caller's establishment", async () => {
    await lockMonth(CLOSED.year, CLOSED.month);

    expect(stub.calls[0]!.where).toMatchObject({ establishmentId: "est_1" });
    const created = stub.writes.find((w) => w.method === "create")!;
    expect(created.args.data).toMatchObject({
      establishmentId: "est_1",
      year: CLOSED.year,
      month: CLOSED.month,
      lockedById: "owner_1",
    });
  });

  it("audits the lock against the establishment", async () => {
    await lockMonth(CLOSED.year, CLOSED.month);
    const audit = stub.writes.find((w) => w.method === "audit")!;
    expect(audit.args).toMatchObject({
      action: "LOCK",
      entity: "PeriodLock",
      establishmentId: "est_1",
    });
  });
});

describe("unlockMonth", () => {
  it("removes an existing lock, scoped to the establishment", async () => {
    stub.lock = { id: "lock_existing" };
    expect(await unlockMonth(CLOSED.year, CLOSED.month)).toEqual({
      ok: true,
      data: null,
    });

    const removed = stub.writes.find((w) => w.method === "deleteMany")!;
    expect(removed.args.where).toEqual({
      establishmentId: "est_1",
      year: CLOSED.year,
      month: CLOSED.month,
    });
  });

  it("is idempotent: an unlocked month succeeds and deletes nothing", async () => {
    stub.lock = null;
    expect(await unlockMonth(CLOSED.year, CLOSED.month)).toEqual({
      ok: true,
      data: null,
    });
    expect(stub.writes).toEqual([]);
  });

  it("refuses the open month, symmetrically with lockMonth", async () => {
    stub.lock = { id: "lock_existing" };
    expect(await unlockMonth(OPEN.year, OPEN.month)).toEqual({
      ok: false,
      error: "err.cannotLockCurrentMonth",
    });
    expect(stub.writes).toEqual([]);
  });

  it("audits the unlock", async () => {
    stub.lock = { id: "lock_existing" };
    await unlockMonth(CLOSED.year, CLOSED.month);
    const audit = stub.writes.find((w) => w.method === "audit")!;
    expect(audit.args).toMatchObject({ action: "UNLOCK", entity: "PeriodLock" });
  });
});

describe("listLocks", () => {
  it("returns 24 months, newest first", async () => {
    const rows = await listLocks("est_1");

    expect(rows).toHaveLength(24);
    expect(rows[0]).toMatchObject({ year: OPEN.year, month: OPEN.month });
    // Newest first is deliberate: an owner locks the month that just ended.
    const oldest = lastMonths(24)[0]!;
    expect(rows[23]).toMatchObject({ year: oldest.year, month: oldest.month });
  });

  it("marks the open month unlockable and an ended one lockable", async () => {
    const rows = await listLocks("est_1");

    expect(rows[0]!.lockable).toBe(false);
    expect(rows[1]!.lockable).toBe(true);
    expect(rows.every((r) => r.ym.length === 7)).toBe(true);
  });

  it("fills months with no row as unlocked rather than leaving gaps", async () => {
    const rows = await listLocks("est_1");
    expect(rows.every((r) => r.locked === false)).toBe(true);
    expect(rows.every((r) => r.lockedAt === null && r.lockedByName === null)).toBe(true);
  });

  it("reports a locked month with who locked it, as a date string", async () => {
    const target = lastMonths(24)[20]!;
    stub.locks = [
      {
        year: target.year,
        month: target.month,
        lockedAt: new Date(Date.UTC(2026, 8, 25, 10, 0)),
        lockedBy: { firstName: "مالك", middleName: null, lastName: "", legacyName: null },
      },
    ];

    const rows = await listLocks("est_1");
    const row = rows.find((r) => r.year === target.year && r.month === target.month)!;

    expect(row.locked).toBe(true);
    expect(row.lockedByName).toBe("مالك");
    // A string, not a Date: the grid is a client component.
    expect(row.lockedAt).toBe("2026-09-25");
    expect(typeof row.lockedAt).toBe("string");
  });

  it("asks for the whole window in one query, scoped to the establishment", async () => {
    await listLocks("est_1");

    expect(stub.calls).toHaveLength(1);
    const where = stub.calls[0]!.where as Record<string, unknown>;
    expect(where.establishmentId).toBe("est_1");
    expect((where.OR as unknown[]).length).toBe(24);
  });
});
