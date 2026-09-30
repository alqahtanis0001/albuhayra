import { beforeEach, describe, expect, it, vi } from "vitest";

import { Prisma } from "@/generated/prisma";

/**
 * الاتفاقيات mutations: guards, the schedule rules (V7, fixed rows), V5
 * kept-not-newly-assigned, the revision lock (W14: nothing after a lost bump),
 * cancel vs archive, and the P2003 catch. `scoping.test.ts` proves scope;
 * `moneyPath.test.ts` proves the SQL.
 */

type Row = { id: string; seq: number; dueDate: Date; amountDueHalalas: number; paidHalalas: number };

const h = vi.hoisted(() => ({
  guards: [] as string[],
  writes: [] as Array<{ op: string; args?: Record<string, unknown> }>,
  plan: null as Record<string, unknown> | null,
  rows: [] as Row[],
  referenced: [] as string[],
  party: { active: true } as { active: boolean } | null,
  category: { type: "OUT", active: true } as { type: string; active: boolean } | null,
  payments: 0,
  bumpCount: 1,
  deleteError: null as unknown,
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/lib/audit", () => ({
  writeAudit: async (a: Record<string, unknown>) => void h.writes.push({ op: `audit:${a.action}`, args: a }),
}));
vi.mock("@/lib/auth", () => {
  const guard = (name: string) => async () => (h.guards.push(name), { user: { id: "owner_1" }, establishmentId: "est_1" });
  return { requireOwner: guard("requireOwner"), requireMember: guard("requireMember"), requireCanEdit: guard("requireCanEdit") };
});
vi.mock("./allocate", async (original) => ({
  ...(await original<typeof import("./allocate")>()),
  reallocatePlan: async () => (h.writes.push({ op: "reallocate" }), { overpaidHalalas: 0 }),
}));
vi.mock("@/lib/db", () => {
  const w = (op: string, result: unknown = { count: 1 }) => async (args: Record<string, unknown>) => (h.writes.push({ op, args }), result);
  const db = {
    plan: {
      findFirst: async () => h.plan,
      create: w("plan.create", { id: "plan_new" }),
      updateMany: async (args: { where: Record<string, unknown> }) => {
        if ("revision" in args.where) return (h.writes.push({ op: "bump", args }), { count: h.bumpCount });
        return w("plan.updateMany")(args);
      },
    },
    instalment: {
      findMany: async () => h.rows,
      createMany: w("instalment.createMany"),
      updateMany: w("instalment.updateMany"),
      deleteMany: async (args: Record<string, unknown>) => {
        if (h.deleteError) throw h.deleteError;
        return w("instalment.deleteMany")(args);
      },
    },
    transaction: {
      groupBy: async () => h.referenced.map((instalmentId) => ({ instalmentId })),
      count: async () => h.payments,
    },
    party: { findFirst: async () => h.party },
    category: { findFirst: async () => h.category },
    $transaction: async (fn: (tx: unknown) => unknown) => fn(db),
  };
  return { db };
});

const { createPlan, updatePlan, cancelPlan, archivePlan } = await import("./actions");

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);
const PLAN = {
  id: "plan_1", state: "OPEN", revision: 7, partyId: "party_1", direction: "OUT", categoryId: "cat_1",
  title: "توريد", totalHalalas: 3000, startDate: d("2026-09-01"), reminderDays: 3, notes: null,
};
const ROWS: Row[] = [
  { id: "i1", seq: 1, dueDate: d("2026-10-01"), amountDueHalalas: 1000, paidHalalas: 1000 },
  { id: "i2", seq: 2, dueDate: d("2026-11-01"), amountDueHalalas: 1000, paidHalalas: 0 },
  { id: "i3", seq: 3, dueDate: d("2026-12-01"), amountDueHalalas: 1000, paidHalalas: 0 },
];

type R = { id?: string; dueDate: string; amountDueHalalas: number };
const KEEP: R[] = [
  { id: "i1", dueDate: "2026-10-01", amountDueHalalas: 1000 },
  { id: "i2", dueDate: "2026-11-01", amountDueHalalas: 1000 },
  { id: "i3", dueDate: "2026-12-01", amountDueHalalas: 1000 },
];

function form(rows: R[] | string, extra: Record<string, string> = {}): FormData {
  const f = new FormData();
  const all = {
    partyId: "party_1", direction: "OUT", title: "توريد", totalHalalas: "3000", categoryId: "cat_1",
    startDate: "2026-09-01", reminderDays: "3", instalments: typeof rows === "string" ? rows : JSON.stringify(rows), ...extra,
  };
  for (const [k, v] of Object.entries(all)) f.append(k, v);
  return f;
}
const ops = () => h.writes.map((w) => w.op);
const refused = (field: string, key: string) => ({ ok: false, error: key, fieldErrors: { [field]: key } });

