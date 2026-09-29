import { beforeEach, describe, expect, it, vi } from "vitest";

import { isoToDate, monthKey, todayISO } from "@/lib/dates";

/**
 * Which guard each ledger mutation calls, and which months it asks about.
 *
 * `scoping.test.ts` proves every call is scoped, but it mocks all the
 * `requireX()` helpers to the same OWNER context, so it cannot tell
 * `requireOwner()` from `requireMember()`. Swap one for the other in
 * `deleteTransaction` and STAFF can delete — and that suite stays green. Likewise
 * `locks.test.ts` proves `assertUnlocked` handles two months, not that
 * `updateTransaction` passes it both. These pin the two claims at the action.
 */

const OLD_ISO = "2025-01-15";

const harness = vi.hoisted(() => ({
  guards: [] as string[],
  /** A guard named here throws, as `redirect()` does when it refuses. */
  refuse: null as string | null,
  lockChecks: [] as Array<Array<{ year: number; month: number }>>,
  lockedMonths: [] as string[],
  writes: [] as string[],
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

vi.mock("@/lib/auth", () => {
  const guard = (name: string) => async () => {
    harness.guards.push(name);
    if (harness.refuse === name) throw new Error("NEXT_REDIRECT");
    return {
      user: { id: "user_1", role: "OWNER", status: "ACTIVE", canEdit: true },
      establishmentId: "est_under_test",
    };
  };
  return {
    requireUser: guard("requireUser"),
    requireMember: guard("requireMember"),
    requireOwner: guard("requireOwner"),
    requireStaff: guard("requireStaff"),
    requireCanEdit: guard("requireCanEdit"),
  };
});

vi.mock("@/features/locks/assertUnlocked", () => ({
  assertUnlocked: async (
    _establishmentId: string,
    months: Array<{ year: number; month: number }>,
  ) => {
    harness.lockChecks.push(months);
    const hit = months.some(({ year, month }) =>
      harness.lockedMonths.includes(`${year}-${String(month).padStart(2, "0")}`),
    );
    return hit ? "err.monthLocked" : null;
  },
}));

vi.mock("@/lib/audit", () => ({
  writeAudit: async () => {
    harness.writes.push("auditLog.create");
  },
}));

vi.mock("@/lib/db", () => {
  const tx = {
    transaction: {
      create: async () => {
        harness.writes.push("transaction.create");
        return { id: "tx_new" };
      },
      updateMany: async () => {
        harness.writes.push("transaction.updateMany");
        return { count: 1 };
      },
    },
  };
  return {
    db: {
      transaction: {
        findFirst: async () => ({
          id: "tx_existing",
          date: new Date(Date.UTC(2025, 0, 15)),
          direction: "OUT",
          amountHalalas: 5000,
          categoryId: "cat_1",
          paymentMethod: "CASH",
        }),
      },
      category: {
        findFirst: async () => ({ type: "OUT", active: true }),
      },
      $transaction: async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx),
    },
  };
});

const { createTransaction, updateTransaction, deleteTransaction } = await import(
  "./actions"
);

function entryForm(date: string): FormData {
  const form = new FormData();
  form.append("date", date);
  form.append("direction", "OUT");
  form.append("amountHalalas", "123450");
  form.append("categoryId", "cat_1");
  form.append("paymentMethod", "CASH");
  return form;
}

const ym = (iso: string) => iso.slice(0, 7);

beforeEach(() => {
  harness.guards = [];
  harness.refuse = null;
  harness.lockChecks = [];
  harness.lockedMonths = [];
  harness.writes = [];
});

describe("each mutation calls the guard its rule names", () => {
  it("createTransaction: any member", async () => {
    await createTransaction(null, entryForm(todayISO()));
    expect(harness.guards).toEqual(["requireMember"]);
  });

  it("updateTransaction: canEdit, re-read from the database", async () => {
    await updateTransaction("tx_existing", null, entryForm(todayISO()));
    expect(harness.guards).toEqual(["requireCanEdit"]);
  });

  it("deleteTransaction: OWNER only", async () => {
    await deleteTransaction("tx_existing");
    expect(harness.guards).toEqual(["requireOwner"]);
  });

  it("a refused delete writes nothing", async () => {
    harness.refuse = "requireOwner";
    await expect(deleteTransaction("tx_existing")).rejects.toThrow("NEXT_REDIRECT");
    expect(harness.writes).toEqual([]);
  });
});

describe("updateTransaction asks about both months", () => {
  it("passes the entry's current month and its new month", async () => {
    const result = await updateTransaction("tx_existing", null, entryForm(todayISO()));

    expect(result).toEqual({ ok: true, data: null });
    expect(harness.lockChecks).toEqual([
      [monthKey(isoToDate(OLD_ISO)), monthKey(isoToDate(todayISO()))],
    ]);
  });

  it("refuses moving an entry out of a locked month", async () => {
    harness.lockedMonths = [ym(OLD_ISO)];
    const result = await updateTransaction("tx_existing", null, entryForm(todayISO()));

    expect(result).toEqual({ ok: false, error: "err.monthLocked" });
    expect(harness.writes).toEqual([]);
  });

  it("refuses moving an entry into a locked month", async () => {
    harness.lockedMonths = ["2025-03"];
    const result = await updateTransaction("tx_existing", null, entryForm("2025-03-10"));

    expect(result).toEqual({ ok: false, error: "err.monthLocked" });
    expect(harness.writes).toEqual([]);
  });
});

describe("deleteTransaction respects the lock", () => {
  it("refuses an entry in a locked month", async () => {
    harness.lockedMonths = [ym(OLD_ISO)];
    const result = await deleteTransaction("tx_existing");

    expect(result).toEqual({ ok: false, error: "err.monthLocked" });
    expect(harness.writes).toEqual([]);
  });

  it("soft-deletes otherwise, with an audit row", async () => {
    const result = await deleteTransaction("tx_existing");

    expect(result).toEqual({ ok: true, data: null });
    expect(harness.writes).toEqual(["transaction.updateMany", "auditLog.create"]);
  });
});
