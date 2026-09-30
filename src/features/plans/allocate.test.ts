import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
// writeAudit falls back to db only without a client; every call here passes the tx.
vi.mock("@/lib/db", () => ({ db: {} }));

const { bumpRevision, ConcurrentChangeError, reallocatePlan } = await import("./allocate");

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** A tx stand-in recording writes; `writeAudit` goes through `auditLog.create`. */
function fakeTx(instalments: object[], payments: object[], bumpCount = 1) {
  const writes: Array<{ op: string; args: Record<string, unknown> }> = [];
  const tx = {
    instalment: {
      findMany: async () => instalments,
      updateMany: async (args: Record<string, unknown>) => (writes.push({ op: "instalment.updateMany", args }), { count: 1 }),
    },
    transaction: { findMany: async () => payments },
    auditLog: { create: async (args: Record<string, unknown>) => void writes.push({ op: "audit", args }) },
    plan: { updateMany: async (args: Record<string, unknown>) => (writes.push({ op: "bump", args }), { count: bumpCount }) },
  };
  return { tx: tx as never, writes };
}

const ROWS = [
  { id: "i1", dueDate: d("2026-10-01"), seq: 1, amountDueHalalas: 1000, paidHalalas: 1000 },
  { id: "i2", dueDate: d("2026-11-01"), seq: 2, amountDueHalalas: 1000, paidHalalas: 0 },
  { id: "i3", dueDate: d("2026-12-01"), seq: 3, amountDueHalalas: 1000, paidHalalas: 0 },
];
const pay = (id: string, instalmentId: string, amountHalalas: number) => ({
  id, instalmentId, amountHalalas, date: d("2026-10-01"), createdAt: new Date("2026-10-01T09:00:00Z"),
});

describe("reallocatePlan", () => {
  it("writes only the rows that changed, scoped, with one PLAN_ALLOCATE audit", async () => {
    const { tx, writes } = fakeTx(ROWS, [pay("p1", "i1", 1500)]);
    expect(await reallocatePlan(tx, "est_1", "plan_1", "u1")).toEqual({ overpaidHalalas: 0 });
    expect(writes.map((w) => w.op)).toEqual(["instalment.updateMany", "audit"]);
    expect(writes[0]!.args).toEqual({ where: { establishmentId: "est_1", id: "i2" }, data: { paidHalalas: 500 } });
    expect((writes[1]!.args.data as Record<string, unknown>)).toMatchObject({
      action: "PLAN_ALLOCATE",
      entityId: "plan_1",
      before: [{ instalmentId: "i2", paidHalalas: 0 }],
      after: [{ instalmentId: "i2", paidHalalas: 500 }],
    });
  });

  it("writes nothing and audits nothing when nothing changed", async () => {
    const { tx, writes } = fakeTx(ROWS, [pay("p1", "i1", 1000)]);
    await reallocatePlan(tx, "est_1", "plan_1", "u1");
    expect(writes).toEqual([]);
  });

  it("un-pays: with no payments every row goes back to zero", async () => {
    const { tx, writes } = fakeTx(ROWS, []);
    await reallocatePlan(tx, "est_1", "plan_1", "u1");
    expect(writes[0]!.args).toMatchObject({ where: { id: "i1" }, data: { paidHalalas: 0 } });
  });

  it("returns the residue it could not place", async () => {
    const { tx } = fakeTx(ROWS, [pay("p1", "i1", 3200)]);
    expect(await reallocatePlan(tx, "est_1", "plan_1", "u1")).toEqual({ overpaidHalalas: 200 });
  });
});

describe("bumpRevision", () => {
  it("increments only the revision it saw, in the caller's establishment", async () => {
    const { tx, writes } = fakeTx([], []);
    await bumpRevision(tx, "est_1", "plan_1", 4);
    expect(writes[0]!.args).toEqual({
      where: { establishmentId: "est_1", id: "plan_1", revision: 4 },
      data: { revision: { increment: 1 } },
    });
  });

  it("throws the sentinel class when the plan moved on", async () => {
    const { tx } = fakeTx([], [], 0);
    await expect(bumpRevision(tx, "est_1", "plan_1", 4)).rejects.toBeInstanceOf(ConcurrentChangeError);
  });
});