beforeEach(() => {
  Object.assign(h, {
    guards: [], writes: [], plan: { ...PLAN }, rows: ROWS.map((r) => ({ ...r })), referenced: [],
    party: { active: true }, category: { type: "OUT", active: true }, payments: 0, bumpCount: 1, deleteError: null,
  });
});

describe("guards", () => {
  it.each([
    ["createPlan", () => createPlan(null, form(KEEP.map(({ id: _i, ...r }) => r)))],
    ["updatePlan", () => updatePlan("plan_1", null, form(KEEP))],
    ["cancelPlan", () => cancelPlan("plan_1")],
    ["archivePlan", () => archivePlan("plan_1")],
  ])("%s is OWNER-only", async (_n, call) => {
    await call();
    expect(h.guards).toEqual(["requireOwner"]);
  });
});

describe("createPlan", () => {
  it("an unparsable schedule is err.scheduleInvalid", async () => {
    expect(await createPlan(null, form("[{"))).toEqual(refused("instalments", "err.scheduleInvalid"));
  });

  it("V7: any row id is refused", async () => {
    expect(await createPlan(null, form(KEEP))).toEqual(refused("instalments", "err.scheduleInvalid"));
    expect(ops()).toEqual([]);
  });

  it("an inactive party or category cannot be assigned; a category must match the direction", async () => {
    const rows = KEEP.map(({ id: _i, ...r }) => r);
    h.party = { active: false };
    expect(await createPlan(null, form(rows))).toEqual(refused("partyId", "err.partyInvalid"));
    h.party = { active: true };
    h.category = { type: "IN", active: true };
    expect(await createPlan(null, form(rows))).toEqual(refused("categoryId", "err.categoryDirectionMismatch"));
  });

  it("numbers rows by (dueDate, input order), scopes every row, audits rows without ids (W12)", async () => {
    const rows = [
      { dueDate: "2026-12-01", amountDueHalalas: 1000 },
      { dueDate: "2026-10-01", amountDueHalalas: 1500 },
      { dueDate: "2026-10-01", amountDueHalalas: 500 },
    ];
    expect(await createPlan(null, form(rows))).toEqual({ ok: true, data: { id: "plan_new" } });
    const many = h.writes.find((w) => w.op === "instalment.createMany")!.args!.data as Array<Record<string, unknown>>;
    expect(many.map((r) => [r.seq, r.amountDueHalalas, r.establishmentId])).toEqual([
      [1, 1500, "est_1"], [2, 500, "est_1"], [3, 1000, "est_1"],
    ]);
    const audit = h.writes.find((w) => w.op === "audit:PLAN_CREATE")!.args!.after as { instalments: object[] };
    expect(audit.instalments[0]).toEqual({ dueDate: "2026-10-01", amountDueHalalas: 1500, seq: 1 });
  });
});

