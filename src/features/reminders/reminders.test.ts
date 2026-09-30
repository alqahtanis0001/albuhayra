import { readFileSync } from "node:fs";

import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * v1.2c CP1 gates that are not the end-to-end run (`digestRun.test.ts`) or
 * the endpoint (`route.test.ts`): the E1 static gate standing in for the
 * scoping gate on `select.ts`, the module shapes, the pure grouping, the
 * selection's output shape and N9, and the settings action.
 */

const h = vi.hoisted(() => ({
  calls: [] as Array<{ model: string; method: string; args: Record<string, unknown> }>,
  rows: [] as unknown[],
  requireOwner: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/lib/auth", () => ({ requireOwner: h.requireOwner }));
vi.mock("@/lib/db", () => {
  const model = (name: string) =>
    new Proxy({}, {
      get: (_t, method) => async (args: Record<string, unknown>) => {
        h.calls.push({ model: name, method: String(method), args });
        if (method === "findMany") return h.rows;
        if (method === "findFirst") return { digestEnabled: false, digestHour: 7 };
        if (method === "updateMany") return { count: 1 };
        return { id: "x" };
      },
    });
  const db: Record<string, unknown> = {
    establishment: model("establishment"), auditLog: model("auditLog"), user: model("user"),
  };
  db.$transaction = async (fn: (tx: unknown) => unknown) => fn(db);
  return { db };
});

const { selectDigestTargets } = await import("./select");
const { digestGroupOf } = await import("./digest");
const { updateDigestSettings } = await import("./actions");
const { getDigestSettings } = await import("./settings");

beforeEach(() => {
  h.calls.length = 0;
  h.rows = [];
  h.requireOwner.mockReset();
  h.requireOwner.mockResolvedValue({ user: { id: "owner_1" }, establishmentId: "est_1" });
});

/* ---------------------------------------------- E1: select.ts's own gate */

describe("E1: select.ts, the one cross-establishment read, stays a routing read", () => {
  const SOURCE = readFileSync("src/features/reminders/select.ts", "utf8");
  const CALL = /\b(?:db|tx|client)\.(\w+)\.(\w+)\(/g;
  /** A read of any model that holds money, people's data or history, through a relation. */
  const FINANCIAL_RELATION =
    /\b(?:transactions?|instalments?|plans?|part(?:y|ies)|projects?|categor(?:y|ies)|employees?|allowances|salaryPeriods?|salaryDeductions?|attendanceRecords?|auditLogs?|locks|periodLocks?|emailCodes?)\s*:\s*(?:true|\{)/;
  /** Anchored on the key shape (`name:`), so the prose "no amount field" cannot trip it. */
  const AMOUNT_FIELD = /\b\w*(?:halalas|amount)\w*\s*:/i;
  const RAW_SQL = /\b(?:db|tx|client)\.\$(?:query|execute)Raw/;

  /** The argument text of each call, by bracket depth. */
  function callArguments(source: string): Array<{ receiver: string; args: string }> {
    return [...source.matchAll(CALL)].map((m) => {
      let depth = 1;
      let i = m.index! + m[0].length;
      const start = i;
      for (; i < source.length && depth > 0; i++) {
        if (source[i] === "(") depth++;
        else if (source[i] === ")") depth--;
      }
      return { receiver: m[1]!, args: source.slice(start, i - 1) };
    });
  }

  it("reads only establishment, user and reminderDigest (and reads something)", () => {
    const calls = callArguments(SOURCE);
    expect(calls.length).toBeGreaterThan(0);
    for (const { receiver } of calls) expect(["establishment", "user", "reminderDigest"]).toContain(receiver);
  });

  it("every call names its fields with an explicit select and includes nothing", () => {
    for (const { args } of callArguments(SOURCE)) {
      expect(args).toMatch(/\bselect\s*:\s*\{/);
      expect(args).not.toMatch(/\binclude\s*:/);
    }
  });

  it("no financial model through a relation, no amount field, no raw SQL", () => {
    expect(SOURCE).not.toMatch(FINANCIAL_RELATION);
    expect(SOURCE).not.toMatch(AMOUNT_FIELD);
    expect(SOURCE).not.toMatch(RAW_SQL);
  });

  it("the patterns do match what they forbid", () => {
    expect(callArguments("db.transaction.findMany({ where: {} })")[0]!.receiver).toBe("transaction");
    expect(callArguments("db.user.findMany({ where: { a: f(1) }, include: { x: true } })")[0]!.args).toMatch(/include/);
    expect("plans: { select: { id: true } }").toMatch(FINANCIAL_RELATION);
    expect("_count: { select: { transactions: true } }").toMatch(FINANCIAL_RELATION);
    expect("parties: true").toMatch(FINANCIAL_RELATION);
    expect("select: { totalHalalas: true }").toMatch(AMOUNT_FIELD);
    expect("select: { amountDue: true }").toMatch(AMOUNT_FIELD);
    expect("db.$queryRaw`x`").toMatch(RAW_SQL);
  });

  it("returns exactly the routing fields, and skips unless one eligible owner (N9)", async () => {
    h.rows = [
      { id: "est_a", name: "أ", digestHour: 7, createdAt: new Date(), users: [{ id: "u_a", email: "a@example.com" }] },
      { id: "est_b", name: "ب", digestHour: 7, users: [] },
      { id: "est_c", name: "ج", digestHour: 7, users: [{ id: "u1", email: "c1@example.com" }, { id: "u2", email: "c2@example.com" }] },
    ];
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const targets = await selectDigestTargets("2026-10-05", 9);
    expect(targets).toEqual([
      { establishmentId: "est_a", ownerId: "u_a", ownerEmail: "a@example.com", name: "أ", digestHour: 7 },
    ]);
    expect(errors.mock.calls.map((c) => String(c[0]))).toEqual([
      "[digest] skipped: 0 eligible owners",
      "[digest] skipped: 2 eligible owners",
    ]);
    errors.mockRestore();
  });

  it("asks only for active, enabled, due-hour, unclaimed establishments and ACTIVE verified owners (C4)", async () => {
    await selectDigestTargets("2026-10-05", 9);
    const where = h.calls[0]!.args.where as Record<string, unknown>;
    expect(where).toEqual({
      active: true,
      digestEnabled: true,
      digestHour: { lte: 9 },
      reminderDigests: { none: { date: new Date("2026-10-05T00:00:00Z") } },
    });
    const select = h.calls[0]!.args.select as Record<string, unknown>;
    expect(Object.keys(select).sort()).toEqual(["digestHour", "id", "name", "users"]);
    // The nested relation names its fields too: never a whole user row (password hash included).
    expect(select.users).toEqual({
      where: { role: "OWNER", status: "ACTIVE", emailVerifiedAt: { not: null } },
      select: { id: true, email: true },
    });
  });
});

/* ------------------------------------------------------------ module shapes */

describe("module shapes", () => {
  it("the digest modules are server-only, never use-server (callable by id)", () => {
    for (const file of ["select.ts", "digest.ts", "run.ts", "settings.ts"]) {
      const source = readFileSync(`src/features/reminders/${file}`, "utf8");
      expect(source, file).toMatch(/^import "server-only";$/m);
      expect(source, file).not.toMatch(/^["']use server["'];?$/m);
    }
  });

  it("actions.ts is use-server and exports one action, which takes no establishment id", () => {
    const source = readFileSync("src/features/reminders/actions.ts", "utf8");
    expect(source).toMatch(/^"use server";$/m);
    expect([...source.matchAll(/^export async function (\w+)\(/gm)].map((m) => m[1])).toEqual(["updateDigestSettings"]);
    expect(source).not.toMatch(/^export (?:const|function|let|class) /m);
  });
});

/* ------------------------------------------------------------- the grouping */

describe("digestGroupOf (C6): each row in one group, by its own plan's window", () => {
  it.each([
    ["2026-10-04", 3, "overdue"],
    ["2026-09-01", 0, "overdue"],
    ["2026-10-05", 3, "today"],
    ["2026-10-05", 0, "today"],
    ["2026-10-06", 3, "tomorrow"],
    ["2026-10-06", 0, "tomorrow"],
    ["2026-10-07", 2, "upcoming"],
    ["2026-10-08", 2, null],
    ["2026-10-07", 1, null],
    ["2026-12-04", 60, "upcoming"],
    ["2026-12-05", 60, null],
  ] as const)("due %s with %i reminder days → %s", (due, days, group) => {
    expect(digestGroupOf(due, "2026-10-05", days)).toBe(group);
  });
});

/* ------------------------------------------------------ the settings action */

function settingsForm(fields: Record<string, string>): FormData {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  return form;
}

describe("updateDigestSettings (C1)", () => {
  it("requires an owner before anything else", async () => {
    h.requireOwner.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(updateDigestSettings(null, settingsForm({ digestHour: "7" }))).rejects.toThrow("NEXT_REDIRECT");
    expect(h.calls).toEqual([]);
  });

  it("writes the owner's own establishment and audits before and after", async () => {
    expect(await updateDigestSettings(null, settingsForm({ digestEnabled: "on", digestHour: "21" }))).toEqual({ ok: true, data: null });
    const write = h.calls.find((c) => c.method === "updateMany")!;
    expect(write.args).toEqual({ where: { id: "est_1" }, data: { digestEnabled: true, digestHour: 21 } });
    const audit = h.calls.find((c) => c.model === "auditLog")!;
    expect(audit.args.data).toMatchObject({
      establishmentId: "est_1", userId: "owner_1", action: "DIGEST_SETTINGS", entity: "Establishment", entityId: "est_1",
      before: { digestEnabled: false, digestHour: 7 }, after: { digestEnabled: true, digestHour: 21 },
    });
  });

  it("a posted establishmentId is ignored: the write and audit target the session's own (Rule 1)", async () => {
    const form = settingsForm({ digestEnabled: "on", digestHour: "8", establishmentId: "est_other", id: "est_other" });
    expect(await updateDigestSettings(null, form)).toEqual({ ok: true, data: null });
    for (const call of h.calls.filter((c) => c.model === "establishment")) {
      expect((call.args.where as { id: string }).id).toBe("est_1");
    }
    expect(h.calls.find((c) => c.method === "updateMany")!.args.data).toEqual({ digestEnabled: true, digestHour: 8 });
    expect(h.calls.find((c) => c.model === "auditLog")!.args.data).toMatchObject({ establishmentId: "est_1", entityId: "est_1" });
    expect(JSON.stringify(h.calls)).not.toContain("est_other");
  });

  it("an absent switch means off", async () => {
    await updateDigestSettings(null, settingsForm({ digestHour: "7" }));
    expect(h.calls.find((c) => c.method === "updateMany")!.args.data).toEqual({ digestEnabled: false, digestHour: 7 });
  });

  it.each(["24", "-1", "7.5", "x", ""])("refuses hour %j without writing", async (hour) => {
    const result = await updateDigestSettings(null, settingsForm({ digestEnabled: "on", digestHour: hour }));
    expect(result).toMatchObject({ ok: false, error: "err.invalidInput" });
    expect(h.calls.filter((c) => c.method === "updateMany")).toEqual([]);
  });
});

/* -------------------------------------------------------- the settings read */

describe("getDigestSettings (C1, N9): the page shows the recipient the digest uses", () => {
  it("names the one ACTIVE verified owner, by the same rule as select.ts", async () => {
    h.rows = [{ email: "owner@example.com" }];
    expect(await getDigestSettings("est_1")).toMatchObject({ ownerEmail: "owner@example.com" });
    const read = h.calls.find((c) => c.model === "user")!;
    expect(read.args.where).toEqual({ establishmentId: "est_1", role: "OWNER", status: "ACTIVE", emailVerifiedAt: { not: null } });
    expect(read.args.select).toEqual({ email: true });
  });

  it.each([[[]], [[{ email: "a@example.com" }, { email: "b@example.com" }]]])(
    "shows no recipient when the digest would be skipped (%j)",
    async (rows) => {
      h.rows = rows;
      expect((await getDigestSettings("est_1")).ownerEmail).toBeNull();
    },
  );

  const SERVER = { CRON_SECRET: "a-secret", BREVO_API_KEY: "xkeysib-key", MAIL_FROM: "from@example.com" };

  it("is configured only with the secret AND mail set up — a boolean, never a value", async () => {
    for (const [name, value] of Object.entries(SERVER)) vi.stubEnv(name, value);
    const settings = await getDigestSettings("est_1");
    expect(settings.schedulerConfigured).toBe(true);
    for (const value of Object.values(SERVER)) expect(JSON.stringify(settings)).not.toContain(value);
    vi.unstubAllEnvs();
  });

  it.each(Object.keys(SERVER).flatMap((name) => [[name, ""], [name, "   "]]))(
    "is not configured with %s=%j (the page shows the notice)",
    async (missing, value) => {
      for (const [name, v] of Object.entries(SERVER)) vi.stubEnv(name, name === missing ? value : v);
      expect((await getDigestSettings("est_1")).schedulerConfigured).toBe(false);
      vi.unstubAllEnvs();
    },
  );
});
