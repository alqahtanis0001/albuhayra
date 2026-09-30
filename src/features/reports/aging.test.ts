import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it, vi } from "vitest";

/**
 * أعمار المستحقات on real Postgres (docs/V12C-DESIGN.md C13, N2): days past
 * due 1–30 · 31–60 · 61–90 · >90 with the boundaries 30/31, 60/61, 90/91, the
 * due day itself not overdue, one row per party per direction, لنا first,
 * OPEN plans and unpaid remainders only, salary under علينا, one tenant.
 */

const h = vi.hoisted(() => ({ lite: null as PGlite | null }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { pgliteClient } = await import("@/lib/testing/pgliteClient");
  h.lite = new PGlite();
  return { db: pgliteClient(h.lite) };
});

await import("@/lib/db");
const { agingBucketOf, getAgingReport } = await import("./aging");

const TODAY = "2026-10-05";

let seq = 0;
const inst = (planId: string, due: string, amount: number, paid = 0, est = "est1") =>
  `INSERT INTO "Instalment" ("id", "establishmentId", "planId", "seq", "dueDate", "amountDueHalalas", "paidHalalas", "updatedAt")
   VALUES ('i${++seq}', '${est}', '${planId}', ${seq}, '${due}', ${amount}, ${paid}, now());`;
const plan = (id: string, party: string, dir: "IN" | "OUT", cat: string, extra = "", extraValues = "", est = "est1") =>
  `INSERT INTO "Plan" ("id", "establishmentId", "partyId", "direction", "title", "totalHalalas", "categoryId", "startDate", "updatedAt"${extra})
   VALUES ('${id}', '${est}', '${party}', '${dir}', 'عقد', 1, '${cat}', '2026-01-01', now()${extraValues});`;

beforeAll(async () => {
  const migrations = join(process.cwd(), "prisma", "migrations");
  const dirs = readdirSync(migrations, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  for (const dir of dirs) await h.lite!.exec(readFileSync(join(migrations, dir, "migration.sql"), "utf8"));
  await h.lite!.exec([
    `INSERT INTO "Establishment" ("id", "name", "joinCode") VALUES ('est1', 'أ', 'AAAA2222'), ('est2', 'ب', 'BBBB3333');`,
    `INSERT INTO "Category" ("id", "establishmentId", "nameAr", "type") VALUES
       ('cin', 'est1', 'مبيعات', 'IN'), ('cout', 'est1', 'مشتريات', 'OUT'), ('csal', 'est1', 'رواتب', 'OUT'), ('c2', 'est2', 'مبيعات', 'IN');`,
    `INSERT INTO "Party" ("id", "establishmentId", "name", "type", "updatedAt") VALUES
       ('pA', 'est1', 'ألف', 'CUSTOMER', now()), ('pB', 'est1', 'باء', 'CUSTOMER', now()),
       ('pC', 'est1', 'جيم', 'CUSTOMER', now()),
       ('pE', 'est1', 'موظف', 'EMPLOYEE', now()), ('p2', 'est2', 'سري', 'CUSTOMER', now());`,
    `INSERT INTO "Employee" ("id", "establishmentId", "partyId", "startDate", "updatedAt") VALUES ('emp', 'est1', 'pE', '2026-01-01', now());`,
    plan("a_in", "pA", "IN", "cin"),
    plan("a_out", "pA", "OUT", "cout"),
    plan("b_in", "pB", "IN", "cin"),
    plan("c_in", "pC", "IN", "cin"),
    plan("a_arch", "pA", "IN", "cin", `, "state"`, `, 'ARCHIVED'`),
    plan("sal", "pE", "OUT", "csal", `, "kind", "employeeId"`, `, 'SALARY', 'emp'`),
    plan("x", "p2", "IN", "c2", "", "", "est2"),
    inst("a_in", "2026-10-05", 99999), // due today: not overdue
    inst("a_in", "2026-10-06", 99999), // future
    inst("a_in", "2026-10-04", 150, 50), // 1 day, 100 left
    inst("a_in", "2026-09-05", 200), // 30
    inst("a_in", "2026-09-04", 400), // 31
    inst("a_in", "2026-08-06", 800), // 60
    inst("a_in", "2026-08-05", 1600), // 61
    inst("a_in", "2026-07-07", 3200), // 90
    inst("a_in", "2026-07-06", 6400), // 91
    inst("a_in", "2026-03-01", 12800), // 218
    inst("a_in", "2026-09-01", 5000, 5000), // paid
    inst("a_out", "2026-09-25", 700), // 10, the same party owed the other way
    inst("b_in", "2026-10-04", 50000), // 1
    inst("c_in", "2026-08-01", 4000, 4000), // a party whose only overdue row is paid: no row at all
    inst("a_arch", "2026-09-01", 77777), // archived plan
    inst("sal", "2026-09-30", 300000), // salary, 5
    inst("x", "2026-09-01", 88888, 0, "est2"), // another tenant
  ].join("\n"));
}, 60_000);

const buckets = (upTo30: number, upTo60: number, upTo90: number, over90: number) => ({
  upTo30Halalas: upTo30, upTo60Halalas: upTo60, upTo90Halalas: upTo90, over90Halalas: over90,
  totalHalalas: upTo30 + upTo60 + upTo90 + over90,
});

describe("getAgingReport (C13, N2)", () => {
  it("buckets by days past due at 30/31, 60/61, 90/91; one row per party per direction; لنا first", async () => {
    expect(await getAgingReport("est1", TODAY)).toEqual({
      today: TODAY,
      toUs: {
        rows: [
          { partyId: "pB", partyName: "باء", ...buckets(50000, 0, 0, 0) },
          { partyId: "pA", partyName: "ألف", ...buckets(300, 1200, 4800, 19200) },
        ],
        totals: buckets(50300, 1200, 4800, 19200),
        // v1.3 item 14: instalments per bucket, this side only.
        counts: { upTo30: 3, upTo60: 2, upTo90: 2, over90: 2, total: 9 },
      },
      fromUs: {
        rows: [
          { partyId: "pE", partyName: "موظف", ...buckets(300000, 0, 0, 0) },
          { partyId: "pA", partyName: "ألف", ...buckets(700, 0, 0, 0) },
        ],
        totals: buckets(300700, 0, 0, 0),
        counts: { upTo30: 2, upTo60: 0, upTo90: 0, over90: 0, total: 2 },
      },
    });
  });

  it("the due day becomes overdue the next day, in the first bucket", async () => {
    const { toUs } = await getAgingReport("est1", "2026-10-06");
    // 10-05 is now 1 day late; 09-05 turned 31 and moved on.
    expect(toUs.rows.find((r) => r.partyId === "pA")).toMatchObject({ upTo30Halalas: 100 + 99999, upTo60Halalas: 200 + 400 });
  });

  it("holds nothing of another establishment", async () => {
    const report = await getAgingReport("est2", TODAY);
    expect(report.toUs.rows.map((r) => r.partyName)).toEqual(["سري"]);
    expect(report.fromUs.rows).toEqual([]);
  });
});

describe("agingBucketOf", () => {
  it.each([
    [1, "upTo30Halalas"], [30, "upTo30Halalas"],
    [31, "upTo60Halalas"], [60, "upTo60Halalas"],
    [61, "upTo90Halalas"], [90, "upTo90Halalas"],
    [91, "over90Halalas"], [400, "over90Halalas"],
  ] as const)("%i days past due → %s", (days, key) => {
    expect(agingBucketOf(days)).toBe(key);
  });
});
