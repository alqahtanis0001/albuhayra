import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

/**
 * Security rule 10: **ADMIN endpoints never return `amountHalalas` or a
 * transaction row.**
 *
 * The admin area is the one place in the app deliberately *not* scoped by
 * establishment — that is the whole point of a platform overview — so the B3
 * scoping gate does not watch these files. This is what stands in its place, and
 * it guards a different property: counts and timestamps may cross the boundary,
 * money may not.
 *
 * `lastActivityAt` is the field to watch. It is derived *from* transactions
 * without being one, so the natural implementation — "find the newest entry" —
 * pulls a whole row, and its amount, into an owner's competitor's view. Hence
 * `groupBy` with `_max: { createdAt: true }`, which structurally cannot carry a
 * value back, and hence the assertions below on the arguments as well as on the
 * result.
 */

const harness = vi.hoisted(() => {
  const calls: Array<{ model: string; method: string; args: Record<string, unknown> }> = [];
  const responses = new Map<string, unknown>();

  function makeClient(): Record<string, unknown> {
    const client: Record<string, unknown> = {};
    for (const model of ["establishment", "transaction", "user", "category", "auditLog"]) {
      client[model] = new Proxy(
        {},
        {
          get(_t, property) {
            const method = String(property);
            return async (args: Record<string, unknown> = {}) => {
              calls.push({ model, method, args });
              const key = `${model}.${method}`;
              if (responses.has(key)) return responses.get(key);
              if (method === "findMany" || method === "groupBy") return [];
              if (method === "count") return 0;
              if (method === "updateMany" || method === "createMany") {
                return { count: 1 };
              }
              return null;
            };
          },
        },
      );
    }
    client.$transaction = async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(makeClient());
    return client;
  }

  return { calls, responses, db: makeClient() };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: harness.db }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/lib/auth", () => ({
  requireAdmin: async () => ({
    user: {
      id: "admin_1",
      name: "مدير",
      email: "a@example.com",
      role: "ADMIN" as const,
      status: "ACTIVE" as const,
      canEdit: false,
      establishmentId: null,
      establishmentName: null,
    },
  }),
  hashPassword: async () => "$2a$12$stub",
}));

const { getAdminOverview } = await import("./queries");
const { approveOwner, rejectOwner, setEstablishmentActive } = await import(
  "./actions"
);

const OWNER = {
  id: "owner_1",
  name: "مالك",
  email: "owner@example.com",
  status: "PENDING" as const,
  createdAt: new Date(Date.UTC(2026, 8, 20, 9, 0)),
};

function seedOverview(): void {
  harness.responses.set("establishment.findMany", [
    {
      id: "est_1",
      name: "منشأة",
      active: true,
      createdAt: new Date(Date.UTC(2026, 8, 20)),
      users: [OWNER],
    },
  ]);
  harness.responses.set("transaction.groupBy", [
    {
      establishmentId: "est_1",
      _count: { _all: 42 },
      _max: { createdAt: new Date(Date.UTC(2026, 8, 25, 10, 0)) },
    },
  ]);
  harness.responses.set("user.groupBy", [
    { establishmentId: "est_1", _count: { _all: 3 } },
  ]);
}

/** Every string that appears anywhere in a nested structure, keys included. */
function deepKeys(value: unknown, found: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const item of value) deepKeys(item, found);
  } else if (value !== null && typeof value === "object") {
    for (const [key, inner] of Object.entries(value)) {
      found.push(key);
      deepKeys(inner, found);
    }
  }
  return found;
}

beforeEach(() => {
  harness.calls.length = 0;
  harness.responses.clear();
});

