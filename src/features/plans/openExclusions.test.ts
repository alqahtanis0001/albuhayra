import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { todayISO } from "@/lib/dates";

/**
 * v1.4 C5 / D4 / D10 / P15 / P17 on real Postgres. The mocked scoping harness
 * never evaluates a `where`, so "the kind filter excludes X" can only be proven
 * here (P2). The D4 fixture is the corruption the UI can never create: an
 * OPEN_ENDED plan **with** an overdue, unpaid instalment row (`i_open`) and a
 * payment linked to it — beside a STANDARD control (`i_std`) that must appear,
 * so every case fails in exactly one direction when its filter is removed.
 *
 *   est1     p_open (OPEN_ENDED, IN, ceiling 1000.00, i_open overdue 50.00, a payment on i_open, a planId payment)
 *            p_open_null (OPEN_ENDED, OUT, no ceiling — P17: the kind branch runs before the total)
 *            p_std (STANDARD, IN, 100.00, i_std 10 days late)
 *            pNoCeil: an OPEN open plan without a ceiling → the remainder line hides (null)
 *            pArch: an ARCHIVED open plan with a ceiling → hides (null)
 *            pOver: two open plans, one over-received → Σ clamps each at 0 (D10)
 *            p_del (on pNoCeil): an open plan whose only payment is soft-deleted → still locked (P7), received 0
 *   est2     no plans at all (hasPlans false)
 *   est_bad  a STANDARD plan with a NULL total — D6 corruption, must throw
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
const { getDues, getStaffDues, getOverdueCount, getInstalmentForPayment, getStaffPaymentPrefill } = await import("./dues");
const { listPlans, getPlan } = await import("./queries");
const { getOpenPlan } = await import("./openQueries");
const { getAgingReport } = await import("@/features/reports/aging");
const { buildDigest } = await import("@/features/reminders/digest");
const { reminderTarget } = await import("@/features/reminders/clientRules");
const { getPartyStatement } = await import("@/features/parties/statement");
const { listParties, getParty } = await import("@/features/parties/queries");
const { createTransaction } = await import("@/features/transactions/actions");

const TODAY = "2026-10-05";

const est = (id: string, code: string) =>
  `INSERT INTO "Establishment" ("id", "name", "joinCode") VALUES ('${id}', 'منشأة ${id}', '${code}');`;
const party = (id: string, estId: string, name: string, optIn = false) =>
  `INSERT INTO "Party" ("id", "establishmentId", "name", "type", "email", "remindersOptIn", "updatedAt")
   VALUES ('${id}', '${estId}', '${name}', 'CUSTOMER', '${id}@example.com', ${optIn}, now());`;
const plan = (id: string, estId: string, partyId: string, dir: "IN" | "OUT", kind: string, total: string, cat: string) =>
  `INSERT INTO "Plan" ("id", "establishmentId", "partyId", "direction", "title", "totalHalalas", "categoryId", "startDate", "kind", "updatedAt")
   VALUES ('${id}', '${estId}', '${partyId}', '${dir}', 'اتفاقية ${id}', ${total}, '${cat}', '2026-01-01', '${kind}', now());`;
const inst = (id: string, planId: string, due: string, amount: number) =>
  `INSERT INTO "Instalment" ("id", "establishmentId", "planId", "seq", "dueDate", "amountDueHalalas", "updatedAt")
   VALUES ('${id}', 'est1', '${planId}', 1, '${due}', ${amount}, now());`;
const tx = (id: string, amount: number, link: string, linkId: string, partyId = "pOpen") =>
  `INSERT INTO "Transaction" ("id", "establishmentId", "date", "direction", "amountHalalas", "categoryId", "paymentMethod",
     "partyId", "createdById", "updatedAt", "${link}")
   VALUES ('${id}', 'est1', '2026-09-10', 'IN', ${amount}, 'cin', 'CASH', '${partyId}', 'u1', now(), '${linkId}');`;

beforeAll(async () => {
  const migrations = join(process.cwd(), "prisma", "migrations");
  const dirs = readdirSync(migrations, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  for (const dir of dirs) await h.lite!.exec(readFileSync(join(migrations, dir, "migration.sql"), "utf8"));
  await h.lite!.exec([
    est("est1", "AAAA2222"), est("est2", "BBBB3333"), est("est_bad", "CCCC4444"),
    `INSERT INTO "User" ("id", "email", "passwordHash", "role", "status", "establishmentId", "firstName", "lastName")
       VALUES ('u1', 'o@example.com', 'h', 'OWNER', 'ACTIVE', 'est1', 'سالم', 'الشهري');`,
    `INSERT INTO "Category" ("id", "establishmentId", "nameAr", "type") VALUES
       ('cin', 'est1', 'مبيعات', 'IN'), ('cout', 'est1', 'مشتريات', 'OUT'), ('cbad', 'est_bad', 'مبيعات', 'IN');`,
    party("pOpen", "est1", "جهة مفتوحة", true),
    party("pStd", "est1", "جهة مجدولة", true),
    party("pBad", "est_bad", "جهة", false),
    party("pNoCeil", "est1", "بلا سقف"),
    party("pArch", "est1", "منتهية"),
    party("pOver", "est1", "زائدة"),
    plan("p_open", "est1", "pOpen", "IN", "OPEN_ENDED", "100000", "cin"),
    plan("p_open_null", "est1", "pOpen", "OUT", "OPEN_ENDED", "NULL", "cout"),
    plan("p_std", "est1", "pStd", "IN", "STANDARD", "10000", "cin"),
    plan("p_bad", "est_bad", "pBad", "IN", "STANDARD", "NULL", "cbad"),
    plan("p_noceil", "est1", "pNoCeil", "IN", "OPEN_ENDED", "NULL", "cin"),
    plan("p_arch_open", "est1", "pArch", "IN", "OPEN_ENDED", "5000", "cin"),
    `UPDATE "Plan" SET "state" = 'ARCHIVED', "closedAt" = now() WHERE "id" = 'p_arch_open';`,
    plan("p_over_a", "est1", "pOver", "IN", "OPEN_ENDED", "1000", "cin"),
    plan("p_over_b", "est1", "pOver", "IN", "OPEN_ENDED", "2000", "cin"),
    tx("tx_over_a", 1500, "planId", "p_over_a", "pOver"), // 500 over its ceiling → counts 0, not −500
    tx("tx_over_b", 500, "planId", "p_over_b", "pOver"), // 1500 left
    plan("p_del", "est1", "pNoCeil", "IN", "OPEN_ENDED", "NULL", "cin"),
    tx("tx_del", 700, "planId", "p_del", "pNoCeil"),
    `UPDATE "Transaction" SET "deletedAt" = now() WHERE "id" = 'tx_del';`, // P7: a deleted payment still fixes the plan
    inst("i_open", "p_open", "2026-09-05", 5000), // D4: the corrupt row, 30 days late
    inst("i_std", "p_std", "2026-09-25", 10000), // the control, 10 days late
    tx("tx_open_inst", 1000, "instalmentId", "i_open"), // a payment on the corrupt row
    tx("tx_open_pay", 2000, "planId", "p_open"), // an ordinary open-plan payment
  ].join("\n"));
}, 60_000);

describe("v1.4 C5 (D4): an open-ended plan never produces a due", () => {
  it("getDues lists the scheduled row only, and hasPlans reads the count", async () => {
    const dues = await getDues("est1", TODAY);
    expect(dues.overdue.map((r) => r.instalmentId)).toEqual(["i_std"]);
    expect(dues.thisWeek).toEqual([]);
    expect(dues.hasPlans).toBe(true);
    expect((await getDues("est2", TODAY)).hasPlans).toBe(false);
  });

  it("getStaffDues and getOverdueCount agree", async () => {
    expect((await getStaffDues("est1", TODAY)).map((r) => r.instalmentId)).toEqual(["i_std"]);
    expect(await getOverdueCount("est1", TODAY)).toBe(1);
  });

  it("the payment-form reads answer null for the corrupt row and read the control", async () => {
    expect(await getInstalmentForPayment("est1", "i_open")).toBeNull();
    expect(await getStaffPaymentPrefill("est1", "i_open")).toBeNull();
    expect(await getInstalmentForPayment("est1", "i_std")).toMatchObject({ planId: "p_std", planRemainingHalalas: 10000 });
  });

  it("the aging report has one row, the scheduled party's", async () => {
    const report = await getAgingReport("est1", TODAY);
    expect(report.toUs.rows.map((r) => r.partyId)).toEqual(["pStd"]);
    expect(report.toUs.counts.total).toBe(1);
    expect(report.fromUs.rows).toEqual([]);
  });

  it("the digest has one item, the scheduled party's", async () => {
    const digest = await buildDigest("est1", TODAY);
    expect(digest.itemCount).toBe(1);
    expect(digest.groups.overdue.rows.map((r) => r.partyName)).toEqual(["جهة مجدولة"]);
  });

  it("a client reminder for the corrupt row reads as missing; the control is applicable", async () => {
    expect(await reminderTarget("est1", "i_open")).toEqual({ ok: false, error: "err.notFound" });
    expect(await reminderTarget("est1", "i_std")).toMatchObject({ ok: true, data: { instalmentId: "i_std" } });
  });

  it("P15: an instalment payment against an open-ended plan is refused, never a throw", async () => {
    const form = new FormData();
    for (const [k, v] of Object.entries({
      date: todayISO(), direction: "IN", amountHalalas: "500", categoryId: "cin", paymentMethod: "CASH", instalmentId: "i_open",
    })) form.append(k, v);
    expect(await createTransaction(null, form)).toMatchObject({ ok: false, fieldErrors: { instalmentId: "err.instalmentInvalid" } });
  });
});

describe("v1.4 D10: open-ended plans stay outside the balance", () => {
  it("the statement has no PLAN row for an open plan; its planId payment is in «other», the corrupt one is not", async () => {
    const statement = await getPartyStatement("est1", "pOpen");
    expect(statement!.rows).toEqual([]);
    expect(statement!.closingBalanceHalalas).toBe(0);
    expect(statement!.other.map((r) => r.id)).toEqual(["tx_open_pay"]);
    expect(statement!.other[0]).toMatchObject({ planId: "p_open", instalmentId: null });
  });

  it("listParties: no balance for the open party, history kept; the invariant holds for both parties", async () => {
    const parties = await listParties("est1");
    const open = parties.find((p) => p.id === "pOpen")!;
    const std = parties.find((p) => p.id === "pStd")!;
    expect(open).toMatchObject({ owedToUsHalalas: 0, owedByUsHalalas: 0, hasHistory: true });
    expect(std).toMatchObject({ owedToUsHalalas: 10000, owedByUsHalalas: 0 });
    for (const p of [open, std]) {
      const statement = await getPartyStatement("est1", p.id);
      expect(statement!.closingBalanceHalalas).toBe(p.owedToUsHalalas - p.owedByUsHalalas);
    }
    expect((await getPartyStatement("est1", "pStd"))!.rows.map((r) => r.kind)).toEqual(["PLAN"]);
  });
});

describe("v1.4 D10 (user) / M4: the open-agreement remainder line", () => {
  it("is Σ (total − received) over OPEN ceilinged plans; the instalment-linked row never counts as received", async () => {
    // p_open: 100000 − 2000 (tx_open_pay); tx_open_inst links an instalment, not the plan; p_open_null has no ceiling.
    expect((await getPartyStatement("est1", "pOpen"))!.openPlansRemainingHalalas).toBe(98000);
  });

  it("hides with no open plan, with no ceiling, and when the only ceilinged plan is closed", async () => {
    expect((await getPartyStatement("est1", "pStd"))!.openPlansRemainingHalalas).toBeNull();
    expect((await getPartyStatement("est1", "pNoCeil"))!.openPlansRemainingHalalas).toBeNull();
    expect((await getPartyStatement("est1", "pArch"))!.openPlansRemainingHalalas).toBeNull();
  });

  it("clamps each plan at 0 before summing, and never enters the balance", async () => {
    const statement = await getPartyStatement("est1", "pOver");
    expect(statement!.openPlansRemainingHalalas).toBe(1500);
    expect(statement!.closingBalanceHalalas).toBe(0);
    expect(statement!.rows).toEqual([]);
    const row = (await listParties("est1")).find((p) => p.id === "pOver")!;
    expect(row).toMatchObject({ owedToUsHalalas: 0, owedByUsHalalas: 0, openPlansRemainingHalalas: 1500 });
  });

  it("M4: the party rows, the party page and the statement read the same number", async () => {
    for (const id of ["pOpen", "pOver", "pNoCeil", "pArch", "pStd"]) {
      const [statement, party, rows] = await Promise.all([getPartyStatement("est1", id), getParty("est1", id), listParties("est1")]);
      const expected = statement!.openPlansRemainingHalalas;
      expect(party!.openPlansRemainingHalalas, id).toBe(expected);
      expect(rows.find((r) => r.id === id)!.openPlansRemainingHalalas, id).toBe(expected);
    }
  });
});

describe("v1.4 P7 / D5: the lock probe counts soft-deleted payments", () => {
  it("a plan whose only payment is deleted is still locked, and received reads 0", async () => {
    expect(await getOpenPlan("est1", "p_del")).toMatchObject({ partyLocked: true, receivedHalalas: 0, payments: [] });
    expect(await getOpenPlan("est1", "p_open_null")).toMatchObject({ partyLocked: false, receivedHalalas: 0 });
  });
});

describe("v1.4 D6 / P17: the kind branch runs before the total is read", () => {
  it("listPlans survives an open-ended row without a total and lists the scheduled plan", async () => {
    const rows = await listPlans("est1");
    expect(rows.map((r) => r.id)).toContain("p_std");
    expect(rows.find((r) => r.id === "p_std")).toMatchObject({ kind: "STANDARD", totalHalalas: 10000 });
  });

  it("a STANDARD plan without a total is corruption: listPlans fails loud", async () => {
    await expect(listPlans("est_bad")).rejects.toThrow(/plan p_bad: scheduled plan without a total/);
  });

  it("getPlan is a scheduled read: an open-ended id reads as missing, the control reads", async () => {
    expect(await getPlan("est1", "p_open")).toBeNull();
    expect(await getPlan("est1", "p_std")).toMatchObject({ id: "p_std", instalments: [{ id: "i_std" }] });
  });
});
