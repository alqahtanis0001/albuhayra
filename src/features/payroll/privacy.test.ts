import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Spec §3.5 on real Postgres: a STAFF session never receives another
 * employee's salary-linked row — ledger, search, totals, «حركاتي الأخيرة», the
 * dues card, the payment prefill, the edit page — while every unlinked row
 * stays visible (the SQL-NULL trap of a negated relation filter). Each hidden
 * row is hidden by exactly one branch of `salaryLinkedWhere` (Y3), so dropping
 * any branch fails a named case.
 */

const h = vi.hoisted(() => ({
  lite: null as PGlite | null,
  ctx: { user: { id: "u_owner", role: "OWNER", status: "ACTIVE", canEdit: true, establishmentId: "est1" }, establishmentId: "est1" },
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/lib/auth", () => {
  const context = async () => h.ctx;
  return { requireUser: context, requireMember: context, requireOwner: context, requireCanEdit: context, requireStaff: context };
});
vi.mock("@/lib/db", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { pgliteClient } = await import("@/lib/testing/pgliteClient");
  h.lite = new PGlite();
  return { db: pgliteClient(h.lite) };
});

await import("@/lib/db");
const { createEmployee } = await import("@/features/employees/actions");
const { listTransactions, getTransaction } = await import("@/features/transactions/queries");
const { createTransaction, updateTransaction } = await import("@/features/transactions/actions");
const { getStaffDashboard } = await import("@/features/dashboard/queries");
const { getStaffDues, getStaffPaymentPrefill, getDues } = await import("@/features/plans/dues");
const { listPlans } = await import("@/features/plans/queries");
const { updatePlan, cancelPlan, archivePlan } = await import("@/features/plans/actions");
const { listParties } = await import("@/features/parties/queries");
const { getPartyStatement } = await import("@/features/parties/statement");

const MIGRATIONS = join(process.cwd(), "prisma", "migrations");
const OWNER = { ...h.ctx };
const STAFF = {
  user: { id: "u_staff", role: "STAFF", status: "ACTIVE", canEdit: true, establishmentId: "est1" },
  establishmentId: "est1",
};

const asOwner = () => void (h.ctx = OWNER);
const asStaff = () => void (h.ctx = STAFF as typeof h.ctx);

let ahmed = "";
let ahmedParty = "";
let salaryInstalment = "";

function entry(fields: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries({ date: "2026-10-10", direction: "OUT", paymentMethod: "CASH", ...fields })) f.append(k, v);
  return f;
}

