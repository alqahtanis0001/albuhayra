import { readFileSync } from "node:fs";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * The v1.2b migration on real Postgres semantics (PGlite). Expand-only: the
 * previous release keeps writing `Plan` and `Instalment` rows without the new
 * columns while Render builds this one against the shared database. The drift
 * check over every migration lives in `migration.v12a.test.ts`.
 */

const MIGRATIONS = join(process.cwd(), "prisma", "migrations");
const sql = (dir: string) => readFileSync(join(MIGRATIONS, dir, "migration.sql"), "utf8");

const UNIQUE_VIOLATION = "23505";
/** ON DELETE RESTRICT raises restrict_violation, not foreign_key_violation. */
const RESTRICT_VIOLATION = "23001";

let lite: PGlite;

async function refusal(statement: string): Promise<string | undefined> {
  try {
    await lite.query(statement);
    return undefined;
  } catch (error) {
    return (error as { code?: string }).code;
  }
}

/** Exactly what the v1.2a release writes: no kind, no employeeId, no periodYm. */
const OLD_PLAN = (id: string) =>
  `INSERT INTO "Plan" ("id", "establishmentId", "partyId", "direction", "title", "totalHalalas",
     "categoryId", "startDate", "updatedAt")
   VALUES ('${id}', 'est1', 'party1', 'OUT', 'توريد', 10000, 'cat1', '2026-09-01', now())`;
const OLD_INSTALMENT = (id: string, planId: string, seq: number) =>
  `INSERT INTO "Instalment" ("id", "establishmentId", "planId", "seq", "dueDate", "amountDueHalalas", "updatedAt")
   VALUES ('${id}', 'est1', '${planId}', ${seq}, '2026-10-01', 5000, now())`;

beforeAll(async () => {
  lite = new PGlite();
  await lite.exec(sql("20260929000000_init"));
  await lite.exec(`
    INSERT INTO "Establishment" ("id", "name", "joinCode") VALUES ('est1', 'منشأة', 'ABCD2345');
    INSERT INTO "User" ("id", "email", "name", "passwordHash", "role", "status", "establishmentId")
      VALUES ('u1', 'o@example.com', 'سالم الشهري', 'h', 'OWNER', 'ACTIVE', 'est1');
    INSERT INTO "Category" ("id", "establishmentId", "nameAr", "type") VALUES ('cat1', 'est1', 'رواتب', 'OUT');
  `);
  await lite.exec(sql("20260930000000_v1_1e_email_names"));
  await lite.exec(sql("20261001000000_v1_2a_parties_projects_plans"));
  await lite.exec(`
    INSERT INTO "Party" ("id", "establishmentId", "name", "type", "updatedAt")
      VALUES ('party1', 'est1', 'مورد', 'SUPPLIER', now()),
             ('party_emp', 'est1', 'أحمد', 'EMPLOYEE', now());
  `);
  await lite.query(OLD_PLAN("plan_before"));
  await lite.query(OLD_INSTALMENT("inst_before", "plan_before", 1));
  await lite.exec(sql("20261002000000_v1_2b_employees_salaries"));
}, 60_000);

