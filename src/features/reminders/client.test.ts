import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Client reminders on real Postgres (docs/V12C-DESIGN.md C9–C12, E8, E9,
 * E13): opt-in, IN / OPEN / unpaid only, owner only, the durable once-a-day
 * rule read from the audit log, the per-establishment cap, the in-memory
 * double-click key, no reply-to, escaping, and every send audited. `fetch` is
 * mocked — nothing reaches Brevo.
 */

const h = vi.hoisted(() => ({ lite: null as PGlite | null, role: "OWNER" as "OWNER" | "STAFF" }));
const EST_NAME = `منشأة <النور> & 'Co' $&`;

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/lib/auth", () => ({
  requireOwner: async () => {
    if (h.role !== "OWNER") throw new Error("NEXT_REDIRECT");
    return { user: { id: "u1", establishmentName: EST_NAME }, establishmentId: "est1" };
  },
}));
vi.mock("@/lib/db", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { pgliteClient } = await import("@/lib/testing/pgliteClient");
  h.lite = new PGlite();
  return { db: pgliteClient(h.lite) };
});

await import("@/lib/db");
const { setPartyRemindersOptIn, sendClientReminder, prepareWhatsAppReminder } = await import("./client");
const { riyadhDayStart, CLIENT_EMAILS_PER_DAY } = await import("./clientRules");
const { clearAttempts, consumeLimit, LIMITS, resetAllAttempts } = await import("@/lib/rateLimit");
const { t } = await import("@/i18n/ar");
const { getDues } = await import("@/features/plans/dues");
const { getPlan } = await import("@/features/plans/queries");
const { getParty } = await import("@/features/parties/queries");

const CLIENT = "client@example.com";
const TITLE = `عقد <b>"صيانة"</b>`;
const fetchMock = vi.fn();
const ok = { ok: true, data: null };

const inst = (id: string, plan: string, amount: number, paid = 0, est = "est1") =>
  `INSERT INTO "Instalment" ("id", "establishmentId", "planId", "seq", "dueDate", "amountDueHalalas", "paidHalalas", "updatedAt")
   VALUES ('${id}', '${est}', '${plan}', 1, '2026-10-01', ${amount}, ${paid}, now());`;
const plan = (id: string, party: string, dir: "IN" | "OUT", title: string, extra = "", est = "est1", cat = dir === "IN" ? "cat_in" : "cat_out") =>
  `INSERT INTO "Plan" ("id", "establishmentId", "partyId", "direction", "title", "totalHalalas", "categoryId", "startDate", "updatedAt", "state")
   VALUES ('${id}', '${est}', '${party}', '${dir}', $t$${title}$t$, 150000, '${cat}', '2026-09-01', now(), '${extra || "OPEN"}');`;

async function audits(action: string): Promise<Array<{ userId: string; entity: string; entityId: string; after: unknown }>> {
  const { rows } = await h.lite!.query<{ userId: string; entity: string; entityId: string; after: unknown }>(
    `SELECT "userId", "entity", "entityId", "after" FROM "AuditLog" WHERE "action" = $1 ORDER BY "createdAt"`, [action],
  );
  return rows;
}
const brevoBodies = () => fetchMock.mock.calls.map(([, init]) => JSON.parse((init as { body: string }).body));
const auditAt = (est: string, entityId: string, at: Date) =>
  `INSERT INTO "AuditLog" ("id", "establishmentId", "userId", "action", "entity", "entityId", "createdAt")
   VALUES ('a_${est}_${entityId}_${at.getTime()}', '${est}', 'u1', 'CLIENT_REMINDER_EMAIL', 'Instalment', '${entityId}', '${at.toISOString()}');`;

