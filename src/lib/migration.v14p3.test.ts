import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * v1.4 part 3 (docs/V14-SPEC.md D29 R7, D30): the one data migration renames
 * the seeded IN category «دفعة من عميل» → «سداد من عميل» — exact name, IN only,
 * and never where the establishment already has a «سداد من عميل» of its own.
 * Run on real Postgres semantics (PGlite) with rows seeded *before* the
 * directory is applied, so an inverted or dropped guard shows (qa-tests F8).
 */

const MIGRATIONS = join(process.cwd(), "prisma", "migrations");
const V14P3 = "20261011000000_v14_p3_customer_payment_name";
const sql = (dir: string) => readFileSync(join(MIGRATIONS, dir, "migration.sql"), "utf8");

const EST = (id: string, code: string) =>
  `INSERT INTO "Establishment" ("id", "name", "joinCode") VALUES ('${id}', 'منشأة', '${code}')`;
const CAT = (id: string, est: string, name: string, type: "IN" | "OUT") =>
  `INSERT INTO "Category" ("id", "establishmentId", "nameAr", "type") VALUES ('${id}', '${est}', '${name}', '${type}')`;

let lite: PGlite;

beforeAll(async () => {
  lite = new PGlite();
  const dirs = readdirSync(MIGRATIONS, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name < V14P3)
    .map((e) => e.name)
    .sort();
  for (const dir of dirs) await lite.exec(sql(dir));
  await lite.query(EST("estA", "AAAA2345"));
  await lite.query(EST("estB", "BBBB2345"));
  await lite.query(EST("estC", "CCCC2345"));
  // A: the plain seeded row. B: the seeded row beside a hand-made «سداد من عميل». C: an OUT row with the
  // old name (never seeded, but the guard must not care) and a hand-renamed near miss.
  await lite.query(CAT("a_old", "estA", "دفعة من عميل", "IN"));
  await lite.query(CAT("b_old", "estB", "دفعة من عميل", "IN"));
  await lite.query(CAT("b_new", "estB", "سداد من عميل", "IN"));
  await lite.query(CAT("c_out", "estC", "دفعة من عميل", "OUT"));
  await lite.query(CAT("c_ren", "estC", "دفعة من العميل", "IN"));
  await lite.exec(sql(V14P3));
}, 60_000);

describe("v1.4 part 3 data migration (R7)", () => {
  it("renames exactly the seeded IN row, skips an establishment that already has the new name, leaves OUT and near-miss names alone", async () => {
    const { rows } = await lite.query<{ id: string; nameAr: string }>(`SELECT "id", "nameAr" FROM "Category" ORDER BY "id"`);
    expect(Object.fromEntries(rows.map((r) => [r.id, r.nameAr]))).toEqual({
      a_old: "سداد من عميل",
      b_old: "دفعة من عميل",
      b_new: "سداد من عميل",
      c_out: "دفعة من عميل",
      c_ren: "دفعة من العميل",
    });
  });

  it("changes no shape: the Category columns are the ones every earlier release wrote", async () => {
    const { rows } = await lite.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'Category' ORDER BY column_name`,
    );
    expect(rows.map((r) => r.column_name)).toEqual(["active", "establishmentId", "id", "nameAr", "sortOrder", "type"]);
  });
});
