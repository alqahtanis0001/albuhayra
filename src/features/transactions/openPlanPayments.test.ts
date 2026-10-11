import { beforeEach, describe, expect, it, vi } from "vitest";

import { todayISO } from "@/lib/dates";

/**
 * v1.4 — payments on open agreements (C3, C4, C7; D7, D9; D21 P3–P5, P13,
 * P14, P19): OWNER only, the inherited columns, the single-link rule, the
 * date floor, the month lock, auto-close at **exactly** the total, the
 * revision lock, and the ordinary edit/delete path of a `planId` row. The SQL
 * is `plans/openMoneyPath.test.ts`; scope is `scoping.test.ts`.
 */

const h = vi.hoisted(() => ({
  user: { id: "u1", role: "OWNER", status: "ACTIVE", canEdit: true, establishmentId: "est_1" } as Record<string, unknown>,
  writes: [] as Array<{ op: string; args?: Record<string, unknown> }>,
  audits: [] as Array<Record<string, unknown>>,
  locked: false,
  plan: null as Record<string, unknown> | null,
  received: 0,
  existing: null as Record<string, unknown> | null,
  bumpCount: 1,
  /** The category the mock answers with; updateTransaction checks it before the plan rules. */
  categoryType: "OUT",
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/lib/audit", () => ({ writeAudit: async (a: Record<string, unknown>) => void h.audits.push(a) }));
vi.mock("@/features/locks/assertUnlocked", () => ({ assertUnlocked: async () => (h.locked ? "err.monthLocked" : null) }));
vi.mock("@/lib/auth", () => {
  const context = async () => ({ user: h.user, establishmentId: "est_1" });
  return {
    requireMember: context,
    requireCanEdit: context,
    // The real one redirects STAFF; here it throws like a redirect does.
    requireOwner: async () => {
      if (h.user.role !== "OWNER") throw new Error("NEXT_REDIRECT");
      return context();
    },
  };
});
vi.mock("@/features/plans/allocate", async (original) => ({
  ...(await original<typeof import("@/features/plans/allocate")>()),
  reallocatePlan: async () => (h.writes.push({ op: "reallocate" }), { overpaidHalalas: 0 }),
}));
vi.mock("@/lib/db", () => {
  const w = (op: string, result: unknown = { count: 1 }) => async (args: Record<string, unknown>) => (h.writes.push({ op, args }), result);
  const db = {
    party: { findFirst: async () => ({ active: true }) },
    project: { findFirst: async () => ({ status: "ACTIVE" }) },
    instalment: { findFirst: async () => null },
    employee: { findMany: async () => [] },
    category: { findFirst: async () => ({ type: h.categoryType, active: true }), findMany: async () => [] },
    plan: {
      findFirst: async () => h.plan,
      count: async () => 0,
      findMany: async () => [],
      updateMany: async (args: { where: Record<string, unknown> }) => {
        if ("revision" in args.where) return (h.writes.push({ op: "bump", args }), { count: h.bumpCount });
        return w("plan.updateMany")(args);
      },
    },
    transaction: {
      aggregate: async (args: Record<string, unknown>) => (h.writes.push({ op: "aggregate", args }), { _sum: { amountHalalas: h.received } }),
      findFirst: async () => h.existing,
      findMany: async () => [],
      groupBy: async () => [],
      create: w("create", { id: "tx_new" }),
      updateMany: w("updateMany"),
    },
    $transaction: async (fn: (tx: unknown) => unknown) => fn(db),
  };
  return { db };
});

const { recordOpenPlanPayment, createTransaction, updateTransaction, deleteTransaction } = await import("./actions");
const { assertSingleLink } = await import("./openPlanPayments");
const { snapshot } = await import("./links");

const today = todayISO();
const shift = (days: number) => new Date(Date.parse(`${today}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
const d = (iso: string) => new Date(`${iso}T00:00:00Z`);

const PLAN = {
  id: "plan_1", kind: "OPEN_ENDED", state: "OPEN", revision: 3, totalHalalas: 3000, direction: "OUT",
  partyId: "party_1", categoryId: "cat_plan", startDate: d(shift(-30)),
};
const EXISTING = {
  id: "tx_1", date: d(shift(-1)), direction: "OUT", amountHalalas: 500, categoryId: "cat_plan", paymentMethod: "CASH",
  partyId: "party_1", projectId: null, instalmentId: null, planId: "plan_1",
};

function payForm(extra: Record<string, string> = {}): FormData {
  const form = new FormData();
  for (const [k, v] of Object.entries({ amountHalalas: "1000", date: today, paymentMethod: "CASH", ...extra })) form.append(k, v);
  return form;
}

function editForm(extra: Record<string, string | undefined> = {}): FormData {
  const form = new FormData();
  const fields: Record<string, string | undefined> = {
    date: today, direction: "OUT", amountHalalas: "700", categoryId: "cat_plan", paymentMethod: "CASH", partyId: "party_1", ...extra,
  };
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) form.append(k, v);
  return form;
}

const ops = () => h.writes.map((x) => x.op);
const write = (op: string) => h.writes.find((x) => x.op === op)?.args as Record<string, unknown> | undefined;

beforeEach(() => {
  h.user = { id: "u1", role: "OWNER", status: "ACTIVE", canEdit: true, establishmentId: "est_1" };
  h.writes = [];
  h.audits = [];
  h.locked = false;
  h.plan = { ...PLAN };
  h.received = 1000;
  h.existing = { ...EXISTING };
  h.bumpCount = 1;
  h.categoryType = "OUT";
});

describe("recordOpenPlanPayment", () => {
  it("inherits direction, party and category from the plan, links planId and never instalmentId; posted links are ignored", async () => {
    const result = await recordOpenPlanPayment("plan_1", null, payForm({ direction: "IN", partyId: "party_x", categoryId: "cat_x", instalmentId: "i1", note: "ملاحظة" }));
    expect(result).toEqual({ ok: true, data: { transactionId: "tx_new", autoClosed: false } });
    const data = write("create")!.data as Record<string, unknown>;
    expect(data).toMatchObject({
      establishmentId: "est_1", direction: "OUT", partyId: "party_1", categoryId: "cat_plan", planId: "plan_1",
      amountHalalas: 1000, paymentMethod: "CASH", note: "ملاحظة", createdById: "u1", projectId: null, counterparty: null,
    });
    expect(Object.keys(data)).not.toContain("instalmentId");
    expect(h.audits.map((a) => a.action)).toEqual(["CREATE"]);
    expect(h.audits[0]!.after).toMatchObject({ planId: "plan_1", instalmentId: null });
  });

  it("the bump is the first write, the create precedes the sum, and the sum reads non-deleted rows of this plan", async () => {
    await recordOpenPlanPayment("plan_1", null, payForm());
    expect(ops()).toEqual(["bump", "create", "aggregate"]);
    expect(write("bump")!.where).toEqual({ establishmentId: "est_1", id: "plan_1", revision: 3 });
    expect(write("aggregate")!.where).toEqual({ establishmentId: "est_1", planId: "plan_1", deletedAt: null });
  });

  it("C4: closes at exactly the total, not one halala below; above closes too (P14); no ceiling never closes", async () => {
    h.received = 3000;
    expect(await recordOpenPlanPayment("plan_1", null, payForm())).toMatchObject({ data: { autoClosed: true } });
    const close = write("plan.updateMany")!;
    expect(close.where).toEqual({ establishmentId: "est_1", id: "plan_1", state: "OPEN" });
    expect((close.data as Record<string, unknown>).state).toBe("ARCHIVED");
    expect((close.data as Record<string, unknown>).closedAt).toBeInstanceOf(Date);
    expect(h.audits.map((a) => a.action)).toEqual(["PLAN_ARCHIVE", "CREATE"]);
    expect(h.audits[0]!.after).toEqual({ state: "ARCHIVED", autoClosed: true, receivedHalalas: 3000 });

    h.writes = []; h.audits = []; h.received = 2999;
    expect(await recordOpenPlanPayment("plan_1", null, payForm())).toMatchObject({ data: { autoClosed: false } });
    expect(ops()).not.toContain("plan.updateMany");
    expect(h.audits.map((a) => a.action)).toEqual(["CREATE"]);

    h.writes = []; h.received = 3500;
    expect(await recordOpenPlanPayment("plan_1", null, payForm())).toMatchObject({ data: { autoClosed: true } });

    h.writes = []; h.received = 999999; h.plan = { ...PLAN, totalHalalas: null };
    expect(await recordOpenPlanPayment("plan_1", null, payForm())).toMatchObject({ data: { autoClosed: false } });
    expect(ops()).not.toContain("plan.updateMany");
  });

  it("D8: a payment dated before the plan's start is a field error, before any write", async () => {
    expect(await recordOpenPlanPayment("plan_1", null, payForm({ date: shift(-31) }))).toMatchObject({
      ok: false, fieldErrors: { date: "err.paymentBeforeStart" },
    });
    expect(h.writes).toEqual([]);
    expect((await recordOpenPlanPayment("plan_1", null, payForm({ date: shift(-30) }))).ok).toBe(true);
  });

  it("refuses a missing, scheduled or closed plan, a locked month and bad input — all before any write", async () => {
    h.plan = null;
    expect(await recordOpenPlanPayment("plan_1", null, payForm())).toEqual({ ok: false, error: "err.notFound" });
    h.plan = { ...PLAN, kind: "STANDARD" };
    expect(await recordOpenPlanPayment("plan_1", null, payForm())).toEqual({ ok: false, error: "err.planNotOpenEnded" });
    h.plan = { ...PLAN, state: "ARCHIVED" };
    expect(await recordOpenPlanPayment("plan_1", null, payForm())).toEqual({ ok: false, error: "err.planClosed" });
    h.plan = { ...PLAN };
    h.locked = true;
    expect(await recordOpenPlanPayment("plan_1", null, payForm())).toEqual({ ok: false, error: "err.monthLocked" });
    h.locked = false;
    expect(await recordOpenPlanPayment("plan_1", null, payForm({ amountHalalas: "0" }))).toMatchObject({ fieldErrors: { amountHalalas: "err.amountPositive" } });
    expect(await recordOpenPlanPayment("plan_1", null, payForm({ date: shift(1) }))).toMatchObject({ fieldErrors: { date: "err.dateFuture" } });
    expect(h.writes).toEqual([]);
  });

  it("D7: STAFF never reach the write — with canEdit or without (requireOwner redirects)", async () => {
    for (const canEdit of [true, false]) {
      h.user = { ...h.user, role: "STAFF", canEdit };
      await expect(recordOpenPlanPayment("plan_1", null, payForm())).rejects.toThrow("NEXT_REDIRECT");
    }
    expect(h.writes).toEqual([]);
  });

  it("W14: a lost revision race writes nothing after the bump and answers err.concurrentChange", async () => {
    h.bumpCount = 0;
    expect(await recordOpenPlanPayment("plan_1", null, payForm())).toEqual({ ok: false, error: "err.concurrentChange" });
    expect(ops()).toEqual(["bump"]);
  });
});

describe("assertSingleLink and the snapshot", () => {
  it("refuses both links together, either way round; accepts one or none", () => {
    expect(assertSingleLink({ instalmentId: "i1", planId: "p1" })).toBe("err.planBothLinks");
    expect(assertSingleLink({ planId: "p1", instalmentId: "i1" })).toBe("err.planBothLinks");
    expect(assertSingleLink({ planId: "p1" })).toBeNull();
    expect(assertSingleLink({ instalmentId: "i1", planId: null })).toBeNull();
    expect(assertSingleLink({})).toBeNull();
  });

  it("P19: snapshot() names planId only when set — older snapshots stay byte-identical", () => {
    const base = { date: d("2026-09-01"), direction: "OUT" as const, amountHalalas: 1, categoryId: "c", paymentMethod: "CASH" };
    expect(Object.keys(snapshot(base))).not.toContain("planId");
    expect(Object.keys(snapshot({ ...base, planId: null }))).not.toContain("planId");
    expect(snapshot({ ...base, planId: "p1" })).toMatchObject({ planId: "p1" });
  });

  it("P19: createTransaction strips a posted planId — the ordinary form can never link a plan", async () => {
    const form = editForm({ partyId: undefined });
    form.append("planId", "plan_1");
    expect(await createTransaction(null, form)).toEqual({ ok: true, data: null });
    expect(Object.keys(write("create")!.data as object)).not.toContain("planId");
  });
});

describe("D9: editing an open-plan payment through updateTransaction", () => {
  it("P4: STAFF, canEdit or not, get err.forbidden before any read of the plan", async () => {
    h.user = { ...h.user, role: "STAFF", canEdit: true };
    expect(await updateTransaction("tx_1", null, editForm())).toEqual({ ok: false, error: "err.forbidden" });
    expect(h.writes).toEqual([]);
  });

  it("an instalmentId arriving on a planId row → err.planBothLinks", async () => {
    expect(await updateTransaction("tx_1", null, editForm({ instalmentId: "i1" }))).toMatchObject({ fieldErrors: { instalmentId: "err.planBothLinks" } });
    expect(h.writes).toEqual([]);
  });

  it("direction and party are refused on mismatch — an absent party included — never forced", async () => {
    // The frozen action checks the category against the posted direction first; give it a matching one.
    h.categoryType = "IN";
    expect(await updateTransaction("tx_1", null, editForm({ direction: "IN" }))).toMatchObject({ fieldErrors: { direction: "err.paymentDirectionMismatch" } });
    h.categoryType = "OUT";
    expect(await updateTransaction("tx_1", null, editForm({ partyId: "party_2" }))).toMatchObject({ fieldErrors: { partyId: "err.paymentPartyMismatch" } });
    expect(await updateTransaction("tx_1", null, editForm({ partyId: undefined }))).toMatchObject({ fieldErrors: { partyId: "err.paymentPartyMismatch" } });
    expect(h.writes).toEqual([]);
  });

  it("D8 applies to an edited payment: a date before the plan's start is refused; the start date itself is accepted", async () => {
    expect(await updateTransaction("tx_1", null, editForm({ date: shift(-31) }))).toMatchObject({ fieldErrors: { date: "err.paymentBeforeStart" } });
    expect(h.writes).toEqual([]);
    expect((await updateTransaction("tx_1", null, editForm({ date: shift(-30) }))).ok).toBe(true);
  });

  it("P3: the category may change within the direction; amount, date, method and note are editable", async () => {
    expect(await updateTransaction("tx_1", null, editForm({ categoryId: "cat_other", note: "تعديل" }))).toEqual({ ok: true, data: null });
    const data = write("updateMany")!.data as Record<string, unknown>;
    expect(data).toMatchObject({ categoryId: "cat_other", amountHalalas: 700, partyId: "party_1", direction: "OUT", note: "تعديل" });
    // planId is fixed by construction: never in the written columns; instalmentId never appears either.
    expect(Object.keys(data)).not.toContain("planId");
    expect(Object.keys(data)).not.toContain("instalmentId");
  });

  it("P13 / C4: the edit bumps the plan's revision and never changes its state", async () => {
    expect(await updateTransaction("tx_1", null, editForm())).toEqual({ ok: true, data: null });
    expect(ops()[0]).toBe("bump");
    expect(write("bump")!.where).toEqual({ establishmentId: "est_1", id: "plan_1", revision: 3 });
    expect(ops()).not.toContain("plan.updateMany");
    expect(h.audits.map((a) => a.action)).toEqual(["UPDATE"]);
  });

  it("a planId row whose plan is not open-ended (corruption) is refused, never written", async () => {
    h.plan = { ...PLAN, kind: "STANDARD" };
    expect(await updateTransaction("tx_1", null, editForm())).toEqual({ ok: false, error: "err.planNotOpenEnded" });
    expect(h.writes).toEqual([]);
  });
});

describe("deleting an open-plan payment", () => {
  it("P13 / C4: OWNER only; bumps the plan, soft-deletes, never changes the plan's state", async () => {
    expect(await deleteTransaction("tx_1")).toEqual({ ok: true, data: null });
    expect(ops()[0]).toBe("bump");
    expect(write("updateMany")!.data).toMatchObject({ deletedAt: expect.any(Date) });
    expect(ops()).not.toContain("plan.updateMany");
    expect(h.audits.map((a) => a.action)).toEqual(["DELETE"]);
  });

  it("STAFF cannot delete (requireOwner)", async () => {
    h.user = { ...h.user, role: "STAFF", canEdit: true };
    await expect(deleteTransaction("tx_1")).rejects.toThrow("NEXT_REDIRECT");
    expect(h.writes).toEqual([]);
  });
});
