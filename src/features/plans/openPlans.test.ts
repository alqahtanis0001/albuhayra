import { readdirSync, readFileSync } from "node:fs";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { todayISO } from "@/lib/dates";

/**
 * v1.4 — the open agreement's mutations (C2, C3, C6; D8; D21 P1, P7, P10,
 * P16): guards, the inherited writes, the lock once any entry references the
 * plan, the state machine, the revision lock, and the scheduled actions'
 * refusal of an open plan. `scoping.test.ts` proves scope;
 * `openMoneyPath.test.ts` proves the SQL.
 */

const h = vi.hoisted(() => ({
  guards: [] as string[],
  writes: [] as Array<{ op: string; args?: Record<string, unknown> }>,
  plan: null as Record<string, unknown> | null,
  party: { active: true } as { active: boolean } | null,
  category: { type: "IN", active: true } as { type: string; active: boolean } | null,
  referenced: 0,
  received: 0,
  bumpCount: 1,
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
    instalment: { findMany: async () => [], createMany: w("instalment.createMany"), updateMany: w("instalment.updateMany"), deleteMany: w("instalment.deleteMany") },
    transaction: {
      count: async () => h.referenced,
      groupBy: async () => [],
      aggregate: async () => ({ _sum: { amountHalalas: h.received } }),
    },
    party: { findFirst: async () => h.party },
    category: { findFirst: async () => h.category },
    $transaction: async (fn: (tx: unknown) => unknown) => fn(db),
  };
  return { db };
});

const { createOpenPlan, updateOpenPlan, closeOpenPlan, reopenOpenPlan } = await import("./openActions");
const { updatePlan, cancelPlan, archivePlan } = await import("./actions");

