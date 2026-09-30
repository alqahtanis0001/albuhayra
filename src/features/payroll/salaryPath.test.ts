import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

/**
 * The salary path on real Postgres (docs/V12B-DESIGN.md D2, D5, D6, D8, Y1;
 * TASKS L4). The actions and the generator run unmodified against the real
 * generated client on PGlite; only auth, next/cache, server-only and the db
 * handle are mocked, and the clock is fixed per step (Date only). PGlite is one
 * connection, so "concurrent" is shown through what the database refuses — a
 * stale revision and a second plan for the same month — not by racing.
 */

const h = vi.hoisted(() => ({ lite: null as PGlite | null }));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/lib/auth", () => {
  const context = async () => ({
    user: { id: "u1", role: "OWNER", status: "ACTIVE", canEdit: true, establishmentId: "est1" },
    establishmentId: "est1",
  });
  return { requireUser: context, requireMember: context, requireOwner: context, requireCanEdit: context };
});
vi.mock("@/lib/db", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { pgliteClient } = await import("@/lib/testing/pgliteClient");
  h.lite = new PGlite();
  return { db: pgliteClient(h.lite) };
});

await import("@/lib/db");
const { createEmployee, updateEmployee } = await import("@/features/employees/actions");
const { endEmployment, reactivateEmployee } = await import("@/features/employees/lifecycle");
const { getEmployee } = await import("@/features/employees/queries");
const { getPayslip } = await import("@/features/employees/payslip");
const { runSalaryGeneration } = await import("./generate");
const { createTransaction } = await import("@/features/transactions/actions");

const MIGRATIONS = join(process.cwd(), "prisma", "migrations");

function at(iso: string): void {
  vi.setSystemTime(new Date(`${iso}T09:00:00Z`)); // 12:00 Riyadh
}

async function q<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await h.lite!.query<T>(sql, params)).rows;
}

type Month = { periodYm: string; due: string; amount: number; paid: number };
async function months(employeeId: string): Promise<Month[]> {
  const rows = await q<{ periodYm: string; dueDate: Date; amountDueHalalas: number; paidHalalas: number }>(
    `SELECT i."periodYm", i."dueDate", i."amountDueHalalas", i."paidHalalas" FROM "Instalment" i
     JOIN "Plan" p ON p."id" = i."planId" WHERE p."employeeId" = $1 ORDER BY i."dueDate"`,
    [employeeId],
  );
  return rows.map((r) => ({ periodYm: r.periodYm, due: r.dueDate.toISOString().slice(0, 10), amount: r.amountDueHalalas, paid: r.paidHalalas }));
}

/** D8: every salary plan's total equals Σ amountDue. */
async function totalsHold(): Promise<void> {
  const rows = await q<{ total: number; sum: string | null }>(
    `SELECT p."totalHalalas" AS total, (SELECT sum(i."amountDueHalalas") FROM "Instalment" i WHERE i."planId" = p."id") AS sum
     FROM "Plan" p WHERE p."kind" = 'SALARY'`,
  );
  for (const row of rows) expect(row.total).toBe(Number(row.sum ?? 0));
}

function form(fields: Record<string, unknown>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.append(k, typeof v === "string" ? v : JSON.stringify(v));
  return f;
}

const AHMED = {
  name: "أحمد سالم", startDate: "2026-09-01", basicSalaryHalalas: "500000", payDay: "27",
  allowances: [{ type: "HOUSING", amountHalalas: 100000 }],
};

function payment(instalmentId: string, amountHalalas: number, date: string): FormData {
  return form({
    date, direction: "OUT", amountHalalas: String(amountHalalas), categoryId: salaryCategory,
    paymentMethod: "CASH", instalmentId,
  });
}

