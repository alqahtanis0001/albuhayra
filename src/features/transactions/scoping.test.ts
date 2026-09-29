import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

import { todayISO } from "@/lib/dates";

/**
 * The establishment-scoping net.
 *
 * Why it exists: an unscoped `groupBy` / `count` / `aggregate` leaks another
 * establishment's **totals** without leaking a single row. It passes a row-level
 * review and every RTL check, and leaves an owner reading a number that is wrong
 * in a way they cannot detect. `CLAUDE.md` ranks "correct numbers" among the four
 * priorities, so that is the worst failure available in this feature.
 *
 * Every Prisma call the read and write paths make is captured through a mocked
 * client and checked for `establishmentId` — at the **top level** of `where`, not
 * merely somewhere inside it, since a scope buried in a relation filter does not
 * constrain the aggregate.
 *
 * What this does NOT prove: a mocked client only sees the calls the tests drive.
 * Each function below therefore runs twice, with empty and with fully-populated
 * filters, so both sides of every conditional execute; and `describe("static
 * sweep")` at the end compares the `(model, method)` pairs in the source against
 * the pairs observed at runtime, so a call site no test reaches fails the suite
 * instead of passing silently. A second site with the *same* pair on an
 * unexercised branch would still escape — closing that needs a coverage
 * threshold, which is a `vitest.config.mts` change and not this task's.
 */

const EST = "est_under_test";
const OTHER_EST = "est_belonging_to_someone_else";
const USER = "user_under_test";
/**
 * The self-write rule needs a foreign *user* to fail against, for the same reason
 * the tenant rule needs `OTHER_EST`: a rule asserted only against the id it
 * accepts can be widened to accept everything without failing anything.
 */
const OTHER_USER = "user_belonging_to_someone_else";

type Call = { model: string; method: string; args: Record<string, unknown> };

const harness = vi.hoisted(() => {
  const calls: Array<{ model: string; method: string; args: Record<string, unknown> }> = [];
  const responses = new Map<string, unknown>();

  const MODELS = [
    "transaction",
    "category",
    "user",
    "establishment",
    "periodLock",
    "auditLog",
  ];

  function defaultResult(method: string): unknown {
    switch (method) {
      case "findMany":
      case "groupBy":
        return [];
      case "count":
        return 0;
      case "aggregate":
        return { _sum: { amountHalalas: null } };
      case "updateMany":
      case "deleteMany":
        return { count: 1 };
      case "create":
      case "update":
        return { id: "generated_id" };
      default:
        return null;
    }
  }

  function makeClient(): Record<string, unknown> {
    const client: Record<string, unknown> = {};

    for (const model of MODELS) {
      client[model] = new Proxy(
        {},
        {
          get(_target, property) {
            const method = String(property);
            return async (args: Record<string, unknown> = {}) => {
              calls.push({ model, method, args });
              const key = `${model}.${method}`;
              if (!responses.has(key)) return defaultResult(method);
              const canned = responses.get(key);
              // A function lets a response depend on the arguments — which is
              // what makes skip/take, and therefore paging, testable.
              return typeof canned === "function"
                ? (canned as (a: Record<string, unknown>) => unknown)(args)
                : canned;
            };
          },
        },
      );
    }

    // A $transaction body must be recorded too, or a write moved inside one
    // would slip out of the net.
    client.$transaction = async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(makeClient());

    // Raw SQL has no `where` object to inspect, so it is banned outright here
    // rather than silently invisible.
    const banRaw = (name: string) => () => {
      throw new Error(`${name} is not allowed in scoped query files`);
    };
    client.$queryRaw = banRaw("$queryRaw");
    client.$queryRawUnsafe = banRaw("$queryRawUnsafe");
    client.$executeRaw = banRaw("$executeRaw");
    client.$executeRawUnsafe = banRaw("$executeRawUnsafe");

    return client;
  }

  return { calls, responses, db: makeClient() };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: harness.db }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/lib/auth", () => {
  const context = {
    user: {
      id: USER,
      name: "تجربة",
      email: "t@example.com",
      role: "OWNER" as const,
      status: "ACTIVE" as const,
      canEdit: true,
      establishmentId: EST,
      establishmentName: "منشأة",
    },
    establishmentId: EST,
  };
  return {
    hashPassword: async () => "$2a$12$stub",
    verifyPassword: async () => true,
    requireUser: async () => context,
    requireMember: async () => context,
    requireOwner: async () => context,
    requireStaff: async () => context,
    requireCanEdit: async () => context,
  };
});