const today = todayISO();
const shift = (days: number) => new Date(Date.parse(`${today}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
const d = (iso: string) => new Date(`${iso}T00:00:00Z`);

const OPEN = {
  id: "plan_1", kind: "OPEN_ENDED", state: "OPEN", revision: 7, partyId: "party_1", direction: "IN", categoryId: "cat_1",
  title: "عقد مفتوح", totalHalalas: 100000, startDate: d(shift(-10)), expectedEndDate: null, notes: null,
};

function openForm(extra: Record<string, string> = {}): FormData {
  const form = new FormData();
  for (const [k, v] of Object.entries({
    partyId: "party_1", direction: "IN", title: "عقد مفتوح", categoryId: "cat_1", startDate: shift(-10),
    totalHalalas: "100000", expectedEndDate: "", notes: "", ...extra,
  })) form.append(k, v);
  return form;
}

function fixedForm(): FormData {
  const form = new FormData();
  for (const [k, v] of Object.entries({
    partyId: "party_1", direction: "IN", title: "عقد", totalHalalas: "1000", categoryId: "cat_1", startDate: "2026-09-01",
    reminderDays: "3", instalments: JSON.stringify([{ dueDate: "2026-10-01", amountDueHalalas: 1000 }]),
  })) form.append(k, v);
  return form;
}

const ops = () => h.writes.map((x) => x.op);
const write = (op: string) => h.writes.find((x) => x.op === op)?.args as Record<string, unknown> | undefined;

beforeEach(() => {
  h.guards = [];
  h.writes = [];
  h.plan = { ...OPEN };
  h.party = { active: true };
  h.category = { type: "IN", active: true };
  h.referenced = 0;
  h.received = 0;
  h.bumpCount = 1;
});

describe("createOpenPlan", () => {
  it("is owner-only and writes kind OPEN_ENDED, employeeId null, the form's start, a null end, the total", async () => {
    expect(await createOpenPlan(null, openForm())).toEqual({ ok: true, data: { id: "plan_new" } });
    expect(h.guards).toEqual(["requireOwner"]);
    const data = write("plan.create")!.data as Record<string, unknown>;
    expect(data).toMatchObject({
      establishmentId: "est_1", kind: "OPEN_ENDED", employeeId: null, partyId: "party_1", direction: "IN",
      categoryId: "cat_1", totalHalalas: 100000, expectedEndDate: null, notes: null, startDate: d(shift(-10)),
    });
    expect(Object.keys(data)).not.toContain("reminderDays");
    expect(write("audit:PLAN_CREATE")!.after).toMatchObject({ kind: "OPEN_ENDED", startDate: shift(-10), totalHalalas: 100000 });
  });

  it("P16: a posted kind / employeeId changes nothing", async () => {
    expect((await createOpenPlan(null, openForm({ kind: "SALARY", employeeId: "emp_1" }))).ok).toBe(true);
    expect(write("plan.create")!.data).toMatchObject({ kind: "OPEN_ENDED", employeeId: null });
  });

  it("no total → null; an expected end is stored as a date", async () => {
    expect((await createOpenPlan(null, openForm({ totalHalalas: "", expectedEndDate: shift(20) }))).ok).toBe(true);
    expect(write("plan.create")!.data).toMatchObject({ totalHalalas: null, expectedEndDate: d(shift(20)) });
  });

  it("D8: an expected end before the start, or a future start, is refused before any write", async () => {
    expect(await createOpenPlan(null, openForm({ expectedEndDate: shift(-11) }))).toMatchObject({
      ok: false, fieldErrors: { expectedEndDate: "err.expectedEndBeforeStart" },
    });
    expect(await createOpenPlan(null, openForm({ startDate: shift(1) }))).toMatchObject({ ok: false, fieldErrors: { startDate: "err.dateFuture" } });
    expect(h.writes).toEqual([]);
  });

  it("party and category rules: missing / inactive party, missing / inactive category, direction mismatch", async () => {
    h.party = null;
    expect(await createOpenPlan(null, openForm())).toMatchObject({ fieldErrors: { partyId: "err.partyInvalid" } });
    h.party = { active: false };
    expect(await createOpenPlan(null, openForm())).toMatchObject({ fieldErrors: { partyId: "err.partyInvalid" } });
    h.party = { active: true };
    h.category = null;
    expect(await createOpenPlan(null, openForm())).toMatchObject({ fieldErrors: { categoryId: "err.categoryInvalid" } });
    h.category = { type: "IN", active: false };
    expect(await createOpenPlan(null, openForm())).toMatchObject({ fieldErrors: { categoryId: "err.categoryInvalid" } });
    h.category = { type: "OUT", active: true };
    expect(await createOpenPlan(null, openForm())).toMatchObject({ fieldErrors: { categoryId: "err.categoryDirectionMismatch" } });
    expect(h.writes).toEqual([]);
  });
});

describe("updateOpenPlan", () => {
  it("bumps first, then writes the columns and the PLAN_UPDATE audit", async () => {
    expect(await updateOpenPlan("plan_1", null, openForm({ title: "عقد معدّل", totalHalalas: "200000", notes: "ملاحظة" }))).toEqual({ ok: true, data: null });
    expect(ops()).toEqual(["bump", "plan.updateMany", "audit:PLAN_UPDATE"]);
    expect(write("bump")!.where).toEqual({ establishmentId: "est_1", id: "plan_1", revision: 7 });
    expect(write("plan.updateMany")).toMatchObject({
      where: { establishmentId: "est_1", id: "plan_1" },
      data: { title: "عقد معدّل", totalHalalas: 200000, notes: "ملاحظة" },
    });
    const audit = write("audit:PLAN_UPDATE")!;
    expect(audit.before).toMatchObject({ title: "عقد مفتوح", totalHalalas: 100000, startDate: shift(-10) });
    expect(audit.after).toMatchObject({ title: "عقد معدّل", totalHalalas: 200000 });
  });

  it("refuses a scheduled plan, a closed plan, and a missing one", async () => {
    h.plan = { ...OPEN, kind: "STANDARD" };
    expect(await updateOpenPlan("plan_1", null, openForm())).toEqual({ ok: false, error: "err.planNotOpenEnded" });
    h.plan = { ...OPEN, state: "ARCHIVED" };
    expect(await updateOpenPlan("plan_1", null, openForm())).toEqual({ ok: false, error: "err.planClosed" });
    h.plan = null;
    expect(await updateOpenPlan("plan_1", null, openForm())).toEqual({ ok: false, error: "err.notFound" });
    expect(h.writes).toEqual([]);
  });

  it("P10: with no payment yet, party, direction, category and start may all change", async () => {
    h.category = { type: "OUT", active: true };
    expect(await updateOpenPlan("plan_1", null, openForm({ partyId: "party_2", direction: "OUT", categoryId: "cat_2", startDate: shift(-3) }))).toEqual({ ok: true, data: null });
    expect(write("plan.updateMany")!.data).toMatchObject({ partyId: "party_2", direction: "OUT", categoryId: "cat_2", startDate: d(shift(-3)) });
  });

  it("C6 / D8 / P7: once any entry references the plan, party, direction and start are locked; the category too (D9)", async () => {
    h.referenced = 1;
    expect(await updateOpenPlan("plan_1", null, openForm({ partyId: "party_2" }))).toMatchObject({ fieldErrors: { partyId: "err.planPartyLocked" } });
    h.category = { type: "OUT", active: true };
    expect(await updateOpenPlan("plan_1", null, openForm({ direction: "OUT" }))).toMatchObject({ fieldErrors: { direction: "err.planPartyLocked" } });
    h.category = { type: "IN", active: true };
    expect(await updateOpenPlan("plan_1", null, openForm({ startDate: shift(-9) }))).toMatchObject({ fieldErrors: { startDate: "err.planPartyLocked" } });
    expect(await updateOpenPlan("plan_1", null, openForm({ categoryId: "cat_2" }))).toMatchObject({ fieldErrors: { categoryId: "err.paymentLinkFixed" } });
    expect(h.writes).toEqual([]);
    // Unchanged links still save (title, total, end, notes).
    expect(await updateOpenPlan("plan_1", null, openForm({ title: "آخر" }))).toEqual({ ok: true, data: null });
  });

  it("a total below what was received is refused; equal or above is fine; no total is fine", async () => {
    h.received = 50000;
    expect(await updateOpenPlan("plan_1", null, openForm({ totalHalalas: "49999" }))).toMatchObject({ fieldErrors: { totalHalalas: "err.totalBelowPaid" } });
    expect(h.writes).toEqual([]);
    expect(await updateOpenPlan("plan_1", null, openForm({ totalHalalas: "50000" }))).toEqual({ ok: true, data: null });
    expect(await updateOpenPlan("plan_1", null, openForm({ totalHalalas: "" }))).toEqual({ ok: true, data: null });
  });

  it("D8 on edit: expected end before start", async () => {
    expect(await updateOpenPlan("plan_1", null, openForm({ expectedEndDate: shift(-11) }))).toMatchObject({
      fieldErrors: { expectedEndDate: "err.expectedEndBeforeStart" },
    });
  });

  it("W14: a lost revision race writes nothing after the bump and answers err.concurrentChange", async () => {
    h.bumpCount = 0;
    expect(await updateOpenPlan("plan_1", null, openForm())).toEqual({ ok: false, error: "err.concurrentChange" });
    expect(ops()).toEqual(["bump"]);
  });
});

describe("closeOpenPlan / reopenOpenPlan", () => {
  it("close: OPEN → ARCHIVED with closedAt, bump first, PLAN_ARCHIVE", async () => {
    expect(await closeOpenPlan("plan_1")).toEqual({ ok: true, data: null });
    expect(ops()).toEqual(["bump", "plan.updateMany", "audit:PLAN_ARCHIVE"]);
    const data = write("plan.updateMany")!.data as Record<string, unknown>;
    expect(data.state).toBe("ARCHIVED");
    expect(data.closedAt).toBeInstanceOf(Date);
    expect(write("audit:PLAN_ARCHIVE")).toMatchObject({ before: { state: "OPEN" }, after: { state: "ARCHIVED" } });
  });

  it("close refuses an already closed plan and a scheduled one", async () => {
    h.plan = { ...OPEN, state: "ARCHIVED" };
    expect(await closeOpenPlan("plan_1")).toEqual({ ok: false, error: "err.planClosed" });
    h.plan = { ...OPEN, kind: "SALARY" };
    expect(await closeOpenPlan("plan_1")).toEqual({ ok: false, error: "err.planNotOpenEnded" });
    expect(h.writes).toEqual([]);
  });

  it("reopen: ARCHIVED → OPEN with closedAt null, bump first, PLAN_REOPEN", async () => {
    h.plan = { ...OPEN, state: "ARCHIVED" };
    expect(await reopenOpenPlan("plan_1")).toEqual({ ok: true, data: null });
    expect(ops()).toEqual(["bump", "plan.updateMany", "audit:PLAN_REOPEN"]);
    expect(write("plan.updateMany")!.data).toEqual({ state: "OPEN", closedAt: null });
    expect(write("audit:PLAN_REOPEN")).toMatchObject({ before: { state: "ARCHIVED" }, after: { state: "OPEN" } });
  });

  it("reopen refuses a scheduled plan (err.planReopenNotAllowed) and one that is not archived", async () => {
    h.plan = { ...OPEN, kind: "STANDARD", state: "ARCHIVED" };
    expect(await reopenOpenPlan("plan_1")).toEqual({ ok: false, error: "err.planReopenNotAllowed" });
    h.plan = { ...OPEN, state: "OPEN" };
    expect(await reopenOpenPlan("plan_1")).toEqual({ ok: false, error: "err.invalidInput" });
    h.plan = null;
    expect(await reopenOpenPlan("plan_1")).toEqual({ ok: false, error: "err.notFound" });
    expect(h.writes).toEqual([]);
  });

  it("every open action is behind requireOwner", async () => {
    await closeOpenPlan("plan_1");
    h.plan = { ...OPEN, state: "ARCHIVED" };
    await reopenOpenPlan("plan_1");
    expect(h.guards).toEqual(["requireOwner", "requireOwner"]);
  });
});

describe("P1: the scheduled actions refuse an open plan", () => {
  it("updatePlan, cancelPlan and archivePlan answer err.planKindFixed and write nothing", async () => {
    expect(await updatePlan("plan_1", null, fixedForm())).toEqual({ ok: false, error: "err.planKindFixed" });
    expect(await cancelPlan("plan_1")).toEqual({ ok: false, error: "err.planKindFixed" });
    expect(await archivePlan("plan_1")).toEqual({ ok: false, error: "err.planKindFixed" });
    expect(h.writes).toEqual([]);
  });
});

/** P16 (static): the only `data:` in src that writes `kind: "OPEN_ENDED"` is createOpenPlan's. */
describe("P16: nothing but openActions.ts writes the OPEN_ENDED kind", () => {
  function dataWritesOf(source: string): string[] {
    const found: string[] = [];
    for (const match of source.matchAll(/\bdata\s*:/g)) {
      let i = match.index! + match[0].length;
      let depth = 0;
      const start = i;
      for (; i < source.length; i++) {
        const c = source[i]!;
        if ("([{".includes(c)) depth++;
        else if (")]}".includes(c)) {
          if (depth === 0) break;
          depth--;
        } else if (c === "," && depth === 0) break;
      }
      found.push(source.slice(start, i));
    }
    return found;
  }
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const path = `${dir}/${e.name}`;
      if (e.isDirectory()) return ["src/generated", "src/lib/testing"].includes(path) ? [] : walk(path);
      return /\.tsx?$/.test(e.name) && !e.name.endsWith(".test.ts") ? [path] : [];
    });

  it("finds exactly one writer", () => {
    const writers = walk("src").filter((file) =>
      dataWritesOf(readFileSync(file, "utf8")).some((d) => /\bkind\s*:\s*"OPEN_ENDED"/.test(d)),
    );
    expect(writers).toEqual(["src/features/plans/openActions.ts"]);
  });
});
