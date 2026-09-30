import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { FIXTURES, HOSTILE_NAME, OWNERS, SECRET_NAME } from "./digestRun.fixtures";

/**
 * The owner digest end to end on real Postgres (PGlite) with the real
 * generated client: selection, salary generation first (E4), the claim (C5,
 * E2), grouping (C6), caps (E3), the send (fetch mocked — nothing reaches
 * Brevo), outcomes and audits (E12). Mocked: `server-only`, `next/cache`,
 * `@/lib/auth` (generation imports it), `@/lib/db` → PGlite, and `fetch`.
 */

const h = vi.hoisted(() => ({
  lite: null as PGlite | null,
  /** Establishments whose salary pass / digest build throws (C8, C5). */
  failGeneration: new Set<string>(),
  failBuild: new Set<string>(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/lib/auth", () => ({ requireMember: async () => ({}) }));
vi.mock("@/features/payroll/generate", async (original) => {
  const real = await original<typeof import("@/features/payroll/generate")>();
  return {
    ...real,
    runSalaryGeneration: async (...args: Parameters<typeof real.runSalaryGeneration>) => {
      if (h.failGeneration.has(args[0])) throw new RangeError("generation failed");
      return real.runSalaryGeneration(...args);
    },
  };
});
vi.mock("./digest", async (original) => {
  const real = await original<typeof import("./digest")>();
  return {
    ...real,
    buildDigest: async (...args: Parameters<typeof real.buildDigest>) => {
      if (h.failBuild.has(args[0])) throw new RangeError("build failed");
      return real.buildDigest(...args);
    },
  };
});
vi.mock("@/lib/db", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { pgliteClient } = await import("@/lib/testing/pgliteClient");
  h.lite = new PGlite();
  return { db: pgliteClient(h.lite) };
});

await import("@/lib/db");
const { runDigests } = await import("./run");
const { buildDigest } = await import("./digest");
const { consumeLimit, LIMITS, resetAllAttempts } = await import("@/lib/rateLimit");

const NOW = new Date("2026-10-05T06:00:00Z"); // 09:00 Riyadh
const TODAY = "2026-10-05";

const fetchMock = vi.fn();
let logged: string[] = [];

type Sent = { to: string; subject: string; html: string; text: string };
function sentMail(): Sent[] {
  return fetchMock.mock.calls.map(([, init]) => {
    const body = JSON.parse((init as { body: string }).body);
    return { to: body.to[0].email, subject: body.subject, html: body.htmlContent, text: body.textContent };
  });
}
const mailTo = (est: string) => sentMail().find((m) => m.to === OWNERS[est]);

async function claims(): Promise<Record<string, string>> {
  const { rows } = await h.lite!.query<{ establishmentId: string; date: string; status: string }>(
    `SELECT "establishmentId", "date"::text AS date, "status" FROM "ReminderDigest"`,
  );
  return Object.fromEntries(rows.map((r) => [`${r.establishmentId}@${r.date}`, r.status]));
}

beforeAll(async () => {
  const migrations = join(process.cwd(), "prisma", "migrations");
  const dirs = readdirSync(migrations, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  for (const dir of dirs) await h.lite!.exec(readFileSync(join(migrations, dir, "migration.sql"), "utf8"));
  await h.lite!.exec(FIXTURES);
}, 60_000);

beforeEach(async () => {
  await h.lite!.exec(`DELETE FROM "ReminderDigest"; DELETE FROM "AuditLog" WHERE "action" = 'DIGEST_SENT';`);
  resetAllAttempts();
  h.failGeneration.clear();
  h.failBuild.clear();
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => new Response("{}", { status: 201 }));
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("BREVO_API_KEY", "xkeysib-test");
  vi.stubEnv("MAIL_FROM", "sender@example.com");
  vi.stubEnv("APP_URL", "https://ledger.example.com");
  logged = [];
  const capture = (...args: unknown[]) => void logged.push(args.map(String).join(" "));
  vi.spyOn(console, "error").mockImplementation(capture);
  vi.spyOn(console, "warn").mockImplementation(capture);
});

describe("buildDigest (C6)", () => {
  it("puts each unpaid instalment of an OPEN plan in exactly one group, by its own plan's window", async () => {
    const digest = await buildDigest("est1", TODAY);
    const view = (key: keyof typeof digest.groups) =>
      digest.groups[key].rows.map((r) => `${r.dueDate} ${r.direction} ${r.remainingHalalas}`);
    expect(view("overdue")).toEqual(["2026-09-20 IN 7500", "2026-09-27 OUT 300000"]);
    expect(view("today")).toEqual(["2026-10-05 IN 10000"]);
    expect(view("tomorrow")).toEqual(["2026-10-06 IN 10000"]);
    expect(view("upcoming")).toEqual(["2026-10-08 IN 10000", "2026-10-15 OUT 20000"]);
    expect(digest.itemCount).toBe(6);
    expect(digest.groups.overdue).toMatchObject({ totalInHalalas: 7500, totalOutHalalas: 300000, moreCount: 0 });
    expect(digest.groups.upcoming).toMatchObject({ totalInHalalas: 10000, totalOutHalalas: 20000 });
  });

  it("names a salary row «راتب شهري — name» and a standard one by its title", async () => {
    const { groups } = await buildDigest("est1", TODAY);
    expect(groups.overdue.rows.map((r) => [r.partyName, r.planTitle])).toEqual([
      [HOSTILE_NAME, "اتفاقية p_in"],
      ["أحمد", "راتب شهري — أحمد"],
    ]);
  });

  it("lists at most 50 rows per group; the totals cover all of them (N11)", async () => {
    const { groups, itemCount } = await buildDigest("est10", TODAY);
    expect(groups.overdue.rows).toHaveLength(50);
    expect(groups.overdue.moreCount).toBe(3);
    expect(groups.overdue.totalInHalalas).toBe(5300);
    expect(itemCount).toBe(53);
  });

  it("holds nothing of another establishment (N12)", async () => {
    const { groups } = await buildDigest("est2", TODAY);
    expect(groups.overdue.rows.map((r) => r.partyName)).toEqual([SECRET_NAME]);
    expect(Object.values(groups).flatMap((g) => g.rows)).toHaveLength(1);
  });
});

describe("runDigests", () => {
  it("mails each due owner once, their own rows only, and records every outcome", async () => {
    expect(await runDigests(NOW)).toEqual({ sent: 4, skipped: 1 });
    expect(sentMail().map((m) => m.to).sort()).toEqual([OWNERS.est1, OWNERS.est2, OWNERS.est8, OWNERS.est9].sort());
    expect(await claims()).toEqual({
      [`est1@${TODAY}`]: "SENT",
      [`est2@${TODAY}`]: "SENT",
      [`est7@${TODAY}`]: "EMPTY",
      [`est8@${TODAY}`]: "SENT",
      [`est9@${TODAY}`]: "SENT",
    });
    expect(mailTo("est1")!.html).not.toContain(SECRET_NAME);
    expect(mailTo("est1")!.text).not.toContain(SECRET_NAME);
    expect(mailTo("est2")!.html).toContain(SECRET_NAME);
    expect(mailTo("est2")!.html).not.toContain("alert");
  });

  it("escapes owner-entered text in the HTML part and links to the dues page (C7, E7)", async () => {
    await runDigests(NOW);
    const mail = mailTo("est1")!;
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;Co&#39; $&amp; $&#39;");
    expect(mail.text).toContain(HOSTILE_NAME);
    expect(mail.html).toContain('href="https://ledger.example.com/owner/dues"');
    expect(mail.html).toContain("75.00 ر.س");
  });

  it("audits every outcome as the owner, with the date, status and count only (E12)", async () => {
    await runDigests(NOW);
    const { rows } = await h.lite!.query<{ establishmentId: string; userId: string; entity: string; after: unknown; before: unknown }>(
      `SELECT "establishmentId", "userId", "entity", "after", "before" FROM "AuditLog" WHERE "action" = 'DIGEST_SENT' ORDER BY "establishmentId"`,
    );
    expect(rows.map((r) => [r.establishmentId, r.userId, r.entity, r.after, r.before])).toEqual([
      ["est1", "u1", "ReminderDigest", { date: TODAY, status: "SENT", itemCount: 6 }, null],
      ["est2", "u2", "ReminderDigest", { date: TODAY, status: "SENT", itemCount: 1 }, null],
      ["est7", "u7", "ReminderDigest", { date: TODAY, status: "EMPTY", itemCount: 0 }, null],
      ["est8", "u8", "ReminderDigest", { date: TODAY, status: "SENT", itemCount: 1 }, null],
      ["est9", "u9", "ReminderDigest", { date: TODAY, status: "SENT", itemCount: 1 }, null],
    ]);
  });

  /** The first run in this file generated est8's months; later runs find them (idempotent). */
  it("generates this month's salary first, audited as automatic (E4)", async () => {
    await runDigests(NOW);
    expect(mailTo("est8")!.html).toContain("راتب شهري — خالد");
    const { rows } = await h.lite!.query<{ userId: string; after: { auto?: boolean } }>(
      `SELECT "userId", "after" FROM "AuditLog" WHERE "action" = 'SALARY_GENERATE' AND "establishmentId" = 'est8'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ userId: "u8", after: { auto: true } });
  });

  it("skips an establishment whose owner is not verified, logging no address (N9)", async () => {
    await runDigests(NOW);
    expect(logged.join("\n")).toContain("[digest] skipped: 0 eligible owners");
    expect(logged.join("\n")).not.toMatch(/owner\d+@/);
  });

  it("sends nothing more the same day, and nothing for a claim left PENDING", async () => {
    await h.lite!.exec(`INSERT INTO "ReminderDigest" ("id", "establishmentId", "date", "status") VALUES ('crash', 'est2', '${TODAY}', 'PENDING')`);
    await runDigests(NOW);
    expect(sentMail().map((m) => m.to)).not.toContain(OWNERS.est2);
    fetchMock.mockClear();
    expect(await runDigests(new Date("2026-10-05T18:00:00Z"))).toEqual({ sent: 0, skipped: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
    expect((await claims())[`est2@${TODAY}`]).toBe("PENDING");
  });

  it("records a Brevo failure as FAILED and does not retry it that day", async () => {
    fetchMock.mockImplementation(async () => new Response('{"code":"unauthorized"}', { status: 401 }));
    expect(await runDigests(NOW)).toEqual({ sent: 0, skipped: 5 });
    expect((await claims())[`est1@${TODAY}`]).toBe("FAILED");
    fetchMock.mockReset();
    fetchMock.mockImplementation(async () => new Response("{}", { status: 201 }));
    await runDigests(new Date("2026-10-05T07:00:00Z"));
    expect(fetchMock).not.toHaveBeenCalled();
    expect((await claims())[`est1@${TODAY}`]).toBe("FAILED");
  });

  it("two concurrent runs claim each day once and send one email per owner (N10)", async () => {
    const [a, b] = await Promise.all([runDigests(NOW), runDigests(NOW)]);
    expect(a.sent + b.sent).toBe(4);
    expect(sentMail().map((m) => m.to).sort()).toEqual([OWNERS.est1, OWNERS.est2, OWNERS.est8, OWNERS.est9].sort());
    const { rows } = await h.lite!.query(`SELECT 1 FROM "ReminderDigest"`);
    expect(rows).toHaveLength(5);
  });

  it("the global digest cap (150/day) records FAILED and logs no address (E3)", async () => {
    expect(LIMITS.digestDay).toEqual({ max: 150, windowMs: 86_400_000 });
    for (let i = 0; i < LIMITS.digestDay.max; i += 1) consumeLimit("digest:day", LIMITS.digestDay);
    expect(await runDigests(NOW)).toEqual({ sent: 0, skipped: 5 });
    expect(fetchMock).not.toHaveBeenCalled();
    expect((await claims())[`est1@${TODAY}`]).toBe("FAILED");
    expect((await claims())[`est7@${TODAY}`]).toBe("EMPTY");
    expect(logged.join("\n")).toContain("[digest] capped");
    expect(logged.join("\n")).not.toMatch(/owner\d+@/);
  });

  it("the recipient's hourly cap, shared with auth mail, stops only that owner (E3)", async () => {
    for (let i = 0; i < LIMITS.mailTo.max; i += 1) consumeLimit(`mailto:${OWNERS.est1}`, LIMITS.mailTo);
    expect(await runDigests(NOW)).toEqual({ sent: 3, skipped: 2 });
    expect(sentMail().map((m) => m.to)).not.toContain(OWNERS.est1);
    expect((await claims())[`est1@${TODAY}`]).toBe("FAILED");
  });

  it("decides the Riyadh date and hour from one instant, across midnight (N5)", async () => {
    await runDigests(new Date("2026-10-05T20:55:00Z")); // 23:55 Riyadh, 5 Oct
    expect((await claims())[`est4@2026-10-05`]).toBe("SENT");
    expect((await claims())[`est9@2026-10-05`]).toBe("SENT");
    await runDigests(new Date("2026-10-05T21:05:00Z")); // 00:05 Riyadh, 6 Oct
    expect((await claims())[`est9@2026-10-06`]).toBe("SENT");
    expect((await claims())[`est4@2026-10-06`]).toBeUndefined();
    expect((await claims())[`est1@2026-10-06`]).toBeUndefined();
  });

  it("one establishment's failure never stops the rest, and is retried later that day (C8)", async () => {
    h.failGeneration.add("est1");
    expect(await runDigests(NOW)).toEqual({ sent: 3, skipped: 2 });
    expect(sentMail().map((m) => m.to)).not.toContain(OWNERS.est1);
    expect((await claims())[`est1@${TODAY}`]).toBeUndefined();
    expect(logged).toContain("[digest] establishment failed: RangeError");
    h.failGeneration.clear();
    fetchMock.mockClear();
    expect(await runDigests(new Date("2026-10-05T07:00:00Z"))).toEqual({ sent: 1, skipped: 0 });
    expect(sentMail().map((m) => m.to)).toEqual([OWNERS.est1]);
  });

  it("a failure after the claim is recorded FAILED and audited, never left PENDING (E2, E12)", async () => {
    h.failBuild.add("est2");
    expect(await runDigests(NOW)).toEqual({ sent: 3, skipped: 2 });
    expect((await claims())[`est2@${TODAY}`]).toBe("FAILED");
    const { rows } = await h.lite!.query(`SELECT "after" FROM "AuditLog" WHERE "action" = 'DIGEST_SENT' AND "establishmentId" = 'est2'`);
    expect(rows).toEqual([{ after: { date: TODAY, status: "FAILED", itemCount: 0 } }]);
    expect(logged).toContain("[digest] build or send failed: RangeError");
  });

  it("at 09:00 leaves the 23:00 owner, the disabled digest and the inactive establishment alone", async () => {
    await runDigests(NOW);
    const claimed = Object.keys(await claims());
    for (const est of ["est3", "est4", "est5", "est6", "est10"]) {
      expect(claimed).not.toContain(`${est}@${TODAY}`);
    }
  });
});