describe("v1.2b is expand-only", () => {
  it("keeps plans and instalments written before it, as STANDARD with no month", async () => {
    const plan = await lite.query(`SELECT "kind", "employeeId" FROM "Plan" WHERE "id" = 'plan_before'`);
    expect(plan.rows[0]).toEqual({ kind: "STANDARD", employeeId: null });
    const inst = await lite.query(`SELECT "periodYm" FROM "Instalment" WHERE "id" = 'inst_before'`);
    expect(inst.rows[0]).toEqual({ periodYm: null });
  });

  it("the previous release's Plan and Instalment inserts (no new columns) still succeed", async () => {
    expect(await refusal(OLD_PLAN("plan_old_release"))).toBeUndefined();
    expect(await refusal(OLD_INSTALMENT("inst_old_a", "plan_old_release", 1))).toBeUndefined();
    const { rows } = await lite.query(`SELECT "kind" FROM "Plan" WHERE "id" = 'plan_old_release'`);
    expect(rows[0]).toEqual({ kind: "STANDARD" });
  });

  it("many instalments of one plan may have no month (nulls never collide)", async () => {
    expect(await refusal(OLD_INSTALMENT("inst_old_b", "plan_old_release", 2))).toBeUndefined();
    expect(await refusal(OLD_INSTALMENT("inst_old_c", "plan_old_release", 3))).toBeUndefined();
  });

  it("every new table carries a NOT NULL establishmentId", async () => {
    const { rows } = await lite.query<{ table_name: string; is_nullable: string }>(
      `SELECT table_name, is_nullable FROM information_schema.columns
       WHERE column_name = 'establishmentId' AND table_name IN
         ('Employee', 'EmployeeAllowance', 'SalaryPeriod', 'SalaryDeduction', 'AttendanceRecord')`,
    );
    expect(rows.map((r) => r.table_name).sort()).toEqual(
      ["AttendanceRecord", "Employee", "EmployeeAllowance", "SalaryDeduction", "SalaryPeriod"],
    );
    for (const row of rows) expect(row.is_nullable).toBe("NO");
  });

  it("stores no identity, iqama, IBAN or birth-date column (spec §3.1)", async () => {
    const { rows } = await lite.query<{ c: string }>(
      `SELECT table_name || '.' || column_name AS c FROM information_schema.columns
       WHERE table_name IN ('Employee', 'EmployeeAllowance', 'SalaryPeriod', 'Party')
         AND column_name ~* '(iqama|iban|national|birth|dob|passport|photo|document)'`,
    );
    expect(rows).toEqual([]);
  });
});

