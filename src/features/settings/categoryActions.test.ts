import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * v1.4 §A at the action: the four category actions are OWNER-only (the quick
 * actions hide their buttons from staff, but a server action in a client bundle
 * is callable by id — the guard is the control), `createCategory` hands back
 * the row on both of its paths (D12), a change reaches the entry-form pages
 * (A3/A4 revalidation), and the last active category of a direction is refused.
 * `scoping.test.ts` proves the calls are scoped; this file pins the behaviour.
 */

const h = vi.hoisted(() => ({
  guards: [] as string[],
  revalidated: [] as Array<[string, string | undefined]>,
  findFirst: [] as unknown[],
  count: 2,
  writes: [] as string[],
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: (path: string, type?: string) => {
    h.revalidated.push([path, type]);
  },
}));
vi.mock("@/lib/audit", () => ({ writeAudit: async () => undefined }));
vi.mock("@/lib/auth", () => {
  const guard = (name: string) => async () => {
    h.guards.push(name);
    return { user: { id: "owner_1", role: "OWNER" }, establishmentId: "est_1" };
  };
  return {
    hashPassword: async () => "$2a$12$stub",
    verifyPassword: async () => true,
    requireUser: guard("requireUser"),
    requireMember: guard("requireMember"),
    requireOwner: guard("requireOwner"),
    requireStaff: guard("requireStaff"),
    requireCanEdit: guard("requireCanEdit"),
  };
});
vi.mock("@/lib/db", () => {
  const category = {
    // Answers in order: nameTaken, then the retired lookup / the target.
    findFirst: async () => h.findFirst.shift() ?? null,
    count: async () => h.count,
    create: async () => {
      h.writes.push("create");
      return { id: "cat_new" };
    },
    updateMany: async () => {
      h.writes.push("updateMany");
      return { count: 1 };
    },
  };
  return { db: { category, $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({ category }) } };
});

const { createCategory, updateCategory, setCategoryActive, setCategoryOrder } = await import("./actions");

const form = (nameAr: string, type = "OUT") => {
  const f = new FormData();
  f.append("nameAr", nameAr);
  f.append("type", type);
  return f;
};

const CURRENT = { id: "cat_1", nameAr: "إيجار", type: "OUT", active: true };

beforeEach(() => {
  h.guards.length = 0;
  h.revalidated.length = 0;
  h.findFirst.length = 0;
  h.writes.length = 0;
  h.count = 2;
});

describe("every category action starts with requireOwner()", () => {
  it("createCategory", async () => {
    await createCategory(null, form("صيانة"));
    expect(h.guards[0]).toBe("requireOwner");
  });
  it("updateCategory", async () => {
    h.findFirst.push(CURRENT);
    await updateCategory("cat_1", null, form("إيجار المستودع"));
    expect(h.guards[0]).toBe("requireOwner");
  });
  it("setCategoryActive", async () => {
    h.findFirst.push(CURRENT);
    await setCategoryActive("cat_1", false);
    expect(h.guards[0]).toBe("requireOwner");
  });
  it("setCategoryOrder", async () => {
    await setCategoryOrder("cat_1", "UP");
    expect(h.guards[0]).toBe("requireOwner");
  });
});

describe("D12 — createCategory returns the row on both paths", () => {
  it("insert: the new id with the posted name and type", async () => {
    expect(await createCategory(null, form("صيانة", "IN"))).toEqual({
      ok: true,
      data: { id: "cat_new", nameAr: "صيانة", type: "IN" },
    });
    expect(h.writes).toEqual(["create"]);
  });

  it("revive: the retired row's id, reactivated instead of inserted", async () => {
    h.findFirst.push(null, { id: "cat_old" });
    expect(await createCategory(null, form("صيانة"))).toEqual({
      ok: true,
      data: { id: "cat_old", nameAr: "صيانة", type: "OUT" },
    });
    expect(h.writes).toEqual(["updateMany"]);
  });

  it("a name an active category already uses is refused", async () => {
    h.findFirst.push({ id: "cat_other" });
    expect(await createCategory(null, form("صيانة"))).toEqual({ ok: false, error: "err.categoryDuplicate" });
    expect(h.writes).toEqual([]);
  });
});

describe("A3/A4 — a category change reaches the entry-form pages", () => {
  const ledgerLayouts = () =>
    h.revalidated.filter(([, type]) => type === "layout").map(([path]) => path).sort();

  it("createCategory revalidates settings and both ledger segments", async () => {
    await createCategory(null, form("صيانة"));
    expect(ledgerLayouts()).toEqual(["/owner/settings", "/owner/transactions", "/staff/transactions"]);
  });

  it("so does setCategoryActive (hide and show)", async () => {
    h.findFirst.push(CURRENT);
    await setCategoryActive("cat_1", false);
    expect(ledgerLayouts()).toEqual(["/owner/settings", "/owner/transactions", "/staff/transactions"]);
  });
});

describe("the last active category of a direction stays", () => {
  it("hiding it is refused with err.lastActiveCategory and writes nothing", async () => {
    h.findFirst.push(CURRENT);
    h.count = 0;
    expect(await setCategoryActive("cat_1", false)).toEqual({ ok: false, error: "err.lastActiveCategory" });
    expect(h.writes).toEqual([]);
  });

  it("with another active one it goes through", async () => {
    h.findFirst.push(CURRENT);
    expect(await setCategoryActive("cat_1", false)).toEqual({ ok: true, data: null });
    expect(h.writes).toEqual(["updateMany"]);
  });

  it("c5: showing a name an active category has reused is refused with err.categoryDuplicate", async () => {
    h.findFirst.push({ ...CURRENT, active: false }, { id: "cat_clash" });
    expect(await setCategoryActive("cat_1", true)).toEqual({ ok: false, error: "err.categoryDuplicate" });
  });
});
