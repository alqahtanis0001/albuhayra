import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * الجهات mutations: the guard each one calls, and the rules the scoping gate
 * cannot see (it answers every lookup the same way). `scoping.test.ts` proves
 * the calls are scoped; this proves what they decide.
 */

const h = vi.hoisted(() => ({
  guards: [] as string[],
  refuse: null as string | null,
  writes: [] as string[],
  /** Answers for party.findFirst: the by-id row, and the namesake probe. */
  existing: null as Record<string, unknown> | null,
  namesake: null as Record<string, unknown> | null,
  namesakeWheres: [] as Array<Record<string, unknown>>,
  transactionCount: 0,
  planCount: 0,
  deleteError: null as unknown,
  /** v1.2b D14: the employee holding the party, if any. */
  employee: null as Record<string, unknown> | null,
  employeeWheres: [] as Array<Record<string, unknown>>,
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/lib/audit", () => ({
  writeAudit: async (a: { action: string }) => void h.writes.push(`audit:${a.action}`),
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
    party: {
      findFirst: async (args: { where: Record<string, unknown> }) => {
        if (args.where.name === undefined) return h.existing;
        h.namesakeWheres.push(args.where);
        return h.namesake;
      },
      create: async () => (h.writes.push("party.create"), { id: "party_new" }),
      updateMany: async () => (h.writes.push("party.updateMany"), { count: 1 }),
      deleteMany: async () => {
        if (h.deleteError) throw h.deleteError;
        h.writes.push("party.deleteMany");
        return { count: 1 };
      },
    },
    transaction: { count: async () => h.transactionCount },
    employee: {
      findFirst: async (args: { where: Record<string, unknown> }) => (h.employeeWheres.push(args.where), h.employee),
    },
    plan: { count: async () => h.planCount },
    $transaction: async (fn: (tx: unknown) => unknown) => fn(db),
  };
  return { db };
});

const { createParty, updateParty, setPartyActive, deleteParty } = await import("./actions");

const PARTY = { id: "party_1", name: "مورد", type: "SUPPLIER", phone: null, email: null, notes: null, active: true };

function form(name = "مورد"): FormData {
  const f = new FormData();
  f.append("name", name);
  f.append("type", "SUPPLIER");
  return f;
}

beforeEach(() => {
  Object.assign(h, {
    guards: [], refuse: null, writes: [], existing: PARTY, namesake: null,
    namesakeWheres: [], transactionCount: 0, planCount: 0, deleteError: null,
    employee: null, employeeWheres: [],
  });
});

describe("every party mutation is OWNER-only", () => {
  const calls: Array<[string, () => Promise<unknown>]> = [
    ["createParty", () => createParty(null, form())],
    ["updateParty", () => updateParty("party_1", null, form())],
    ["setPartyActive", () => setPartyActive("party_1", false)],
    ["deleteParty", () => deleteParty("party_1")],
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

describe("duplicate names", () => {
  it("refuses a name an active party already carries, case-insensitively", async () => {
    h.namesake = { id: "party_2" };
    expect(await createParty(null, form("MORAD Co"))).toEqual({
      ok: false,
      error: "err.partyDuplicate",
      fieldErrors: { name: "err.partyDuplicate" },
    });
    expect(h.namesakeWheres[0]).toMatchObject({
      establishmentId: "est_1",
      active: true,
      name: { equals: "MORAD Co", mode: "insensitive" },
    });
    expect(h.writes).toEqual([]);
  });

  it("an update does not clash with itself", async () => {
    expect(await updateParty("party_1", null, form())).toEqual({ ok: true, data: null });
    expect(h.namesakeWheres[0]).toMatchObject({ id: { not: "party_1" } });
  });

  it("reactivating onto an active namesake is refused", async () => {
    h.existing = { ...PARTY, active: false };
    h.namesake = { id: "party_2" };
    expect(await setPartyActive("party_1", true)).toEqual({ ok: false, error: "err.partyDuplicate" });
    expect(h.writes).toEqual([]);
  });
});

describe("deleteParty refuses a party with history", () => {
  it("any transaction, deleted ones included", async () => {
    h.transactionCount = 1;
    expect(await deleteParty("party_1")).toEqual({ ok: false, error: "err.partyHasHistory" });
    expect(h.writes).toEqual([]);
  });

  it("any plan", async () => {
    h.planCount = 1;
    expect(await deleteParty("party_1")).toEqual({ ok: false, error: "err.partyHasHistory" });
    expect(h.writes).toEqual([]);
  });

  it("the Restrict foreign key under a race (P2003) gives the same answer", async () => {
    h.deleteError = Object.assign(new Error("fk"), { code: "P2003" });
    expect(await deleteParty("party_1")).toEqual({ ok: false, error: "err.partyHasHistory" });
  });

  it("any other database error is not disguised as history", async () => {
    h.deleteError = Object.assign(new Error("boom"), { code: "P1001" });
    await expect(deleteParty("party_1")).rejects.toThrow("boom");
  });

  it("deletes and audits otherwise", async () => {
    expect(await deleteParty("party_1")).toEqual({ ok: true, data: null });
    expect(h.writes).toEqual(["party.deleteMany", "audit:PARTY_DELETE"]);
  });
});

describe("v1.2b D14: an employee's party is managed from the profile", () => {
  beforeEach(() => {
    h.existing = { ...PARTY, type: "EMPLOYEE" };
    h.employee = { id: "emp_1" };
  });

  it("refuses retyping it, looking the holder up in this establishment only", async () => {
    expect(await updateParty("party_1", null, form())).toEqual({
      ok: false, error: "err.partyIsEmployee", fieldErrors: { type: "err.partyIsEmployee" },
    });
    expect(h.employeeWheres[0]).toEqual({ establishmentId: "est_1", partyId: "party_1" });
    expect(h.writes).toEqual([]);
  });

  it("still allows editing it without a type change", async () => {
    const f = form();
    f.set("type", "EMPLOYEE");
    expect(await updateParty("party_1", null, f)).toEqual({ ok: true, data: null });
  });

  it("refuses deactivating it, but not reactivating", async () => {
    expect(await setPartyActive("party_1", false)).toEqual({ ok: false, error: "err.partyIsEmployee" });
    h.existing = { ...PARTY, type: "EMPLOYEE", active: false };
    expect(await setPartyActive("party_1", true)).toEqual({ ok: true, data: null });
  });

  it("refuses deleting it before any history check", async () => {
    expect(await deleteParty("party_1")).toEqual({ ok: false, error: "err.partyIsEmployee" });
    expect(h.writes).toEqual([]);
  });

  it("a موظف party with no employee profile behaves as before", async () => {
    h.employee = null;
    expect(await setPartyActive("party_1", false)).toEqual({ ok: true, data: null });
    expect(await deleteParty("party_1")).toEqual({ ok: true, data: null });
  });
});