const { listTransactions, getTransaction } = await import("./queries");
const { createTransaction, updateTransaction, deleteTransaction } = await import(
  "./actions"
);
const { getOwnerDashboard, getStaffDashboard } = await import(
  "@/features/dashboard/queries"
);
const { getReport } = await import("@/features/reports/queries");
const { lockMonth, unlockMonth } = await import("@/features/locks/actions");
const { listLocks } = await import("@/features/locks/queries");
const {
  setCategoryOrder,
  createCategory,
  updateCategory,
  setCategoryActive,
  changeOwnPassword,
} = await import("@/features/settings/actions");
const { listStaff, getJoinCode } = await import(
  "@/features/establishments/queries"
);
const { listCategories } = await import("@/features/settings/queries");
const {
  approveStaff,
  rejectStaff,
  setCanEdit,
  setStaffActive,
  resetStaffPassword,
  regenerateJoinCode,
} = await import("@/features/establishments/actions");

/* ------------------------------------------------------------ the scope rule */

/** Writes that take a *unique* where cannot carry establishmentId — see actions.ts. */
const UNIQUE_WRITE_METHODS = new Set(["update", "delete", "upsert"]);

const WHERE_METHODS = new Set([
  "findFirst",
  "findMany",
  "findUnique",
  "count",
  "groupBy",
  "aggregate",
  "updateMany",
  "deleteMany",
]);

/**
 * One rule per model, so a model nobody thought about cannot pass by accident:
 * `Establishment` is scoped by its own `id`, and a `create` carries the scope in
 * `data` because it has no `where`.
 */
function scopeFailure(call: Call): string | null {
  const { model, method, args } = call;

  if (UNIQUE_WRITE_METHODS.has(method)) {
    return `${model}.${method} takes a unique where, so it cannot carry establishmentId — use updateMany`;
  }

  if (method === "create" || method === "createMany") {
    const data = args.data as Record<string, unknown> | undefined;
    if (!data) return `${model}.${method} has no data`;
    return data.establishmentId === EST
      ? null
      : `${model}.${method} data.establishmentId is ${JSON.stringify(data.establishmentId)}`;
  }

  if (!WHERE_METHODS.has(method)) {
    return `${model}.${method} is not a method this rule set knows about`;
  }

  const where = args.where as Record<string, unknown> | undefined;
  if (!where) return `${model}.${method} has no where at all`;

  if (model === "establishment") {
    /**
     * `allocateJoinCode` probes whether a freshly generated code is already
     * taken, which is global by nature — a code must be unique across every
     * establishment, so scoping the probe to the caller's own would defeat it.
     * Narrowly allowed: lookup by the unique `joinCode`, selecting nothing but
     * `id`. It can answer "taken or not" and cannot read anyone's data.
     */
    const select = args.select as Record<string, unknown> | undefined;
    const isUniquenessProbe =
      method === "findUnique" &&
      typeof where.joinCode === "string" &&
      select !== undefined &&
      Object.keys(select).length === 1 &&
      select.id === true;
    if (isUniquenessProbe) return null;

    return where.id === EST
      ? null
      : `establishment.${method} where.id is ${JSON.stringify(where.id)}`;
  }

  /**
   * A self-service action — `changeOwnPassword` — scopes by the session's own
   * user id rather than by establishment, and must, because an ADMIN has no
   * establishment at all. `where.id === USER` is as strong a boundary as a
   * tenant scope: it names exactly one row, the caller's.
   */
  if (model === "user" && where.id === USER && where.establishmentId === undefined) {
    return null;
  }

  if (where.establishmentId !== EST) {
    return `${model}.${method} where.establishmentId is ${JSON.stringify(where.establishmentId)}`;
  }

  /**
   * Soft delete is the same class of defect as a missing tenant scope, and just
   * as undetectable: a deleted entry silently back inside a total. Without this,
   * the gate catches cross-tenant wrong numbers and misses same-tenant ones.
   * Transaction is the only soft-deleted model.
   */
  if (model === "transaction" && where.deletedAt !== null) {
    return `transaction.${method} where.deletedAt is ${JSON.stringify(where.deletedAt)}, not null`;
  }

  return null;
}

function failures(): string[] {
  return harness.calls
    .map((call) => scopeFailure(call as Call))
    .filter((f): f is string => f !== null);
}

function observedPairs(): Set<string> {
  return new Set(harness.calls.map((c) => `${c.model}.${c.method}`));
}

