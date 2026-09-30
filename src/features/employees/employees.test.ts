import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * الموظفون mutations: the guard each one calls, and the reference rules the
 * scoping gate cannot see (it answers every lookup alike). The salary money
 * path runs on real Postgres in `payroll/salaryPath.test.ts`.
 */

const h = vi.hoisted(() => ({
  guards: [] as string[],
  refuse: null as string | null,
  writes: [] as string[],
  answers: new Map<string, unknown>(),
  wheres: new Map<string, Array<Record<string, unknown>>>(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
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
  const model = (name: string) =>
    new Proxy({}, {
      get: (_t, method) => {
        if (method === "fields") return new Proxy({}, { get: () => ({}) });
        return async (args: { where?: Record<string, unknown> } = {}) => {
          const key = `${name}.${String(method)}`;
          if (args.where) h.wheres.set(key, [...(h.wheres.get(key) ?? []), args.where]);
          if (/create|update|delete/i.test(String(method))) h.writes.push(key);
          if (h.answers.has(key)) {
            const a = h.answers.get(key);
            return typeof a === "function" ? (a as (x: unknown) => unknown)(args) : a;
          }
          if (/Many$/.test(String(method)) && String(method) !== "findMany") return { count: 1 };
          if (String(method) === "findMany" || String(method) === "groupBy") return [];
          if (String(method) === "create") return { id: `${name}_new` };
          if (String(method) === "aggregate") return { _sum: {} };
          if (String(method) === "count") return 0;
          return null;
        };
      },
    });
  const db: Record<string, unknown> = {};
  for (const m of ["party", "employee", "employeeAllowance", "user", "plan", "instalment", "salaryPeriod",
    "salaryDeduction", "category", "transaction", "auditLog"]) db[m] = model(m);
  db.$transaction = async (fn: (tx: unknown) => unknown) => fn(db);
  return { db };
});

const { createEmployee, updateEmployee } = await import("./actions");
const { endEmployment, reactivateEmployee } = await import("./lifecycle");

const EMPLOYEE = {
  id: "emp_1", partyId: "party_1", status: "ACTIVE", startDate: new Date("2026-09-01T00:00:00Z"), endDate: null,
  userId: null, jobTitle: null, notes: null, workDays: 31, workStart: null, workEnd: null, graceMinutes: null,
  basicSalaryHalalas: null, payDay: null, party: { name: "أحمد", phone: null, email: null, active: true },
};

function form(extra: Record<string, string> = {}): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries({ name: "أحمد", startDate: "2026-09-01", ...extra })) f.append(k, v);
  return f;
}

beforeEach(() => {
  h.guards = [];
  h.refuse = null;
  h.writes = [];
  h.answers.clear();
  h.wheres.clear();
  h.answers.set("employee.findFirst", (args: { where: Record<string, unknown> }) => (args.where.id ? EMPLOYEE : null));
});

describe("every employee mutation is OWNER-only", () => {
  const ended = () => h.answers.set("employee.findFirst", { ...EMPLOYEE, status: "ENDED" });
  const calls: Array<[string, () => Promise<unknown>, (() => void)?]> = [
    ["createEmployee", () => createEmployee(null, form())],
    ["updateEmployee", () => updateEmployee("emp_1", null, form())],
    ["endEmployment", () => endEmployment("emp_1", null, form({ endDate: "2026-12-31" }))],
    ["reactivateEmployee", () => reactivateEmployee("emp_1"), ended],
  ];

  it.each(calls)("%s calls requireOwner and nothing weaker, and writes", async (_n, call, setup) => {
    setup?.();
    expect(await call()).toMatchObject({ ok: true });
    expect(h.guards).toEqual(["requireOwner"]);
    expect(h.writes.length).toBeGreaterThan(0);
  });

  it.each(calls)("%s writes nothing when requireOwner refuses", async (_n, call, setup) => {
    setup?.();
    h.refuse = "requireOwner";
    await expect(call()).rejects.toThrow("NEXT_REDIRECT");
    expect(h.writes).toEqual([]);
  });
});