const tx = (id: string, party: string | null, category: string, extra = "NULL", by = "u_owner") =>
  `('${id}', 'est1', '2026-10-05', 'OUT', 1000, '${category}', 'CASH', '${by}', now(), ${party ? `'${party}'` : "NULL"}, ${extra}, 'ملاحظة أحمد')`;

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-10T09:00:00Z"));
  const dirs = readdirSync(MIGRATIONS, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  for (const dir of dirs) await h.lite!.exec(readFileSync(join(MIGRATIONS, dir, "migration.sql"), "utf8"));
  await h.lite!.exec(`
    INSERT INTO "Establishment" ("id", "name", "joinCode") VALUES ('est1', 'منشأة', 'ABCD2345');
    INSERT INTO "User" ("id", "email", "passwordHash", "role", "status", "establishmentId", "firstName", "lastName", "canEdit")
      VALUES ('u_owner', 'o@example.com', 'h', 'OWNER', 'ACTIVE', 'est1', 'سالم', 'الشهري', true),
             ('u_staff', 's@example.com', 'h', 'STAFF', 'ACTIVE', 'est1', 'فهد', 'العتيبي', true);
    INSERT INTO "Category" ("id", "establishmentId", "nameAr", "type") VALUES
      ('cat_sal', 'est1', 'رواتب', 'OUT'), ('cat_rent', 'est1', 'إيجار', 'OUT');
    INSERT INTO "Party" ("id", "establishmentId", "name", "type", "updatedAt") VALUES
      ('party_sup', 'est1', 'مورد', 'SUPPLIER', now()),
      ('party_legacy', 'est1', 'عامل قديم', 'EMPLOYEE', now());
    INSERT INTO "Plan" ("id", "establishmentId", "partyId", "direction", "title", "totalHalalas", "categoryId", "startDate", "updatedAt")
      VALUES ('plan_std', 'est1', 'party_sup', 'OUT', 'توريد', 5000, 'cat_rent', '2026-10-01', now());
    INSERT INTO "Instalment" ("id", "establishmentId", "planId", "seq", "dueDate", "amountDueHalalas", "updatedAt")
      VALUES ('inst_std', 'est1', 'plan_std', 1, '2026-10-11', 5000, now());
  `);
  // Ruling 2: a v1.2a-style agreement with a موظف party in «رواتب» — STANDARD, still a salary.
  await h.lite!.exec(`
    INSERT INTO "Category" ("id", "establishmentId", "nameAr", "type") VALUES ('cat_legacy_sal', 'est1', 'رواتب', 'OUT');
    INSERT INTO "Plan" ("id", "establishmentId", "partyId", "direction", "title", "totalHalalas", "categoryId", "startDate", "updatedAt")
      VALUES ('plan_legacy', 'est1', 'party_legacy', 'OUT', 'راتب قديم', 3000, 'cat_legacy_sal', '2026-10-01', now());
    INSERT INTO "Instalment" ("id", "establishmentId", "planId", "seq", "dueDate", "amountDueHalalas", "updatedAt")
      VALUES ('inst_legacy', 'est1', 'plan_legacy', 1, '2026-10-13', 3000, now());
  `);

  // Ahmed's salary is paid on the 12th, so this month is inside the dues window.
  const created = await createEmployee(null, entry({
    name: "أحمد سالم", startDate: "2026-09-01", basicSalaryHalalas: "500000", payDay: "12",
  }));
  ahmed = (created as { data: { id: string } }).data.id;
  const [row] = (await h.lite!.query<{ partyId: string; instalmentId: string }>(
    `SELECT e."partyId", i."id" AS "instalmentId" FROM "Employee" e JOIN "Plan" p ON p."employeeId" = e."id"
     JOIN "Instalment" i ON i."planId" = p."id" WHERE e."id" = $1 AND i."periodYm" = '2026-10'`, [ahmed],
  )).rows;
  ahmedParty = row!.partyId;
  salaryInstalment = row!.instalmentId;

  // A salary category renamed after it was chosen: only the id branch catches it.
  await h.lite!.exec(`UPDATE "Category" SET "nameAr" = 'أجور' WHERE "id" = 'cat_sal';
    INSERT INTO "Category" ("id", "establishmentId", "nameAr", "type") VALUES ('cat_sal_name', 'est1', 'رواتب', 'OUT');`);
  await h.lite!.exec(`
    INSERT INTO "Transaction" ("id", "establishmentId", "date", "direction", "amountHalalas", "categoryId", "paymentMethod",
        "createdById", "updatedAt", "partyId", "instalmentId", "note") VALUES
      ${tx("tx_branch_instalment", ahmedParty, "cat_rent", `'${salaryInstalment}'`)},
      ${tx("tx_branch_id", ahmedParty, "cat_sal")},
      ${tx("tx_branch_name", "party_legacy", "cat_sal_name")},
      ${tx("tx_visible_no_party", null, "cat_sal")},
      ${tx("tx_visible_supplier", "party_sup", "cat_sal_name")},
      ${tx("tx_visible_legacy_rent", "party_legacy", "cat_rent")},
      ${tx("tx_visible_employee_rent", ahmedParty, "cat_rent")},
      ${tx("tx_visible_standard_payment", "party_sup", "cat_rent", "'inst_std'")};
  `);
}, 60_000);

