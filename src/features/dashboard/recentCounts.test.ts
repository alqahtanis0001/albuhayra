import { describe, expect, it, vi } from "vitest";

/**
 * v1.5 (D21, reviewer R1-H9): the owner home's recent list reads five, the
 * staff dashboard's «حركاتي الأخيرة» keeps ten — pinned at the call itself.
 */

vi.mock("server-only", () => ({}));
const recentTransactions = vi.fn(async () => []);
vi.mock("@/features/transactions/queries", () => ({
  ledgerWhere: (establishmentId: string) => ({ establishmentId, deletedAt: null }),
  sumByDirection: async () => ({ inHalalas: 0, outHalalas: 0, netHalalas: 0 }),
  recentTransactions,
}));
vi.mock("./firstRunReads", () => ({ readFirstRunFlags: async () => ({ hasEntry: false, hasParty: false, hasPlan: false, hasEmployee: false }) }));
vi.mock("@/lib/db", () => ({
  db: {
    transaction: { groupBy: async () => [], findMany: async () => [] },
    category: { findMany: async () => [] },
    user: { findFirst: async () => ({ canEdit: false }) },
  },
}));

const { getOwnerDashboard, getStaffDashboard, OWNER_RECENT_COUNT, RECENT_COUNT } = await import("./queries");

describe("recent counts", () => {
  it("staff: «حركاتي الأخيرة» asks for 10 of the user's own entries, salary hidden", async () => {
    recentTransactions.mockClear();
    await getStaffDashboard("est_1", "user_1");
    expect(RECENT_COUNT).toBe(10);
    expect(recentTransactions).toHaveBeenCalledWith("est_1", 10, { createdById: "user_1" }, { hideSalary: true });
  });

  it("owner: the home asks for 5", async () => {
    recentTransactions.mockClear();
    await getOwnerDashboard("est_1");
    expect(OWNER_RECENT_COUNT).toBe(5);
    expect(recentTransactions).toHaveBeenCalledWith("est_1", 5);
  });
});