describe("references are checked in this establishment (rule 11)", () => {
  it("a login that is not an ACTIVE STAFF here is err.loginInvalid", async () => {
    const result = await createEmployee(null, form({ userId: "user_foreign" }));
    expect(result).toMatchObject({ fieldErrors: { userId: "err.loginInvalid" } });
    expect(h.wheres.get("user.findFirst")?.[0]).toEqual({
      establishmentId: "est_1", id: "user_foreign", role: "STAFF", status: "ACTIVE",
    });
    expect(h.writes).toEqual([]);
  });

  it("a login another employee holds is err.loginAlreadyLinked; the employee's own is fine", async () => {
    h.answers.set("user.findFirst", { id: "user_1" });
    h.answers.set("employee.findFirst", (args: { where: Record<string, unknown> }) =>
      args.where.userId ? { id: "emp_other" } : args.where.id ? EMPLOYEE : null);
    expect(await createEmployee(null, form({ userId: "user_1" }))).toMatchObject({
      fieldErrors: { userId: "err.loginAlreadyLinked" },
    });
    h.answers.set("employee.findFirst", (args: { where: Record<string, unknown> }) =>
      args.where.userId ? { id: "emp_1" } : args.where.id ? EMPLOYEE : null);
    expect(await updateEmployee("emp_1", null, form({ userId: "user_1" }))).toEqual({ ok: true, data: null });
  });

  it("adopting needs an active موظف party here that no employee holds", async () => {
    expect(await createEmployee(null, form({ partyId: "party_x" }))).toMatchObject({
      fieldErrors: { partyId: "err.partyInvalid" },
    });
    expect(h.wheres.get("party.findFirst")?.[0]).toEqual({
      establishmentId: "est_1", id: "party_x", type: "EMPLOYEE", active: true,
    });
    h.answers.set("party.findFirst", (args: { where: Record<string, unknown> }) => (args.where.id === "party_x" ? { id: "party_x" } : null));
    h.answers.set("employee.findFirst", { id: "emp_holder" });
    expect(await createEmployee(null, form({ partyId: "party_x" }))).toMatchObject({
      fieldErrors: { partyId: "err.partyInvalid" },
    });
    expect(h.writes).toEqual([]);
  });

  it("an update may not move the profile to another party", async () => {
    expect(await updateEmployee("emp_1", null, form({ partyId: "party_2" }))).toMatchObject({
      fieldErrors: { partyId: "err.partyInvalid" },
    });
  });

  it("a name an active party carries is err.partyDuplicate (N11)", async () => {
    h.answers.set("party.findFirst", { id: "party_2" });
    expect(await createEmployee(null, form())).toMatchObject({ fieldErrors: { name: "err.partyDuplicate" } });
  });

  it("a foreign or missing employee id is err.notFound", async () => {
    h.answers.set("employee.findFirst", null);
    expect(await updateEmployee("emp_x", null, form())).toEqual({ ok: false, error: "err.notFound" });
    expect(await endEmployment("emp_x", null, form({ endDate: "2026-12-31" }))).toEqual({ ok: false, error: "err.notFound" });
    expect(await reactivateEmployee("emp_x")).toEqual({ ok: false, error: "err.notFound" });
  });

  it("status changes are compare-and-set: a lost race is err.concurrentChange (S3)", async () => {
    h.answers.set("employee.updateMany", { count: 0 });
    expect(await endEmployment("emp_1", null, form({ endDate: "2026-12-31" }))).toEqual({ ok: false, error: "err.concurrentChange" });
    expect(h.wheres.get("employee.updateMany")?.[0]).toMatchObject({ establishmentId: "est_1", id: "emp_1", status: "ACTIVE" });
  });

  it("the form's allowances must be JSON", async () => {
    expect(await createEmployee(null, form({ allowances: "{nope" }))).toMatchObject({
      fieldErrors: { allowances: "err.allowancesInvalid" },
    });
  });
});