const allObserved = new Set<string>();

beforeEach(() => {
  harness.calls.length = 0;
  harness.responses.clear();
  // Enough for the mutations to run past their guards to the write itself.
  harness.responses.set("periodLock.findFirst", null);
  harness.responses.set("category.findFirst", { type: "OUT", active: true });
  harness.responses.set("transaction.findFirst", {
    id: "tx_existing",
    date: new Date(Date.UTC(2026, 8, 1)),
    direction: "OUT",
    amountHalalas: 5000,
    categoryId: "cat_1",
    paymentMethod: "CASH",
    counterparty: null,
    note: null,
    // getTransaction maps through these; the actions select a narrower shape and
    // simply ignore them.
    category: { nameAr: "إيجار" },
    createdBy: { name: "تجربة" },
  });
  harness.responses.set("user.findFirst", { canEdit: true });
});

function record(): void {
  for (const pair of observedPairs()) allObserved.add(pair);
}

/** Every filter populated, so each conditional in `ledgerWhere` runs. */
const FULL_FILTERS = {
  from: "2026-01-01",
  to: "2026-12-31",
  direction: "OUT" as const,
  categoryId: "cat_1",
  paymentMethod: "CASH" as const,
  q: "إيجار",
  page: 2,
};

function categoryForm(nameAr = "إيجار جديد", type = "OUT"): FormData {
  const form = new FormData();
  form.append("nameAr", nameAr);
  form.append("type", type);
  return form;
}

function ledgerForm(): FormData {
  const form = new FormData();
  form.append("date", todayISO());
  form.append("direction", "OUT");
  form.append("amountHalalas", "123450");
  form.append("categoryId", "cat_1");
  form.append("paymentMethod", "CASH");
  form.append("counterparty", "مؤجر");
  form.append("note", "ملاحظة");
  return form;
}

/* ------------------------------------------------------- the harness itself */

describe("the scope rule actually bites", () => {
  it("rejects a groupBy with no where at all", () => {
    expect(
      scopeFailure({ model: "transaction", method: "groupBy", args: { by: ["direction"] } }),
    ).toMatch(/no where at all/);
  });

  it("rejects a scope buried in a nested relation filter", () => {
    expect(
      scopeFailure({
        model: "transaction",
        method: "groupBy",
        args: { by: ["direction"], where: { category: { establishmentId: EST } } },
      }),
    ).toMatch(/where\.establishmentId is undefined/);
  });

  it("rejects another establishment's id", () => {
    expect(
      scopeFailure({
        model: "transaction",
        method: "count",
        args: { where: { establishmentId: OTHER_EST } },
      }),
    ).toMatch(/where\.establishmentId is/);
  });

  it("rejects a unique-where write, which cannot hold the scope", () => {
    expect(
      scopeFailure({ model: "transaction", method: "update", args: { where: { id: "x" } } }),
    ).toMatch(/use updateMany/);
  });

  it("rejects a create whose data omits the establishment", () => {
    expect(
      scopeFailure({ model: "transaction", method: "create", args: { data: { amountHalalas: 1 } } }),
    ).toMatch(/data\.establishmentId/);
  });

  it("rejects a transaction read that forgets the soft-delete filter", () => {
    expect(
      scopeFailure({
        model: "transaction",
        method: "groupBy",
        args: { by: ["direction"], where: { establishmentId: EST } },
      }),
    ).toMatch(/deletedAt is undefined, not null/);
  });

  it("rejects a transaction read that asks for deleted rows", () => {
    expect(
      scopeFailure({
        model: "transaction",
        method: "count",
        args: { where: { establishmentId: EST, deletedAt: { not: null } } },
      }),
    ).toMatch(/deletedAt is/);
  });

  it("accepts a correctly scoped call", () => {
    expect(
      scopeFailure({
        model: "transaction",
        method: "groupBy",
        args: { by: ["direction"], where: { establishmentId: EST, deletedAt: null } },
      }),
    ).toBeNull();
  });

  /**
   * The two encoded exceptions, pinned. Each is narrow by one clause, and without
   * these cases that clause could be dropped as a tidy-up with nothing failing —
   * which is the gap the lead's "logged Decision per exception" rule cannot see,
   * because a widening adds no exception and so triggers no Decision.
   */
  it("accepts the join-code uniqueness probe, which must be global", () => {
    expect(
      scopeFailure({
        model: "establishment",
        method: "findUnique",
        args: { where: { joinCode: "ABCD2345" }, select: { id: true } },
      }),
    ).toBeNull();
  });

  it("refuses a join-code probe that selects more than the id", () => {
    // Dropping the `Object.keys(select).length === 1` check would let this read
    // any field of any establishment. That check is the whole exception.
    expect(
      scopeFailure({
        model: "establishment",
        method: "findUnique",
        args: {
          where: { joinCode: "ABCD2345" },
          select: { id: true, name: true },
        },
      }),
    ).toMatch(/where\.id is/);
  });

  it("accepts a self-write keyed by the session's own user id", () => {
    expect(
      scopeFailure({
        model: "user",
        method: "updateMany",
        args: { where: { id: USER } },
      }),
    ).toBeNull();
  });

  it("refuses a self-write naming somebody else", () => {
    // Relaxing `where.id === USER` to a typeof check would widen this to every
    // user row in the database.
    expect(
      scopeFailure({
        model: "user",
        method: "updateMany",
        args: { where: { id: OTHER_USER } },
      }),
    ).toMatch(/where\.establishmentId is/);
  });

  it("refuses a self-write carrying a foreign establishment", () => {
    // The `establishmentId === undefined` clause is what stops the right id
    // being paired with the wrong tenant.
    expect(
      scopeFailure({
        model: "user",
        method: "updateMany",
        args: { where: { id: USER, establishmentId: OTHER_EST } },
      }),
    ).toMatch(/where\.establishmentId is/);
  });

  it("refuses raw SQL, which has no where to inspect", async () => {
    const raw = harness.db as { $queryRaw: () => unknown };
    expect(() => raw.$queryRaw()).toThrow(/not allowed/);
  });
});