describe("getAdminOverview returns no money", () => {
  it("no request it makes mentions amountHalalas", async () => {
    seedOverview();
    await getAdminOverview();

    for (const call of harness.calls) {
      const serialised = JSON.stringify(call.args);
      expect(serialised, `${call.model}.${call.method}`).not.toContain(
        "amountHalalas",
      );
    }
  });

  it("no key in the result is an amount", async () => {
    seedOverview();
    const overview = await getAdminOverview();

    const keys = deepKeys(overview);
    expect(keys).not.toContain("amountHalalas");
    expect(keys.filter((k) => /amount|halalas|total|sum|balance/i.test(k))).toEqual(
      [],
    );
  });

  it("reads activity as an aggregate, never as a transaction row", async () => {
    seedOverview();
    await getAdminOverview();

    const onTransactions = harness.calls.filter((c) => c.model === "transaction");
    expect(onTransactions.length).toBeGreaterThan(0);
    // findFirst/findMany on transactions would return rows; groupBy cannot.
    expect(onTransactions.every((c) => c.method === "groupBy")).toBe(true);
    for (const call of onTransactions) {
      expect(call.args._sum).toBeUndefined();
      expect(call.args._avg).toBeUndefined();
      expect(call.args._max).toEqual({ createdAt: true });
    }
  });

  it("excludes soft-deleted entries from the counts it does show", async () => {
    seedOverview();
    await getAdminOverview();

    const grouped = harness.calls.find(
      (c) => c.model === "transaction" && c.method === "groupBy",
    )!;
    expect((grouped.args.where as Record<string, unknown>).deletedAt).toBeNull();
  });

  it("serialises both timestamps as strings", async () => {
    seedOverview();
    const overview = await getAdminOverview();

    expect(overview.establishments[0]!.lastActivityAt).toBe("2026-09-25");
    expect(overview.pendingOwners[0]!.requestedAt).toBe("2026-09-20");
    expect(overview.establishments[0]!.transactionCount).toBe(42);
    expect(overview.establishments[0]!.staffCount).toBe(3);
  });

  it("carries the owner's user id, which the reset-password control binds to", async () => {
    seedOverview();
    const overview = await getAdminOverview();

    expect(overview.establishments[0]!.ownerUserId).toBe("owner_1");
    // An id is not an amount: rule 10 is untouched by this field.
    expect(deepKeys(overview)).not.toContain("amountHalalas");
  });

  it("leaves ownerUserId null when an establishment has no owner row", async () => {
    harness.responses.set("establishment.findMany", [
      {
        id: "est_1",
        name: "منشأة",
        active: true,
        createdAt: new Date(Date.UTC(2026, 8, 20)),
        users: [],
      },
    ]);

    const overview = await getAdminOverview();
    // Null rather than "" — the screen drops the control instead of binding an
    // id the action would reject.
    expect(overview.establishments[0]!.ownerUserId).toBeNull();
  });

  it("reports a pending owner's establishment as PENDING", async () => {
    seedOverview();
    const overview = await getAdminOverview();
    expect(overview.establishments[0]!.status).toBe("PENDING");
    expect(overview.pendingOwners).toHaveLength(1);
  });

  it("reports an active establishment whose owner is disabled as DISABLED", async () => {
    harness.responses.set("establishment.findMany", [
      {
        id: "est_1",
        name: "منشأة",
        active: true,
        createdAt: new Date(Date.UTC(2026, 8, 20)),
        users: [{ ...OWNER, status: "DISABLED" }],
      },
    ]);
    const overview = await getAdminOverview();
    expect(overview.establishments[0]!.status).toBe("DISABLED");
    expect(overview.pendingOwners).toEqual([]);
  });
});

