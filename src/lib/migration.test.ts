import { readFileSync } from "node:fs";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

import { displayName, fullName } from "./names";

/**
 * The v1.1e migration on real Postgres semantics (PGlite 0.5.8 = PG 18).
 *
 * It rewrites every user's name on the production database, which is the one
 * kind of change a mocked test cannot vouch for (Decision in PROGRESS.md). So
 * this applies `20260929000000_init`, seeds rows the way v1.1d stored them,
 * applies the v1.1e migration, and reads every column back.
 *
 * PGlite runs with ctype C.UTF-8, where `trim()` strips only U+0020 and `\s`
 * misses NBSP (reviewer S1). The cases below are the ones that differ between
 * a naive split and the locale-proof one.
 */

const MIGRATIONS = join(process.cwd(), "prisma", "migrations");
const INIT = readFileSync(join(MIGRATIONS, "20260929000000_init", "migration.sql"), "utf8");
const V1_1E = readFileSync(
  join(MIGRATIONS, "20260930000000_v1_1e_email_names", "migration.sql"),
  "utf8",
);

type Expected = [label: string, name: string, first: string, middle: string | null, last: string];

const CASES: Expected[] = [
  ["one word", "سالم", "سالم", null, ""],
  ["two words", "سالم الشهري", "سالم", null, "الشهري"],
  ["three words", "سالم علي الشهري", "سالم", "علي", "الشهري"],
  ["four words", "سالم علي محمد الشهري", "سالم", "علي محمد", "الشهري"],
  ["six words", "سالم علي محمد حسن فهد الشهري", "سالم", "علي محمد حسن فهد", "الشهري"],
  ["compound first name", "عبد الله محمد القحطاني", "عبد الله", "محمد", "القحطاني"],
  ["connectors in the middle and last", "محمد بن سلمان آل سعود", "محمد", "بن سلمان", "آل سعود"],
  ["chained connectors", "أبو عبد الله الشمري", "أبو عبد الله", null, "الشمري"],
  ["ابن and ابو", "ابو فهد ابن سعد", "ابو فهد", null, "ابن سعد"],
  ["a connector written joined is one word", "عبدالرحمن السالم", "عبدالرحمن", null, "السالم"],
  ["a trailing connector stays a word", "محمد بن", "محمد", null, "بن"],
  ["only a compound name", "عبد الله", "عبد الله", null, ""],
  ["Latin two words", "John Smith", "John", null, "Smith"],
  ["Latin four words", "Mary Anne de Souza", "Mary", "Anne de", "Souza"],
  ["double spaces", "سالم  علي   الشهري", "سالم", "علي", "الشهري"],
  ["leading and trailing spaces", "   سالم الشهري  ", "سالم", null, "الشهري"],
  ["tab", "سالم\tالشهري", "سالم", null, "الشهري"],
  ["NBSP", "سالم\u00A0الشهري", "سالم", null, "الشهري"],
  ["NBSP around the name", "\u00A0سالم الشهري\u00A0", "سالم", null, "الشهري"],
  ["ideographic space and newline", "سالم\u3000علي\nالشهري", "سالم", "علي", "الشهري"],
  ["bidi marks and tatweel", "\u200Fمحـــمد\u200E الشهري\u200F", "محمد", null, "الشهري"],
  ["empty", "", "", null, ""],
  ["whitespace only", " \t\u00A0 ", "", null, ""],
];

let pg: PGlite;
const rows = new Map<string, Record<string, unknown>>();

beforeAll(async () => {
  pg = new PGlite();
  await pg.exec(INIT);
  for (const [i, [, name]] of CASES.entries()) {
    await pg.query(
      `INSERT INTO "User" ("id", "email", "name", "passwordHash", "role", "status")
       VALUES ($1, $2, $3, 'hash', 'OWNER', 'ACTIVE')`,
      [`u${i}`, `u${i}@example.com`, name],
    );
  }
  await pg.exec(V1_1E);
  const result = await pg.query<Record<string, unknown>>(`SELECT * FROM "User"`);
  for (const row of result.rows) rows.set(row.id as string, row);
}, 60_000);

describe("the name split", () => {
  it.each(CASES.map((c, i) => [...c, i] as const))(
    "%s",
    (_label, name, first, middle, last, i) => {
      const row = rows.get(`u${i}`)!;
      expect(row.firstName).toBe(first);
      expect(row.middleName).toBe(middle);
      expect(row.lastName).toBe(last);
      // Expand-only: the old column is untouched.
      expect(row.name).toBe(name);
    },
  );

  it("the display and full names read naturally from the parts", () => {
    const row = rows.get(`u${CASES.findIndex((c) => c[0] === "connectors in the middle and last")}`)!;
    const parts = row as { firstName: string; middleName: string | null; lastName: string };
    expect(displayName(parts)).toBe("محمد آل سعود");
    expect(fullName(parts)).toBe("محمد بن سلمان آل سعود");
  });
});

describe("the rest of the expand step", () => {
  it("marks every existing account verified", () => {
    for (const row of rows.values()) expect(row.emailVerifiedAt).toBeInstanceOf(Date);
  });

  it("keeps the old column, now nullable, so the previous release still runs", async () => {
    const column = await pg.query<{ is_nullable: string }>(
      `SELECT is_nullable FROM information_schema.columns
       WHERE table_name = 'User' AND column_name = 'name'`,
    );
    expect(column.rows[0]?.is_nullable).toBe("YES");
  });

  it("an insert by the previous release still works, and is shown by its legacy name (A9)", async () => {
    await pg.query(
      `INSERT INTO "User" ("id", "email", "name", "passwordHash", "role")
       VALUES ('old', 'old@example.com', 'سالم الشهري', 'hash', 'STAFF')`,
    );
    const { rows: [row] } = await pg.query<Record<string, unknown>>(
      `SELECT "firstName", "middleName", "lastName", "name", "emailVerifiedAt" FROM "User" WHERE "id" = 'old'`,
    );
    expect(row).toMatchObject({ firstName: "", middleName: null, lastName: "", emailVerifiedAt: null });
    expect(displayName({ ...(row as { firstName: string; lastName: string }), legacyName: row!.name as string })).toBe(
      "سالم الشهري",
    );
  });

  it("creates EmailCode, cascading with its user", async () => {
    await pg.query(
      `INSERT INTO "EmailCode" ("id", "userId", "purpose", "codeHash", "expiresAt")
       VALUES ('c1', 'u1', 'VERIFY', 'h', now())`,
    );
    const inserted = await pg.query<{ attempts: number; consumedAt: Date | null }>(
      `SELECT "attempts", "consumedAt" FROM "EmailCode" WHERE "id" = 'c1'`,
    );
    expect(inserted.rows[0]).toEqual({ attempts: 0, consumedAt: null });
    await pg.query(`DELETE FROM "User" WHERE "id" = 'u1'`);
    const left = await pg.query(`SELECT 1 FROM "EmailCode" WHERE "id" = 'c1'`);
    expect(left.rows).toHaveLength(0);
  });

  it("drops nothing: every v1.1d column of User is still there", async () => {
    const columns = await pg.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'User'`,
    );
    const names = columns.rows.map((c) => c.column_name);
    for (const old of ["id", "email", "name", "passwordHash", "role", "status", "canEdit", "establishmentId", "createdAt"]) {
      expect(names).toContain(old);
    }
  });
});
