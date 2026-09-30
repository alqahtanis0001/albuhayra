import { beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";

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
    // v1.2a
    "party",
    "project",
    "plan",
    "instalment",
    // v1.2b (Y12: models join the list; the rules below are unchanged)
    "employee",
    "employeeAllowance",
    "salaryPeriod",
    "salaryDeduction",
    "attendanceRecord",
    // v1.2c (models join the list; the rules are unchanged)
    "reminderDigest",
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
            // `db.instalment.fields.x` is a Prisma field reference, not a query:
            // answered here and deliberately NOT recorded, or the sweep would
            // report a phantom `instalment.fields` pair (W14).
            if (method === "fields") {
              return new Proxy({}, { get: (_t, field) => ({ fieldRef: `${model}.${String(field)}` }) });
            }
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
/**
 * v1.2c E1: `reminders/select.ts` is the digest's one cross-establishment read
 * and is excluded from FILES by name (see the sweep below). Here it answers
 * with this establishment, so `runDigests` drives only the per-establishment
 * work of `run.ts`/`digest.ts` through the net. Mail never leaves the process.
 */
vi.mock("@/features/reminders/select", () => ({
  selectDigestTargets: async () => [
    { establishmentId: EST, ownerId: USER, ownerEmail: "o@example.com", name: "منشأة", digestHour: 7 },
  ],
}));
vi.mock("@/lib/mail/send", () => ({ sendMail: async () => true }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/lib/auth", () => {
  const context = {
    user: {
      id: USER,
      firstName: "تجربة", middleName: null, lastName: "", displayName: "تجربة",
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
const { listParties, listPartyOptions, getParty } = await import("@/features/parties/queries");
const { createParty, updateParty, setPartyActive, deleteParty } = await import(
  "@/features/parties/actions"
);
const { listProjects, listProjectOptions, getProject } = await import(
  "@/features/projects/queries"
);
const { createProject, updateProject, setProjectStatus, deleteProject } = await import(
  "@/features/projects/actions"
);
const { topActiveProjects } = await import("@/features/projects/queries");
const { listPlans, getPlan } = await import("@/features/plans/queries");
const {
  getDues,
  getOverdueCount,
  getStaffDues,
  getInstalmentForPayment,
  getStaffPaymentPrefill,
  getPaymentLink,
} = await import("@/features/plans/dues");
const { createPlan, updatePlan, cancelPlan, archivePlan } = await import("@/features/plans/actions");
const { reallocatePlan } = await import("@/features/plans/allocate");
const { getPartyStatement } = await import("@/features/parties/statement");
// v1.2b
const { createEmployee, updateEmployee } = await import("@/features/employees/actions");
const { endEmployment, reactivateEmployee } = await import("@/features/employees/lifecycle");
const {
  listEmployees,
  getEmployee,
  listLinkableStaff,
  listAdoptableParties,
  getUnpaidSalaryMonths,
  employeeIdOfParty,
} = await import("@/features/employees/queries");
const { getPayslip } = await import("@/features/employees/payslip");
const { ensureSalaryInstalments } = await import("@/features/payroll/generate");
// v1.2b CP2
const { getDaySheet, getMonthGrid, getLastRecordedDate, getAttendanceYear } = await import("@/features/attendance/queries");
const { getEmployeeMonth } = await import("@/features/attendance/month");
const { saveAttendanceDay } = await import("@/features/attendance/actions");
const { checkIn, checkOut } = await import("@/features/attendance/self");
const { getMySelf, getMyMonth, getMyPayslips, getMyPayslip, getMySalaryInstalments } = await import(
  "@/features/attendance/mine"
);
const { hasEmployeeLink } = await import("@/features/attendance/own");
const { addDeduction, deleteDeduction } = await import("@/features/payroll/deductions");
// v1.2c
const { getDigestSettings } = await import("@/features/reminders/settings");
const { updateDigestSettings } = await import("@/features/reminders/actions");
const { buildDigest } = await import("@/features/reminders/digest");
const { runDigests } = await import("@/features/reminders/run");
// v1.2c CP2
const { setPartyRemindersOptIn, sendClientReminder, prepareWhatsAppReminder } = await import("@/features/reminders/client");
const { getAgingReport } = await import("@/features/reports/aging");

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

  /**
   * `createMany` takes an array, and every element is its own row — one
   * unscoped element among scoped ones is still a foreign-tenant write, so each
   * is checked (v1.2a: instalments are created this way). `createManyAndReturn`
   * is deliberately absent: it falls to "not a method this rule set knows".
   */
  if (method === "create" || method === "createMany") {
    const data = args.data as Record<string, unknown> | Array<Record<string, unknown>> | undefined;
    const rows = Array.isArray(data) ? data : data ? [data] : [];
    if (rows.length === 0) return `${model}.${method} has no data`;
    const bad = rows.find((row) => row?.establishmentId !== EST);
    return bad === undefined
      ? null
      : `${model}.${method} data.establishmentId is ${JSON.stringify(bad?.establishmentId)}`;
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
  if (model === "transaction" && where.deletedAt !== null && !isReferenceProbe(call)) {
    return `transaction.${method} where.deletedAt is ${JSON.stringify(where.deletedAt)}, not null`;
  }

  return null;
}

/**
 * V1 — the third encoded exception (Decision in PROGRESS.md). "Does anything
 * reference this party / إضافة / instalment" must count soft-deleted entries,
 * because their foreign key still points there — so it cannot carry
 * `deletedAt: null`. Allowed only when it can answer "linked or not" and never
 * a total: a `transaction` count/findFirst/groupBy whose `where` keys are a
 * subset of the link keys (scope already checked by value above, `deletedAt`
 * absent), grouping only by link keys, selecting only ids, and reading no
 * aggregate. Each clause is pinned by its own case below.
 */
const LINK_KEYS = new Set(["establishmentId", "partyId", "projectId", "instalmentId"]);
const PROBE_SELECT_KEYS = new Set(["id", "partyId", "projectId", "instalmentId", "_all"]);

function isReferenceProbe(call: Call): boolean {
  const { method, args } = call;
  if (!["count", "findFirst", "groupBy"].includes(method)) return false;
  const where = args.where as Record<string, unknown>;
  if (!Object.keys(where).every((k) => LINK_KEYS.has(k))) return false;
  // S-K5a: it must name a link — `{ establishmentId }` alone is a count of every
  // entry, deleted ones included, which is exactly the wrong number this gate
  // exists for. Two clauses, one pin each: a link key is present, and every
  // link key names a real id (a string, or `{ in: [strings] }`), never null.
  const links = Object.keys(where).filter((k) => k !== "establishmentId");
  if (links.length === 0) return false;
  const isId = (id: unknown) => typeof id === "string" && id !== "";
  const namesIds = (v: unknown) =>
    isId(v) ||
    (typeof v === "object" &&
      v !== null &&
      Object.keys(v).length === 1 &&
      Array.isArray((v as { in?: unknown }).in) &&
      (v as { in: unknown[] }).in.length > 0 &&
      (v as { in: unknown[] }).in.every(isId));
  if (!links.every((k) => namesIds(where[k]))) return false;
  if (["_sum", "_avg", "_min", "_max", "include"].some((k) => k in args)) return false;
  if (method === "groupBy") {
    const by = (args.by as string[] | undefined) ?? [];
    if (!by.every((k) => LINK_KEYS.has(k))) return false;
  }
  const select = args.select as Record<string, unknown> | undefined;
  if (method === "findFirst" && select === undefined) return false; // a whole row carries the amount
  if (select && !Object.keys(select).every((k) => PROBE_SELECT_KEYS.has(k))) return false;
  return true;
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
    createdBy: { firstName: "تجربة", middleName: null, lastName: "", legacyName: null },
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
  partyId: "party_1",
  projectId: "proj_1",
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
        // A total — the shape the soft-delete rule exists for. The `_sum` also
        // keeps it clear of the V1 probe, so each probe bound has one pin below.
        args: { by: ["direction"], where: { establishmentId: EST }, _sum: { amountHalalas: true } },
      }),
    ).toMatch(/deletedAt is undefined, not null/);
  });

  it("rejects a transaction read that asks for deleted rows", () => {
    expect(
      scopeFailure({
        model: "transaction",
        // findMany: a list of rows, never a V1 probe (see the pins below).
        method: "findMany",
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

  it("v1.2a: checks every element of a createMany, not only the first", () => {
    expect(
      scopeFailure({
        model: "instalment",
        method: "createMany",
        args: { data: [{ establishmentId: EST }, { establishmentId: OTHER_EST }] },
      }),
    ).toMatch(/data\.establishmentId is "est_belonging/);
    expect(
      scopeFailure({
        model: "instalment",
        method: "createMany",
        args: { data: [{ establishmentId: EST }, { establishmentId: EST }] },
      }),
    ).toBeNull();
  });

  it("v1.2a: refuses createManyAndReturn, which the harness does not know", () => {
    expect(
      scopeFailure({
        model: "instalment",
        method: "createManyAndReturn",
        args: { data: [{ establishmentId: EST }] },
      }),
    ).toMatch(/not a method this rule set knows/);
  });
});

/**
 * V1's reference probe, pinned clause by clause. Each widening must fail
 * exactly one case, naming what was dropped.
 */
describe("v1.2a: the reference-probe exemption (V1) is narrow", () => {
  const probe = (method: string, args: Record<string, unknown>) =>
    scopeFailure({ model: "transaction", method, args });

  it("accepts 'is anything linked' — count, findFirst of ids, groupBy by the link", () => {
    expect(probe("count", { where: { establishmentId: EST, partyId: "p1" } })).toBeNull();
    expect(
      probe("findFirst", { where: { establishmentId: EST, projectId: "j1" }, select: { id: true } }),
    ).toBeNull();
    expect(
      probe("groupBy", { by: ["partyId"], where: { establishmentId: EST, partyId: { in: ["p1"] } } }),
    ).toBeNull();
  });

  it("S-K5a: refuses a probe that names no link — a count of every entry, deleted included", () => {
    expect(probe("count", { where: { establishmentId: EST } })).toMatch(/deletedAt is undefined/);
  });

  it("S-K5a: refuses a probe whose link is null (or any non-id filter)", () => {
    expect(probe("count", { where: { establishmentId: EST, partyId: null } })).toMatch(
      /deletedAt is undefined/,
    );
    for (const partyId of [{ not: null }, "", { in: [] }, { in: [""] }]) {
      expect(probe("count", { where: { establishmentId: EST, partyId } }), JSON.stringify(partyId)).toMatch(
        /deletedAt is undefined/,
      );
    }
  });

  it("refuses a probe that sums the amount", () => {
    expect(
      probe("groupBy", {
        by: ["partyId"],
        where: { establishmentId: EST, partyId: { in: ["p1"] } },
        _sum: { amountHalalas: true },
      }),
    ).toMatch(/deletedAt is undefined/);
  });

  // One case per aggregate, so dropping any single one from the list fails.
  it.each(["_avg", "_min", "_max"])("refuses a probe that reads %s of the amount", (aggregate) => {
    expect(
      probe("groupBy", {
        by: ["partyId"],
        where: { establishmentId: EST, partyId: { in: ["p1"] } },
        [aggregate]: { amountHalalas: true },
      }),
    ).toMatch(/deletedAt is undefined/);
  });

  it("refuses a probe that includes a relation", () => {
    expect(
      probe("findFirst", {
        where: { establishmentId: EST, partyId: "p1" },
        select: { id: true },
        include: { category: true },
      }),
    ).toMatch(/deletedAt is undefined/);
  });

  it("refuses a probe that selects the amount", () => {
    expect(
      probe("findFirst", {
        where: { establishmentId: EST, partyId: "p1" },
        select: { id: true, amountHalalas: true },
      }),
    ).toMatch(/deletedAt is undefined/);
  });

  it("refuses a findFirst probe with no select, which returns the whole row", () => {
    expect(probe("findFirst", { where: { establishmentId: EST, partyId: "p1" } })).toMatch(
      /deletedAt is undefined/,
    );
  });

  it("refuses a probe grouped by something other than a link", () => {
    expect(
      probe("groupBy", { by: ["amountHalalas"], where: { establishmentId: EST, partyId: "p1" } }),
    ).toMatch(/deletedAt is undefined/);
  });

  it("refuses a probe with an extra where key", () => {
    expect(
      probe("count", { where: { establishmentId: EST, partyId: "p1", direction: "OUT" } }),
    ).toMatch(/deletedAt is undefined/);
  });

  it("refuses a probe on a method outside count/findFirst/groupBy", () => {
    expect(probe("findMany", { where: { establishmentId: EST, partyId: "p1" }, select: { id: true } })).toMatch(
      /deletedAt is undefined/,
    );
  });

  it("refuses a probe without the scope, or with another establishment's", () => {
    expect(probe("count", { where: { partyId: "p1" } })).toMatch(/where\.establishmentId is undefined/);
    expect(probe("count", { where: { establishmentId: OTHER_EST, partyId: "p1" } })).toMatch(
      /where\.establishmentId is/,
    );
  });

  it("applies only to transaction — no other model has soft delete to skip", () => {
    expect(
      scopeFailure({ model: "party", method: "count", args: { where: { partyId: "p1" } } }),
    ).toMatch(/where\.establishmentId is undefined/);
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
      emailVerifiedAt: new Date(0),
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

  it("v1.1e: approveStaff refuses an unverified address and writes nothing", async () => {
    harness.responses.set("user.findFirst", {
      id: "staff_1",
      emailVerifiedAt: null,
      status: "PENDING",
      canEdit: false,
    });
    expect(await approveStaff("staff_1")).toEqual({ ok: false, error: "err.emailNotVerified" });
    expect(observedPairs()).not.toContain("user.updateMany");
  });

  it("rejectStaff", async () => {
    expect(await rejectStaff("staff_1")).toEqual({ ok: true, data: null });
    expect(failures()).toEqual([]);
    record();
  });

  it("setCanEdit", async () => {
    harness.responses.set("user.findFirst", {
      id: "staff_1",
      emailVerifiedAt: new Date(0),
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
      emailVerifiedAt: new Date(0),
      status: "ACTIVE",
      canEdit: true,
    });
    expect(await setStaffActive("staff_1", false)).toEqual({ ok: true, data: null });
    expect(failures()).toEqual([]);
    record();
  });

  it("resetStaffPassword", async () => {
    const form = new FormData();
    form.append("newPassword", "averylongpassword7");
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

  it("v1.1e: the owner's staff reset and change-password refuse a common password (A12 amended)", async () => {
    const reset = new FormData();
    reset.append("newPassword", "Password123");
    const change = new FormData();
    change.append("currentPassword", "oldpassword");
    change.append("newPassword", "Password123");
    change.append("confirmPassword", "Password123");
    const refused = { ok: false, error: "err.invalidInput", fieldErrors: { newPassword: "err.passwordCommon" } };

    expect(await resetStaffPassword("staff_1", null, reset)).toEqual(refused);
    expect(await changeOwnPassword(null, change)).toEqual(refused);
    expect(observedPairs()).not.toContain("user.updateMany");
  });

  it("changeOwnPassword scopes by the caller's own id", async () => {
    const form = new FormData();
    form.append("currentPassword", "oldpassword");
    form.append("newPassword", "averylongpassword7");
    form.append("confirmPassword", "averylongpassword7");

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
      emailVerifiedAt: new Date(0),
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
      emailVerifiedAt: new Date(0),
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
    form.append("newPassword", "averylongpassword7");
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
    createdBy: { firstName: "موظف", middleName: null, lastName: "", legacyName: null },
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

/* ------------------------------------------------ v1.2a: parties and إضافة */

const PARTY = {
  id: "party_1",
  name: "مورد الخرسانة",
  type: "SUPPLIER",
  phone: null,
  email: null,
  notes: null,
  active: true,
  createdAt: new Date(Date.UTC(2026, 8, 1)),
};

const PROJECT = {
  id: "proj_1",
  name: "فرع جديد",
  description: null,
  status: "ACTIVE",
  budgetHalalas: 10_000,
  startDate: new Date(Date.UTC(2026, 0, 1)),
  endDate: null,
};

/** Populated reads, so every branch past "nothing found" runs. */
function populateParties(): void {
  harness.responses.set("party.findMany", [PARTY]);
  harness.responses.set("plan.findMany", [
    { id: "plan_1", partyId: "party_1", direction: "OUT", state: "OPEN" },
    { id: "plan_2", partyId: "party_1", direction: "IN", state: "ARCHIVED" },
  ]);
  harness.responses.set("instalment.groupBy", [
    { planId: "plan_1", _sum: { amountDueHalalas: 1000, paidHalalas: 400 } },
  ]);
  harness.responses.set("transaction.groupBy", [{ partyId: "party_1" }]);
}

function populateProjects(): void {
  harness.responses.set("project.findMany", [PROJECT]);
  harness.responses.set("project.findFirst", PROJECT);
  harness.responses.set("transaction.groupBy", (args: Record<string, unknown>) =>
    (args.by as string[]).includes("direction")
      ? [
          {
            projectId: "proj_1",
            categoryId: "cat_1",
            direction: "OUT",
            _sum: { amountHalalas: 2500 },
            _count: { _all: 2 },
          },
        ]
      : [{ projectId: "proj_1" }],
  );
}

/** The row for a by-id lookup, and "no namesake" for the duplicate probe. */
function partyLookup(row: Record<string, unknown> = PARTY) {
  return (args: Record<string, unknown>) =>
    (args.where as Record<string, unknown>).name === undefined ? row : null;
}

function partyForm(): FormData {
  const form = new FormData();
  form.append("name", "مورد الخرسانة");
  form.append("type", "SUPPLIER");
  form.append("phone", "0501234567");
  form.append("email", "");
  return form;
}

function projectForm(): FormData {
  const form = new FormData();
  form.append("name", "فرع جديد");
  form.append("budgetHalalas", "1000000");
  form.append("startDate", "2026-01-01");
  form.append("endDate", "2026-12-31");
  return form;
}

describe("v1.2a: parties scope every call", () => {
  it("listParties, empty", async () => {
    await listParties(EST);
    expect(observedPairs()).toContain("party.findMany");
    expect(failures()).toEqual([]);
    record();
  });

  it("listParties, populated and filtered — balances and the reference probe run", async () => {
    populateParties();
    const [row] = await listParties(EST, { type: "SUPPLIER" });
    expect(row).toMatchObject({ owedByUsHalalas: 600, owedToUsHalalas: 0, hasHistory: true });
    expect(observedPairs()).toContain("instalment.groupBy");
    expect(observedPairs()).toContain("transaction.groupBy");
    expect(failures()).toEqual([]);
    record();
  });

  it("balance numbers: OPEN IN counts due − paid, ARCHIVED counts 0, a plan alone is history", async () => {
    harness.responses.set("party.findMany", [PARTY]);
    harness.responses.set("plan.findMany", [
      { id: "plan_in", partyId: "party_1", direction: "IN", state: "OPEN" },
      { id: "plan_old", partyId: "party_1", direction: "OUT", state: "ARCHIVED" },
    ]);
    harness.responses.set("instalment.groupBy", (args: Record<string, unknown>) => {
      const ids = ((args.where as Record<string, unknown>).planId as { in: string[] }).in;
      return [
        { planId: "plan_in", _sum: { amountDueHalalas: 1000, paidHalalas: 300 } },
        { planId: "plan_old", _sum: { amountDueHalalas: 9000, paidHalalas: 0 } },
      ].filter((g) => ids.includes(g.planId));
    });
    // No transaction references it: hasHistory must come from the plans alone.
    const [row] = await listParties(EST);
    expect(row).toMatchObject({ owedToUsHalalas: 700, owedByUsHalalas: 0, hasHistory: true });
    expect(failures()).toEqual([]);
    record();
  });

  it("listPartyOptions and getParty", async () => {
    populateParties();
    harness.responses.set("party.findFirst", PARTY);
    await listPartyOptions(EST);
    expect(await getParty(EST, "party_1")).toMatchObject({ createdAt: "2026-09-01" });
    expect(failures()).toEqual([]);
    record();
  });

  it("createParty, updateParty, setPartyActive", async () => {
    harness.responses.set("party.findFirst", partyLookup());
    expect(await createParty(null, partyForm())).toEqual({ ok: true, data: { id: "generated_id" } });
    expect(await updateParty("party_1", null, partyForm())).toEqual({ ok: true, data: null });
    expect(await setPartyActive("party_1", false)).toEqual({ ok: true, data: null });
    harness.responses.set("party.findFirst", partyLookup({ ...PARTY, active: false }));
    expect(await setPartyActive("party_1", true)).toEqual({ ok: true, data: null });
    expect(observedPairs()).toContain("party.create");
    expect(observedPairs()).toContain("party.updateMany");
    expect(failures()).toEqual([]);
    record();
  });

  it("deleteParty, without and with history", async () => {
    harness.responses.set("party.findFirst", PARTY);
    expect(await deleteParty("party_1")).toEqual({ ok: true, data: null });
    expect(observedPairs()).toContain("party.deleteMany");
    harness.responses.set("transaction.count", 1);
    expect(await deleteParty("party_1")).toEqual({ ok: false, error: "err.partyHasHistory" });
    expect(failures()).toEqual([]);
    record();
  });
});

describe("v1.2a: projects scope every call", () => {
  it("listProjects, empty", async () => {
    await listProjects(EST);
    expect(observedPairs()).toContain("project.findMany");
    expect(failures()).toEqual([]);
    record();
  });

  it("listProjects, populated and filtered — totals and the reference probe run", async () => {
    populateProjects();
    const [row] = await listProjects(EST, { status: "ACTIVE" });
    expect(row).toMatchObject({ spentHalalas: 2500, remainingHalalas: 7500, hasHistory: true });
    expect(failures()).toEqual([]);
    record();
  });

  it("listProjectOptions and getProject with categories to name", async () => {
    populateProjects();
    await listProjectOptions(EST);
    const project = await getProject(EST, "proj_1");
    expect(project?.byCategory).toHaveLength(1);
    expect(observedPairs()).toContain("category.findMany");
    expect(failures()).toEqual([]);
    record();
  });

  it("createProject, updateProject, setProjectStatus, deleteProject", async () => {
    harness.responses.set("project.findFirst", PROJECT);
    expect(await createProject(null, projectForm())).toEqual({ ok: true, data: { id: "generated_id" } });
    expect(await updateProject("proj_1", null, projectForm())).toEqual({ ok: true, data: null });
    expect(await setProjectStatus("proj_1", "COMPLETED")).toEqual({ ok: true, data: null });
    expect(await deleteProject("proj_1")).toEqual({ ok: true, data: null });
    expect(observedPairs()).toContain("project.deleteMany");
    harness.responses.set("transaction.count", 1);
    expect(await deleteProject("proj_1")).toEqual({ ok: false, error: "err.projectHasHistory" });
    expect(failures()).toEqual([]);
    record();
  });
});

/**
 * Rule 11 at the ledger: a link id belonging to another establishment reads
 * exactly like an unknown one. The canned lookup answers only for the caller's
 * own row under the caller's scope, as the database would.
 */
describe("v1.2a: a foreign link id is the field error, and the lookup is scoped", () => {
  beforeEach(() => {
    const ownOnly =
      (row: Record<string, unknown>, id: string) => (args: Record<string, unknown>) => {
        const where = args.where as Record<string, unknown>;
        return where.establishmentId === EST && where.id === id ? row : null;
      };
    harness.responses.set("party.findFirst", ownOnly({ active: true }, "party_mine"));
    harness.responses.set("project.findFirst", ownOnly({ status: "ACTIVE" }, "proj_mine"));
    harness.responses.set(
      "instalment.findFirst",
      ownOnly({ planId: "plan_mine", amountDueHalalas: 1000, paidHalalas: 0 }, "inst_mine"),
    );
  });

  it.each([
    ["partyId", "party_foreign", "err.partyInvalid", "err.partyInvalid"],
    ["projectId", "proj_foreign", "err.projectInvalid", "err.projectInvalid"],
    // CP2: an edit cannot add a payment link to an unlinked entry at all.
    ["instalmentId", "inst_foreign", "err.instalmentInvalid", "err.paymentLinkFixed"],
  ])("%s from another establishment", async (field, id, key, updateKey) => {
    const form = ledgerForm();
    form.set(field, id);
    expect(await createTransaction(null, form)).toEqual({
      ok: false,
      error: key,
      fieldErrors: { [field]: key },
    });
    expect(await updateTransaction("tx_existing", null, form)).toMatchObject({
      fieldErrors: { [field]: updateKey },
    });
    expect(observedPairs()).not.toContain("transaction.create");
    expect(observedPairs()).not.toContain("transaction.updateMany");
    expect(failures()).toEqual([]);
  });

  it("the caller's own party and project are accepted", async () => {
    const form = ledgerForm();
    form.set("partyId", "party_mine");
    form.set("projectId", "proj_mine");
    expect(await createTransaction(null, form)).toEqual({ ok: true, data: null });
    expect(await updateTransaction("tx_existing", null, form)).toEqual({ ok: true, data: null });
    expect(failures()).toEqual([]);
    record();
  });
});

/* ------------------------------------ v1.2a CP2: plans, dues, payments, statement */

const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

const PLAN_ROW = {
  id: "plan_1", title: "توريد", partyId: "party_1", direction: "OUT", startDate: day("2026-09-01"),
  totalHalalas: 3000, reminderDays: 3, state: "OPEN", revision: 2, closedAt: null, createdAt: day("2026-09-01"),
  categoryId: "cat_1", notes: null, party: { name: "مورد", type: "SUPPLIER" }, category: { nameAr: "موردون" },
};

const PLAN_REF = { title: "توريد", state: "OPEN", direction: "OUT", partyId: "party_1", categoryId: "cat_1",
  totalHalalas: 3000, reminderDays: 3, party: { name: "مورد" } };

const INSTALMENT = { id: "inst_1", planId: "plan_1", seq: 1, dueDate: day("2026-09-20"), amountDueHalalas: 1000, paidHalalas: 0, plan: PLAN_REF };

/** One row that satisfies both the payment select and the ledger ROW_SELECT. */
const PAYMENT_TX = {
  id: "tx_pay", instalmentId: "inst_1", date: day("2026-09-21"), createdAt: day("2026-09-21"), amountHalalas: 500,
  direction: "OUT", categoryId: "cat_1", paymentMethod: "CASH", counterparty: null, note: null,
  partyId: "party_1", projectId: null, category: { nameAr: "موردون" }, party: { name: "مورد" }, project: null,
  createdBy: { firstName: "تجربة", middleName: null, lastName: "", legacyName: null },
};

function populatePlans(): void {
  harness.responses.set("plan.findMany", [PLAN_ROW]);
  harness.responses.set("plan.findFirst", PLAN_ROW);
  harness.responses.set("instalment.findMany", [INSTALMENT]);
  harness.responses.set("instalment.findFirst", INSTALMENT);
  harness.responses.set("transaction.findMany", [PAYMENT_TX]);
  harness.responses.set("transaction.groupBy", []);
  harness.responses.set("transaction.aggregate", { _sum: { amountHalalas: 500 } });
  harness.responses.set("party.findFirst", PARTY);
}

function planForm(rows: Array<Record<string, unknown>>): FormData {
  const form = new FormData();
  for (const [k, v] of Object.entries({
    partyId: "party_1", direction: "OUT", title: "توريد", totalHalalas: "3000", categoryId: "cat_1",
    startDate: "2026-09-01", reminderDays: "3", instalments: JSON.stringify(rows),
  })) form.append(k, v);
  return form;
}

function paymentForm(): FormData {
  const form = ledgerForm();
  form.set("amountHalalas", "500");
  form.set("instalmentId", "inst_1");
  return form;
}

describe("v1.2a CP2: plans and dues scope every call", () => {
  it("listPlans, empty and populated with every filter", async () => {
    await listPlans(EST);
    populatePlans();
    const [row] = await listPlans(EST, { direction: "OUT", partyId: "party_1", status: "ACTIVE" }, "2026-10-01");
    expect(row?.nextDue).toMatchObject({ instalmentId: "inst_1", status: "OVERDUE" });
    expect(failures()).toEqual([]);
    record();
  });

  it("getPlan, with payments and the reference probe", async () => {
    populatePlans();
    const plan = await getPlan(EST, "plan_1", "2026-10-01");
    expect(plan?.instalments[0]?.payments).toHaveLength(1);
    expect(failures()).toEqual([]);
    record();
  });

  it("getDues, getOverdueCount, getStaffDues — the field reference is not a recorded call", async () => {
    populatePlans();
    const dues = await getDues(EST, "2026-09-20");
    expect(dues.thisWeek).toHaveLength(1);
    expect(await getOverdueCount(EST, "2026-09-20")).toBe(0);
    const [staffRow] = await getStaffDues(EST, "2026-09-20");
    expect(observedPairs()).not.toContain("instalment.fields");
    const counted = harness.calls.find((c) => c.model === "instalment" && c.method === "count")!;
    expect((counted.args.where as Record<string, unknown>).paidHalalas).toEqual({ lt: { fieldRef: "instalment.amountDueHalalas" } });
    // W5: exactly the four fields of the user's ruling — nothing more.
    expect(Object.keys(staffRow!).sort()).toEqual(["dueDate", "instalmentId", "partyName", "remainingHalalas"]);
    expect(failures()).toEqual([]);
    record();
  });

  it("the payment-form reads; the staff prefill has exactly six fields (W2)", async () => {
    populatePlans();
    expect(await getInstalmentForPayment(EST, "inst_1")).toMatchObject({ planRemainingHalalas: 2500 });
    const prefill = await getStaffPaymentPrefill(EST, "inst_1");
    expect(Object.keys(prefill!).sort()).toEqual([
      "categoryId", "direction", "instalmentId", "instalmentRemainingHalalas", "partyId", "partyName",
    ]);
    expect(await getPaymentLink(EST, "inst_1")).toMatchObject({ planId: "plan_1", partyName: "مورد" });
    expect(failures()).toEqual([]);
    record();
  });

  it("topActiveProjects and getPartyStatement", async () => {
    populatePlans();
    await topActiveProjects(EST);
    const statement = await getPartyStatement(EST, "party_1");
    expect(statement?.rows.map((r) => r.kind)).toEqual(["PLAN", "PAYMENT"]);
    expect(failures()).toEqual([]);
    record();
  });

  it("rule 11: a foreign plan or instalment id reads as missing, through a scoped lookup", async () => {
    const own = (row: unknown, id: string) => (args: Record<string, unknown>) => {
      const where = args.where as Record<string, unknown>;
      return where.establishmentId === EST && where.id === id ? row : null;
    };
    harness.responses.set("plan.findFirst", own(PLAN_ROW, "plan_1"));
    harness.responses.set("instalment.findFirst", own(INSTALMENT, "inst_1"));
    expect(await getPlan(EST, "plan_foreign")).toBeNull();
    expect(await getInstalmentForPayment(EST, "inst_foreign")).toBeNull();
    expect(await getStaffPaymentPrefill(EST, "inst_foreign")).toBeNull();
    expect(await getPaymentLink(EST, "inst_foreign")).toBeNull();
    expect(await archivePlan("plan_foreign")).toEqual({ ok: false, error: "err.notFound" });
    const form = paymentForm();
    form.set("instalmentId", "inst_foreign");
    expect(await createTransaction(null, form)).toMatchObject({ fieldErrors: { instalmentId: "err.instalmentInvalid" } });
    expect(failures()).toEqual([]);
  });
});

describe("v1.2a CP2: plan and payment writes scope every call", () => {
  it("createPlan: the plan and every instalment row carry the establishment", async () => {
    harness.responses.set("party.findFirst", { active: true });
    const result = await createPlan(null, planForm([{ dueDate: "2026-10-01", amountDueHalalas: 3000 }]));
    expect(result.ok).toBe(true);
    expect(observedPairs()).toContain("instalment.createMany");
    expect(failures()).toEqual([]);
    record();
  });

  it("updatePlan: bump, row update / delete / create, re-allocation, audit", async () => {
    populatePlans();
    harness.responses.set("party.findFirst", { active: true });
    expect(await updatePlan("plan_1", null, planForm([
      { id: "inst_1", dueDate: "2026-10-01", amountDueHalalas: 1000 },
      { dueDate: "2026-11-01", amountDueHalalas: 2000 },
    ]))).toEqual({ ok: true, data: null });
    expect(await updatePlan("plan_1", null, planForm([{ dueDate: "2026-10-01", amountDueHalalas: 3000 }]))).toEqual({ ok: true, data: null });
    for (const pair of ["plan.updateMany", "instalment.updateMany", "instalment.deleteMany", "instalment.createMany"]) {
      expect(observedPairs()).toContain(pair);
    }
    expect(failures()).toEqual([]);
    record();
  });

  it("cancelPlan and archivePlan", async () => {
    populatePlans();
    expect(await cancelPlan("plan_1")).toEqual({ ok: true, data: null });
    expect(await archivePlan("plan_1")).toEqual({ ok: true, data: null });
    expect(failures()).toEqual([]);
    record();
  });

  it("reallocatePlan writes only through scoped updateMany", async () => {
    populatePlans();
    await reallocatePlan(harness.db as never, EST, "plan_1", USER);
    expect(observedPairs()).toContain("instalment.updateMany");
    expect(failures()).toEqual([]);
    record();
  });

  it("a payment: create, edit, delete", async () => {
    populatePlans();
    expect(await createTransaction(null, paymentForm())).toEqual({ ok: true, data: null });
    harness.responses.set("transaction.findFirst", { ...PAYMENT_TX, date: day(todayISO()) });
    expect(await updateTransaction("tx_pay", null, paymentForm())).toEqual({ ok: true, data: null });
    expect(await deleteTransaction("tx_pay")).toEqual({ ok: true, data: null });
    expect(observedPairs()).toContain("transaction.aggregate");
    expect(failures()).toEqual([]);
    record();
  });
});

/* ---------------------------- v1.2b CP1: employees, salaries, staff privacy */

/**
 * Y12: v1.2b adds models to the harness, files to FILES and these drivers —
 * `scopeFailure`, `isReferenceProbe` and their constants are untouched. Every
 * canned row carries every field any caller reads, so each path runs through
 * to its writes.
 */
const EMP_ROW = {
  id: "emp_1", partyId: "party_1", status: "ACTIVE", startDate: day("2026-09-01"), endDate: null as Date | null,
  userId: "user_staff", jobTitle: null, notes: null, workDays: 31, workStart: null, workEnd: null, graceMinutes: null,
  basicSalaryHalalas: 500000 as number | null, payDay: 27 as number | null, salaryCategoryId: "cat_sal",
  party: { name: "أحمد", phone: null, email: null, active: true },
  allowances: [{ type: "HOUSING", label: null, amountHalalas: 100000 }],
  user: { firstName: "فهد", middleName: null, lastName: "", legacyName: null },
};
const SAL_PLAN = { id: "plan_sal", revision: 1, startDate: day("2026-09-01"), employeeId: "emp_1", state: "OPEN" };
const SAL_INST = {
  id: "inst_sal", planId: "plan_sal", seq: 24320, periodYm: "2026-09", dueDate: day("2099-12-27"),
  amountDueHalalas: 600000, paidHalalas: 0, plan: { state: "OPEN" },
};
const SAL_PERIOD = {
  id: "sp_1", employeeId: "emp_1", periodYm: "2026-09", instalmentId: "inst_sal",
  basicHalalas: 1, allowances: [], grossHalalas: 1,
};

/** Lookups that answer only for this establishment's own ids (rule 11 by construction). */
function populateEmployees(employee: Record<string, unknown> = EMP_ROW): void {
  harness.responses.set("employee.findFirst", (args: Record<string, unknown>) => {
    const where = args.where as Record<string, unknown>;
    if (where.establishmentId !== EST) return null;
    if (where.userId !== undefined || where.partyId !== undefined) return null; // no other holder
    return where.id === undefined || where.id === employee.id ? employee : null;
  });
  harness.responses.set("employee.findMany", [employee]);
  harness.responses.set("party.findFirst", (args: Record<string, unknown>) => {
    const where = args.where as Record<string, unknown>;
    return where.name !== undefined ? null : { id: "party_1", active: true };
  });
  harness.responses.set("party.findMany", [{ id: "party_2", name: "عامل", phone: null, email: null }]);
  harness.responses.set("user.findFirst", { id: "user_staff", canEdit: true });
  harness.responses.set("user.findMany", [
    { id: "user_staff", email: "s@example.com", firstName: "فهد", middleName: null, lastName: "", legacyName: null },
  ]);
  harness.responses.set("plan.findFirst", SAL_PLAN);
  harness.responses.set("plan.findMany", [SAL_PLAN]);
  harness.responses.set("instalment.findMany", [SAL_INST]);
  harness.responses.set("instalment.findFirst", SAL_INST);
  harness.responses.set("salaryPeriod.findMany", [SAL_PERIOD]);
  harness.responses.set("salaryPeriod.findFirst", SAL_PERIOD);
  harness.responses.set("establishment.findFirst", { name: "منشأة" });
  harness.responses.set("employeeAllowance.findMany", EMP_ROW.allowances);
  harness.responses.set("category.findFirst", (args: Record<string, unknown>) =>
    (args.where as Record<string, unknown>).nameAr !== undefined ? null : { sortOrder: 3, type: "OUT", active: true });
}

function employeeForm(extra: Record<string, string> = {}): FormData {
  const form = new FormData();
  for (const [k, v] of Object.entries({
    name: "أحمد", startDate: "2026-09-01", basicSalaryHalalas: "700000", payDay: "25", userId: "user_staff",
    allowances: JSON.stringify([{ type: "HOUSING", amountHalalas: 100000 }]), ...extra,
  })) form.append(k, v);
  return form;
}

function endForm(endDate = "2026-09-15"): FormData {
  const form = new FormData();
  form.append("endDate", endDate);
  return form;
}

describe("v1.2b: employee reads scope every call", () => {
  it("empty, then populated: list, detail, linkable staff, adoptable parties, unpaid months, payslip", async () => {
    expect(await listEmployees(EST)).toEqual([]);
    populateEmployees();
    expect(await listEmployees(EST, { status: "ACTIVE" })).toHaveLength(1);
    const detail = await getEmployee(EST, "emp_1", "2026-09-10");
    expect(detail?.thisMonth).toMatchObject({ instalmentId: "inst_sal", payable: true });
    await listLinkableStaff(EST);
    await listLinkableStaff(EST, "user_staff");
    await listAdoptableParties(EST);
    expect(await getUnpaidSalaryMonths(EST, "emp_1")).toHaveLength(1);
    expect(await employeeIdOfParty(EST, "party_1")).toBeNull();
    expect(await getPayslip(EST, "emp_1", "2026-09")).toMatchObject({ establishmentName: "منشأة", netHalalas: 600000 });
    expect(observedPairs()).not.toContain("instalment.fields");
    expect(failures()).toEqual([]);
    record();
  });
});

describe("v1.2b: employee and salary writes scope every call", () => {
  it("createEmployee: party, employee, allowances, «رواتب» created, plan, months, periods — each row scoped", async () => {
    populateEmployees();
    harness.responses.set("category.findFirst", (args: Record<string, unknown>) =>
      (args.where as Record<string, unknown>).id !== undefined || (args.where as Record<string, unknown>).nameAr !== undefined
        ? null
        : { sortOrder: 3 });
    expect(await createEmployee(null, employeeForm())).toMatchObject({ ok: true });
    for (const pair of ["party.create", "employee.create", "employeeAllowance.createMany", "category.create",
      "plan.create", "instalment.createMany", "salaryPeriod.createMany", "instalment.aggregate"]) {
      expect(observedPairs()).toContain(pair);
    }
    expect(failures()).toEqual([]);
    record();
  });

  it("createEmployee adopting a party (D14), no salary", async () => {
    populateEmployees();
    const form = employeeForm({ partyId: "party_2", basicSalaryHalalas: "", payDay: "", allowances: "" });
    expect(await createEmployee(null, form)).toMatchObject({ ok: true });
    expect(observedPairs()).toContain("party.updateMany");
    expect(failures()).toEqual([]);
    record();
  });

  it("updateEmployee: a salary change re-snapshots future months (D5) and generates", async () => {
    populateEmployees();
    expect(await updateEmployee("emp_1", null, employeeForm())).toEqual({ ok: true, data: null });
    for (const pair of ["employee.updateMany", "employeeAllowance.deleteMany", "salaryDeduction.groupBy",
      "salaryPeriod.updateMany", "instalment.updateMany", "plan.updateMany"]) {
      expect(observedPairs()).toContain(pair);
    }
    expect(failures()).toEqual([]);
    record();
  });

  it("updateEmployee: removing the salary deletes unfixed months (N5 order) and archives", async () => {
    populateEmployees();
    const form = employeeForm({ basicSalaryHalalas: "", payDay: "", allowances: "" });
    expect(await updateEmployee("emp_1", null, form)).toEqual({ ok: true, data: null });
    expect(observedPairs()).toContain("instalment.count");
    const deletes = harness.calls
      .map((c) => `${c.model}.${c.method}`)
      .filter((p) => p.endsWith(".deleteMany") && !p.startsWith("employeeAllowance"));
    expect(deletes).toEqual(["salaryDeduction.deleteMany", "salaryPeriod.deleteMany", "instalment.deleteMany"]);
    expect(failures()).toEqual([]);
    record();
  });

  it("updateEmployee: a salary added with no open plan starts one; a retired «رواتب» is reactivated", async () => {
    populateEmployees({ ...EMP_ROW, basicSalaryHalalas: null, payDay: null });
    harness.responses.set("plan.findFirst", null);
    harness.responses.set("category.findFirst", { id: "cat_sal", active: false });
    expect(await updateEmployee("emp_1", null, employeeForm())).toEqual({ ok: true, data: null });
    expect(observedPairs()).toContain("category.updateMany");
    expect(failures()).toEqual([]);
    record();
  });

  it("endEmployment (past date) and reactivateEmployee", async () => {
    populateEmployees();
    expect(await endEmployment("emp_1", null, endForm())).toEqual({ ok: true, data: null });
    populateEmployees({ ...EMP_ROW, status: "ENDED", endDate: day("2026-09-15") });
    harness.responses.set("plan.findFirst", null);
    expect(await reactivateEmployee("emp_1")).toEqual({ ok: true, data: null });
    expect(failures()).toEqual([]);
    record();
  });

  it("ensureSalaryInstalments: the generating pass and the ended pass", async () => {
    populateEmployees();
    await ensureSalaryInstalments(EST);
    expect(observedPairs()).toContain("salaryPeriod.createMany");
    expect(failures()).toEqual([]);
    record();
    harness.calls.length = 0;
    populateEmployees({ ...EMP_ROW, endDate: day("2026-01-31") });
    await ensureSalaryInstalments(EST, "emp_1");
    expect(observedPairs()).toContain("instalment.deleteMany");
    // S3/S-L4a: the automatic ENDED flip is compare-and-set on the state it read.
    const flip = harness.calls.find((c) => c.model === "employee" && c.method === "updateMany")!;
    expect(flip.args.where).toMatchObject({ establishmentId: EST, id: "emp_1", status: "ACTIVE", endDate: day("2026-01-31") });
    expect(failures()).toEqual([]);
    record();
  });

  it("staff privacy reads: ledger, edit read and recent carry the salary filter, still scoped", async () => {
    populateEmployees();
    await listTransactions(EST, FULL_FILTERS, { hideSalary: true });
    await getTransaction(EST, "tx_existing", { hideSalary: true });
    await getStaffDashboard(EST, USER);
    const reads = harness.calls.filter((c) => c.model === "transaction" && ["findMany", "findFirst"].includes(c.method));
    expect(reads.length).toBeGreaterThanOrEqual(3);
    for (const read of reads) expect(JSON.stringify(read.args.where)).toContain('"NOT"');
    expect(failures()).toEqual([]);
    record();
  });
});

describe("v1.2b: rule 11 — another establishment's employee reads as missing", () => {
  it("reads null, writes err.notFound, a foreign login or party is the field error", async () => {
    populateEmployees();
    expect(await getEmployee(EST, "emp_foreign")).toBeNull();
    expect(await getPayslip(EST, "emp_foreign", "2026-09")).toBeNull();
    expect(await updateEmployee("emp_foreign", null, employeeForm())).toEqual({ ok: false, error: "err.notFound" });
    expect(await endEmployment("emp_foreign", null, endForm())).toEqual({ ok: false, error: "err.notFound" });
    expect(await reactivateEmployee("emp_foreign")).toEqual({ ok: false, error: "err.notFound" });
    harness.responses.set("user.findFirst", (args: Record<string, unknown>) =>
      (args.where as Record<string, unknown>).id === "user_staff" ? { id: "user_staff" } : null);
    expect(await createEmployee(null, employeeForm({ userId: "user_foreign" }))).toMatchObject({
      fieldErrors: { userId: "err.loginInvalid" },
    });
    harness.responses.set("party.findFirst", (args: Record<string, unknown>) => {
      const where = args.where as Record<string, unknown>;
      return where.name === undefined && where.id === "party_own" ? { id: "party_own" } : null;
    });
    expect(await createEmployee(null, employeeForm({ partyId: "party_foreign" }))).toMatchObject({
      fieldErrors: { partyId: "err.partyInvalid" },
    });
    expect(failures()).toEqual([]);
  });
});

/* ------------------------- v1.2b CP2: attendance, self-service, deductions */

const ATT_EMPLOYEES = [
  { ...EMP_ROW, id: "emp_1" },
  { ...EMP_ROW, id: "emp_2", partyId: "party_2", userId: null },
];
const ATT_RECORD = {
  id: "att_1", employeeId: "emp_1", date: day("2026-09-15"), status: "PRESENT", statusOverridden: false,
  checkIn: "00:00", checkOut: null, note: null, updatedAt: new Date("2026-09-15T05:00:00.000Z"),
};

function populateAttendance(): void {
  populateEmployees();
  harness.responses.set("employee.findMany", ATT_EMPLOYEES);
  // Self-service looks its employee up by the session user: always this one here.
  harness.responses.set("employee.findFirst", EMP_ROW);
  harness.responses.set("attendanceRecord.findMany", [ATT_RECORD]);
  harness.responses.set("attendanceRecord.findFirst", null);
  harness.responses.set("salaryDeduction.findFirst", { id: "ded_1", salaryPeriodId: "sp_1", amountHalalas: 1, reason: "غياب" });
  harness.responses.set("salaryDeduction.findMany", [{ id: "ded_1", amountHalalas: 1, reason: "غياب" }]);
}

function attendanceForm(): FormData {
  const form = new FormData();
  form.append("date", "2026-09-15");
  form.append("rows", JSON.stringify([
    { employeeId: "emp_1", status: "ABSENT", updatedAt: ATT_RECORD.updatedAt.toISOString() },
    { employeeId: "emp_2", status: "LEAVE" },
  ]));
  return form;
}

describe("v1.2b CP2: attendance reads and the day save scope every call", () => {
  it("getDaySheet, getMonthGrid, getEmployeeMonth — empty, then populated", async () => {
    expect((await getDaySheet(EST, "2026-09-15")).rows).toEqual([]);
    populateAttendance();
    expect((await getDaySheet(EST, "2026-09-15")).rows).toHaveLength(2);
    expect((await getMonthGrid(EST, "2026-09")).rows).toHaveLength(2);
    expect((await getEmployeeMonth(EST, "emp_1", "2026-09"))?.salary).toMatchObject({ editable: true });
    harness.responses.set("attendanceRecord.findFirst", { date: day("2026-09-14") });
    expect(await getLastRecordedDate(EST, "2026-09-15")).toBe("2026-09-14");
    expect(failures()).toEqual([]);
    record();
  });

  it("v1.3: getAttendanceYear (the employee heat strip) scopes its one read", async () => {
    populateAttendance();
    await getAttendanceYear(EST, "emp_1", "2026-09");
    const read = harness.calls.find((c) => c.model === "attendanceRecord" && c.method === "findMany")!;
    expect(read.args.where).toMatchObject({ establishmentId: EST, employeeId: "emp_1" });
    expect(failures()).toEqual([]);
    record();
  });

  it("saveAttendanceDay: createMany for new rows, compare-and-set updateMany for changed ones (Z3)", async () => {
    populateAttendance();
    expect(await saveAttendanceDay(null, attendanceForm())).toEqual({ ok: true, data: { saved: 2 } });
    const created = harness.calls.find((c) => c.model === "attendanceRecord" && c.method === "createMany")!;
    expect((created.args.data as unknown[]).length).toBe(1);
    const update = harness.calls.find((c) => c.model === "attendanceRecord" && c.method === "updateMany")!;
    expect(update.args.where).toMatchObject({ establishmentId: EST, employeeId: "emp_1", updatedAt: ATT_RECORD.updatedAt });
    expect(failures()).toEqual([]);
    record();
  });

  it("rule 11: another establishment's employee in the rows is err.employeeInvalid", async () => {
    populateAttendance();
    harness.responses.set("employee.findMany", (args: Record<string, unknown>) =>
      (args.where as Record<string, unknown>).establishmentId === EST ? [ATT_EMPLOYEES[0]] : []);
    expect(await saveAttendanceDay(null, attendanceForm())).toMatchObject({ fieldErrors: { rows: "err.employeeInvalid" } });
    expect(observedPairs()).not.toContain("attendanceRecord.createMany");
    expect(failures()).toEqual([]);
  });
});

describe("v1.2b CP2: self-service scopes every call to the session's own employee", () => {
  it("checkIn creates, checkIn updates the owner's row, checkOut", async () => {
    populateAttendance();
    expect(await checkIn()).toMatchObject({ ok: true });
    harness.responses.set("attendanceRecord.findFirst", { ...ATT_RECORD, checkIn: null });
    expect(await checkIn()).toMatchObject({ ok: true });
    // R-L9 note 1: the update is compare-and-set on the override flag it read.
    const cas = harness.calls.filter((c) => c.model === "attendanceRecord" && c.method === "updateMany").at(-1)!;
    expect(cas.args.where).toMatchObject({ establishmentId: EST, checkIn: null, statusOverridden: false });
    harness.responses.set("attendanceRecord.findFirst", ATT_RECORD);
    expect(await checkOut()).toMatchObject({ ok: true });
    const own = harness.calls.filter((c) => c.model === "employee" && c.method === "findFirst");
    for (const call of own) expect(call.args.where).toEqual({ establishmentId: EST, userId: USER });
    expect(failures()).toEqual([]);
    record();
  });

  it("a check-in that loses its compare-and-set: the owner changed the row → err.concurrentChange; someone checked in → alreadyCheckedIn", async () => {
    populateAttendance();
    harness.responses.set("attendanceRecord.updateMany", { count: 0 });
    let reads = 0;
    const after = (checkedIn: string | null) => () =>
      ++reads === 1 ? { ...ATT_RECORD, checkIn: null } : { ...ATT_RECORD, checkIn: checkedIn };
    harness.responses.set("attendanceRecord.findFirst", after(null));
    expect(await checkIn()).toEqual({ ok: false, error: "err.concurrentChange" });
    reads = 0;
    harness.responses.set("attendanceRecord.findFirst", after("08:01"));
    expect(await checkIn()).toEqual({ ok: false, error: "err.alreadyCheckedIn" });
    expect(failures()).toEqual([]);
    record();
  });

  it("the «حضوري» reads and the layout link", async () => {
    populateAttendance();
    expect(await getMySelf()).not.toBeNull();
    expect(await getMyMonth("2026-09")).not.toBeNull();
    expect(await getMyPayslips()).toHaveLength(1);
    expect(await getMyPayslip("2026-09")).not.toBeNull();
    expect(await getMySalaryInstalments()).toHaveLength(1);
    expect(await hasEmployeeLink(EST, USER)).toBe(true);
    expect(failures()).toEqual([]);
    record();
  });
});

describe("v1.2b CP2: deductions scope every call", () => {
  it("addDeduction and deleteDeduction: bump, write, amount, total, re-allocation, audit", async () => {
    populateAttendance();
    harness.responses.set("instalment.findFirst", { ...SAL_INST, planId: "plan_sal", paidHalalas: 0, plan: { state: "OPEN" } });
    const add = new FormData();
    for (const [k, v] of Object.entries({ periodYm: "2026-09", amountHalalas: "1", reason: "غياب يوم" })) add.append(k, v);
    expect(await addDeduction("emp_1", null, add)).toEqual({ ok: true, data: null });
    expect(await deleteDeduction("ded_1")).toEqual({ ok: true, data: null });
    for (const pair of ["salaryDeduction.create", "salaryDeduction.aggregate", "salaryDeduction.deleteMany", "transaction.count"]) {
      expect(observedPairs()).toContain(pair);
    }
    expect(failures()).toEqual([]);
    record();
  });

  it("rule 11: a foreign deduction or month reads as missing", async () => {
    populateAttendance();
    harness.responses.set("salaryDeduction.findFirst", null);
    harness.responses.set("salaryPeriod.findFirst", null);
    expect(await deleteDeduction("ded_foreign")).toEqual({ ok: false, error: "err.notFound" });
    const add = new FormData();
    for (const [k, v] of Object.entries({ periodYm: "2026-09", amountHalalas: "1", reason: "غياب يوم" })) add.append(k, v);
    expect(await addDeduction("emp_foreign", null, add)).toMatchObject({ fieldErrors: { periodYm: "err.notFound" } });
    expect(failures()).toEqual([]);
  });
});

/* ------------------------------------------------ v1.2c CP1: the owner digest */

/** One unpaid instalment in the shape `buildDigest` selects, due today. */
function digestInstalment(): Record<string, unknown> {
  return {
    dueDate: day(todayISO()), amountDueHalalas: 5000, paidHalalas: 0,
    plan: { title: "توريد", kind: "STANDARD", direction: "IN", reminderDays: 3, party: { name: "عميل" } },
  };
}

describe("v1.2c: the digest settings and the per-establishment run scope every call", () => {
  it("settings: read empty, read populated, then save", async () => {
    expect(await getDigestSettings(EST)).toMatchObject({ digestEnabled: false, digestHour: 7, ownerEmail: null });
    harness.responses.set("establishment.findFirst", { digestEnabled: true, digestHour: 9 });
    harness.responses.set("user.findMany", [{ email: "o@example.com" }]);
    expect(await getDigestSettings(EST)).toMatchObject({ digestEnabled: true, digestHour: 9, ownerEmail: "o@example.com" });
    const form = new FormData();
    form.append("digestEnabled", "on");
    form.append("digestHour", "6");
    expect(await updateDigestSettings(null, form)).toEqual({ ok: true, data: null });
    expect(observedPairs()).toContain("establishment.updateMany");
    expect(failures()).toEqual([]);
    record();
  });

  it("buildDigest: empty, then with a row", async () => {
    expect((await buildDigest(EST, todayISO())).itemCount).toBe(0);
    harness.responses.set("instalment.findMany", [digestInstalment()]);
    expect((await buildDigest(EST, todayISO())).itemCount).toBe(1);
    expect(failures()).toEqual([]);
    record();
  });

  it("runDigests: generation, claim, build, send, record — EMPTY and SENT", async () => {
    expect(await runDigests(new Date())).toEqual({ sent: 0, skipped: 1 });
    harness.responses.set("instalment.findMany", [digestInstalment()]);
    expect(await runDigests(new Date())).toEqual({ sent: 1, skipped: 0 });
    for (const pair of ["reminderDigest.create", "reminderDigest.updateMany", "auditLog.create", "plan.findMany"]) {
      expect(observedPairs()).toContain(pair);
    }
    expect(failures()).toEqual([]);
    record();
  });
});

/* ------------------------------------ v1.2c CP2: client reminders and reports */

/** An unpaid instalment of an OPEN IN plan whose party opted in and has an email. */
const REMIND_INST = {
  id: "inst_1", planId: "plan_1", dueDate: day("2026-09-01"), amountDueHalalas: 5000, paidHalalas: 0,
  plan: { title: "عقد", direction: "IN", state: "OPEN", partyId: "party_1", party: { email: "c@example.com", remindersOptIn: true } },
};

describe("v1.2c CP2: client reminders, aging and the party filter scope every call", () => {
  it("opt-in, email reminder (durable daily check, establishment cap), WhatsApp text", async () => {
    harness.responses.set("party.findFirst", { id: "party_1", remindersOptIn: false });
    expect(await setPartyRemindersOptIn("party_1", true)).toEqual({ ok: true, data: null });
    harness.responses.set("instalment.findFirst", REMIND_INST);
    expect(await sendClientReminder("inst_1")).toEqual({ ok: true, data: null });
    expect(await prepareWhatsAppReminder("inst_1")).toMatchObject({ ok: true });
    for (const pair of ["party.updateMany", "auditLog.findFirst", "auditLog.count", "auditLog.create"]) {
      expect(observedPairs()).toContain(pair);
    }
    expect(failures()).toEqual([]);
    record();
  });

  it("rule 11: a foreign instalment or party reads as missing", async () => {
    harness.responses.set("instalment.findFirst", null);
    harness.responses.set("party.findFirst", null);
    expect(await sendClientReminder("inst_foreign")).toEqual({ ok: false, error: "err.notFound" });
    expect(await prepareWhatsAppReminder("inst_foreign")).toEqual({ ok: false, error: "err.notFound" });
    expect(await setPartyRemindersOptIn("party_foreign", true)).toEqual({ ok: false, error: "err.notFound" });
    expect(failures()).toEqual([]);
  });

  it("aging: empty, then with rows", async () => {
    expect((await getAgingReport(EST, "2026-10-05")).toUs.rows).toEqual([]);
    harness.responses.set("instalment.findMany", [
      { dueDate: day("2026-09-01"), amountDueHalalas: 5000, paidHalalas: 0, plan: { direction: "IN", partyId: "party_1", party: { name: "عميل" } } },
    ]);
    expect((await getAgingReport(EST, "2026-10-05")).toUs.totals.totalHalalas).toBe(5000);
    expect(failures()).toEqual([]);
    record();
  });

  it("getReport by party: the party is looked up in scope and narrows the group; a foreign one reads nothing more", async () => {
    harness.responses.set("party.findFirst", { id: "party_1", name: "عميل" });
    const report = await getReport(EST, "2026-01-01", "2026-03-31", "party_1");
    expect(report?.party).toEqual({ id: "party_1", name: "عميل" });
    const group = harness.calls.find((c) => c.method === "groupBy")!;
    expect((group.args.where as Record<string, unknown>).partyId).toBe("party_1");
    expect(failures()).toEqual([]);
    record();
    harness.calls.length = 0;
    harness.responses.set("party.findFirst", null);
    expect(await getReport(EST, "2026-01-01", "2026-03-31", "party_foreign")).toBeNull();
    expect(harness.calls.map((c) => `${c.model}.${c.method}`)).toEqual(["party.findFirst"]);
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
   *
   * v1.2c E1: `src/features/reminders/select.ts` is the second named absence.
   * Choosing whose digest is due is cross-establishment by nature, like the
   * admin view, so this gate's tenant rule cannot hold there. Its own static
   * gate in `src/features/reminders/reminders.test.ts` applies instead: only
   * `establishment` / `user` / `reminderDigest`, an explicit `select` on every
   * call, no financial model, no amount field.
   */
  const FILES = [
    "src/features/transactions/queries.ts",
    "src/features/transactions/actions.ts",
    // v1.2a: the link checks actions.ts calls.
    "src/features/transactions/links.ts",
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
    // v1.2a
    "src/features/parties/queries.ts",
    "src/features/parties/actions.ts",
    "src/features/projects/queries.ts",
    "src/features/projects/actions.ts",
    // v1.2a CP2
    "src/features/parties/statement.ts",
    "src/features/plans/queries.ts",
    "src/features/plans/dues.ts",
    "src/features/plans/actions.ts",
    "src/features/plans/allocate.ts",
    "src/features/plans/scheduleEdit.ts",
    "src/features/transactions/payments.ts",
    // v1.2b CP1
    "src/features/employees/actions.ts",
    "src/features/employees/lifecycle.ts",
    "src/features/employees/form.ts",
    "src/features/employees/salaryPlan.ts",
    "src/features/employees/queries.ts",
    "src/features/employees/payslip.ts",
    "src/features/payroll/core.ts",
    "src/features/payroll/generate.ts",
    "src/features/payroll/privacy.ts",
    "src/features/payroll/resnapshot.ts",
    "src/features/parties/rules.ts",
    // v1.2b CP2
    "src/features/attendance/queries.ts",
    "src/features/attendance/month.ts",
    "src/features/attendance/actions.ts",
    "src/features/attendance/own.ts",
    "src/features/attendance/self.ts",
    "src/features/attendance/mine.ts",
    "src/features/payroll/deductions.ts",
    // v1.2c CP1 (select.ts: the named absence above)
    "src/features/reminders/settings.ts",
    "src/features/reminders/actions.ts",
    "src/features/reminders/digest.ts",
    "src/features/reminders/run.ts",
    // Reaches data only through runDigests: listed so a direct call fails here.
    "src/app/api/reminders/run/route.ts",
    // v1.2c CP2
    "src/features/reminders/client.ts",
    "src/features/reminders/clientRules.ts",
    "src/features/reports/aging.ts",
    // Reads only through getPartyStatement (C14); listed like the ledger export.
    "src/app/api/export/statement/route.ts",
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

  /**
   * V1: a nested `transactions` read inside a select/include/_count is a query
   * the harness never sees — its scope and soft-delete filter would go
   * unchecked. Anchored on the Prisma shape (`transactions: true|{`), so prose
   * naming transactions cannot trip it.
   */
  it("v1.2a: no nested transactions read in parties, projects or plans", () => {
    const dirs = [
      "src/features/parties", "src/features/projects", "src/features/plans",
      // v1.2b
      "src/features/employees", "src/features/payroll", "src/features/attendance",
      // v1.2c
      "src/features/reminders", "src/features/reports",
    ];
    let scanned = 0;
    for (const dir of dirs) {
      if (!existsSync(dir)) continue;
      for (const name of readdirSync(dir)) {
        if (!/\.tsx?$/.test(name) || name.endsWith(".test.ts")) continue;
        const source = readFileSync(`${dir}/${name}`, "utf8");
        scanned += 1;
        expect(source, `${dir}/${name}`).not.toMatch(/\btransactions\s*:\s*(?:true|\{)/);
      }
    }
    expect(scanned).toBeGreaterThanOrEqual(4);
  });

  /**
   * W5: `paidHalalas` is a cache of `allocate()`, written only by
   * `reallocatePlan` in plans/allocate.ts. For every `data:` in src (not tests,
   * not generated), the expression after it — scanned to its end at depth 0 —
   * must not name `paidHalalas`. Catches `data: { … }` and
   * `data: rows.map((r) => ({ … }))` alike; `select: { paidHalalas: true }` is
   * a read and does not match. A spread of an object built elsewhere would
   * escape — none exists, and review holds that line.
   */
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
  const writesPaid = (source: string) => dataWritesOf(source).some((d) => /\bpaidHalalas\b/.test(d));

  it("W5: the scanner finds the shapes it forbids, and ignores a read", () => {
    expect(writesPaid("x.updateMany({ where, data: { paidHalalas: 3 } })")).toBe(true);
    expect(writesPaid("x.createMany({ data: rows.map((r) => ({ seq: 1, paidHalalas })) })")).toBe(true);
    expect(writesPaid("x.findMany({ where, select: { paidHalalas: true } })")).toBe(false);
    expect(writesPaid("x.updateMany({ data: { seq: 1 }, where: { paidHalalas: 0 } })")).toBe(false);
  });

  it("W5: nothing but plans/allocate.ts writes paidHalalas", () => {
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const path = `${dir}/${e.name}`;
        if (e.isDirectory()) return ["src/generated", "src/lib/testing"].includes(path) ? [] : walk(path);
        return /\.tsx?$/.test(e.name) && !e.name.endsWith(".test.ts") ? [path] : [];
      });
    const writers = walk("src").filter((file) => writesPaid(readFileSync(file, "utf8")));
    // Non-vacuous: the one legitimate writer is found by the same scan.
    expect(writers).toEqual(["src/features/plans/allocate.ts"]);
  });

  /**
   * S8: the salary core and generator are server-only modules, never
   * `"use server"` — a `"use server"` file exports endpoints callable by id,
   * and `ensureSalaryInstalments` and the tx helpers must not be. Anchored on
   * the statements at line start, so prose naming them cannot match.
   */
  it("v1.2b S8: the salary modules are server-only and never use-server", () => {
    const serverOnly = [
      "src/features/payroll/core.ts", "src/features/payroll/generate.ts", "src/features/payroll/privacy.ts",
      "src/features/payroll/resnapshot.ts",
      "src/features/attendance/queries.ts", "src/features/attendance/month.ts",
      "src/features/attendance/own.ts", "src/features/attendance/mine.ts",
      "src/features/employees/form.ts", "src/features/employees/salaryPlan.ts",
      "src/features/employees/queries.ts", "src/features/employees/payslip.ts",
      // v1.2c: the digest modules — settings.ts's reader takes an establishment id.
      "src/features/reminders/settings.ts", "src/features/reminders/select.ts",
      "src/features/reminders/digest.ts", "src/features/reminders/run.ts",
      "src/features/reminders/clientRules.ts", "src/features/reports/aging.ts",
    ];
    for (const file of serverOnly) {
      const source = readFileSync(file, "utf8");
      expect(source, file).toMatch(/^import "server-only";$/m);
      expect(source, file).not.toMatch(/^["']use server["'];?$/m);
    }
    expect('x;\n"use server";\n').toMatch(/^["']use server["'];?$/m);
  });

  it("no unique-where write in any of those files", () => {
    for (const file of FILES) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/\b(?:db|tx)\.\w+\.(?:update|delete|upsert)\(/);
    }
  });
});