let ahmed = "";
let salaryCategory = "";

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  const dirs = readdirSync(MIGRATIONS, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  for (const dir of dirs) await h.lite!.exec(readFileSync(join(MIGRATIONS, dir, "migration.sql"), "utf8"));
  await h.lite!.exec(`
    INSERT INTO "Establishment" ("id", "name", "joinCode") VALUES ('est1', 'منشأة', 'ABCD2345');
    INSERT INTO "User" ("id", "email", "passwordHash", "role", "status", "establishmentId", "firstName", "lastName")
      VALUES ('u1', 'o@example.com', 'h', 'OWNER', 'ACTIVE', 'est1', 'سالم', 'الشهري');
    INSERT INTO "Category" ("id", "establishmentId", "nameAr", "type", "active") VALUES ('cat_old', 'est1', 'رواتب', 'OUT', false);
  `);
}, 60_000);

afterAll(() => {
  vi.useRealTimers();
});

describe("creating an employee with a salary (D1, D2, Y1, X4)", () => {
  it("starts the plan today, generates this month and next, reactivates «رواتب»", async () => {
    at("2026-10-10");
    const result = await createEmployee(null, form(AHMED));
    expect(result.ok).toBe(true);
    ahmed = (result as { data: { id: string } }).data.id;

    expect(await months(ahmed)).toEqual([
      { periodYm: "2026-10", due: "2026-10-27", amount: 600000, paid: 0 },
      { periodYm: "2026-11", due: "2026-11-27", amount: 600000, paid: 0 },
    ]);
    const [plan] = await q<{ startDate: Date; categoryId: string; kind: string; direction: string }>(
      `SELECT "startDate", "categoryId", "kind", "direction" FROM "Plan" WHERE "employeeId" = $1`, [ahmed],
    );
    // Y1: max(hire 2026-09-01, today) — September is never generated.
    expect(plan!.startDate.toISOString().slice(0, 10)).toBe("2026-10-10");
    expect(plan).toMatchObject({ categoryId: "cat_old", kind: "SALARY", direction: "OUT" });
    salaryCategory = plan!.categoryId;
    expect(await q(`SELECT "active" FROM "Category" WHERE "id" = 'cat_old'`)).toEqual([{ active: true }]);
    const [party] = await q<{ type: string; name: string }>(
      `SELECT pa."type", pa."name" FROM "Party" pa JOIN "Employee" e ON e."partyId" = pa."id" WHERE e."id" = $1`, [ahmed],
    );
    expect(party).toEqual({ type: "EMPLOYEE", name: "أحمد سالم" });
    await totalsHold();
  });

  it("a second run the same day creates nothing (idempotent)", async () => {
    await runSalaryGeneration("est1", "u1", "2026-10-10");
    await runSalaryGeneration("est1", "u1", "2026-10-10");
    expect(await months(ahmed)).toHaveLength(2);
    const periods = await q(`SELECT "periodYm" FROM "SalaryPeriod" WHERE "employeeId" = $1`, [ahmed]);
    expect(periods).toHaveLength(2);
  });

  it("a later run fills forward only through the end of next month", async () => {
    await runSalaryGeneration("est1", "u1", "2026-11-02");
    expect((await months(ahmed)).map((m) => m.periodYm)).toEqual(["2026-10", "2026-11", "2026-12"]);
    await totalsHold();
    expect(await q(`SELECT count(*)::int AS n FROM "AuditLog" WHERE "action" = 'SALARY_GENERATE'`)).toEqual([{ n: 2 }]);
  });

  it("a second open salary plan for the same employee cannot take a month (S3) — the run survives", async () => {
    await h.lite!.exec(`
      INSERT INTO "Plan" ("id", "establishmentId", "partyId", "direction", "title", "totalHalalas",
          "categoryId", "startDate", "updatedAt", "kind", "employeeId")
        SELECT 'plan_dup', 'est1', "partyId", 'OUT', 'x', 0, '${salaryCategory}', '2026-11-01', now(), 'SALARY', "id"
        FROM "Employee" WHERE "id" = '${ahmed}';
    `);
    // Both plans want January. The older plan runs first (createdAt order); the
    // duplicate's transaction aborts on SalaryPeriod(employeeId, periodYm) and
    // is swallowed as a lost race — the run itself does not throw.
    await runSalaryGeneration("est1", "u1", "2026-12-01");
    const rows = await q<{ planId: string; periodYm: string }>(
      `SELECT i."planId", i."periodYm" FROM "Instalment" i JOIN "SalaryPeriod" s ON s."instalmentId" = i."id"
       WHERE s."employeeId" = $1 AND s."periodYm" = '2027-01'`, [ahmed],
    );
    expect(rows).toHaveLength(1);
    expect(await q(`SELECT count(*)::int AS n FROM "Instalment" WHERE "planId" = 'plan_dup'`)).toEqual([{ n: 0 }]);
    await h.lite!.exec(`DELETE FROM "Plan" WHERE "id" = 'plan_dup'`);
    await totalsHold();
  });
});