// A failed staff case must not leave the next case signed in as STAFF.
beforeEach(asOwner);

afterAll(() => {
  vi.useRealTimers();
  asOwner();
});

const HIDDEN = ["tx_branch_instalment", "tx_branch_id", "tx_branch_name"];
const VISIBLE = ["tx_visible_employee_rent", "tx_visible_legacy_rent", "tx_visible_no_party", "tx_visible_standard_payment", "tx_visible_supplier"];

describe("spec §3.5: the staff ledger", () => {
  it("the owner sees everything", async () => {
    const page = await listTransactions("est1", { page: 1 });
    expect(page.rows.map((r) => r.id).sort()).toEqual([...HIDDEN, ...VISIBLE].sort());
  });

  it("rows: every salary-linked row is gone, every unlinked row stays", async () => {
    const page = await listTransactions("est1", { page: 1 }, { hideSalary: true });
    expect(page.rows.map((r) => r.id).sort()).toEqual(VISIBLE);
    expect(page.total).toBe(VISIBLE.length);
  });

  it("totals exclude them too", async () => {
    const page = await listTransactions("est1", { page: 1 }, { hideSalary: true });
    expect(page.filterTotals.outHalalas).toBe(VISIBLE.length * 1000);
  });

  it("search (the OR on counterparty / note / party name) cannot bring one back", async () => {
    for (const q of ["أحمد", "عامل", "ملاحظة"]) {
      const page = await listTransactions("est1", { q, page: 1 }, { hideSalary: true });
      for (const id of HIDDEN) expect(page.rows.map((r) => r.id), q).not.toContain(id);
    }
    const byParty = await listTransactions("est1", { partyId: ahmedParty, page: 1 }, { hideSalary: true });
    expect(byParty.rows.map((r) => r.id)).toEqual(["tx_visible_employee_rent"]);
  });

  it("the edit page read answers null for a hidden row, the row for a visible one", async () => {
    for (const id of HIDDEN) expect(await getTransaction("est1", id, { hideSalary: true }), id).toBeNull();
    expect(await getTransaction("est1", "tx_visible_no_party", { hideSalary: true })).not.toBeNull();
  });
});

