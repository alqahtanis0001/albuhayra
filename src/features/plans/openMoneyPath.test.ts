import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { todayISO } from "@/lib/dates";

/**
 * v1.4 C7 — the open agreement's money path on real Postgres (the model is
 * `moneyPath.test.ts`): create → pay → pay to exactly the total → ARCHIVED
 * with the auto-close audit → a new payment refused → reopen → a deleted
 * payment drops out of «received» → pay again → ARCHIVED again; an edit
 * never changes the state; the statement, the party rows and the party page
 * agree on the open remainder (M4) while the balance stays untouched (D10).
 * **No concurrency claim** — PGlite is one connection.
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
const { createOpenPlan, updateOpenPlan, closeOpenPlan, reopenOpenPlan } = await import("./openActions");
const { updatePlan, archivePlan } = await import("./actions");
const { getOpenPlan, getOpenPlanPaymentLink } = await import("./openQueries");
const { listPlans, getPlan } = await import("./queries");
const { getDues } = await import("./dues");
const { recordOpenPlanPayment, updateTransaction, deleteTransaction } = await import("@/features/transactions/actions");
const { getTransaction } = await import("@/features/transactions/queries");
const { listParties, getParty } = await import("@/features/parties/queries");
const { getPartyStatement } = await import("@/features/parties/statement");

const MIGRATIONS = join(process.cwd(), "prisma", "migrations");
const today = todayISO();
const shift = (days: number) => new Date(Date.parse(`${today}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

let planId = "";
const txIds: string[] = [];

function openForm(extra: Record<string, string> = {}): FormData {
  const form = new FormData();
  for (const [k, v] of Object.entries({
    partyId: "pc", direction: "IN", title: "توريد مفتوح", categoryId: "cin", startDate: shift(-10),
    totalHalalas: "3000", expectedEndDate: "", notes: "", ...extra,
  })) form.append(k, v);
  return form;
}

function payForm(amountHalalas: number, date = today): FormData {
  const form = new FormData();
  for (const [k, v] of Object.entries({ amountHalalas: String(amountHalalas), date, paymentMethod: "CASH" })) form.append(k, v);
  return form;
}

function editForm(amountHalalas: number, partyId: string | null = "pc"): FormData {
  const form = new FormData();
  for (const [k, v] of Object.entries({ date: today, direction: "IN", amountHalalas: String(amountHalalas), categoryId: "cin", paymentMethod: "CASH" })) form.append(k, v);
  if (partyId) form.append("partyId", partyId);
  return form;
}

async function pay(amountHalalas: number) {
  const result = await recordOpenPlanPayment(planId, null, payForm(amountHalalas));
  expect(result.ok).toBe(true);
  const data = (result as { data: { transactionId: string; autoClosed: boolean } }).data;
  txIds.push(data.transactionId);
  return data;
}

async function state(): Promise<string> {
  const { rows } = await h.lite!.query<{ state: string }>(`SELECT "state" FROM "Plan" WHERE "id" = $1`, [planId]);
  return rows[0]!.state;
}

/** M4 / D10: the three reads agree on the open remainder; the balance ignores it. */
async function agreement(): Promise<number | null> {
  const [statement, parties, party] = await Promise.all([getPartyStatement("est1", "pc"), listParties("est1"), getParty("est1", "pc")]);
  const row = parties.find((p) => p.id === "pc")!;
  expect(row.openPlansRemainingHalalas).toBe(statement!.openPlansRemainingHalalas);
  expect(party!.openPlansRemainingHalalas).toBe(statement!.openPlansRemainingHalalas);
  expect(statement!.rows).toEqual([]);
  expect(statement!.closingBalanceHalalas).toBe(0);
  expect(row).toMatchObject({ owedToUsHalalas: 0, owedByUsHalalas: 0 });
  return statement!.openPlansRemainingHalalas;
}