/* ----------------------------------------------------------- the real calls */

describe("transactions/queries.ts scopes every call", () => {
  it("listTransactions, no filters", async () => {
    await listTransactions(EST, { page: 1 });
    expect(harness.calls.length).toBeGreaterThan(0);
    expect(failures()).toEqual([]);
    record();
  });

  it("listTransactions, every filter populated", async () => {
    await listTransactions(EST, FULL_FILTERS);
    expect(failures()).toEqual([]);
    record();
  });

  it("getTransaction", async () => {
    await getTransaction(EST, "tx_existing");
    expect(harness.calls.length).toBeGreaterThan(0);
    expect(failures()).toEqual([]);
    record();
  });

  /**
   * The gate compares the id **by value**, not merely for presence. Driving the
   * same function against a second establishment must make every call fail: a
   * `toBeDefined()` check would pass here, which is the hole this closes.
   */
  it("a wrong-but-present establishment id fails the gate", async () => {
    await listTransactions(OTHER_EST, FULL_FILTERS);

    const found = failures();
    expect(found.length).toBe(harness.calls.length);
    expect(found.every((f) => f.includes("where.establishmentId is"))).toBe(true);
    // Deliberately not recorded: these calls are the counter-example, not coverage.
  });
});

describe("dashboard/queries.ts scopes every call", () => {
  it("getOwnerDashboard", async () => {
    await getOwnerDashboard(EST);
    expect(harness.calls.length).toBeGreaterThan(0);
    expect(failures()).toEqual([]);
    record();
  });

  it("getOwnerDashboard with categories to name", async () => {
    harness.responses.set("transaction.groupBy", [
      { categoryId: "cat_1", direction: "OUT", paymentMethod: "CASH", _sum: { amountHalalas: 900 } },
    ]);
    await getOwnerDashboard(EST);
    expect(failures()).toEqual([]);
    // The name lookup only happens when a group came back.
    expect(observedPairs()).toContain("category.findMany");
    record();
  });

  it("getStaffDashboard", async () => {
    await getStaffDashboard(EST, USER);
    expect(harness.calls.length).toBeGreaterThan(0);
    expect(failures()).toEqual([]);
    record();
  });
});

describe("reports/queries.ts scopes every call", () => {
  it("getReport with no rows", async () => {
    await getReport(EST, "2026-01-01", "2026-03-31");
    expect(harness.calls.length).toBeGreaterThan(0);
    expect(failures()).toEqual([]);
    record();
  });

  it("getReport with rows to name", async () => {
    harness.responses.set("transaction.groupBy", [
      { categoryId: "cat_1", direction: "IN", _sum: { amountHalalas: 400 } },
      { categoryId: "cat_2", direction: "OUT", _sum: { amountHalalas: 100 } },
    ]);
    await getReport(EST, "2026-01-01", "2026-03-31");
    expect(failures()).toEqual([]);
    expect(observedPairs()).toContain("category.findMany");
    record();
  });
});