describe("spec §3.5: staff dues, prefill and writes", () => {
  it("the owner's dues list the salary month; the staff card does not", async () => {
    const owner = await getDues("est1", "2026-10-10");
    expect(owner.thisWeek.map((r) => r.instalmentId).sort()).toEqual(["inst_legacy", "inst_std", salaryInstalment].sort());
    expect(owner.thisWeek.find((r) => r.instalmentId === salaryInstalment)).toMatchObject({
      kind: "SALARY", periodYm: "2026-10", planTitle: "راتب شهري — أحمد سالم",
    });
    const staff = await getStaffDues("est1", "2026-10-10");
    expect(staff.map((r) => r.instalmentId)).toEqual(["inst_std"]);
  });

  it("the staff payment prefill is null for a salary month and a salary agreement", async () => {
    expect(await getStaffPaymentPrefill("est1", salaryInstalment)).toBeNull();
    expect(await getStaffPaymentPrefill("est1", "inst_legacy")).toBeNull();
    expect(await getStaffPaymentPrefill("est1", "inst_std")).not.toBeNull();
  });

  it("STAFF paying a salary month gets the missing-id answer (N2); the owner may", async () => {
    asStaff();
    const pay = entry({ amountHalalas: "1000", categoryId: "cat_rent", instalmentId: salaryInstalment });
    expect(await createTransaction(null, pay)).toMatchObject({ fieldErrors: { instalmentId: "err.instalmentInvalid" } });
    const missing = entry({ amountHalalas: "1000", categoryId: "cat_rent", instalmentId: "inst_nowhere" });
    expect(await createTransaction(null, missing)).toMatchObject({ fieldErrors: { instalmentId: "err.instalmentInvalid" } });
    asOwner();
    expect(await createTransaction(null, pay)).toEqual({ ok: true, data: null });
  });

  it("ruling 2: STAFF paying a STANDARD agreement with a موظف party in «رواتب» is refused; the owner's payment is hidden", async () => {
    asStaff();
    const pay = entry({ amountHalalas: "500", categoryId: "cat_rent", instalmentId: "inst_legacy" });
    expect(await createTransaction(null, pay)).toMatchObject({ fieldErrors: { instalmentId: "err.instalmentInvalid" } });
    asOwner();
    expect(await createTransaction(null, pay)).toEqual({ ok: true, data: null });
    const [paid] = (await h.lite!.query<{ id: string }>(`SELECT "id" FROM "Transaction" WHERE "instalmentId" = 'inst_legacy'`)).rows;
    // Its category is «إيجار»: only the plan-level branch can hide it.
    expect((await listTransactions("est1", { page: 1 }, { hideSalary: true })).rows.map((r) => r.id)).not.toContain(paid!.id);
    expect((await listTransactions("est1", { page: 1 })).rows.map((r) => r.id)).toContain(paid!.id);
  });

  it("STAFF editing a hidden row gets err.notFound; a visible one saves", async () => {
    asStaff();
    const edit = entry({ amountHalalas: "2000", categoryId: "cat_rent" });
    for (const id of HIDDEN) expect(await updateTransaction(id, null, edit), id).toEqual({ ok: false, error: "err.notFound" });
    expect(await updateTransaction("tx_visible_no_party", null, edit)).toEqual({ ok: true, data: null });
    asOwner();
  });

  it("Y4: STAFF may still add a plain «رواتب» entry to an employee — it then leaves their recent list", async () => {
    asStaff();
    const plain = entry({ amountHalalas: "700", categoryId: "cat_sal_name", partyId: ahmedParty });
    expect(await createTransaction(null, plain)).toEqual({ ok: true, data: null });
    const rent = entry({ amountHalalas: "300", categoryId: "cat_rent", partyId: "party_sup" });
    expect(await createTransaction(null, rent)).toEqual({ ok: true, data: null });
    const dash = await getStaffDashboard("est1", "u_staff");
    expect(dash.myRecent.map((r) => r.amountHalalas)).toEqual([300]);
    // Aggregates may include it (spec §3.5): the month's OUT counts both.
    expect(dash.monthOutHalalas).toBeGreaterThanOrEqual(1000);
    asOwner();
  });
});