beforeAll(async () => {
  const dirs = readdirSync(MIGRATIONS, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  for (const dir of dirs) await h.lite!.exec(readFileSync(join(MIGRATIONS, dir, "migration.sql"), "utf8"));
  await h.lite!.exec(`
    INSERT INTO "Establishment" ("id", "name", "joinCode") VALUES ('est1', 'منشأة', 'ABCD2345');
    INSERT INTO "User" ("id", "email", "passwordHash", "role", "status", "establishmentId", "firstName", "lastName")
      VALUES ('u1', 'o@example.com', 'h', 'OWNER', 'ACTIVE', 'est1', 'سالم', 'الشهري');
    INSERT INTO "Category" ("id", "establishmentId", "nameAr", "type") VALUES ('cin', 'est1', 'مبيعات', 'IN'), ('cout', 'est1', 'مشتريات', 'OUT');
    INSERT INTO "Party" ("id", "establishmentId", "name", "type", "updatedAt") VALUES ('pc', 'est1', 'عميل', 'CUSTOMER', now()), ('p2', 'est1', 'آخر', 'CUSTOMER', now());
  `);
}, 60_000);

describe("the open agreement's money path on real Postgres", () => {
  it("createOpenPlan writes an OPEN_ENDED plan the list and the page read back; hasPlans turns true", async () => {
    expect((await getDues("est1")).hasPlans).toBe(false);
    const created = await createOpenPlan(null, openForm());
    expect(created.ok).toBe(true);
    planId = (created as { data: { id: string } }).data.id;
    const [row] = await listPlans("est1");
    expect(row).toMatchObject({ id: planId, kind: "OPEN_ENDED", status: "ACTIVE", totalHalalas: 3000, receivedHalalas: 0, remainingHalalas: 3000 });
    expect(await getOpenPlan("est1", planId)).toMatchObject({ canClose: true, canReopen: false, partyLocked: false, payments: [] });
    expect(await getPlan("est1", planId)).toBeNull();
    expect((await getDues("est1")).hasPlans).toBe(true);
    expect(await agreement()).toBe(3000);
  });

  it("a payment inherits the plan's party, category and direction, links planId, and locks the plan's identity", async () => {
    expect(await pay(1000)).toMatchObject({ autoClosed: false });
    const row = await getTransaction("est1", txIds[0]!);
    expect(row).toMatchObject({ planId, instalmentId: null, partyId: "pc", categoryId: "cin", direction: "IN", amountHalalas: 1000 });
    const plan = await getOpenPlan("est1", planId);
    expect(plan).toMatchObject({ receivedHalalas: 1000, remainingHalalas: 2000, partyLocked: true });
    expect(plan!.payments.map((p) => p.transactionId)).toEqual([txIds[0]]);
    expect(await getOpenPlanPaymentLink("est1", txIds[0]!)).toEqual({ planId, planTitle: "توريد مفتوح", direction: "IN", partyId: "pc", partyName: "عميل" });
    expect(await agreement()).toBe(2000);
  });

  it("the edit form: party locked, total below received refused, otherwise saved", async () => {
    expect(await updateOpenPlan(planId, null, openForm({ partyId: "p2" }))).toMatchObject({ fieldErrors: { partyId: "err.planPartyLocked" } });
    expect(await updateOpenPlan(planId, null, openForm({ totalHalalas: "999" }))).toMatchObject({ fieldErrors: { totalHalalas: "err.totalBelowPaid" } });
    expect(await updateOpenPlan(planId, null, openForm({ totalHalalas: "4000", notes: "موسّع" }))).toEqual({ ok: true, data: null });
    expect(await getOpenPlan("est1", planId)).toMatchObject({ totalHalalas: 4000, remainingHalalas: 3000, notes: "موسّع" });
  });

  it("P1: the scheduled actions refuse the open plan on real SQL", async () => {
    const form = openForm();
    form.set("instalments", JSON.stringify([{ dueDate: today, amountDueHalalas: 3000 }]));
    expect(await updatePlan(planId, null, form)).toEqual({ ok: false, error: "err.planKindFixed" });
    expect(await archivePlan(planId)).toEqual({ ok: false, error: "err.planKindFixed" });
    expect(await state()).toBe("OPEN");
  });

  it("C4: a payment to exactly the total closes the plan in the same transaction, with the auto-close audit", async () => {
    expect(await pay(3000)).toMatchObject({ autoClosed: true });
    expect(await state()).toBe("ARCHIVED");
    expect(await getOpenPlan("est1", planId)).toMatchObject({ status: "ARCHIVED", receivedHalalas: 4000, remainingHalalas: 0, canClose: false, canReopen: true });
    const { rows } = await h.lite!.query<{ after: { autoClosed?: boolean } }>(
      `SELECT "after" FROM "AuditLog" WHERE "entityId" = $1 AND "action" = 'PLAN_ARCHIVE'`, [planId],
    );
    expect(rows.map((r) => r.after.autoClosed)).toEqual([true]);
    // Closed: outside the remainder line (null = hidden), and no payment is accepted.
    expect(await agreement()).toBeNull();
    expect(await recordOpenPlanPayment(planId, null, payForm(1))).toEqual({ ok: false, error: "err.planClosed" });
  });

  it("reopen; deleting a payment drops it from received and never changes the state", async () => {
    expect(await reopenOpenPlan(planId)).toEqual({ ok: true, data: null });
    expect(await state()).toBe("OPEN");
    expect(await deleteTransaction(txIds[1]!)).toEqual({ ok: true, data: null });
    expect(await state()).toBe("OPEN");
    expect(await getOpenPlan("est1", planId)).toMatchObject({ receivedHalalas: 1000, remainingHalalas: 3000, partyLocked: true });
    expect((await listPlans("est1"))[0]).toMatchObject({ receivedHalalas: 1000 });
    expect(await agreement()).toBe(3000);
    // err.totalBelowPaid compares against the same non-deleted sum: 4000 before the delete, 1000 after.
    expect(await updateOpenPlan(planId, null, openForm({ totalHalalas: "999" }))).toMatchObject({ fieldErrors: { totalHalalas: "err.totalBelowPaid" } });
    expect(await updateOpenPlan(planId, null, openForm({ totalHalalas: "1000" }))).toEqual({ ok: true, data: null });
    expect(await updateOpenPlan(planId, null, openForm({ totalHalalas: "4000", notes: "موسّع" }))).toEqual({ ok: true, data: null });
    expect(await getOpenPlan("est1", planId)).toMatchObject({ totalHalalas: 4000, receivedHalalas: 1000, remainingHalalas: 3000 });
  });

  it("D9: an edit keeps direction and party (refused on mismatch), may change the amount, never changes the state", async () => {
    expect(await updateTransaction(txIds[0]!, null, editForm(1500, null))).toMatchObject({ fieldErrors: { partyId: "err.paymentPartyMismatch" } });
    expect(await updateTransaction(txIds[0]!, null, editForm(1500, "p2"))).toMatchObject({ fieldErrors: { partyId: "err.paymentPartyMismatch" } });
    expect(await updateTransaction(txIds[0]!, null, editForm(4500))).toEqual({ ok: true, data: null });
    // Above the total through an edit: received 4500 > 4000, yet the state does not move (C4).
    expect(await state()).toBe("OPEN");
    expect(await getOpenPlan("est1", planId)).toMatchObject({ receivedHalalas: 4500, remainingHalalas: -500 });
    // The clamp: the remainder line reads 0, never negative.
    expect(await agreement()).toBe(0);
    expect(await updateTransaction(txIds[0]!, null, editForm(1000))).toEqual({ ok: true, data: null });
  });

  it("pays again to the total → ARCHIVED again; closeOpenPlan by hand works the same way", async () => {
    expect(await pay(3000)).toMatchObject({ autoClosed: true });
    expect(await state()).toBe("ARCHIVED");
    expect(await reopenOpenPlan(planId)).toEqual({ ok: true, data: null });
    expect(await closeOpenPlan(planId)).toEqual({ ok: true, data: null });
    expect(await state()).toBe("ARCHIVED");
    expect(await reopenOpenPlan(planId)).toEqual({ ok: true, data: null });
    expect(await state()).toBe("OPEN");
  });

  it("D10: the payments reach the statement's «other» section only; a non-payment entry has no link", async () => {
    const statement = await getPartyStatement("est1", "pc");
    expect(statement!.rows).toEqual([]);
    expect(statement!.other.map((r) => r.planId)).toEqual([planId, planId]);
    expect(await getOpenPlanPaymentLink("est1", txIds[1]!)).toBeNull(); // soft-deleted
    expect(await getOpenPlanPaymentLink("est1", "nope")).toBeNull();
  });
});
