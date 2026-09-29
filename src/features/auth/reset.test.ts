import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMemoryDb, type MemoryDb } from "@/lib/testing/memoryDb";

/**
 * `/forgot` and `/reset` (docs/BACKEND.md v1.1e + A3, A4, A6, A7).
 *
 * No enumeration: `/forgot` answers the same for any address and looks the
 * address up only after the response; every code failure on `/reset` is the
 * one key `err.codeInvalidOrExpired`, with the same statements for a known and
 * an unknown address; and the name rule runs only after the code is proven —
 * before that, a name-bearing password answering `passwordPersonal` would say
 * the account exists (A3).
 */

type Flow = { verify?: { userId: string; email: string }; reset?: { email: string } };

const h = vi.hoisted(() => ({
  db: null as unknown as MemoryDb,
  after: [] as Array<() => unknown>,
  flow: {} as Flow,
  limits: [] as string[],
  mail: [] as Array<{ to: string; subject: string; text: string }>,
  hashed: [] as string[],
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  get db() {
    return h.db;
  },
}));
vi.mock("next/server", () => ({ after: (fn: () => unknown) => void h.after.push(fn) }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "10.0.0.7" }),
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw Object.assign(new Error("redirect"), { digest: `NEXT_REDIRECT;replace;${to};307;` });
  },
}));
vi.mock("@/lib/auth", () => ({
  hashPassword: async (plain: string) => {
    h.hashed.push(plain);
    return `hash:${plain}`;
  },
  verifyPassword: async () => false,
}));
vi.mock("@/lib/session", () => ({
  getFlow: async () => h.flow,
  startFlow: async (data: Flow) => {
    h.flow = { ...data };
  },
  clearFlow: async () => {
    h.flow = {};
  },
}));
vi.mock("@/lib/rateLimit", async (original) => ({
  ...(await original<typeof import("@/lib/rateLimit")>()),
  consumeLimit: (key: string) => {
    h.limits.push(key);
    return true;
  },
}));
vi.mock("@/lib/mail/send", () => ({
  deliver: async (message: { to: string; subject: string; text: string }) => {
    h.mail.push(message);
    return true;
  },
}));

process.env.SESSION_SECRET = "r".repeat(40);

const { requestPasswordReset, resetPassword } = await import("./actions");
const { t } = await import("@/i18n/ar");

const KNOWN = "salem@example.com";
const UNKNOWN = "nobody@example.com";
const NEW_PASSWORD = "Bright-river42";
const GENERIC = { ok: false, error: "err.codeInvalidOrExpired" };
const T0 = new Date("2026-09-30T09:00:00Z").getTime();

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.append(k, v);
  return data;
}

async function outcome(action: () => Promise<unknown>): Promise<unknown> {
  try {
    return await action();
  } catch (error: unknown) {
    const digest = (error as { digest?: string }).digest ?? "";
    if (digest.startsWith("NEXT_REDIRECT")) return { redirect: digest.split(";")[2] };
    throw error;
  }
}

async function drain(): Promise<void> {
  while (h.after.length) await h.after.shift()!();
}

async function forgot(email: string): Promise<unknown> {
  return outcome(() => requestPasswordReset(null, form({ email })));
}

function reset(code: string, password = NEW_PASSWORD): Promise<unknown> {
  return outcome(() =>
    resetPassword(null, form({ code, newPassword: password, confirmPassword: password })),
  );
}