describe("transactions/actions.ts scopes every write", () => {
  it("createTransaction", async () => {
    const result = await createTransaction(null, ledgerForm());
    expect(result).toEqual({ ok: true, data: null });
    expect(observedPairs()).toContain("transaction.create");
    expect(failures()).toEqual([]);
    record();
  });

  it("updateTransaction", async () => {
    const result = await updateTransaction("tx_existing", null, ledgerForm());
    expect(result).toEqual({ ok: true, data: null });
    expect(observedPairs()).toContain("transaction.updateMany");
    expect(failures()).toEqual([]);
    record();
  });

  it("deleteTransaction", async () => {
    const result = await deleteTransaction("tx_existing");
    expect(result).toEqual({ ok: true, data: null });
    expect(observedPairs()).toContain("transaction.updateMany");
    expect(failures()).toEqual([]);
    record();
  });

  it("writes the audit row against the same establishment", async () => {
    await createTransaction(null, ledgerForm());
    expect(observedPairs()).toContain("auditLog.create");
    expect(failures()).toEqual([]);
    record();
  });
});

describe("locks scope every call", () => {
  it("listLocks", async () => {
    await listLocks(EST);
    expect(harness.calls.length).toBeGreaterThan(0);
    expect(failures()).toEqual([]);
    record();
  });

  it("lockMonth creates against the caller's establishment", async () => {
    // A month long past, so the closed-month guard lets it through.
    const result = await lockMonth(2020, 1);
    expect(result).toEqual({ ok: true, data: null });
    expect(observedPairs()).toContain("periodLock.create");
    expect(failures()).toEqual([]);
    record();
  });

  it("unlockMonth deletes only within the caller's establishment", async () => {
    harness.responses.set("periodLock.findFirst", { id: "lock_1" });
    const result = await unlockMonth(2020, 1);
    expect(result).toEqual({ ok: true, data: null });
    expect(observedPairs()).toContain("periodLock.deleteMany");
    expect(failures()).toEqual([]);
    record();
  });
});

describe("B11: the migrated staff and settings writes scope in SQL", () => {
  beforeEach(() => {
    harness.responses.set("user.findFirst", {
      id: "staff_1",
      name: "موظف",
      status: "PENDING",
      canEdit: false,
    });
    harness.responses.set("user.findUnique", { passwordHash: "$2a$12$stub" });
  });

  it("approveStaff", async () => {
    expect(await approveStaff("staff_1")).toEqual({ ok: true, data: null });
    expect(observedPairs()).toContain("user.updateMany");
    expect(failures()).toEqual([]);
    record();
  });

  it("rejectStaff", async () => {
    expect(await rejectStaff("staff_1")).toEqual({ ok: true, data: null });
    expect(failures()).toEqual([]);
    record();
  });

  it("setCanEdit", async () => {
    harness.responses.set("user.findFirst", {
      id: "staff_1",
      name: "موظف",
      status: "ACTIVE",
      canEdit: false,
    });
    expect(await setCanEdit("staff_1", true)).toEqual({ ok: true, data: null });
    expect(failures()).toEqual([]);
    record();
  });

  it("setStaffActive", async () => {
    harness.responses.set("user.findFirst", {
      id: "staff_1",
      name: "موظف",
      status: "ACTIVE",
      canEdit: true,
    });
    expect(await setStaffActive("staff_1", false)).toEqual({ ok: true, data: null });
    expect(failures()).toEqual([]);
    record();
  });

  it("resetStaffPassword", async () => {
    const form = new FormData();
    form.append("newPassword", "averylongpassword");
    expect(await resetStaffPassword("staff_1", null, form)).toEqual({
      ok: true,
      data: null,
    });
    expect(failures()).toEqual([]);
    record();
  });

  it("regenerateJoinCode", async () => {
    harness.responses.set("establishment.findUnique", null);
    const result = await regenerateJoinCode();
    expect(result.ok).toBe(true);
    expect(observedPairs()).toContain("establishment.updateMany");
    expect(failures()).toEqual([]);
    record();
  });

  it("changeOwnPassword scopes by the caller's own id", async () => {
    const form = new FormData();
    form.append("currentPassword", "oldpassword");
    form.append("newPassword", "averylongpassword");
    form.append("confirmPassword", "averylongpassword");

    // verifyPassword is not mocked here, so the compare fails and the action
    // stops at err.passwordWrong — the lookup still happened, which is the call
    // the sweep needs to observe.
    await changeOwnPassword(null, form);
    expect(observedPairs()).toContain("user.findUnique");
    expect(failures()).toEqual([]);
    record();
  });

  it("createCategory", async () => {
    harness.responses.set("category.findFirst", null);
    expect(await createCategory(null, categoryForm())).toEqual({
      ok: true,
      data: null,
    });
    expect(observedPairs()).toContain("category.create");
    expect(failures()).toEqual([]);
    record();
  });

  it("updateCategory", async () => {
    harness.responses.set("category.findFirst", {
      id: "cat_1",
      nameAr: "إيجار",
      type: "OUT",
      active: true,
    });
    const form = new FormData();
    form.append("nameAr", "إيجار المستودع");
    form.append("type", "OUT");
    // The duplicate check reuses category.findFirst, which returns a row here,
    // so this lands on err.categoryDuplicate — the scoped calls still happen.
    await updateCategory("cat_1", null, form);
    expect(failures()).toEqual([]);
    record();
  });

  it("setCategoryActive", async () => {
    harness.responses.set("category.findFirst", {
      id: "cat_1",
      nameAr: "إيجار",
      type: "OUT",
      active: true,
    });
    harness.responses.set("category.count", 2);
    expect(await setCategoryActive("cat_1", false)).toEqual({
      ok: true,
      data: null,
    });
    expect(observedPairs()).toContain("category.count");
    expect(observedPairs()).toContain("category.updateMany");
    expect(failures()).toEqual([]);
    record();
  });
});

