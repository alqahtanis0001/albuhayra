import { beforeEach, describe, expect, it, vi } from "vitest";

import { todayISO } from "@/lib/dates";

/**
 * Payments through the three ledger actions (CP2; Confirmed readings; W3, W14):
 * the canEdit matrix, refusal (never forcing) of direction and party, the
 * remaining-amount limit, archived plans, month locks and the revision lock.
 * The SQL itself is `plans/moneyPath.test.ts`.
 */

const h = vi.hoisted(() => ({
  user: { id: "u1", role: "OWNER", status: "ACTIVE", canEdit: true, establishmentId: "est_1" },
  lookups: [] as string[],
  writes: [] as Array<{ op: string; data?: Record<string, unknown> }>,
  locked: false,
  instalment: { planId: "plan_1", amountDueHalalas: 1000, paidHalalas: 0 } as Record<string, unknown> | null,
  plan: { id: "plan_1", state: "OPEN", revision: 3, totalHalalas: 3000, direction: "OUT", partyId: "party_1" } as Record<string, unknown>,
  paidSum: 1000,
  /** Σ with the edited entry excluded (`id: { not }`). */
  othersSum: 500,
  existing: null as Record<string, unknown> | null,
  bumpCount: 1,
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/lib/audit", () => ({ writeAudit: async () => void h.writes.push({ op: "audit" }) }));
vi.mock("@/features/locks/assertUnlocked", () => ({ assertUnlocked: async () => (h.locked ? "err.monthLocked" : null) }));
vi.mock("@/lib/auth", () => {
  const context = async () => ({ user: h.user, establishmentId: "est_1" });
  return { requireMember: context, requireCanEdit: context, requireOwner: context };
});
vi.mock("@/features/plans/allocate", async (original) => ({
  ...(await original<typeof import("@/features/plans/allocate")>()),
  reallocatePlan: async () => (h.writes.push({ op: "reallocate" }), { overpaidHalalas: 0 }),
}));
vi.mock("@/lib/db", () => {
  const db = {
    category: { findFirst: async () => ({ type: "OUT", active: true }) },
    party: { findFirst: async () => ({ active: true }) },
    project: { findFirst: async () => ({ status: "ACTIVE" }) },
    instalment: { findFirst: async () => (h.lookups.push("instalment"), h.instalment) },
    plan: {
      findFirst: async () => (h.lookups.push("plan"), h.plan),
      updateMany: async () => (h.writes.push({ op: "bump" }), { count: h.bumpCount }),
    },
    transaction: {
      aggregate: async (a: { where: Record<string, unknown> }) => ({
        _sum: { amountHalalas: a.where.id ? h.othersSum : h.paidSum },
      }),
      findFirst: async () => h.existing,
      create: async (a: { data: Record<string, unknown> }) => (h.writes.push({ op: "create", data: a.data }), { id: "tx_new" }),
      updateMany: async (a: { data: Record<string, unknown> }) => (h.writes.push({ op: "updateMany", data: a.data }), { count: 1 }),
    },
    $transaction: async (fn: (tx: unknown) => unknown) => fn(db),
  };
  return { db };
});

const { createTransaction, updateTransaction, deleteTransaction } = await import("./actions");

const PAYMENT_ROW = {
  id: "tx_pay", date: new Date(`${todayISO()}T00:00:00Z`), direction: "OUT", amountHalalas: 500, categoryId: "cat_1",
  paymentMethod: "CASH", partyId: "party_1", projectId: null, instalmentId: "inst_1",
};

function form(fields: Record<string, string> = {}): FormData {
  const f = new FormData();
  const all = { date: todayISO(), direction: "OUT", amountHalalas: "500", categoryId: "cat_1", paymentMethod: "CASH", instalmentId: "inst_1", ...fields };
  for (const [k, v] of Object.entries(all)) if (v !== "") f.append(k, v);
  return f;
}
const ops = () => h.writes.map((w) => w.op);
const refused = (field: string, key: string) => ({ ok: false, error: key, fieldErrors: { [field]: key } });

beforeEach(() => {
  Object.assign(h, {
    user: { id: "u1", role: "OWNER", status: "ACTIVE", canEdit: true, establishmentId: "est_1" },
    lookups: [], writes: [], locked: false,
    instalment: { planId: "plan_1", amountDueHalalas: 1000, paidHalalas: 0 },
    plan: { id: "plan_1", state: "OPEN", revision: 3, totalHalalas: 3000, direction: "OUT", partyId: "party_1" },
    paidSum: 1000, othersSum: 500, existing: { ...PAYMENT_ROW }, bumpCount: 1,
  });
});

describe("the canEdit matrix for recording a payment", () => {
  const staff = (canEdit: boolean) => ({ id: "s1", role: "STAFF", status: "ACTIVE", canEdit, establishmentId: "est_1" });

  it("OWNER ✓", async () => {
    expect(await createTransaction(null, form())).toEqual({ ok: true, data: null });
  });

  it("STAFF with canEdit ✓", async () => {
    h.user = staff(true);
    expect(await createTransaction(null, form())).toEqual({ ok: true, data: null });
  });

  it("STAFF without canEdit ✗ err.forbidden — before any instalment is looked up (W3c)", async () => {
    h.user = staff(false);
    expect(await createTransaction(null, form())).toEqual({ ok: false, error: "err.forbidden" });
    expect(await createTransaction(null, form({ instalmentId: "no_such_row" }))).toEqual({ ok: false, error: "err.forbidden" });
    expect(h.lookups).toEqual([]);
    expect(ops()).toEqual([]);
  });

  it("a plain entry by STAFF without canEdit is still ✓", async () => {
    h.user = staff(false);
    expect(await createTransaction(null, form({ instalmentId: "" }))).toEqual({ ok: true, data: null });
  });
});

describe("recording a payment", () => {
  it("writes the link and the plan's party, inside bump → create → reallocate", async () => {
    expect(await createTransaction(null, form({ counterparty: "نص" }))).toEqual({ ok: true, data: null });
    expect(ops()).toEqual(["bump", "create", "audit", "reallocate"]);
    expect(h.writes[1]!.data).toMatchObject({ instalmentId: "inst_1", partyId: "party_1", counterparty: null });
  });

  it("W3b: a direction or party other than the plan's is refused, never forced", async () => {
    expect(await createTransaction(null, form({ direction: "IN" }))).toEqual(refused("direction", "err.paymentDirectionMismatch"));
    expect(await createTransaction(null, form({ partyId: "party_2" }))).toEqual(refused("partyId", "err.paymentPartyMismatch"));
    expect(ops()).toEqual([]);
  });

  it("the amount may not exceed the plan's remainder (total − linked payments)", async () => {
    expect(await createTransaction(null, form({ amountHalalas: "2001" }))).toEqual(refused("amountHalalas", "err.paymentExceedsRemaining"));
    expect(await createTransaction(null, form({ amountHalalas: "2000" }))).toEqual({ ok: true, data: null });
  });

  it("unknown instalment, a paid one, a closed plan", async () => {
    h.instalment = null;
    expect(await createTransaction(null, form())).toEqual(refused("instalmentId", "err.instalmentInvalid"));
    h.instalment = { planId: "plan_1", amountDueHalalas: 1000, paidHalalas: 1000 };
    expect(await createTransaction(null, form())).toEqual({ ok: false, error: "err.instalmentPaid" });
    h.instalment = { planId: "plan_1", amountDueHalalas: 1000, paidHalalas: 0 };
    for (const state of ["ARCHIVED", "CANCELLED"]) {
      h.plan = { ...h.plan, state };
      expect(await createTransaction(null, form()), state).toEqual({ ok: false, error: "err.planClosed" });
    }
    expect(ops()).toEqual([]);
  });

  it("a lost revision race is err.concurrentChange and nothing is written after the bump", async () => {
    h.bumpCount = 0;
    expect(await createTransaction(null, form())).toEqual({ ok: false, error: "err.concurrentChange" });
    expect(ops()).toEqual(["bump"]);
  });
});

describe("editing and deleting a payment", () => {
  it("the link is fixed: another instalment is refused; absent means keep", async () => {
    expect(await updateTransaction("tx_pay", null, form({ instalmentId: "inst_2" }))).toEqual(refused("instalmentId", "err.paymentLinkFixed"));
    expect(await updateTransaction("tx_pay", null, form({ instalmentId: "" }))).toEqual({ ok: true, data: null });
    expect(h.writes.find((w) => w.op === "updateMany")!.data).not.toHaveProperty("instalmentId");
    expect(ops()).toEqual(["bump", "updateMany", "audit", "reallocate"]);
  });

  it("its own amount counts toward the limit", async () => {
    // remaining = 3000 − 500 (the other payments) = 2500
    expect(await updateTransaction("tx_pay", null, form({ amountHalalas: "2501" }))).toEqual(refused("amountHalalas", "err.paymentExceedsRemaining"));
    expect(await updateTransaction("tx_pay", null, form({ amountHalalas: "2500" }))).toEqual({ ok: true, data: null });
  });

  it("an ARCHIVED plan's payment may be corrected and deleted (Confirmed reading 2)", async () => {
    h.plan = { ...h.plan, state: "ARCHIVED" };
    expect(await updateTransaction("tx_pay", null, form({ amountHalalas: "400" }))).toEqual({ ok: true, data: null });
    expect(await deleteTransaction("tx_pay")).toEqual({ ok: true, data: null });
  });

  it("deleting a payment soft-deletes and re-allocates (un-pays)", async () => {
    expect(await deleteTransaction("tx_pay")).toEqual({ ok: true, data: null });
    expect(ops()).toEqual(["bump", "updateMany", "audit", "reallocate"]);
  });
});

describe("S-P3a: an edit never adds back a stale amount", () => {
  it("the entry changed under us (5000 → 1000): the limit is total − the others, not + the stale 5000", async () => {
    // Plan total 10000; other payments 4000; this entry was read as 5000 but
    // another edit committed 1000 before the revision read. True limit: 6000.
    h.plan = { ...h.plan, totalHalalas: 10_000 };
    h.existing = { ...PAYMENT_ROW, amountHalalas: 5000 };
    h.othersSum = 4000;
    h.paidSum = 5000; // Σ including the entry's *current* 1000
    expect(await updateTransaction("tx_pay", null, form({ amountHalalas: "6001" }))).toEqual(
      refused("amountHalalas", "err.paymentExceedsRemaining"),
    );
    expect(await updateTransaction("tx_pay", null, form({ amountHalalas: "6000" }))).toEqual({ ok: true, data: null });
  });
});

describe("month locks apply to all three", () => {
  it("create, edit and delete of a payment in a closed month are refused before any write", async () => {
    h.locked = true;
    expect(await createTransaction(null, form())).toEqual({ ok: false, error: "err.monthLocked" });
    expect(await updateTransaction("tx_pay", null, form())).toEqual({ ok: false, error: "err.monthLocked" });
    expect(await deleteTransaction("tx_pay")).toEqual({ ok: false, error: "err.monthLocked" });
    expect(ops()).toEqual([]);
  });
});