function mailedCode(): string {
  return h.mail.at(-1)!.text.match(/\b\d{6}\b/)![0];
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(T0);
  h.db = createMemoryDb();
  h.after = [];
  h.flow = {};
  h.limits = [];
  h.mail = [];
  h.hashed = [];
  h.db.data.user.push({
    id: "user_1",
    email: KNOWN,
    firstName: "سالم",
    middleName: null,
    lastName: "Alshehri",
    passwordHash: "old",
    role: "OWNER",
    status: "ACTIVE",
    emailVerifiedAt: null,
    establishmentId: "est_1",
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("requestPasswordReset — the same answer for any address", () => {
  it("known and unknown: same result, same cookie, no statement before the response", async () => {
    h.db.log.length = 0;
    const known = await forgot(KNOWN);
    const knownFlow = h.flow;
    const unknown = await forgot(UNKNOWN);

    expect(known).toEqual({ ok: true, data: null });
    expect(unknown).toEqual(known);
    expect(Object.keys(h.flow)).toEqual(Object.keys(knownFlow));
    expect(h.db.log).toEqual([]);
    expect(h.mail).toEqual([]);
  });

  it("after the response: the known address gets a RESET code, the unknown one nothing", async () => {
    await forgot(KNOWN);
    await drain();
    await forgot(UNKNOWN);
    await drain();
    expect(h.mail.map((m) => [m.to, m.subject])).toEqual([[KNOWN, t.mail.resetSubject]]);
    expect(h.db.data.emailCode.map((c) => c.purpose)).toEqual(["RESET"]);
  });

  it("RESET has the 60 s gate too (A4): a second request inside it sends nothing", async () => {
    await forgot(KNOWN);
    await drain();
    vi.setSystemTime(T0 + 30_000);
    expect(await forgot(KNOWN)).toEqual({ ok: true, data: null });
    await drain();
    expect(h.mail).toHaveLength(1);
  });

  it("at most five RESET codes a day, then silence (A4)", async () => {
    for (let i = 0; i < 7; i += 1) {
      vi.setSystemTime(T0 + i * 61_000);
      expect(await forgot(KNOWN)).toEqual({ ok: true, data: null });
      await drain();
    }
    expect(h.mail).toHaveLength(5);
  });

  it("spends only the per-IP key (A7)", async () => {
    await forgot(KNOWN);
    expect(h.limits).toEqual(["forgot:10.0.0.7"]);
  });
});

describe("resetPassword — one generic key for every code failure", () => {
  async function codeFor(email: string): Promise<string> {
    await forgot(email);
    await drain();
    return mailedCode();
  }

  it("wrong, expired, burnt, unknown address and no flow all answer the same", async () => {
    const code = await codeFor(KNOWN);
    const wrong = code === "000000" ? "111111" : "000000";

    const answers: unknown[] = [];
    answers.push(await reset(wrong));
    vi.setSystemTime(T0 + 11 * 60_000);
    answers.push(await reset(code)); // expired
    vi.setSystemTime(T0 + 12 * 60_000);
    const second = await codeFor(KNOWN);
    for (let i = 0; i < 5; i += 1) await reset(second === "000000" ? "111111" : "000000");
    answers.push(await reset(second)); // burnt
    await forgot(UNKNOWN);
    answers.push(await reset("123456")); // unknown address
    h.flow = {};
    answers.push(await reset("123456")); // no flow

    for (const answer of answers) expect(answer).toEqual(GENERIC);
  });

  it("runs the same statements for a known and an unknown address", async () => {
    await codeFor(KNOWN);
    h.db.log.length = 0;
    await reset("000001");
    const known = [...h.db.log];

    await forgot(UNKNOWN);
    await drain();
    h.db.log.length = 0;
    await reset("000001");
    expect(h.db.log).toEqual(known);
  });

  it("A3: an unknown address with a name-bearing password answers the generic key", async () => {
    await forgot(UNKNOWN);
    expect(await reset("123456", "Alshehri-2026x")).toEqual(GENERIC);
  });

  it("A3: a known address with the wrong code and a name-bearing password answers the generic key", async () => {
    await codeFor(KNOWN);
    expect(await reset("000001", "Alshehri-2026x")).toEqual(GENERIC);
  });

  it("A3: the name rule runs once the code is proven", async () => {
    const code = await codeFor(KNOWN);
    expect(await reset(code, "Alshehri-2026x")).toEqual({
      ok: false,
      error: "err.invalidInput",
      fieldErrors: { newPassword: "err.passwordPersonal" },
    });
    expect(h.hashed).toEqual([]);
  });

  it("A3: the email local part is checked first, for any address — it tells nothing new", async () => {
    await forgot(UNKNOWN);
    expect(await reset("123456", "xx-nobody-2026")).toEqual({
      ok: false,
      error: "err.invalidInput",
      fieldErrors: { newPassword: "err.passwordPersonal" },
    });
  });

  it("the common list is checked on the server before the code, for any address (A12 amended)", async () => {
    await forgot(UNKNOWN);
    expect(await reset("123456", "Password123")).toEqual({
      ok: false,
      error: "err.invalidInput",
      fieldErrors: { newPassword: "err.passwordCommon" },
    });
  });

  it("the account-free password rules come before the code", async () => {
    await forgot(UNKNOWN);
    expect(await reset("123456", "onlyletterslong")).toMatchObject({
      fieldErrors: { newPassword: "err.passwordLetterDigit" },
    });
  });

  it("success: new hash, code consumed, address verified, audit, flow cleared, /login?reset=1", async () => {
    const code = await codeFor(KNOWN);
    expect(await reset(code)).toEqual({ redirect: "/login?reset=1" });

    const user = h.db.data.user[0]!;
    expect(user.passwordHash).toBe(`hash:${NEW_PASSWORD}`);
    expect(user.emailVerifiedAt).toBeInstanceOf(Date);
    expect(h.db.data.emailCode.every((c) => c.consumedAt !== null)).toBe(true);
    expect(h.db.data.auditLog.map((a) => a.action)).toEqual(["PASSWORD_RESET_SELF"]);
    expect(h.flow).toEqual({});
    // The code cannot be used twice.
    await forgot(KNOWN);
    expect(await reset(code)).toEqual(GENERIC);
  });

  it("keeps an existing verification date", async () => {
    const verifiedAt = new Date(0);
    h.db.data.user[0]!.emailVerifiedAt = verifiedAt;
    const code = await codeFor(KNOWN);
    await reset(code);
    expect(h.db.data.user[0]!.emailVerifiedAt).toEqual(verifiedAt);
  });

  it("spends the per-address and per-IP keys, the same for an unknown address (A4, A7)", async () => {
    await forgot(UNKNOWN);
    h.limits = [];
    await reset("123456");
    expect(h.limits).toEqual([`reset:${UNKNOWN}`, "reset:10.0.0.7"]);
  });
});