/**
 * The migration is only behaviour-preserving if "not mine" still answers
 * `err.notFound`. Before rule 2b the scoped `findFirst` produced that; now the
 * write itself does, and a 0-row result must not read as success.
 */
describe("B11: a 0-row write is err.notFound, never a silent success", () => {
  beforeEach(() => {
    harness.responses.set("user.findFirst", {
      id: "staff_1",
      name: "موظف",
      status: "PENDING",
      canEdit: false,
    });
    harness.responses.set("user.updateMany", { count: 0 });
    harness.responses.set("category.updateMany", { count: 0 });
    harness.responses.set("establishment.updateMany", { count: 0 });
  });

  it("approveStaff", async () => {
    expect(await approveStaff("staff_1")).toEqual({
      ok: false,
      error: "err.notFound",
    });
  });

  it("setCanEdit", async () => {
    harness.responses.set("user.findFirst", {
      id: "staff_1",
      name: "موظف",
      status: "ACTIVE",
      canEdit: false,
    });
    expect(await setCanEdit("staff_1", true)).toEqual({
      ok: false,
      error: "err.notFound",
    });
  });

  it("resetStaffPassword", async () => {
    const form = new FormData();
    form.append("newPassword", "averylongpassword");
    expect(await resetStaffPassword("staff_1", null, form)).toEqual({
      ok: false,
      error: "err.notFound",
    });
  });

  it("regenerateJoinCode", async () => {
    harness.responses.set("establishment.findUnique", null);
    expect(await regenerateJoinCode()).toEqual({
      ok: false,
      error: "err.notFound",
    });
  });

  it("setCategoryActive", async () => {
    harness.responses.set("category.findFirst", {
      id: "cat_1",
      nameAr: "إيجار",
      type: "OUT",
      active: true,
    });
    harness.responses.set("category.count", 2);
    expect(await setCategoryActive("cat_1", false)).toEqual({
      ok: false,
      error: "err.notFound",
    });
  });
});

describe("the staff and settings reads scope every call", () => {
  it("listStaff", async () => {
    await listStaff(EST);
    expect(observedPairs()).toContain("user.findMany");
    expect(failures()).toEqual([]);
    record();
  });

  it("getJoinCode", async () => {
    await getJoinCode(EST);
    expect(harness.calls.length).toBeGreaterThan(0);
    expect(failures()).toEqual([]);
    record();
  });

  it("listCategories", async () => {
    await listCategories(EST);
    expect(observedPairs()).toContain("category.findMany");
    expect(failures()).toEqual([]);
    record();
  });
});

describe("setCategoryOrder scopes its swap", () => {
  it("both sides of the swap carry establishmentId", async () => {
    harness.responses.set("category.findFirst", {
      id: "cat_1",
      type: "OUT",
      active: true,
      sortOrder: 2,
      nameAr: "إيجار",
    });
    const result = await setCategoryOrder("cat_1", "UP");
    expect(result).toEqual({ ok: true, data: null });
    expect(observedPairs()).toContain("category.updateMany");
    expect(failures()).toEqual([]);
    record();
  });
});

