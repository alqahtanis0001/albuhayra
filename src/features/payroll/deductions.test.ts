import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Deductions on real Postgres (spec §3.4; D8, D9, Z4). The auth mock is
 * role-aware, the clock fixed (Date only).
 */

const ctxOf = (id: string, role: "OWNER" | "STAFF") => ({
  user: { id, role, status: "ACTIVE", canEdit: true, establishmentId: "est1" },
  establishmentId: "est1",
});

const h = vi.hoisted(() => ({ lite: null as PGlite | null, ctx: null as unknown as ReturnType<typeof ctxOf> }));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/lib/auth", () => {
  const as = (role?: string) => async () => {
    if (role && h.ctx.user.role !== role) throw new Error("NEXT_REDIRECT");
    return h.ctx;
  };
  return { requireUser: as(), requireMember: as(), requireOwner: as("OWNER"), requireStaff: as("STAFF"), requireCanEdit: as() };
});
vi.mock("@/lib/db", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { pgliteClient } = await import("@/lib/testing/pgliteClient");
  h.lite = new PGlite();
  return { db: pgliteClient(h.lite) };
});

await import("@/lib/db");
const { createEmployee } = await import("@/features/employees/actions");
const { endEmployment } = await import("@/features/employees/lifecycle");
const { addDeduction, deleteDeduction } = await import("./deductions");
const { getPayslip } = await import("@/features/employees/payslip");
const { getEmployeeMonth } = await import("@/features/attendance/month");
const { createTransaction } = await import("@/features/transactions/actions");
const { getPlan } = await import("@/features/plans/queries");

const MIGRATIONS = join(process.cwd(), "prisma", "migrations");

async function q<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await h.lite!.query<T>(sql, params)).rows;
}
function form(fields: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.append(k, v);
  return f;
}
const deduct = (periodYm: string, amountHalalas: number, reason = "غياب يوم") =>
  addDeduction(emp, null, form({ periodYm, amountHalalas: String(amountHalalas), reason }));

async function month(ym: string) {
  return (await q<{ id: string; amountDueHalalas: number; paidHalalas: number }>(
    `SELECT i."id", i."amountDueHalalas", i."paidHalalas" FROM "Instalment" i JOIN "Plan" p ON p."id" = i."planId"
     WHERE p."employeeId" = $1 AND i."periodYm" = $2`, [emp, ym],
  ))[0]!;
}
async function totalsHold(): Promise<void> {
  const rows = await q<{ total: number; sum: string | null }>(
    `SELECT p."totalHalalas" AS total, (SELECT sum(i."amountDueHalalas") FROM "Instalment" i WHERE i."planId" = p."id") AS sum
     FROM "Plan" p WHERE p."kind" = 'SALARY'`,
  );
  for (const r of rows) expect(r.total).toBe(Number(r.sum ?? 0));
}

let emp = "";

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-10T09:00:00Z"));
  const dirs = readdirSync(MIGRATIONS, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  for (const dir of dirs) await h.lite!.exec(readFileSync(join(MIGRATIONS, dir, "migration.sql"), "utf8"));
  await h.lite!.exec(`
    INSERT INTO "Establishment" ("id", "name", "joinCode") VALUES ('est1', 'منشأة', 'ABCD2345');
    INSERT INTO "User" ("id", "email", "passwordHash", "role", "status", "establishmentId", "firstName", "lastName") VALUES
      ('u_owner', 'o@example.com', 'h', 'OWNER', 'ACTIVE', 'est1', 'سالم', 'الشهري'),
      ('u_staff', 's@example.com', 'h', 'STAFF', 'ACTIVE', 'est1', 'فهد', 'ع');
  `);
  h.ctx = ctxOf("u_owner", "OWNER");
  const r = await createEmployee(null, form({
    name: "أحمد", startDate: "2026-09-01", basicSalaryHalalas: "500000", payDay: "27",
    allowances: JSON.stringify([{ type: "HOUSING", amountHalalas: 100000 }]),
  }));
  emp = (r as { data: { id: string } }).data.id;
}, 60_000);