describe("updatePlan — the schedule", () => {
  it("a fixed row changed, or omitted, is err.schedulePaidRowChanged", async () => {
    const changed = KEEP.map((r) => (r.id === "i1" ? { ...r, dueDate: "2026-10-02" } : r));
    expect(await updatePlan("plan_1", null, form(changed))).toEqual(refused("instalments", "err.schedulePaidRowChanged"));
    const omitted = [{ dueDate: "2026-10-01", amountDueHalalas: 1000 }, KEEP[1]!, KEEP[2]!];
    expect(await updatePlan("plan_1", null, form(omitted))).toEqual(refused("instalments", "err.schedulePaidRowChanged"));
  });

  it("a row referenced only by a deleted entry is fixed too", async () => {
    h.referenced = ["i2"];
    const moved = KEEP.map((r) => (r.id === "i2" ? { ...r, amountDueHalalas: 900 } : r.id === "i3" ? { ...r, amountDueHalalas: 1100 } : r));
    expect(await updatePlan("plan_1", null, form(moved))).toEqual(refused("instalments", "err.schedulePaidRowChanged"));
  });

  it("V7: a duplicate or foreign id is err.scheduleInvalid", async () => {
    const dup = [KEEP[0]!, { ...KEEP[1]!, id: "i1" }, KEEP[2]!];
    expect(await updatePlan("plan_1", null, form(dup))).toEqual(refused("instalments", "err.scheduleInvalid"));
    const foreign = [KEEP[0]!, KEEP[1]!, { ...KEEP[2]!, id: "i_other_plan" }];
    expect(await updatePlan("plan_1", null, form(foreign))).toEqual(refused("instalments", "err.scheduleInvalid"));
  });

  it("with a fixed row the party and direction are locked", async () => {
    expect(await updatePlan("plan_1", null, form(KEEP, { partyId: "party_2" }))).toEqual(refused("partyId", "err.planPartyLocked"));
  });

  it("unfixed rows may change or go: dropped ones are deleted, new ones created, then re-allocated", async () => {
    const next = [KEEP[0]!, { dueDate: "2026-11-15", amountDueHalalas: 2000 }];
    expect(await updatePlan("plan_1", null, form(next))).toEqual({ ok: true, data: null });
    expect(ops()).toEqual(["bump", "instalment.deleteMany", "instalment.updateMany", "instalment.createMany", "plan.updateMany", "reallocate", "audit:PLAN_UPDATE"]);
    expect(h.writes[1]!.args!.where).toMatchObject({ establishmentId: "est_1", planId: "plan_1", id: { in: ["i2", "i3"] } });
  });

  it("V5: the plan's own inactive party and category may stay; others may not be newly assigned", async () => {
    h.party = { active: false };
    h.category = { type: "OUT", active: false };
    expect(await updatePlan("plan_1", null, form(KEEP))).toEqual({ ok: true, data: null });
    h.referenced = [];
    h.rows = ROWS.map((r) => ({ ...r, paidHalalas: 0 }));
    expect(await updatePlan("plan_1", null, form(KEEP, { partyId: "party_2" }))).toEqual(refused("partyId", "err.partyInvalid"));
    expect(await updatePlan("plan_1", null, form(KEEP, { categoryId: "cat_2" }))).toEqual(refused("categoryId", "err.categoryInvalid"));
  });

  it("a closed plan is err.planClosed", async () => {
    h.plan = { ...PLAN, state: "ARCHIVED" };
    expect(await updatePlan("plan_1", null, form(KEEP))).toEqual({ ok: false, error: "err.planClosed" });
  });
});

describe("the revision lock and the P2003 catch (W14)", () => {
  it("a lost bump is err.concurrentChange and nothing is written after it", async () => {
    h.bumpCount = 0;
    expect(await updatePlan("plan_1", null, form(KEEP))).toEqual({ ok: false, error: "err.concurrentChange" });
    expect(ops()).toEqual(["bump"]);
    h.writes = [];
    expect(await archivePlan("plan_1")).toEqual({ ok: false, error: "err.concurrentChange" });
    expect(ops()).toEqual(["bump"]);
  });

  it("the bump carries the revision read with the plan", async () => {
    await archivePlan("plan_1");
    expect(h.writes[0]).toMatchObject({
      op: "bump",
      args: { where: { establishmentId: "est_1", id: "plan_1", revision: 7 }, data: { revision: { increment: 1 } } },
    });
  });

  it("a row a payment raced onto (P2003) is err.schedulePaidRowChanged", async () => {
    h.deleteError = new Prisma.PrismaClientKnownRequestError("fk", { code: "P2003", clientVersion: "7" });
    const next = [KEEP[0]!, { dueDate: "2026-11-15", amountDueHalalas: 2000 }];
    expect(await updatePlan("plan_1", null, form(next))).toEqual(refused("instalments", "err.schedulePaidRowChanged"));
  });

  it("any other error is rethrown, not disguised — including a look-alike P2003", async () => {
    h.deleteError = Object.assign(new Error("look-alike"), { code: "P2003" });
    const next = [KEEP[0]!, { dueDate: "2026-11-15", amountDueHalalas: 2000 }];
    await expect(updatePlan("plan_1", null, form(next))).rejects.toThrow("look-alike");
  });
});

describe("cancel vs archive", () => {
  it("cancel refuses a plan with a non-deleted payment; archive accepts it", async () => {
    h.payments = 1;
    expect(await cancelPlan("plan_1")).toEqual({ ok: false, error: "err.planHasPayments" });
    expect(ops()).toEqual([]);
    expect(await archivePlan("plan_1")).toEqual({ ok: true, data: null });
    expect(h.writes.find((w) => w.op === "plan.updateMany")!.args!.data).toMatchObject({ state: "ARCHIVED" });
  });

  it("cancel without payments sets CANCELLED; neither touches a closed plan", async () => {
    expect(await cancelPlan("plan_1")).toEqual({ ok: true, data: null });
    expect(h.writes.find((w) => w.op === "plan.updateMany")!.args!.data).toMatchObject({ state: "CANCELLED" });
    h.plan = { ...PLAN, state: "CANCELLED" };
    expect(await archivePlan("plan_1")).toEqual({ ok: false, error: "err.planClosed" });
  });
});