describe("a retired category may be kept but not newly assigned", () => {
  const RETIRED = { id: "cat_retired", type: "OUT", active: false, sortOrder: 1 };

  it("createTransaction refuses an inactive category", async () => {
    harness.responses.set("category.findFirst", RETIRED);
    const result = await createTransaction(null, ledgerForm());

    expect(result).toEqual({
      ok: false,
      error: "err.categoryInvalid",
      fieldErrors: { categoryId: "err.categoryInvalid" },
    });
    expect(observedPairs()).not.toContain("transaction.create");
  });

  it("updateTransaction keeps the entry's own inactive category", async () => {
    // The existing row already carries cat_retired, so editing a note must work
    // without forcing the owner to re-categorise a two-year-old entry.
    harness.responses.set("category.findFirst", RETIRED);
    harness.responses.set("transaction.findFirst", {
      id: "tx_existing",
      date: new Date(Date.UTC(2026, 8, 1)),
      direction: "OUT",
      amountHalalas: 5000,
      categoryId: "cat_retired",
      paymentMethod: "CASH",
    });

    const form = ledgerForm();
    form.set("categoryId", "cat_retired");
    const result = await updateTransaction("tx_existing", null, form);

    expect(result).toEqual({ ok: true, data: null });
    expect(failures()).toEqual([]);
  });

  it("updateTransaction still refuses moving to a different inactive category", async () => {
    harness.responses.set("category.findFirst", RETIRED);
    harness.responses.set("transaction.findFirst", {
      id: "tx_existing",
      date: new Date(Date.UTC(2026, 8, 1)),
      direction: "OUT",
      amountHalalas: 5000,
      categoryId: "cat_something_else",
      paymentMethod: "CASH",
    });

    const form = ledgerForm();
    form.set("categoryId", "cat_retired");
    const result = await updateTransaction("tx_existing", null, form);

    expect(result).toMatchObject({ ok: false, error: "err.categoryInvalid" });
    expect(observedPairs()).not.toContain("transaction.updateMany");
  });
});

/**
 * `filterTotals` covers the whole filtered set, not the visible page.
 *
 * Asked for by `frontend` as F5's first acceptance criterion, and the regression
 * it guards is specific: someone "optimises" the query by summing the rows it has
 * already fetched. That is invisible on page 1 — where the rows *are* the whole
 * set in a small fixture — and wrong from page 2 on. So this fixture is larger
 * than PAGE_SIZE and the assertion compares the two pages to each other and to
 * the full sum, rather than checking page 1 in isolation.
 */
describe("filterTotals span the filter, not the page", () => {
  const ROWS = Array.from({ length: 60 }, (_, i) => ({
    id: `tx_${i}`,
    date: new Date(Date.UTC(2026, 8, 1 + (i % 28))),
    direction: i % 3 === 0 ? ("IN" as const) : ("OUT" as const),
    amountHalalas: 1000 + i,
    categoryId: "cat_1",
    paymentMethod: "CASH" as const,
    counterparty: null,
    note: null,
    category: { nameAr: "إيجار" },
    createdBy: { name: "موظف" },
  }));

  const expectedIn = ROWS.filter((r) => r.direction === "IN").reduce(
    (sum, r) => sum + r.amountHalalas,
    0,
  );
  const expectedOut = ROWS.filter((r) => r.direction === "OUT").reduce(
    (sum, r) => sum + r.amountHalalas,
    0,
  );

  beforeEach(() => {
    harness.responses.set(
      "transaction.findMany",
      (args: Record<string, unknown>) => {
        const skip = (args.skip as number | undefined) ?? 0;
        const take = (args.take as number | undefined) ?? ROWS.length;
        return ROWS.slice(skip, skip + take);
      },
    );
    harness.responses.set("transaction.count", ROWS.length);
    // groupBy carries no skip/take, so the database would answer the same for
    // every page — which is the property under test.
    harness.responses.set("transaction.groupBy", [
      { direction: "IN", _sum: { amountHalalas: expectedIn } },
      { direction: "OUT", _sum: { amountHalalas: expectedOut } },
    ]);
  });

  it("pages the rows but not the totals", async () => {
    const first = await listTransactions(EST, { page: 1 });
    const second = await listTransactions(EST, { page: 2 });

    expect(first.rows).toHaveLength(50);
    expect(second.rows).toHaveLength(10);
    expect(first.total).toBe(60);
    expect(second.total).toBe(60);

    expect(first.filterTotals).toEqual(second.filterTotals);
    expect(first.filterTotals).toEqual({
      inHalalas: expectedIn,
      outHalalas: expectedOut,
      netHalalas: expectedIn - expectedOut,
    });
  });

  it("the totals are not the visible rows' sum", async () => {
    const second = await listTransactions(EST, { page: 2 });

    const visible = second.rows.reduce((sum, r) => sum + r.amountHalalas, 0);
    // If the implementation ever derives totals from `rows`, page 2 would report
    // this instead — so the two must differ for the test to mean anything.
    expect(visible).toBeLessThan(expectedIn + expectedOut);
    expect(second.filterTotals.inHalalas + second.filterTotals.outHalalas).toBe(
      expectedIn + expectedOut,
    );
  });

  it("asks the database for the totals without skip or take", async () => {
    await listTransactions(EST, { page: 2 });

    const grouped = harness.calls.filter(
      (c) => c.model === "transaction" && c.method === "groupBy",
    );
    expect(grouped).toHaveLength(1);
    expect(grouped[0]!.args.skip).toBeUndefined();
    expect(grouped[0]!.args.take).toBeUndefined();
    expect(failures()).toEqual([]);
    record();
  });
});