describe("approveOwner", () => {
  beforeEach(() => {
    harness.responses.set("user.findFirst", {
      id: "owner_1",
      status: "PENDING",
      establishmentId: "est_1",
    });
    harness.responses.set("category.count", 0);
  });

  it("creates the 13 default categories, 4 IN and 9 OUT", async () => {
    const result = await approveOwner("owner_1");
    expect(result).toEqual({ ok: true, data: null });

    const created = harness.calls.find(
      (c) => c.model === "category" && c.method === "createMany",
    );
    const rows = created!.args.data as Array<{ type: string; nameAr: string }>;
    expect(rows).toHaveLength(13);
    expect(rows.filter((r) => r.type === "IN")).toHaveLength(4);
    expect(rows.filter((r) => r.type === "OUT")).toHaveLength(9);
    expect(rows.every((r) => r.nameAr.trim().length > 0)).toBe(true);
  });

  it("does not create them twice", async () => {
    harness.responses.set("category.count", 13);
    await approveOwner("owner_1");

    expect(
      harness.calls.some((c) => c.model === "category" && c.method === "createMany"),
    ).toBe(false);
  });

  it("switches the establishment back on", async () => {
    await approveOwner("owner_1");
    const updated = harness.calls.find(
      (c) => c.model === "establishment" && c.method === "updateMany",
    );
    expect(updated!.args.data).toEqual({ active: true });
  });

  it("refuses an owner who is not pending", async () => {
    harness.responses.set("user.findFirst", {
      id: "owner_1",
      status: "ACTIVE",
      establishmentId: "est_1",
    });
    expect(await approveOwner("owner_1")).toEqual({
      ok: false,
      error: "err.forbidden",
    });
  });

  it("refuses an id that is not an owner", async () => {
    harness.responses.set("user.findFirst", null);
    expect(await approveOwner("staff_1")).toEqual({
      ok: false,
      error: "err.notFound",
    });
  });

  it("only ever targets a row whose role is OWNER", async () => {
    await approveOwner("owner_1");
    const lookup = harness.calls.find(
      (c) => c.model === "user" && c.method === "findFirst",
    );
    expect((lookup!.args.where as Record<string, unknown>).role).toBe("OWNER");
  });
});

describe("rejectOwner disables both the owner and the establishment", () => {
  it("writes both, in one transaction", async () => {
    harness.responses.set("user.findFirst", {
      id: "owner_1",
      status: "PENDING",
      establishmentId: "est_1",
    });

    expect(await rejectOwner("owner_1")).toEqual({ ok: true, data: null });
    expect(
      (harness.calls.find((c) => c.model === "user" && c.method === "updateMany")!
        .args.data as Record<string, unknown>).status,
    ).toBe("DISABLED");
    expect(
      (harness.calls.find(
        (c) => c.model === "establishment" && c.method === "updateMany",
      )!.args.data as Record<string, unknown>).active,
    ).toBe(false);
  });
});

describe("setEstablishmentActive", () => {
  it("refuses an establishment that does not exist", async () => {
    harness.responses.set("establishment.findUnique", null);
    expect(await setEstablishmentActive("nope", false)).toEqual({
      ok: false,
      error: "err.notFound",
    });
  });

  it("audits the direction it moved", async () => {
    harness.responses.set("establishment.findUnique", {
      id: "est_1",
      active: true,
    });
    await setEstablishmentActive("est_1", false);

    const audit = harness.calls.find(
      (c) => c.model === "auditLog" && c.method === "create",
    );
    expect((audit!.args.data as Record<string, unknown>).action).toBe(
      "DISABLE_ESTABLISHMENT",
    );
  });
});

describe("static: rule 10 in the source", () => {
  const FILES = [
    "src/features/admin/queries.ts",
    "src/features/admin/actions.ts",
  ];

  /**
   * Comments are stripped first so the rule can be *explained* in these files
   * without the explanation failing the check — a prose mention of the forbidden
   * field is documentation, a code reference is the defect. (Naive on strings
   * containing `//`, of which there are none here.)
   */
  function code(file: string): string {
    return readFileSync(file, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
  }

  it("neither file references amountHalalas in code", () => {
    for (const file of FILES) {
      expect(code(file), file).not.toContain("amountHalalas");
    }
  });

  it("no _sum or _avg anywhere in the admin feature", () => {
    for (const file of FILES) {
      expect(code(file), file).not.toMatch(/_sum|_avg/);
    }
  });

  it("the stripper does not simply blank the file", () => {
    // Without this, a bug in `code()` would make both checks above vacuous.
    for (const file of FILES) {
      expect(code(file), file).toContain("establishment");
    }
  });
});