describe("the v1.2a plan screens and a salary plan (D1, Y2, Y8, X13)", () => {
  it("lists it as «راتب شهري — name», kind SALARY, جارية while the employee is active", async () => {
    const plans = await listPlans("est1", {}, "2026-10-10");
    const salary = plans.find((p) => p.kind === "SALARY")!;
    expect(salary).toMatchObject({ title: "راتب شهري — أحمد سالم", employeeId: ahmed, status: "ACTIVE" });
  });

  it("refuses edit, cancel and archive from the plan pages", async () => {
    const [plan] = (await h.lite!.query<{ id: string }>(`SELECT "id" FROM "Plan" WHERE "kind" = 'SALARY'`)).rows;
    expect(await cancelPlan(plan!.id)).toEqual({ ok: false, error: "err.salaryPlanManaged" });
    expect(await archivePlan(plan!.id)).toEqual({ ok: false, error: "err.salaryPlanManaged" });
    const valid = new FormData();
    for (const [k, v] of Object.entries({
      partyId: ahmedParty, direction: "OUT", title: "راتب", totalHalalas: "100", categoryId: "cat_rent",
      startDate: "2026-10-10", reminderDays: "3", instalments: JSON.stringify([{ dueDate: "2026-11-01", amountDueHalalas: 100 }]),
    })) valid.append(k, v);
    expect(await updatePlan(plan!.id, null, valid)).toEqual({ ok: false, error: "err.salaryPlanManaged" });
  });

  it("Y2: the statement closes at the party balance with v1.2a semantics", async () => {
    const statement = await getPartyStatement("est1", ahmedParty);
    const party = (await listParties("est1")).find((p) => p.id === ahmedParty)!;
    expect(party.employeeId).toBe(ahmed);
    expect(statement!.closingBalanceHalalas).toBe(party.owedToUsHalalas - party.owedByUsHalalas);
    expect(statement!.rows.find((r) => r.kind === "PLAN")).toMatchObject({ planTitle: "راتب شهري — أحمد سالم" });
  });

  it("Y8: prepaid in full, it still reads جارية while the employee is active", async () => {
    const [plan] = (await h.lite!.query<{ total: number; paid: string }>(
      `SELECT p."totalHalalas" AS total, (SELECT sum(t."amountHalalas") FROM "Transaction" t JOIN "Instalment" i ON i."id" = t."instalmentId"
         WHERE i."planId" = p."id" AND t."deletedAt" IS NULL) AS paid FROM "Plan" p WHERE p."kind" = 'SALARY'`,
    )).rows;
    const rest = plan!.total - Number(plan!.paid);
    expect(await createTransaction(null, entry({ amountHalalas: String(rest), categoryId: "cat_rent", instalmentId: salaryInstalment })))
      .toEqual({ ok: true, data: null });
    const salary = (await listPlans("est1", {}, "2026-10-10")).find((p) => p.kind === "SALARY")!;
    expect(salary.remainingHalalas).toBe(0);
    expect(salary.status).toBe("ACTIVE");
  });
});

describe("S-L3a: renaming «رواتب» never splits the salary category", () => {
  it("a new employee reuses the renamed category; staff still cannot see an entry on it", async () => {
    const before = (await h.lite!.query<{ n: number }>(`SELECT count(*)::int AS n FROM "Category"`)).rows[0]!.n;
    const created = await createEmployee(null, entry({
      name: "سعيد", startDate: "2026-10-01", basicSalaryHalalas: "300000", payDay: "25",
    }));
    const saeed = (created as { data: { id: string } }).data.id;
    const [row] = (await h.lite!.query<{ salaryCategoryId: string; partyId: string }>(
      `SELECT "salaryCategoryId", "partyId" FROM "Employee" WHERE "id" = $1`, [saeed],
    )).rows;
    // cat_sal is «أجور» now; it is still the salary category — no second «رواتب».
    expect(row!.salaryCategoryId).toBe("cat_sal");
    expect((await h.lite!.query<{ n: number }>(`SELECT count(*)::int AS n FROM "Category"`)).rows[0]!.n).toBe(before);
    await h.lite!.exec(`
      INSERT INTO "Transaction" ("id", "establishmentId", "date", "direction", "amountHalalas", "categoryId", "paymentMethod",
          "createdById", "updatedAt", "partyId") VALUES
        ('tx_renamed', 'est1', '2026-10-06', 'OUT', 1000, 'cat_sal', 'CASH', 'u_owner', now(), '${row!.partyId}');
    `);
    expect((await listTransactions("est1", { page: 1 }, { hideSalary: true })).rows.map((r) => r.id)).not.toContain("tx_renamed");
  });

  it("an empty salary-category set is valid SQL and keeps unlinked rows (reviewer R-L2 item 2)", async () => {
    const { db } = await import("@/lib/db");
    const { salaryLinkedWhere } = await import("@/lib/payroll");
    const rows = await db.transaction.findMany({
      where: { establishmentId: "est1", deletedAt: null, AND: [{ NOT: salaryLinkedWhere([]) }] },
      select: { id: true },
    });
    const ids = rows.map((r) => r.id);
    expect(ids).toContain("tx_visible_no_party");
    expect(ids).toContain("tx_visible_legacy_rent");
    // The name branch still hides the «رواتب»-named entry with an employee party.
    expect(ids).not.toContain("tx_branch_name");
  });
});