describe("salary changes affect unpaid future months only (D5)", () => {
  it("a paid past month and a partly paid month keep their amounts; unpaid future months re-snapshot", async () => {
    at("2026-12-01");
    const before = await months(ahmed);
    const ids = await q<{ id: string; periodYm: string }>(
      `SELECT i."id", i."periodYm" FROM "Instalment" i JOIN "Plan" p ON p."id" = i."planId" WHERE p."employeeId" = $1 ORDER BY i."dueDate"`,
      [ahmed],
    );
    const id = (ym: string) => ids.find((r) => r.periodYm === ym)!.id;
    expect(await createTransaction(null, payment(id("2026-10"), 600000, "2026-10-27"))).toEqual({ ok: true, data: null });
    expect(await createTransaction(null, payment(id("2026-12"), 1000, "2026-12-01"))).toEqual({ ok: true, data: null });

    const raised = await updateEmployee(ahmed, null, form({ ...AHMED, basicSalaryHalalas: "700000", payDay: "25" }));
    expect(raised).toEqual({ ok: true, data: null });
    const after = await months(ahmed);
    expect(after.find((m) => m.periodYm === "2026-10")).toEqual({ ...before[0], paid: 600000 });
    // November's pay date (27 Nov) is before today: past, untouched.
    expect(after.find((m) => m.periodYm === "2026-11")).toEqual(before[1]);
    // December is future but has a payment: untouched.
    expect(after.find((m) => m.periodYm === "2026-12")).toMatchObject({ due: "2026-12-27", amount: 600000, paid: 1000 });
    // January is future and unpaid: new gross and the new pay day.
    expect(after.find((m) => m.periodYm === "2027-01")).toEqual({ periodYm: "2027-01", due: "2027-01-25", amount: 800000, paid: 0 });
    const [snap] = await q<{ basicHalalas: number; grossHalalas: number }>(
      `SELECT "basicHalalas", "grossHalalas" FROM "SalaryPeriod" WHERE "employeeId" = $1 AND "periodYm" = '2027-01'`, [ahmed],
    );
    expect(snap).toEqual({ basicHalalas: 700000, grossHalalas: 800000 });
    await totalsHold();
  });

  it("S4: a month an entry pays is never re-snapshotted, even while its paid cache reads 0", async () => {
    at("2026-12-01");
    const created = await createEmployee(null, form({ ...AHMED, name: "سعد", startDate: "2026-12-01" }));
    const saad = (created as { data: { id: string } }).data.id;
    const [jan] = await q<{ id: string }>(
      `SELECT i."id" FROM "Instalment" i JOIN "Plan" p ON p."id" = i."planId" WHERE p."employeeId" = $1 AND i."periodYm" = '2027-01'`,
      [saad],
    );
    // A payment row whose allocation has not run: only the payment predicate can see it.
    await h.lite!.exec(`
      INSERT INTO "Transaction" ("id", "establishmentId", "date", "direction", "amountHalalas", "categoryId",
          "paymentMethod", "createdById", "updatedAt", "instalmentId")
        VALUES ('tx_cache_lag', 'est1', '2026-12-01', 'OUT', 100, '${salaryCategory}', 'CASH', 'u1', now(), '${jan!.id}');
    `);
    expect(await updateEmployee(saad, null, form({ ...AHMED, name: "سعد", startDate: "2026-12-01", basicSalaryHalalas: "900000" }))).toEqual({ ok: true, data: null });
    const rows = await months(saad);
    expect(rows.find((m) => m.periodYm === "2026-12")).toMatchObject({ amount: 1000000 });
    expect(rows.find((m) => m.periodYm === "2027-01")).toMatchObject({ amount: 600000 });
    await totalsHold();
  });

  it("the detail read reports this month and offers «صرف راتب» only while something is left", async () => {
    const detail = await getEmployee("est1", ahmed, "2026-12-01");
    expect(detail?.thisMonth).toMatchObject({ periodYm: "2026-12", netHalalas: 600000, paidHalalas: 1000, remainingHalalas: 599000, payable: true });
    expect(detail?.months.map((m) => m.periodYm)).toEqual(["2027-01", "2026-12", "2026-11", "2026-10"]);
  });
});

