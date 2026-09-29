/**
 * TEST-ONLY. The real generated Prisma 7 client, running on PGlite (in-process
 * Postgres) instead of Neon. Imported only by `*.test.ts` — a static case in
 * `src/lib/migration.v12a.test.ts` fails if anything else imports it — so it
 * never reaches a bundle, and no test ever needs the shared database.
 *
 * How: `@prisma/adapter-pg` accepts a `pg.Pool` (checked with `instanceof`),
 * so this hands it an object on `pg.Pool.prototype` whose `query` runs on
 * PGlite. PGlite is told to return every built-in type as raw text (identity
 * parsers for OIDs 0–8191; user enums already arrive as text), and the
 * adapter's own `getTypeParser` then parses it — exactly as over the wire, so
 * dates, int8 and numerics come back the way production sees them.
 *
 * Limits: one PGlite connection. `$transaction` issues BEGIN/COMMIT on it, so a
 * test must not run other queries concurrently with an open transaction.
 */
import type { PGlite } from "@electric-sql/pglite";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

import { PrismaClient } from "@/generated/prisma";

const RAW_TEXT = Object.fromEntries(
  Array.from({ length: 8192 }, (_, oid) => [oid, (value: string) => value]),
);

type TypeParser = (oid: number, format: string) => (value: string) => unknown;
type QueryConfig = string | { text: string; values?: unknown[]; types?: { getTypeParser: TypeParser } };

export function pgliteClient(lite: PGlite): PrismaClient {
  const query = async (config: QueryConfig) => {
    const text = typeof config === "string" ? config : config.text;
    const values = typeof config === "string" ? [] : (config.values ?? []);
    const result = await lite.query<unknown[]>(text, values, { rowMode: "array", parsers: RAW_TEXT });
    const parse = typeof config === "string" ? undefined : config.types?.getTypeParser;
    const rows = result.rows.map((row) =>
      row.map((value, i) =>
        value === null || !parse ? value : parse(result.fields[i]!.dataTypeID, "text")(value as string),
      ),
    );
    return { fields: result.fields, rows, rowCount: result.affectedRows ?? rows.length };
  };
  const connection = {
    query,
    on: () => undefined,
    removeListener: () => undefined,
    release: () => undefined,
  };
  const pool = Object.assign(Object.create(pg.Pool.prototype) as pg.Pool, {
    ...connection,
    connect: async () => connection,
    end: async () => undefined,
  });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}