beforeAll(async () => {
  const migrations = join(process.cwd(), "prisma", "migrations");
  const dirs = readdirSync(migrations, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  for (const dir of dirs) await h.lite!.exec(readFileSync(join(migrations, dir, "migration.sql"), "utf8"));
  await h.lite!.exec([
    `INSERT INTO "Establishment" ("id", "name", "joinCode") VALUES ('est1', 'أ', 'AAAA2222'), ('est2', 'ب', 'BBBB3333');`,
    `INSERT INTO "User" ("id", "email", "passwordHash", "role", "status", "establishmentId") VALUES
       ('u1', 'owner1@example.com', 'h', 'OWNER', 'ACTIVE', 'est1'), ('u2', 'owner2@example.com', 'h', 'OWNER', 'ACTIVE', 'est2');`,
    `INSERT INTO "Category" ("id", "establishmentId", "nameAr", "type") VALUES
       ('cat_in', 'est1', 'مبيعات', 'IN'), ('cat_out', 'est1', 'مشتريات', 'OUT'), ('cat2', 'est2', 'مبيعات', 'IN');`,
    `INSERT INTO "Party" ("id", "establishmentId", "name", "type", "email", "remindersOptIn", "updatedAt") VALUES
       ('pc_in', 'est1', 'عميل', 'CUSTOMER', '${CLIENT}', true, now()),
       ('pc_noemail', 'est1', 'بلا بريد', 'CUSTOMER', NULL, true, now()),
       ('pc_optout', 'est1', 'غير مشترك', 'CUSTOMER', 'optout@example.com', false, now()),
       ('ps', 'est1', 'مورد', 'SUPPLIER', 'supplier@example.com', true, now()),
       ('pc2', 'est2', 'عميل آخر', 'CUSTOMER', 'other@example.com', true, now());`,
    plan("p_in", "pc_in", "IN", TITLE),
    plan("p_noemail", "pc_noemail", "IN", "عقد"),
    plan("p_optout", "pc_optout", "IN", "عقد"),
    plan("p_out", "ps", "OUT", "توريد"),
    plan("p_arch", "pc_in", "IN", "قديم", "ARCHIVED"),
    plan("p2", "pc2", "IN", "عقد", "", "est2", "cat2"),
    inst("i_due", "p_in", 150000, 50000),
    inst("i_other", "p_in", 20000),
    inst("i_paid", "p_in", 10000, 10000),
    inst("i_noemail", "p_noemail", 10000),
    inst("i_optout", "p_optout", 10000),
    inst("i_out", "p_out", 10000),
    inst("i_arch", "p_arch", 10000),
    inst("x2", "p2", 10000, 0, "est2"),
  ].join("\n"));
}, 60_000);

beforeEach(async () => {
  await h.lite!.exec(`DELETE FROM "AuditLog";`);
  h.role = "OWNER";
  resetAllAttempts();
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => new Response("{}", { status: 201 }));
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("BREVO_API_KEY", "xkeysib-test");
  vi.stubEnv("MAIL_FROM", "sender@example.com");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("setPartyRemindersOptIn (C9)", () => {
  it("switches this establishment's party and audits before and after", async () => {
    expect(await setPartyRemindersOptIn("pc_optout", true)).toEqual(ok);
    const { rows } = await h.lite!.query(`SELECT "remindersOptIn" FROM "Party" WHERE "id" = 'pc_optout'`);
    expect(rows).toEqual([{ remindersOptIn: true }]);
    expect(await audits("PARTY_REMINDERS")).toEqual([
      { userId: "u1", entity: "Party", entityId: "pc_optout", after: { remindersOptIn: true } },
    ]);
    expect(await setPartyRemindersOptIn("pc_optout", false)).toEqual(ok);
  });

  it("another establishment's party reads as missing; a non-boolean is refused", async () => {
    expect(await setPartyRemindersOptIn("pc2", false)).toEqual({ ok: false, error: "err.notFound" });
    expect(await setPartyRemindersOptIn("pc_in", "yes" as unknown as boolean)).toMatchObject({ ok: false, error: "err.invalidInput" });
    const { rows } = await h.lite!.query(`SELECT "remindersOptIn" FROM "Party" WHERE "id" IN ('pc2', 'pc_in') ORDER BY "id"`);
    expect(rows).toEqual([{ remindersOptIn: true }, { remindersOptIn: true }]);
  });
});

describe("sendClientReminder (C11, E8, E9, E13)", () => {
  it("sends one email with no reply-to, escaped, footer filled twice, and audits it", async () => {
    expect(await sendClientReminder("i_due")).toEqual(ok);
    const [body] = brevoBodies();
    expect(Object.keys(body).sort()).toEqual(["htmlContent", "sender", "subject", "textContent", "to"]);
    expect(JSON.stringify(body)).not.toMatch(/reply/i);
    expect(JSON.stringify(body)).not.toContain("owner1@example.com");
    expect(body.to).toEqual([{ email: CLIENT }]);
    expect(body.subject).toBe(t.clientReminder.subject.replace("{establishment}", () => EST_NAME));
    expect(body.htmlContent).not.toContain("<النور>");
    expect(body.htmlContent).not.toContain("<b>");
    expect(body.htmlContent).toContain("منشأة &lt;النور&gt; &amp; &#39;Co&#39; $&amp;");
    expect(body.htmlContent).toContain("عقد &lt;b&gt;&quot;صيانة&quot;&lt;/b&gt;");
    expect(body.htmlContent).not.toMatch(/\{\w+\}/);
    expect(body.textContent).not.toMatch(/\{\w+\}/);
    expect(body.textContent.split(EST_NAME).length - 1).toBe(3); // body + footer ×2
    expect(body.textContent).toContain("1,000.00 ر.س");
    expect(body.textContent).toContain("2026-10-01");
    expect(await audits("CLIENT_REMINDER_EMAIL")).toEqual([{
      userId: "u1", entity: "Instalment", entityId: "i_due",
      after: { planId: "p_in", partyId: "pc_in", remainingHalalas: 100000, dueDate: "2026-10-01" },
    }]);
  });

  it("once a day per instalment — durable: still refused after a restart clears memory", async () => {
    expect(await sendClientReminder("i_due")).toEqual(ok);
    expect(await sendClientReminder("i_due")).toEqual({ ok: false, error: "err.reminderTooSoon" });
    resetAllAttempts();
    expect(await sendClientReminder("i_due")).toEqual({ ok: false, error: "err.reminderTooSoon" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await sendClientReminder("i_other")).toEqual(ok);
  });

  it("an email at 23:00 does not block the next Riyadh day at 08:00, memory kept (S-G6a)", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date("2026-10-05T20:00:00Z")); // 23:00 Riyadh, 5 Oct
      expect(await sendClientReminder("i_due")).toEqual(ok);
      // The audit row carries that instant whatever clock wrote it.
      await h.lite!.exec(`UPDATE "AuditLog" SET "createdAt" = '2026-10-05T20:00:00Z'`);
      vi.setSystemTime(new Date("2026-10-05T20:30:00Z")); // 23:30, same Riyadh day
      expect(await sendClientReminder("i_due")).toEqual({ ok: false, error: "err.reminderTooSoon" });
      vi.setSystemTime(new Date("2026-10-06T05:00:00Z")); // 08:00 Riyadh, 6 Oct — no reset
      expect(await sendClientReminder("i_due")).toEqual(ok);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("an email before Riyadh midnight does not count for today", async () => {
    const before = new Date(riyadhDayStart(new Date()).getTime() - 60_000);
    await h.lite!.exec(auditAt("est1", "i_due", before));
    expect(await sendClientReminder("i_due")).toEqual(ok);
  });

  it(`at most ${CLIENT_EMAILS_PER_DAY} a day per establishment; yesterday's and another tenant's do not count`, async () => {
    expect(CLIENT_EMAILS_PER_DAY).toBe(20);
    // The owner's message names the cap; it must not drift from the constant.
    expect(t.err.clientReminderDailyCap).toContain(String(CLIENT_EMAILS_PER_DAY));
    // A WhatsApp text is not an email and does not count.
    await prepareWhatsAppReminder("i_noemail");
    const today = riyadhDayStart(new Date());
    const yesterday = new Date(today.getTime() - 60_000);
    for (let i = 0; i < CLIENT_EMAILS_PER_DAY; i += 1) {
      await h.lite!.exec(auditAt("est2", `x${i}`, today) + auditAt("est1", `y${i}`, yesterday));
    }
    for (let i = 0; i < CLIENT_EMAILS_PER_DAY - 1; i += 1) await h.lite!.exec(auditAt("est1", `z${i}`, today));
    expect(await sendClientReminder("i_due")).toEqual(ok);
    expect(await sendClientReminder("i_other")).toEqual({ ok: false, error: "err.clientReminderDailyCap" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["i_paid", "err.reminderNotApplicable"],
    ["i_out", "err.reminderNotApplicable"],
    ["i_arch", "err.reminderNotApplicable"],
    ["i_optout", "err.remindersNotOptedIn"],
    ["i_noemail", "err.partyNoEmail"],
    ["x2", "err.notFound"],
    ["missing", "err.notFound"],
  ])("%s → %s, nothing sent or audited", async (id, error) => {
    expect(await sendClientReminder(id)).toEqual({ ok: false, error });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await audits("CLIENT_REMINDER_EMAIL")).toEqual([]);
  });

  it("a Brevo failure is mailFailed, unaudited, and may be retried at once", async () => {
    fetchMock.mockImplementationOnce(async () => new Response("{}", { status: 500 }));
    expect(await sendClientReminder("i_due")).toEqual({ ok: false, error: "err.mailFailed" });
    expect(await audits("CLIENT_REMINDER_EMAIL")).toEqual([]);
    expect(await sendClientReminder("i_due")).toEqual(ok);
  });

  it("the recipient's mailto: cap is mailFailed and frees the double-click key", async () => {
    for (let i = 0; i < LIMITS.mailTo.max; i += 1) consumeLimit(`mailto:${CLIENT}`, LIMITS.mailTo);
    expect(await sendClientReminder("i_due")).toEqual({ ok: false, error: "err.mailFailed" });
    expect(fetchMock).not.toHaveBeenCalled();
    clearAttempts(`mailto:${CLIENT}`);
    expect(await sendClientReminder("i_due")).toEqual(ok);
  });

  it("a double click sends once", async () => {
    const results = await Promise.all([sendClientReminder("i_due"), sendClientReminder("i_due")]);
    expect(results).toContainEqual(ok);
    expect(results).toContainEqual({ ok: false, error: "err.reminderTooSoon" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("prepareWhatsAppReminder (C12)", () => {
  it("returns the copy-ready text — raw, no link, no phone — and audits it", async () => {
    const result = await prepareWhatsAppReminder("i_noemail");
    expect(result).toMatchObject({ ok: true });
    const text = (result as { data: { text: string } }).data.text;
    expect(text).toContain(EST_NAME);
    expect(text).toContain("100.00 ر.س");
    expect(text).not.toMatch(/wa\.me|https?:|\{\w+\}/);
    expect(await audits("CLIENT_REMINDER_WHATSAPP")).toEqual([{
      userId: "u1", entity: "Instalment", entityId: "i_noemail",
      after: { planId: "p_noemail", partyId: "pc_noemail", remainingHalalas: 10000, dueDate: "2026-10-01" },
    }]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([["i_paid"], ["i_out"], ["i_arch"], ["i_optout"], ["x2"]])("refuses %s", async (id) => {
    expect((await prepareWhatsAppReminder(id)).ok).toBe(false);
    expect(await audits("CLIENT_REMINDER_WHATSAPP")).toEqual([]);
  });
});

describe("what the «تذكير» button reads (C10, N4)", () => {
  it("dues rows carry the party's opt-in and whether it has an email — never the address", async () => {
    const { overdue } = await getDues("est1", "2026-10-05");
    const flags = Object.fromEntries(overdue.map((r) => [r.instalmentId, [r.partyRemindersOptIn, r.partyHasEmail]]));
    expect(flags).toMatchObject({ i_due: [true, true], i_noemail: [true, false], i_optout: [false, true], i_out: [true, true] });
    expect(JSON.stringify(overdue)).not.toContain("@example.com");
  });

  it("plan detail and party detail carry them too", async () => {
    expect(await getPlan("est1", "p_noemail")).toMatchObject({ partyRemindersOptIn: true, partyHasEmail: false });
    expect(await getPlan("est1", "p_optout")).toMatchObject({ partyRemindersOptIn: false, partyHasEmail: true });
    expect(await getParty("est1", "pc_in")).toMatchObject({ remindersOptIn: true });
    expect(await getParty("est1", "pc_optout")).toMatchObject({ remindersOptIn: false });
  });
});

describe("owner only — never staff, never automatic", () => {
  it("a STAFF session (canEdit or not) is refused by all three before anything happens", async () => {
    h.role = "STAFF";
    await expect(sendClientReminder("i_due")).rejects.toThrow("NEXT_REDIRECT");
    await expect(prepareWhatsAppReminder("i_due")).rejects.toThrow("NEXT_REDIRECT");
    await expect(setPartyRemindersOptIn("pc_in", false)).rejects.toThrow("NEXT_REDIRECT");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("Riyadh midnight is 21:00 UTC the day before", () => {
    expect(riyadhDayStart(new Date("2026-10-05T20:59:00Z")).toISOString()).toBe("2026-10-04T21:00:00.000Z");
    expect(riyadhDayStart(new Date("2026-10-05T21:00:00Z")).toISOString()).toBe("2026-10-05T21:00:00.000Z");
  });

  it("only owner pages and components import the client actions; clientRules only client.ts", () => {
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const path = `${dir}/${e.name}`;
        if (e.isDirectory()) return path === "src/generated" ? [] : walk(path);
        return /\.tsx?$/.test(e.name) && !e.name.endsWith(".test.ts") ? [path] : [];
      });
    const files = walk("src");
    const importers = (pattern: RegExp) => files.filter((f) => pattern.test(readFileSync(f, "utf8")));
    for (const file of importers(/["'][^"']*reminders\/client["']/)) {
      expect(file).toMatch(/^src\/(?:app\/\(owner\)\/|features\/[\w-]+\/components\/|components\/)/);
    }
    expect(importers(/["'][^"']*reminders\/clientRules["']/)).toEqual([]);
    expect(importers(/["']\.\/clientRules["']/)).toEqual(["src/features/reminders/client.ts"]);
  });
});