describe("the payslip (D12, N4)", () => {
  it("prints the month's snapshot, what paid it and when", async () => {
    const slip = await getPayslip("est1", ahmed, "2026-10");
    expect(slip).toMatchObject({
      establishmentName: "منشأة", employee: { name: "أحمد سالم" }, periodYm: "2026-10", dueDate: "2026-10-27",
      basicHalalas: 500000, allowances: [{ type: "HOUSING", label: null, amountHalalas: 100000 }], grossHalalas: 600000,
      deductions: [], netHalalas: 600000, paidHalalas: 600000, remainingHalalas: 0,
      payments: [{ date: "2026-10-27", amountHalalas: 600000, paymentMethod: "CASH" }],
    });
    expect(await getPayslip("est1", ahmed, "2031-01")).toBeNull();
  });

  it("R-note 6: a snapshot that does not parse, or does not add up to its gross, fails loud — never prints", async () => {
    const good = (await q<{ allowances: unknown }>(
      `SELECT "allowances" FROM "SalaryPeriod" WHERE "employeeId" = $1 AND "periodYm" = '2026-11'`, [ahmed],
    ))[0]!.allowances;
    const set = (json: string) => h.lite!.query(
      `UPDATE "SalaryPeriod" SET "allowances" = $2::jsonb WHERE "employeeId" = $1 AND "periodYm" = '2026-11'`, [ahmed, json],
    );
    await set('[{"type":"HOUSING"}]');
    // The parse itself must throw — not a fallback to [] caught later by the sum check.
    await expect(getPayslip("est1", ahmed, "2026-11")).rejects.toBeInstanceOf(ZodError);
    await set("[]");
    await expect(getPayslip("est1", ahmed, "2026-11")).rejects.toThrow("does not add up");
    await set(JSON.stringify(good));
    expect(await getPayslip("est1", ahmed, "2026-11")).toMatchObject({ grossHalalas: 600000 });
  });
});