beforeEach(() => void (h.ctx = ctxOf("u_owner", "OWNER")));
afterAll(() => vi.useRealTimers());

describe("deductions (D9, D8, Z4)", () => {
  it("reduce the month's instalment; the total follows by aggregate; the payslip lists them", async () => {
    expect(await deduct("2026-10", 50000)).toEqual({ ok: true, data: null });
    expect(await month("2026-10")).toMatchObject({ amountDueHalalas: 550000 });
    await totalsHold();
    const slip = await getPayslip("est1", emp, "2026-10");
    expect(slip).toMatchObject({ grossHalalas: 600000, deductionsHalalas: 50000, netHalalas: 550000, deductions: [{ amountHalalas: 50000, reason: "غياب يوم" }] });
    const sheet = await getEmployeeMonth("est1", emp, "2026-10");
    expect(sheet?.salary).toMatchObject({ editable: true, deductionsHalalas: 50000, netHalalas: 550000 });
    expect(await q(`SELECT count(*)::int AS n FROM "AuditLog" WHERE "action" = 'DEDUCTION_ADD'`)).toEqual([{ n: 1 }]);
  });

  it("Σ deductions may not exceed the gross; exactly the gross gives net 0, read as PAID with nothing remaining", async () => {
    expect(await deduct("2026-10", 550001)).toMatchObject({ fieldErrors: { amountHalalas: "err.deductionExceedsGross" } });
    expect(await deduct("2026-10", 550000, "إجازة بدون راتب")).toEqual({ ok: true, data: null });
    expect(await month("2026-10")).toMatchObject({ amountDueHalalas: 0, paidHalalas: 0 });
    expect((await getPayslip("est1", emp, "2026-10"))?.remainingHalalas).toBe(0);
    const plan = await getPlan("est1", (await q<{ id: string }>(`SELECT "id" FROM "Plan" WHERE "employeeId" = $1`, [emp]))[0]!.id);
    expect(plan?.instalments.find((i) => i.periodYm === "2026-10")?.status).toBe("PAID");
    await totalsHold();
  });

  it("delete brings the amount back and is audited", async () => {
    const [big] = await q<{ id: string }>(`SELECT "id" FROM "SalaryDeduction" WHERE "amountHalalas" = 550000`);
    expect(await deleteDeduction(big!.id)).toEqual({ ok: true, data: null });
    expect(await month("2026-10")).toMatchObject({ amountDueHalalas: 550000 });
    expect(await q(`SELECT count(*)::int AS n FROM "AuditLog" WHERE "action" = 'DEDUCTION_DELETE'`)).toEqual([{ n: 1 }]);
    await totalsHold();
  });

  it("Z4: a month with a payment refuses both adding and deleting", async () => {
    const [cat] = await q<{ id: string }>(`SELECT "categoryId" AS id FROM "Plan" WHERE "employeeId" = $1`, [emp]);
    const nov = await month("2026-11");
    expect(await deduct("2026-11", 1000)).toEqual({ ok: true, data: null });
    const pay = form({ date: "2026-10-10", direction: "OUT", amountHalalas: "1000", categoryId: cat!.id, paymentMethod: "CASH", instalmentId: nov.id });
    expect(await createTransaction(null, pay)).toEqual({ ok: true, data: null });
    expect(await deduct("2026-11", 1000)).toEqual({ ok: false, error: "err.salaryPeriodPaid" });
    const [novDeduction] = await q<{ id: string }>(`SELECT d."id" FROM "SalaryDeduction" d JOIN "SalaryPeriod" s ON s."id" = d."salaryPeriodId" WHERE s."periodYm" = '2026-11'`);
    expect(await deleteDeduction(novDeduction!.id)).toEqual({ ok: false, error: "err.salaryPeriodPaid" });
    expect((await getEmployeeMonth("est1", emp, "2026-11"))?.salary?.editable).toBe(false);
  });

  it("Z4/D5: a payment whose allocation has not run (paid cache still 0) closes the month too — add and delete refused", async () => {
    const oct = await month("2026-10");
    expect(oct.paidHalalas).toBe(0);
    const [cat] = await q<{ id: string }>(`SELECT "categoryId" AS id FROM "Plan" WHERE "employeeId" = $1`, [emp]);
    // The cache-lag state, written directly: a live payment names October, `paidHalalas` untouched.
    await h.lite!.query(
      `INSERT INTO "Transaction" ("id", "establishmentId", "date", "direction", "amountHalalas", "categoryId",
         "paymentMethod", "createdById", "updatedAt", "instalmentId")
       VALUES ('tx_lag', 'est1', '2026-10-10', 'OUT', 100, $1, 'CASH', 'u_owner', now(), $2)`,
      [cat!.id, oct.id],
    );
    expect((await month("2026-10")).paidHalalas).toBe(0);
    expect(await deduct("2026-10", 1000)).toEqual({ ok: false, error: "err.salaryPeriodPaid" });
    const [octDeduction] = await q<{ id: string }>(
      `SELECT d."id" FROM "SalaryDeduction" d JOIN "SalaryPeriod" s ON s."id" = d."salaryPeriodId" WHERE s."periodYm" = '2026-10'`,
    );
    expect(await deleteDeduction(octDeduction!.id)).toEqual({ ok: false, error: "err.salaryPeriodPaid" });
    expect((await getEmployeeMonth("est1", emp, "2026-10"))?.salary?.editable).toBe(false);
    // A soft-deleted payment does not close it (the D5 predicate counts live payments only).
    await h.lite!.exec(`UPDATE "Transaction" SET "deletedAt" = now() WHERE "id" = 'tx_lag'`);
    expect((await getEmployeeMonth("est1", emp, "2026-10"))?.salary?.editable).toBe(true);
    await h.lite!.exec(`DELETE FROM "Transaction" WHERE "id" = 'tx_lag'`);
  });

  it("references are scoped: an unknown month or deduction reads as missing", async () => {
    expect(await deduct("2031-01", 1000)).toMatchObject({ fieldErrors: { periodYm: "err.notFound" } });
    expect(await addDeduction("emp_foreign", null, form({ periodYm: "2026-10", amountHalalas: "1", reason: "سبب" })))
      .toMatchObject({ fieldErrors: { periodYm: "err.notFound" } });
    expect(await deleteDeduction("ded_foreign")).toEqual({ ok: false, error: "err.notFound" });
  });

  it("spec §3.3/§3.4: STAFF with canEdit cannot add or delete a deduction", async () => {
    h.ctx = ctxOf("u_staff", "STAFF");
    await expect(deduct("2026-10", 1)).rejects.toThrow("NEXT_REDIRECT");
    await expect(deleteDeduction("anything")).rejects.toThrow("NEXT_REDIRECT");
  });

  it("Z4: once the plan is archived (employment ended), an unpaid month refuses deductions", async () => {
    vi.setSystemTime(new Date("2026-11-05T09:00:00Z"));
    expect(await endEmployment(emp, null, form({ endDate: "2026-11-01" }))).toEqual({ ok: true, data: null });
    expect(await deduct("2026-10", 1000)).toEqual({ ok: false, error: "err.salaryPeriodPaid" });
    const [octDeduction] = await q<{ id: string }>(`SELECT d."id" FROM "SalaryDeduction" d JOIN "SalaryPeriod" s ON s."id" = d."salaryPeriodId" WHERE s."periodYm" = '2026-10'`);
    expect(await deleteDeduction(octDeduction!.id)).toEqual({ ok: false, error: "err.salaryPeriodPaid" });
  });
});
