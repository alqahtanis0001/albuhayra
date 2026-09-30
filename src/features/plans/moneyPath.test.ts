import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { todayISO } from "@/lib/dates";

/**
 * The money path on real Postgres (CP2 additions; W6). The actions and queries
 * run unmodified against the real generated Prisma client on PGlite; only these
 * are mocked: `@/lib/auth` (the requireX context), `next/cache`, `server-only`,
 * and `@/lib/db` → `pgliteClient(lite)`. What the mocked gate cannot vouch for
 * is what this proves: the field reference in `getOverdueCount`, relation
 * filters, the aggregate over linked payments, and the statement invariant.
 * **No concurrency claim** — PGlite is one connection; `err.concurrentChange`
 * is pinned in the mocked gate.
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
const { createPlan, archivePlan } = await import("./actions");
const { getDues, getOverdueCount } = await import("./dues");
const { createTransaction, updateTransaction, deleteTransaction } = await import("@/features/transactions/actions");
const { listParties } = await import("@/features/parties/queries");
const { getPartyStatement } = await import("@/features/parties/statement");

const MIGRATIONS = join(process.cwd(), "prisma", "migrations");
const today = todayISO();
const shift = (days: number) => new Date(Date.parse(`${today}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

let planId = "";
let ids: string[] = [];

async function paid(): Promise<number[]> {
  const { rows } = await h.lite!.query<{ paidHalalas: number }>(
    `SELECT "paidHalalas" FROM "Instalment" WHERE "planId" = $1 ORDER BY "seq"`,
    [planId],
  );
  return rows.map((r) => r.paidHalalas);
}

function payment(instalmentId: string, amountHalalas: number): FormData {
  const form = new FormData();
  for (const [k, v] of Object.entries({
    date: today, direction: "OUT", amountHalalas: String(amountHalalas), categoryId: "cat_out",
    paymentMethod: "CASH", instalmentId,
  })) form.append(k, v);
  return form;
}

async function paymentIds(): Promise<string[]> {
  const { rows } = await h.lite!.query<{ id: string }>(
    `SELECT "id" FROM "Transaction" WHERE "instalmentId" IS NOT NULL AND "deletedAt" IS NULL ORDER BY "createdAt", "id"`,
  );
  return rows.map((r) => r.id);
}

async function balanceInvariant(): Promise<number> {
  const statement = await getPartyStatement("est1", "party1");
  const [party] = await listParties("est1");
  expect(statement!.closingBalanceHalalas).toBe(party!.owedToUsHalalas - party!.owedByUsHalalas);
  return statement!.closingBalanceHalalas;
}

beforeAll(async () => {
  for (const dir of ["20260929000000_init", "20260930000000_v1_1e_email_names", "20261001000000_v1_2a_parties_projects_plans"]) {
    await h.lite!.exec(readFileSync(join(MIGRATIONS, dir, "migration.sql"), "utf8"));
  }
  await h.lite!.exec(`
    INSERT INTO "Establishment" ("id", "name", "joinCode") VALUES ('est1', 'منشأة', 'ABCD2345');
    INSERT INTO "User" ("id", "email", "passwordHash", "role", "status", "establishmentId", "firstName", "lastName")
      VALUES ('u1', 'o@example.com', 'h', 'OWNER', 'ACTIVE', 'est1', 'سالم', 'الشهري');
    INSERT INTO "Category" ("id", "establishmentId", "nameAr", "type") VALUES ('cat_out', 'est1', 'موردون', 'OUT');
    INSERT INTO "Party" ("id", "establishmentId", "name", "type", "updatedAt") VALUES ('party1', 'est1', 'مورد', 'SUPPLIER', now());
  `);

  const form = new FormData();
  for (const [k, v] of Object.entries({
    partyId: "party1", direction: "OUT", title: "توريد", totalHalalas: "3000", categoryId: "cat_out",
    startDate: shift(-60), reminderDays: "3",
    instalments: JSON.stringify([
      { dueDate: shift(40), amountDueHalalas: 1000 },
      { dueDate: shift(-40), amountDueHalalas: 1000 },
      { dueDate: shift(3), amountDueHalalas: 1000 },
    ]),
  })) form.append(k, v);
  const created = await createPlan(null, form);
  expect(created.ok).toBe(true);
  planId = (created as { data: { id: string } }).data.id;
  const { rows } = await h.lite!.query<{ id: string }>(`SELECT "id" FROM "Instalment" WHERE "planId" = $1 ORDER BY "seq"`, [planId]);
  ids = rows.map((r) => r.id);
}, 60_000);

describe("the money path on real Postgres", () => {
  it("createPlan numbers the rows by due date and the badge counts the overdue one", async () => {
    const { rows } = await h.lite!.query<{ dueDate: Date }>(`SELECT "dueDate" FROM "Instalment" WHERE "planId" = $1 ORDER BY "seq"`, [planId]);
    expect(rows.map((r) => r.dueDate.toISOString().slice(0, 10))).toEqual([shift(-40), shift(3), shift(40)]);
    expect(await getOverdueCount("est1")).toBe(1);
    expect(await balanceInvariant()).toBe(-3000);
  });

  it("a partial payment stays on its instalment, which is still overdue", async () => {
    expect(await createTransaction(null, payment(ids[0]!, 400))).toEqual({ ok: true, data: null });
    expect(await paid()).toEqual([400, 0, 0]);
    expect(await getOverdueCount("est1")).toBe(1);
  });

  it("an overpayment rolls forward; the field reference sees the row paid", async () => {
    expect(await createTransaction(null, payment(ids[0]!, 1100))).toEqual({ ok: true, data: null });
    expect(await paid()).toEqual([1000, 500, 0]);
    expect(await getOverdueCount("est1")).toBe(0);
    const dues = await getDues("est1");
    expect(dues.overdue).toEqual([]);
    expect(dues.thisWeek.map((r) => [r.instalmentId, r.remainingHalalas])).toEqual([[ids[1], 500]]);
    expect(await balanceInvariant()).toBe(-1500);
  });

  it("more than the plan's remainder is refused", async () => {
    expect(await createTransaction(null, payment(ids[2]!, 1501))).toMatchObject({
      fieldErrors: { amountHalalas: "err.paymentExceedsRemaining" },
    });
  });

  it("editing a payment re-allocates from scratch; its own amount counts toward the limit", async () => {
    const [, second] = await paymentIds();
    expect(await updateTransaction(second!, null, payment(ids[0]!, 2600))).toEqual({ ok: true, data: null });
    expect(await paid()).toEqual([1000, 1000, 1000]);
    expect(await updateTransaction(second!, null, payment(ids[0]!, 1600))).toEqual({ ok: true, data: null });
    expect(await paid()).toEqual([1000, 1000, 0]);
  });

  it("deleting a payment un-pays, and the overdue row comes back", async () => {
    const [first] = await paymentIds();
    expect(await deleteTransaction(first!)).toEqual({ ok: true, data: null });
    expect(await paid()).toEqual([1000, 600, 0]);
    expect(await getOverdueCount("est1")).toBe(0);
    expect(await balanceInvariant()).toBe(-1400);
  });

  it("archiving writes the remainder off: the statement closes at the party balance", async () => {
    expect(await archivePlan(planId)).toEqual({ ok: true, data: null });
    expect(await balanceInvariant()).toBe(0);
    const statement = await getPartyStatement("est1", "party1");
    expect(statement!.rows.at(-1)).toMatchObject({ kind: "WRITE_OFF", deltaHalalas: 1400, balanceHalalas: 0 });
    expect(await getOverdueCount("est1")).toBe(0);
  });

  it("an archived plan refuses a new payment but a delete re-allocates and the write-off grows", async () => {
    expect(await createTransaction(null, payment(ids[2]!, 100))).toEqual({ ok: false, error: "err.planClosed" });
    const [remaining] = await paymentIds();
    expect(await deleteTransaction(remaining!)).toEqual({ ok: true, data: null });
    expect(await paid()).toEqual([0, 0, 0]);
    const statement = await getPartyStatement("est1", "party1");
    expect(statement!.rows.at(-1)).toMatchObject({ kind: "WRITE_OFF", deltaHalalas: 3000, balanceHalalas: 0 });
    expect(await balanceInvariant()).toBe(0);
    // The first row is unpaid and 40 days late again — but the plan is archived.
    expect(await getOverdueCount("est1")).toBe(0);
    expect((await getDues("est1")).overdue).toEqual([]);
  });
});