describe("ending and reactivating (D6, S5, Y1)", () => {
  it("a past end date deletes unfixed months after it, archives the plan and ends the employee", async () => {
    at("2027-01-05");
    const result = await endEmployment(ahmed, null, form({ endDate: "2026-12-31" }));
    expect(result).toEqual({ ok: true, data: null });
    // January (after the end, unpaid, unreferenced) is gone; December (has a payment) stays.
    expect((await months(ahmed)).map((m) => m.periodYm)).toEqual(["2026-10", "2026-11", "2026-12"]);
    expect(await q(`SELECT "state" FROM "Plan" WHERE "employeeId" = $1`, [ahmed])).toEqual([{ state: "ARCHIVED" }]);
    expect(await q(`SELECT "status" FROM "Employee" WHERE "id" = $1`, [ahmed])).toEqual([{ status: "ENDED" }]);
    await totalsHold();
    expect(await endEmployment(ahmed, null, form({ endDate: "2027-01-01" }))).toEqual({ ok: false, error: "err.employeeEnded" });
  });

  it("reactivation opens a new plan from today; months that already have a period are skipped", async () => {
    expect(await reactivateEmployee(ahmed)).toEqual({ ok: true, data: null });
    const plans = await q<{ state: string; startDate: Date }>(
      `SELECT "state", "startDate" FROM "Plan" WHERE "employeeId" = $1 ORDER BY "createdAt"`, [ahmed],
    );
    expect(plans.map((p) => [p.state, p.startDate.toISOString().slice(0, 10)])).toEqual([
      ["ARCHIVED", "2026-10-10"],
      ["OPEN", "2027-01-05"],
    ]);
    expect((await months(ahmed)).map((m) => [m.periodYm, m.due, m.amount])).toEqual([
      ["2026-10", "2026-10-27", 600000],
      ["2026-11", "2026-11-27", 600000],
      ["2026-12", "2026-12-27", 600000],
      ["2027-01", "2027-01-25", 800000],
      ["2027-02", "2027-02-25", 800000],
    ]);
    await totalsHold();
  });

  it("a future end date bounds generation; when it passes the next run archives and ends", async () => {
    at("2027-01-05");
    expect(await endEmployment(ahmed, null, form({ endDate: "2027-01-31" }))).toEqual({ ok: true, data: null });
    expect((await months(ahmed)).map((m) => m.periodYm)).toEqual(["2026-10", "2026-11", "2026-12", "2027-01"]);
    expect(await q(`SELECT "status" FROM "Employee" WHERE "id" = $1`, [ahmed])).toEqual([{ status: "ACTIVE" }]);
    await runSalaryGeneration("est1", "u1", "2027-01-20");
    expect(await q(`SELECT count(*)::int AS n FROM "Plan" WHERE "employeeId" = $1 AND "state" = 'OPEN'`, [ahmed])).toEqual([{ n: 1 }]);
    await runSalaryGeneration("est1", "u1", "2027-02-01");
    expect(await q(`SELECT count(*)::int AS n FROM "Plan" WHERE "employeeId" = $1 AND "state" = 'OPEN'`, [ahmed])).toEqual([{ n: 0 }]);
    expect(await q(`SELECT "status" FROM "Employee" WHERE "id" = $1`, [ahmed])).toEqual([{ status: "ENDED" }]);
    // S-L4a: the automatic flip is audited (spec §0), once.
    const audits = await q<{ n: number }>(
      `SELECT count(*)::int AS n FROM "AuditLog" WHERE "action" = 'EMPLOYEE_END' AND "entityId" = $1 AND "after"->>'auto' = 'true'`, [ahmed],
    );
    expect(audits).toEqual([{ n: 1 }]);
    await runSalaryGeneration("est1", "u1", "2027-02-02");
    expect(await q(
      `SELECT count(*)::int AS n FROM "AuditLog" WHERE "action" = 'EMPLOYEE_END' AND "entityId" = $1 AND "after"->>'auto' = 'true'`, [ahmed],
    )).toEqual([{ n: 1 }]);
  });

  it("an end date before the hire date is refused", async () => {
    at("2027-02-01");
    expect(await reactivateEmployee(ahmed)).toEqual({ ok: true, data: null });
    expect(await endEmployment(ahmed, null, form({ endDate: "2026-08-31" }))).toMatchObject({
      fieldErrors: { endDate: "err.endBeforeStart" },
    });
  });
});

describe("removing a salary (S4)", () => {
  it("deletes unpaid future months, then archives when nothing unpaid is left", async () => {
    at("2027-02-01");
    const salaried = await createEmployee(null, form({ ...AHMED, name: "خالد", startDate: "2027-02-01", payDay: "28" }));
    const khaled = (salaried as { data: { id: string } }).data.id;
    expect((await months(khaled)).map((m) => m.periodYm)).toEqual(["2027-02", "2027-03"]);
    const { basicSalaryHalalas: _b, payDay: _p, allowances: _a, ...plain } = { ...AHMED, name: "خالد", startDate: "2027-02-01" };
    expect(await updateEmployee(khaled, null, form(plain))).toEqual({ ok: true, data: null });
    expect(await months(khaled)).toEqual([]);
    expect(await q(`SELECT "state" FROM "Plan" WHERE "employeeId" = $1`, [khaled])).toEqual([{ state: "ARCHIVED" }]);
    await totalsHold();
  });
});