/* --------------------------------------------------------- the static sweep */

describe("static sweep: no call site escapes the runtime net", () => {
  /**
   * `src/features/admin/**` is the one deliberate absence. ADMIN has
   * `establishmentId: null` and the whole point of that area is the
   * cross-establishment view, so the unscoped aggregate this gate rejects is
   * correct there. `src/features/admin/admin.test.ts` holds the rule that
   * applies instead — Security rule 10, no amounts and no transaction rows.
   */
  const FILES = [
    "src/features/transactions/queries.ts",
    "src/features/transactions/actions.ts",
    "src/features/dashboard/queries.ts",
    "src/features/reports/queries.ts",
    "src/features/locks/assertUnlocked.ts",
    "src/features/locks/actions.ts",
    "src/features/locks/queries.ts",
    "src/features/establishments/actions.ts",
    "src/features/establishments/queries.ts",
    "src/features/settings/actions.ts",
    "src/features/settings/queries.ts",
    // The export writes every matching row to a file the owner keeps and
    // forwards, so a soft-deleted entry reappearing there is the worst version
    // of the wrong-number class. It reuses listTransactions/getReport rather
    // than querying Prisma, so it contributes no pairs — being listed is what
    // fails the suite if that ever changes.
    "src/app/api/export/route.ts",
  ];

  it("every (model, method) pair in the source was exercised above", () => {
    /**
     * This block reads what the driver blocks above recorded, so it must run
     * after them. Vitest keeps declaration order within a file unless
     * `sequence.shuffle` is enabled — verified: under `--sequence.shuffle` this
     * block can run first and then reports every pair as unexercised, which
     * looks like a scoping regression and is not one. The floor below turns that
     * into a message naming the actual cause.
     *
     * Not fixed by making the sweep self-driving, because that would duplicate
     * every driver's response fixture; recorded for the lead instead, since
     * `vitest.config.mts` is not mine and this project does not shuffle.
     */
    expect(
      allObserved.size,
      "the static sweep ran before the driver blocks — it reads what they record, so it must run last (sequence.shuffle breaks this, it is not a scoping failure)",
    ).toBeGreaterThan(10);

    const inSource = new Set<string>();
    for (const file of FILES) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/\b(?:db|tx|client)\.(\w+)\.(\w+)\(/g)) {
        inSource.add(`${match[1]}.${match[2]}`);
      }
    }

    expect(inSource.size).toBeGreaterThan(0);
    const unexercised = [...inSource].filter((pair) => !allObserved.has(pair));
    expect(unexercised).toEqual([]);
  });

  it("no raw SQL in any of those files", () => {
    for (const file of FILES) {
      const source = readFileSync(file, "utf8");
      // Anchored on the client receiver, so a comment that merely names
      // $queryRaw — explaining why it is avoided — does not trip this.
      expect(source, file).not.toMatch(/\b(?:db|tx|client)\.\$(?:query|execute)Raw/);
    }
  });

  it("no unique-where write in any of those files", () => {
    for (const file of FILES) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/\b(?:db|tx)\.\w+\.(?:update|delete|upsert)\(/);
    }
  });
});
