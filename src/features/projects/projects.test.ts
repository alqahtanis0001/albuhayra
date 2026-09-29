import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * إضافة mutations: the guard each one calls, deletion refused with history,
 * and "clearing an optional field writes null". `scoping.test.ts` proves the
 * calls are scoped; this proves what they decide.
 */

const h = vi.hoisted(() => ({
  guards: [] as string[],
  refuse: null as string | null,
  writes: [] as Array<{ op: string; data?: Record<string, unknown> }>,
  existing: null as Record<string, unknown> | null,
  transactionCount: 0,
  countWhere: null as Record<string, unknown> | null,
  deleteError: null as unknown,
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/lib/audit", () => ({
  writeAudit: async (a: { action: string }) => void h.writes.push({ op: `audit:${a.action}` }),
}));
vi.mock("@/lib/auth", () => {
  const guard = (name: string) => async () => {
    h.guards.push(name);
    if (h.refuse === name) throw new Error("NEXT_REDIRECT");
    return { user: { id: "owner_1" }, establishmentId: "est_1" };
  };
  return {
    requireUser: guard("requireUser"),
    requireMember: guard("requireMember"),
    requireOwner: guard("requireOwner"),
    requireCanEdit: guard("requireCanEdit"),
  };
});
vi.mock("@/lib/db", () => {
  const db = {
    project: {
      findFirst: async () => h.existing,
      create: async (a: { data: Record<string, unknown> }) => (
        h.writes.push({ op: "project.create", data: a.data }), { id: "proj_new" }
      ),
      updateMany: async (a: { data: Record<string, unknown> }) => (
        h.writes.push({ op: "project.updateMany", data: a.data }), { count: 1 }
      ),
      deleteMany: async () => {
        if (h.deleteError) throw h.deleteError;
        h.writes.push({ op: "project.deleteMany" });
        return { count: 1 };
      },
    },
    transaction: {
      count: async (a: { where: Record<string, unknown> }) => ((h.countWhere = a.where), h.transactionCount),
    },
    $transaction: async (fn: (tx: unknown) => unknown) => fn(db),
  };
  return { db };
});

const { createProject, updateProject, setProjectStatus, deleteProject } = await import("./actions");

const PROJECT = {
  id: "proj_1", name: "فرع", description: "وصف", budgetHalalas: 5000,
  startDate: new Date(Date.UTC(2026, 0, 1)), endDate: new Date(Date.UTC(2026, 5, 1)), status: "ACTIVE",
};

function form(fields: Record<string, string> = {}): FormData {
  const f = new FormData();
  const all = { name: "فرع جديد", description: "", budgetHalalas: "", startDate: "2026-01-01", endDate: "", ...fields };
  for (const [k, v] of Object.entries(all)) f.append(k, v);
  return f;
}

beforeEach(() => {
  Object.assign(h, { guards: [], refuse: null, writes: [], existing: PROJECT, transactionCount: 0, countWhere: null, deleteError: null });
});

describe("every project mutation is OWNER-only", () => {
  const calls: Array<[string, () => Promise<unknown>]> = [
    ["createProject", () => createProject(null, form())],
    ["updateProject", () => updateProject("proj_1", null, form())],
    ["setProjectStatus", () => setProjectStatus("proj_1", "COMPLETED")],
    ["deleteProject", () => deleteProject("proj_1")],
  ];

  it.each(calls)("%s calls requireOwner and nothing weaker", async (_name, call) => {
    await call();
    expect(h.guards).toEqual(["requireOwner"]);
  });

  it.each(calls)("%s writes nothing when requireOwner refuses", async (_name, call) => {
    h.refuse = "requireOwner";
    await expect(call()).rejects.toThrow("NEXT_REDIRECT");
    expect(h.writes).toEqual([]);
  });
});

describe("fields", () => {
  it("clearing the optional fields writes null (V12)", async () => {
    expect(await updateProject("proj_1", null, form())).toEqual({ ok: true, data: null });
    expect(h.writes[0]).toMatchObject({
      op: "project.updateMany",
      data: { description: null, budgetHalalas: null, endDate: null },
    });
  });

  it("stores the dates as UTC calendar days and the budget in halalas", async () => {
    await createProject(null, form({ budgetHalalas: "150000", endDate: "2026-03-31" }));
    expect(h.writes[0]!.data).toMatchObject({
      budgetHalalas: 150000,
      startDate: new Date(Date.UTC(2026, 0, 1)),
      endDate: new Date(Date.UTC(2026, 2, 31)),
    });
  });

  it("any status may move to any other, reopening included", async () => {
    h.existing = { ...PROJECT, status: "CANCELLED" };
    expect(await setProjectStatus("proj_1", "ACTIVE")).toEqual({ ok: true, data: null });
  });

  it("refuses a status outside the enum", async () => {
    expect(await setProjectStatus("proj_1", "ARCHIVED" as never)).toMatchObject({ ok: false });
    expect(h.writes).toEqual([]);
  });
});

describe("deleteProject refuses a project with history", () => {
  it("any transaction, deleted ones included — the probe carries no deletedAt", async () => {
    h.transactionCount = 1;
    expect(await deleteProject("proj_1")).toEqual({ ok: false, error: "err.projectHasHistory" });
    expect(h.countWhere).toEqual({ establishmentId: "est_1", projectId: "proj_1" });
    expect(h.writes).toEqual([]);
  });

  it("the Restrict foreign key under a race (P2003) gives the same answer", async () => {
    h.deleteError = Object.assign(new Error("fk"), { code: "P2003" });
    expect(await deleteProject("proj_1")).toEqual({ ok: false, error: "err.projectHasHistory" });
  });

  it("an unknown or foreign id is err.notFound", async () => {
    h.existing = null;
    expect(await deleteProject("proj_x")).toEqual({ ok: false, error: "err.notFound" });
  });
});
