import { beforeEach, describe, expect, it, vi } from "vitest";

import { todayISO } from "@/lib/dates";

/**
 * v1.2a transaction links (docs/BACKEND.md → v1.2a → Transactions): what the
 * actions decide about a party / إضافة / instalment and what they store.
 * Scoping and foreign ids are `scoping.test.ts`; this is the rules.
 */

const h = vi.hoisted(() => ({
  party: null as { active: boolean } | null,
  project: null as { status: string } | null,
  existing: null as Record<string, unknown> | null,
  lookups: [] as string[],
  writes: [] as Array<{ op: string; data: Record<string, unknown> }>,
  audits: [] as Array<Record<string, unknown>>,
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/features/locks/assertUnlocked", () => ({ assertUnlocked: async () => null }));
vi.mock("@/lib/audit", () => ({
  writeAudit: async (a: Record<string, unknown>) => void h.audits.push(a),
}));
vi.mock("@/lib/auth", () => {
  const context = async () => ({ user: { id: "user_1" }, establishmentId: "est_1" });
  return { requireMember: context, requireCanEdit: context, requireOwner: context };
});
vi.mock("@/lib/db", () => {
  const db = {
    category: { findFirst: async () => ({ type: "OUT", active: true }) },
    party: { findFirst: async () => (h.lookups.push("party"), h.party) },
    project: { findFirst: async () => (h.lookups.push("project"), h.project) },
    transaction: {
      findFirst: async () => h.existing,
      create: async (a: { data: Record<string, unknown> }) => (
        h.writes.push({ op: "create", data: a.data }), { id: "tx_new" }
      ),
      updateMany: async (a: { data: Record<string, unknown> }) => (
        h.writes.push({ op: "updateMany", data: a.data }), { count: 1 }
      ),
    },
    $transaction: async (fn: (tx: unknown) => unknown) => fn(db),
  };
  return { db };
});

const { createTransaction, updateTransaction } = await import("./actions");

const EXISTING = {
  id: "tx_1",
  date: new Date(Date.UTC(2026, 8, 1)),
  direction: "OUT",
  amountHalalas: 5000,
  categoryId: "cat_1",
  paymentMethod: "CASH",
  partyId: "party_old",
  projectId: "proj_old",
  instalmentId: null,
};

function form(fields: Record<string, string> = {}): FormData {
  const f = new FormData();
  const all = {
    date: todayISO(), direction: "OUT", amountHalalas: "1000", categoryId: "cat_1",
    paymentMethod: "CASH", counterparty: "نص حر", ...fields,
  };
  for (const [k, v] of Object.entries(all)) f.append(k, v);
  return f;
}

const refused = (field: string, key: string) => ({ ok: false, error: key, fieldErrors: { [field]: key } });

beforeEach(() => {
  Object.assign(h, {
    party: { active: true }, project: { status: "ACTIVE" }, existing: EXISTING,
    lookups: [], writes: [], audits: [],
  });
});

describe("party", () => {
  it("an inactive party cannot be newly assigned", async () => {
    h.party = { active: false };
    expect(await createTransaction(null, form({ partyId: "party_x" }))).toEqual(refused("partyId", "err.partyInvalid"));
    expect(await updateTransaction("tx_1", null, form({ partyId: "party_x" }))).toEqual(refused("partyId", "err.partyInvalid"));
    expect(h.writes).toEqual([]);
  });

  it("but the entry's own inactive party is kept on edit", async () => {
    h.party = { active: false };
    expect(await updateTransaction("tx_1", null, form({ partyId: "party_old" }))).toEqual({ ok: true, data: null });
  });

  it("with a party the free text is not stored; without one it is", async () => {
    await createTransaction(null, form({ partyId: "party_x" }));
    await createTransaction(null, form());
    expect(h.writes[0]!.data).toMatchObject({ partyId: "party_x", counterparty: null });
    expect(h.writes[1]!.data).toMatchObject({ partyId: null, counterparty: "نص حر" });
  });

  it('"" from the select means no party, and nothing is looked up', async () => {
    expect(await createTransaction(null, form({ partyId: "", projectId: "" }))).toEqual({ ok: true, data: null });
    expect(h.lookups).toEqual([]);
    expect(h.writes[0]!.data).toMatchObject({ partyId: null, projectId: null });
  });
});

describe("إضافة (project)", () => {
  it.each(["COMPLETED", "CANCELLED"])("a %s project refuses a new link", async (status) => {
    h.project = { status };
    expect(await createTransaction(null, form({ projectId: "proj_x" }))).toEqual(refused("projectId", "err.projectClosed"));
    expect(await updateTransaction("tx_1", null, form({ projectId: "proj_x" }))).toEqual(refused("projectId", "err.projectClosed"));
    expect(h.writes).toEqual([]);
  });

  it("but keeps the entry's existing link on edit", async () => {
    h.project = { status: "COMPLETED" };
    expect(await updateTransaction("tx_1", null, form({ projectId: "proj_old" }))).toEqual({ ok: true, data: null });
    expect(h.writes[0]!.data).toMatchObject({ projectId: "proj_old" });
  });

  it("an unknown project is err.projectInvalid", async () => {
    h.project = null;
    expect(await createTransaction(null, form({ projectId: "proj_x" }))).toEqual(refused("projectId", "err.projectInvalid"));
  });

  it("clearing the project on edit writes null", async () => {
    await updateTransaction("tx_1", null, form({ projectId: "" }));
    expect(h.writes[0]!.data).toMatchObject({ projectId: null });
  });
});

describe("instalment (checkpoint 1)", () => {
  it("any instalmentId is refused, on create and on edit", async () => {
    const key = refused("instalmentId", "err.instalmentInvalid");
    expect(await createTransaction(null, form({ instalmentId: "inst_1" }))).toEqual(key);
    expect(await updateTransaction("tx_1", null, form({ instalmentId: "inst_1" }))).toEqual(key);
    expect(h.writes).toEqual([]);
  });

  it("an edit never writes the instalment link — absent means keep (V12)", async () => {
    await updateTransaction("tx_1", null, form());
    expect(h.writes[0]!.data).not.toHaveProperty("instalmentId");
  });
});

describe("audit snapshots carry the links", () => {
  it("create", async () => {
    await createTransaction(null, form({ partyId: "party_x", projectId: "proj_x" }));
    expect(h.audits[0]!.after).toMatchObject({ partyId: "party_x", projectId: "proj_x", instalmentId: null });
  });

  it("update, before and after", async () => {
    await updateTransaction("tx_1", null, form({ partyId: "party_x", projectId: "" }));
    expect(h.audits[0]!.before).toMatchObject({ partyId: "party_old", projectId: "proj_old", instalmentId: null });
    expect(h.audits[0]!.after).toMatchObject({ partyId: "party_x", projectId: null, instalmentId: null });
  });
});
