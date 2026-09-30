import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * The v1.2c migration on real Postgres semantics (PGlite). Expand-only: the
 * v1.2b release keeps inserting `Establishment` and `Party` rows without the
 * new columns while Render builds this one against the shared database. The
 * drift check over every migration (enum labels included) lives in
 * `migration.v12a.test.ts`.
 */

const MIGRATIONS = join(process.cwd(), "prisma", "migrations");
const V12C = "20261003000000_v1_2c_reminders";
const sql = (dir: string) => readFileSync(join(MIGRATIONS, dir, "migration.sql"), "utf8");

const UNIQUE_VIOLATION = "23505";
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

/** Exactly what the v1.2b release writes: no digest columns, no opt-in. */
const OLD_ESTABLISHMENT = (id: string, code: string) =>
  `INSERT INTO "Establishment" ("id", "name", "joinCode") VALUES ('${id}', 'منشأة', '${code}')`;
const OLD_PARTY = (id: string) =>
  `INSERT INTO "Party" ("id", "establishmentId", "name", "type", "updatedAt")
   VALUES ('${id}', 'est1', 'عميل ${id}', 'CUSTOMER', now())`;
const CLAIM = (id: string, est: string, date: string, status = "PENDING") =>
  `INSERT INTO "ReminderDigest" ("id", "establishmentId", "date", "status")
   VALUES ('${id}', '${est}', '${date}', '${status}')`;

beforeAll(async () => {
  lite = new PGlite();
  const dirs = readdirSync(MIGRATIONS, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name < V12C)
    .map((e) => e.name)
    .sort();
  for (const dir of dirs) await lite.exec(sql(dir));
  await lite.query(OLD_ESTABLISHMENT("est1", "ABCD2345"));
  await lite.query(OLD_PARTY("party_before"));
  await lite.exec(sql(V12C));
}, 60_000);

describe("v1.2c is expand-only", () => {
  it("rows written before it read digest off at 07:00 and reminders not opted in", async () => {
    const est = await lite.query(`SELECT "digestEnabled", "digestHour" FROM "Establishment" WHERE "id" = 'est1'`);
    expect(est.rows[0]).toEqual({ digestEnabled: false, digestHour: 7 });
    const party = await lite.query(`SELECT "remindersOptIn" FROM "Party" WHERE "id" = 'party_before'`);
    expect(party.rows[0]).toEqual({ remindersOptIn: false });
  });

  it("the previous release's Establishment and Party inserts (no new columns) still succeed", async () => {
    expect(await refusal(OLD_ESTABLISHMENT("est_old", "WXYZ6789"))).toBeUndefined();
    expect(await refusal(OLD_PARTY("party_old"))).toBeUndefined();
    const est = await lite.query(`SELECT "digestEnabled", "digestHour" FROM "Establishment" WHERE "id" = 'est_old'`);
    expect(est.rows[0]).toEqual({ digestEnabled: false, digestHour: 7 });
    const party = await lite.query(`SELECT "remindersOptIn" FROM "Party" WHERE "id" = 'party_old'`);
    expect(party.rows[0]).toEqual({ remindersOptIn: false });
  });

  it("the new table carries a NOT NULL establishmentId and no amount column", async () => {
    const { rows } = await lite.query<{ column_name: string; is_nullable: string }>(
      `SELECT column_name, is_nullable FROM information_schema.columns
       WHERE table_name = 'ReminderDigest' ORDER BY column_name`,
    );
    expect(rows.map((r) => r.column_name)).toEqual(
      ["createdAt", "date", "establishmentId", "id", "itemCount", "status"],
    );
    expect(rows.find((r) => r.column_name === "establishmentId")?.is_nullable).toBe("NO");
  });

  it("the digest status enum has exactly PENDING, SENT, EMPTY, FAILED", async () => {
    const { rows } = await lite.query<{ s: string }>(
      `SELECT string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder) AS s
       FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid WHERE t.typname = 'DigestStatus'`,
    );
    expect(rows[0]?.s).toBe("PENDING,SENT,EMPTY,FAILED");
  });
});

describe("the daily claim (C5)", () => {
  it("refuses a second claim for the same establishment and day, whatever its status", async () => {
    expect(await refusal(CLAIM("d1", "est1", "2026-10-05"))).toBeUndefined();
    expect(await refusal(CLAIM("d2", "est1", "2026-10-05", "SENT"))).toBe(UNIQUE_VIOLATION);
    const { rows } = await lite.query(`SELECT "id" FROM "ReminderDigest" WHERE "establishmentId" = 'est1'`);
    expect(rows).toEqual([{ id: "d1" }]);
  });

  it("allows the next day, and another establishment the same day", async () => {
    expect(await refusal(CLAIM("d3", "est1", "2026-10-06"))).toBeUndefined();
    expect(await refusal(CLAIM("d4", "est_old", "2026-10-05"))).toBeUndefined();
  });

  it("a claim defaults to zero items", async () => {
    const { rows } = await lite.query(`SELECT "itemCount" FROM "ReminderDigest" WHERE "id" = 'd1'`);
    expect(rows[0]).toEqual({ itemCount: 0 });
  });

  it("an establishment with digest records cannot be deleted (Restrict)", async () => {
    expect(await refusal(`DELETE FROM "Establishment" WHERE "id" = 'est_old'`)).toBe(RESTRICT_VIOLATION);
  });
});