describe("the salary constraints", () => {
  beforeAll(async () => {
    await lite.exec(`
      INSERT INTO "Employee" ("id", "establishmentId", "partyId", "startDate", "updatedAt")
        VALUES ('emp1', 'est1', 'party_emp', '2026-09-01', now());
      INSERT INTO "Plan" ("id", "establishmentId", "partyId", "direction", "title", "totalHalalas",
          "categoryId", "startDate", "updatedAt", "kind", "employeeId")
        VALUES ('plan_sal', 'est1', 'party_emp', 'OUT', 'راتب شهري', 500000, 'cat1', '2026-10-01', now(), 'SALARY', 'emp1');
      INSERT INTO "Instalment" ("id", "establishmentId", "planId", "seq", "dueDate", "amountDueHalalas", "updatedAt", "periodYm")
        VALUES ('inst_oct', 'est1', 'plan_sal', 24321, '2026-10-27', 500000, now(), '2026-10');
      INSERT INTO "SalaryPeriod" ("id", "establishmentId", "employeeId", "instalmentId", "periodYm",
          "basicHalalas", "allowances", "grossHalalas", "updatedAt")
        VALUES ('sp_oct', 'est1', 'emp1', 'inst_oct', '2026-10', 500000, '[]', 500000, now());
      -- Each Restrict case below needs a row held by exactly one reference,
      -- or a different foreign key would refuse the delete and hide a missing one.
      INSERT INTO "Party" ("id", "establishmentId", "name", "type", "updatedAt")
        VALUES ('party_iso', 'est1', 'سعد', 'EMPLOYEE', now()),
               ('party_p', 'est1', 'فهد', 'EMPLOYEE', now());
      INSERT INTO "Employee" ("id", "establishmentId", "partyId", "startDate", "updatedAt")
        VALUES ('emp_iso', 'est1', 'party_iso', '2026-09-01', now()),
               ('emp_plan', 'est1', 'party_p', '2026-09-01', now());
      INSERT INTO "Plan" ("id", "establishmentId", "partyId", "direction", "title", "totalHalalas",
          "categoryId", "startDate", "updatedAt", "kind", "employeeId")
        VALUES ('plan_iso', 'est1', 'party1', 'OUT', 'راتب شهري', 0, 'cat1', '2026-10-01', now(), 'SALARY', 'emp_plan');
    `);
  });

  it("refuses a second instalment for the same plan and month (D2 idempotence)", async () => {
    const code = await refusal(
      `INSERT INTO "Instalment" ("id", "establishmentId", "planId", "seq", "dueDate", "amountDueHalalas", "updatedAt", "periodYm")
       VALUES ('inst_dup', 'est1', 'plan_sal', 24321, '2026-10-27', 500000, now(), '2026-10')`,
    );
    expect(code).toBe(UNIQUE_VIOLATION);
  });

  it("refuses a second salary period for the same employee and month (S3)", async () => {
    await lite.exec(`
      INSERT INTO "Instalment" ("id", "establishmentId", "planId", "seq", "dueDate", "amountDueHalalas", "updatedAt", "periodYm")
        VALUES ('inst_other', 'est1', 'plan_before', 2, '2026-10-27', 500000, now(), '2026-10');
    `);
    const code = await refusal(
      `INSERT INTO "SalaryPeriod" ("id", "establishmentId", "employeeId", "instalmentId", "periodYm",
         "basicHalalas", "allowances", "grossHalalas", "updatedAt")
       VALUES ('sp_dup', 'est1', 'emp1', 'inst_other', '2026-10', 1, '[]', 1, now())`,
    );
    expect(code).toBe(UNIQUE_VIOLATION);
  });

  it("one login links to at most one employee", async () => {
    await lite.exec(`
      INSERT INTO "Party" ("id", "establishmentId", "name", "type", "updatedAt")
        VALUES ('party_emp2', 'est1', 'خالد', 'EMPLOYEE', now());
      UPDATE "Employee" SET "userId" = 'u1' WHERE "id" = 'emp1';
    `);
    const code = await refusal(
      `INSERT INTO "Employee" ("id", "establishmentId", "partyId", "userId", "startDate", "updatedAt")
       VALUES ('emp2', 'est1', 'party_emp2', 'u1', '2026-09-01', now())`,
    );
    expect(code).toBe(UNIQUE_VIOLATION);
  });

  /** Restrict, not Prisma's optional-relation default SET NULL (N3, N5). */
  it.each([
    ["Party", "party_iso", "an employee's party"],
    ["Instalment", "inst_oct", "a salary period's instalment"],
    ["Employee", "emp_plan", "an employee with a salary plan"],
  ])("refuses to delete %s %s — %s (Restrict)", async (table, id) => {
    expect(await refusal(`DELETE FROM "${table}" WHERE "id" = '${id}'`)).toBe(RESTRICT_VIOLATION);
    const { rows } = await lite.query(`SELECT 1 FROM "${table}" WHERE "id" = '${id}'`);
    expect(rows).toHaveLength(1);
  });

  it("D6/N5 order: deductions → periods → instalments deletes cleanly", async () => {
    await lite.exec(`
      INSERT INTO "Instalment" ("id", "establishmentId", "planId", "seq", "dueDate", "amountDueHalalas", "updatedAt", "periodYm")
        VALUES ('inst_nov', 'est1', 'plan_sal', 24322, '2026-11-27', 500000, now(), '2026-11');
      INSERT INTO "SalaryPeriod" ("id", "establishmentId", "employeeId", "instalmentId", "periodYm",
          "basicHalalas", "allowances", "grossHalalas", "updatedAt")
        VALUES ('sp_nov', 'est1', 'emp1', 'inst_nov', '2026-11', 500000, '[]', 500000, now());
      INSERT INTO "SalaryDeduction" ("id", "establishmentId", "salaryPeriodId", "amountHalalas", "reason", "createdById")
        VALUES ('ded1', 'est1', 'sp_nov', 1000, 'غياب', 'u1');
    `);
    expect(await refusal(`DELETE FROM "SalaryPeriod" WHERE "id" = 'sp_nov'`)).toBe(RESTRICT_VIOLATION);
    await lite.exec(`
      DELETE FROM "SalaryDeduction" WHERE "salaryPeriodId" = 'sp_nov';
      DELETE FROM "SalaryPeriod" WHERE "id" = 'sp_nov';
      DELETE FROM "Instalment" WHERE "id" = 'inst_nov';
    `);
    const { rows } = await lite.query(`SELECT 1 FROM "Instalment" WHERE "id" = 'inst_nov'`);
    expect(rows).toHaveLength(0);
  });

  it("one attendance row per employee per day", async () => {
    await lite.exec(`
      INSERT INTO "AttendanceRecord" ("id", "establishmentId", "employeeId", "date", "status", "recordedById", "updatedAt")
        VALUES ('att1', 'est1', 'emp1', '2026-10-04', 'PRESENT', 'u1', now());
    `);
    const code = await refusal(
      `INSERT INTO "AttendanceRecord" ("id", "establishmentId", "employeeId", "date", "status", "recordedById", "updatedAt")
       VALUES ('att2', 'est1', 'emp1', '2026-10-04', 'LATE', 'u1', now())`,
    );
    expect(code).toBe(UNIQUE_VIOLATION);
  });
});
