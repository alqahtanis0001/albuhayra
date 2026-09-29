import { execSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

import { pgliteClient } from "@/lib/testing/pgliteClient";

/**
 * The v1.2a migration on real Postgres semantics (PGlite 0.5.8 = PG 18).
 *
 * Expand-only is what lets the previous release keep running against the one
 * shared Neon database while Render builds this one, so the old-shape insert
 * below is the case that matters most. The drift check is the substitute for
 * `migrate diff --from-migrations`, which needs a shadow database (Gotcha).
 */

const MIGRATIONS = join(process.cwd(), "prisma", "migrations");
const sql = (dir: string) => readFileSync(join(MIGRATIONS, dir, "migration.sql"), "utf8");
const INIT = sql("20260929000000_init");
const V1_1E = sql("20260930000000_v1_1e_email_names");
const V1_2A = sql("20261001000000_v1_2a_parties_projects_plans");

const FK_VIOLATION = "23503";
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

const OLD_SHAPE_INSERT = (id: string) =>
  `INSERT INTO "Transaction" ("id", "establishmentId", "date", "direction", "amountHalalas",
     "categoryId", "paymentMethod", "counterparty", "createdById", "updatedAt")
   VALUES ('${id}', 'est1', '2026-09-01', 'OUT', 5000, 'cat1', 'CASH', 'مؤجر', 'u1', now())`;

beforeAll(async () => {
  lite = new PGlite();
  await lite.exec(INIT);
  await lite.exec(`
    INSERT INTO "Establishment" ("id", "name", "joinCode") VALUES ('est1', 'منشأة', 'ABCD2345');
    INSERT INTO "User" ("id", "email", "name", "passwordHash", "role", "status", "establishmentId")
      VALUES ('u1', 'o@example.com', 'سالم الشهري', 'h', 'OWNER', 'ACTIVE', 'est1');
    INSERT INTO "Category" ("id", "establishmentId", "nameAr", "type") VALUES ('cat1', 'est1', 'إيجار', 'OUT');
  `);
  await lite.query(OLD_SHAPE_INSERT("tx_before"));
  await lite.exec(V1_1E);
  await lite.exec(V1_2A);
}, 60_000);

describe("v1.2a is expand-only", () => {
  it("keeps a row written before it, with null links", async () => {
    const { rows } = await lite.query<Record<string, unknown>>(
      `SELECT "amountHalalas", "counterparty", "partyId", "projectId", "instalmentId"
       FROM "Transaction" WHERE "id" = 'tx_before'`,
    );
    expect(rows[0]).toEqual({
      amountHalalas: 5000,
      counterparty: "مؤجر",
      partyId: null,
      projectId: null,
      instalmentId: null,
    });
  });

  it("the previous release's insert (no new columns) still succeeds", async () => {
    expect(await refusal(OLD_SHAPE_INSERT("tx_old_release"))).toBeUndefined();
  });

  it("adds only nullable columns to Transaction", async () => {
    const { rows } = await lite.query<{ column_name: string; is_nullable: string }>(
      `SELECT column_name, is_nullable FROM information_schema.columns
       WHERE table_name = 'Transaction' AND column_name IN ('partyId', 'projectId', 'instalmentId')`,
    );
    expect(rows).toHaveLength(3);
    for (const row of rows) expect(row.is_nullable).toBe("YES");
  });
});

describe("links and their foreign keys", () => {
  beforeAll(async () => {
    await lite.exec(`
      INSERT INTO "Party" ("id", "establishmentId", "name", "type", "updatedAt")
        VALUES ('party1', 'est1', 'مورد', 'SUPPLIER', now()),
               ('party2', 'est1', 'عميل', 'CUSTOMER', now());
      INSERT INTO "Project" ("id", "establishmentId", "name", "startDate", "updatedAt")
        VALUES ('proj1', 'est1', 'فرع جديد', '2026-09-01', now());
      INSERT INTO "Plan" ("id", "establishmentId", "partyId", "direction", "title", "totalHalalas",
          "categoryId", "startDate", "updatedAt")
        VALUES ('plan1', 'est1', 'party1', 'OUT', 'توريد', 10000, 'cat1', '2026-09-01', now());
      INSERT INTO "Instalment" ("id", "establishmentId", "planId", "seq", "dueDate", "amountDueHalalas", "updatedAt")
        VALUES ('inst1', 'est1', 'plan1', 1, '2026-10-01', 10000, now());
    `);
  });

  it("a transaction can reference a party, a project and an instalment", async () => {
    await lite.query(
      `INSERT INTO "Transaction" ("id", "establishmentId", "date", "direction", "amountHalalas",
         "categoryId", "paymentMethod", "createdById", "updatedAt", "partyId", "projectId", "instalmentId", "deletedAt")
       VALUES ('tx_linked', 'est1', '2026-09-02', 'OUT', 100, 'cat1', 'CASH', 'u1', now(),
         'party2', 'proj1', 'inst1', now())`,
    );
    const { rows } = await lite.query<Record<string, unknown>>(
      `SELECT "partyId", "projectId", "instalmentId" FROM "Transaction" WHERE "id" = 'tx_linked'`,
    );
    expect(rows[0]).toEqual({ partyId: "party2", projectId: "proj1", instalmentId: "inst1" });
  });

  it.each(["partyId", "projectId", "instalmentId"])("refuses a dangling %s", async (column) => {
    const code = await refusal(
      `UPDATE "Transaction" SET "${column}" = 'no_such_row' WHERE "id" = 'tx_before'`,
    );
    expect(code).toBe(FK_VIOLATION);
  });

  /**
   * V2: Restrict, not Prisma's default SET NULL — a hard delete must not strip
   * the link from a row that points at it. `tx_linked` is soft-deleted on
   * purpose: a deleted entry still holds its reference. party2 is referenced by
   * that transaction only (party1 is held by a plan, which would hide a missing
   * Restrict on the transaction link).
   */
  it.each([
    ["Party", "party2"],
    ["Project", "proj1"],
    ["Instalment", "inst1"],
  ])("refuses to delete a referenced %s (Restrict)", async (table, id) => {
    expect(await refusal(`DELETE FROM "${table}" WHERE "id" = '${id}'`)).toBe(RESTRICT_VIOLATION);
    const { rows } = await lite.query(`SELECT 1 FROM "${table}" WHERE "id" = '${id}'`);
    expect(rows).toHaveLength(1);
  });
});

describe("no drift: the migrations equal the schema", () => {
  type Shape = { columns: string[]; indexes: string[]; constraints: string[] };

  async function shape(db: PGlite): Promise<Shape> {
    const columns = await db.query<{ s: string }>(
      `SELECT table_name || '.' || column_name || ':' || data_type || ':' || udt_name || ':' ||
              is_nullable || ':' || coalesce(column_default, '') AS s
       FROM information_schema.columns WHERE table_schema = 'public' ORDER BY s`,
    );
    const indexes = await db.query<{ s: string }>(
      `SELECT indexname || ':' || indexdef AS s FROM pg_indexes WHERE schemaname = 'public' ORDER BY s`,
    );
    const constraints = await db.query<{ s: string }>(
      `SELECT c.conname || ':' || pg_get_constraintdef(c.oid) AS s
       FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace
       WHERE n.nspname = 'public' ORDER BY s`,
    );
    return {
      columns: columns.rows.map((r) => r.s),
      indexes: indexes.rows.map((r) => r.s),
      constraints: constraints.rows.map((r) => r.s),
    };
  }

  it("init → v1.1e → v1.2a has the same columns, indexes and constraints as --from-empty", async () => {
    const fromEmpty = execSync(
      "npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script",
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    const fresh = new PGlite();
    await fresh.exec(fromEmpty);

    const [migrated, expected] = await Promise.all([shape(lite), shape(fresh)]);
    expect(migrated.columns.length).toBeGreaterThan(50);
    expect(migrated).toEqual(expected);
  }, 120_000);
});

/**
 * V3: every money column is int4, but Postgres widens `sum(int4)` to bigint.
 * This drives the real generated Prisma client on PGlite (`pgliteClient`) and
 * records what an `_sum` above 2^31 arrives as, so the `Number()` at each query
 * boundary is justified by evidence.
 */
describe("V3: an _sum over int4 above 2^31", () => {
  it("is widened to bigint by Postgres and reaches the caller as a JavaScript number", async () => {
    const prisma = pgliteClient(lite);
    await lite.exec(`
      INSERT INTO "Instalment" ("id", "establishmentId", "planId", "seq", "dueDate", "amountDueHalalas", "updatedAt")
      VALUES ('big1', 'est1', 'plan1', 2, '2026-11-01', 2000000000, now()),
             ('big2', 'est1', 'plan1', 3, '2026-12-01', 2000000000, now());
    `);
    const { rows } = await lite.query<{ t: string }>(
      `SELECT pg_typeof(sum("amountDueHalalas"))::text AS t FROM "Instalment" WHERE "id" LIKE 'big%'`,
    );
    expect(rows[0]!.t).toBe("bigint");

    const grouped = await prisma.instalment.groupBy({
      by: ["planId"],
      where: { establishmentId: "est1", id: { in: ["big1", "big2"] } },
      _sum: { amountDueHalalas: true },
    });
    const sum: unknown = grouped[0]!._sum.amountDueHalalas;
    // Recorded result (PROGRESS/backend notes): see the assertion — the queries
    // still wrap every sum in Number(), which is a no-op for a number.
    expect({ type: typeof sum, value: Number(sum) }).toEqual({ type: "number", value: 4_000_000_000 });
  });

  // adapter-pg maps both 23503 and 23001 to P2003.
  it("a Restrict violation surfaces from Prisma as P2003, which the delete actions map", async () => {
    const prisma = pgliteClient(lite);
    const error = await prisma.party
      .deleteMany({ where: { establishmentId: "est1", id: "party2" } })
      .then(() => null, (e: unknown) => e as { code?: string });
    expect(error?.code).toBe("P2003");
  });
});

describe("the PGlite client stays test-only", () => {
  function walk(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) return path.endsWith("generated") ? [] : walk(path);
      return /\.tsx?$/.test(entry.name) ? [path] : [];
    });
  }

  it("nothing but a *.test.ts imports src/lib/testing/pgliteClient", () => {
    const importers = walk("src").filter(
      (file) =>
        !file.endsWith(".test.ts") &&
        /from\s+["'][^"']*testing\/pgliteClient["']/.test(readFileSync(file, "utf8")),
    );
    expect(importers).toEqual([]);
  });

  it("the pattern matches a real import", () => {
    expect('import { pgliteClient } from "@/lib/testing/pgliteClient";').toMatch(
      /from\s+["'][^"']*testing\/pgliteClient["']/,
    );
  });
});
