import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMemoryDb, type MemoryDb } from "@/lib/testing/memoryDb";

/**
 * `/verify` end to end through the actions, and **A1: the fake flow is a
 * perfect twin**. One script drives a sign-up with a new address and a sign-up
 * with a registered address through the same steps — five wrong codes, the
 * ten-minute expiry, a resend, a resend 30 s later, another at 61 s, a wrong
 * code after the resend, then resends until the daily cap — and requires the
 * two transcripts (answers, countdowns *and* the database statements each
 * response ran) to be identical. The specific code errors are only safe
 * because of this.
 */

type Flow = { verify?: { userId: string; email: string }; reset?: { email: string } };

const h = vi.hoisted(() => ({
  db: null as unknown as MemoryDb,
  after: [] as Array<() => unknown>,
  flow: {} as Flow,
  limits: [] as string[],
  mail: [] as Array<{ to: string; subject: string; text: string }>,
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  get db() {
    return h.db;
  },
}));
vi.mock("next/server", () => ({ after: (fn: () => unknown) => void h.after.push(fn) }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "10.0.0.9" }),
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw Object.assign(new Error("redirect"), { digest: `NEXT_REDIRECT;replace;${to};307;` });
  },
}));
vi.mock("@/lib/auth", () => ({
  hashPassword: async () => "$2a$12$stub",
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
  startSession: async () => undefined,
  destroySession: async () => undefined,
}));
vi.mock("@/lib/rateLimit", async (original) => ({
  ...(await original<typeof import("@/lib/rateLimit")>()),
  consumeAttempt: () => true,
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

process.env.SESSION_SECRET = "v".repeat(40);

const { signupOwner, verifyEmail, resendVerification, requestPasswordReset, resetPassword } =
  await import("./actions");
const { getVerifyFlow } = await import("./queries");
const { isFakeFlow, resetFakeFlows } = await import("@/lib/codes");

const T0 = new Date("2026-09-30T09:00:00Z").getTime();
const EXISTING = "taken@example.com";
const PASSWORD = "Bright-river42";

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

function fresh(): void {
  h.db = createMemoryDb();
  h.after = [];
  h.flow = {};
  h.limits = [];
  h.mail = [];
  resetFakeFlows();
  h.db.data.user.push({
    id: "existing_1",
    email: EXISTING,
    firstName: "قائم",
    lastName: "مسبقا",
    role: "OWNER",
    status: "ACTIVE",
    emailVerifiedAt: new Date(0),
    establishmentId: "est_0",
  });
}

async function signUp(email: string): Promise<void> {
  vi.setSystemTime(T0);
  await outcome(() =>
    signupOwner(
      null,
      form({
        firstName: "سالم",
        lastName: "الشهري",
        email,
        password: PASSWORD,
        confirmPassword: PASSWORD,
        establishmentName: "مؤسسة سالم",
      }),
    ),
  );
  await drain();
}

/** The six digits in the newest verify mail, if any. */
function mailedCode(): string | null {
  return h.mail.at(-1)?.text.match(/\b\d{6}\b/)?.[0] ?? null;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  fresh();
});

afterEach(() => {
  vi.useRealTimers();
});

/**
 * One step of the script: the answer and the statements the response ran.
 * `after()` work is drained separately — it happens once the response is gone.
 */
async function step(label: string, atMs: number, action: () => Promise<unknown>) {
  vi.setSystemTime(T0 + atMs);
  h.db.log.length = 0;
  const answer = await outcome(action);
  const statements = [...h.db.log];
  await drain();
  return { label, answer, statements };
}

async function script(email: string) {
  await signUp(email);
  const code = mailedCode();
  // The same wrong code for both flows, and certainly wrong for the real one.
  const bad = code === "000000" ? "111111" : "000000";
  const verify = () => verifyEmail(null, form({ code: bad }));
  const resend = () => resendVerification(null);
  const countdown = async () => (await getVerifyFlow())?.resendInSeconds;

  const t: Array<{ label: string; answer: unknown; statements: string[] }> = [];
  t.push(await step("countdown at +10 s", 10_000, countdown));
  for (let i = 1; i <= 5; i += 1) t.push(await step(`wrong #${i}`, 20_000, verify));
  t.push(await step("wrong after burn", 30_000, verify));
  t.push(await step("wrong at +10 min", 10 * 60_000 + 1, verify));
  t.push(await step("resend", 11 * 60_000, resend));
  t.push(await step("countdown after resend", 11 * 60_000 + 5_000, countdown));
  t.push(await step("resend at +30 s", 11 * 60_000 + 30_000, resend));
  t.push(await step("resend at +61 s", 11 * 60_000 + 61_000, resend));
  t.push(await step("wrong after resend", 11 * 60_000 + 62_000, verify));
  for (let i = 0; i < 5; i += 1) {
    t.push(await step(`resend towards the cap #${i}`, (14 + i * 2) * 60_000, resend));
  }
  // Codes #4 and #5 went out at 14 and 16 min; the next three resends answered
  // the same but issued nothing (A4) — so the newest code is still #5.
  t.push(await step("countdown at the cap", 23 * 60_000, countdown));
  t.push(await step("wrong at the cap", 23 * 60_000, verify));
  t.push(await step("wrong once #5 has expired", 27 * 60_000, verify));
  return t;
}

describe("A1: a registered address runs a perfect twin of a real flow", () => {
  it("identical answers, countdowns and statements at every step", async () => {
    const real = await script("new.person@example.com");
    const realMails = h.mail.map((m) => m.subject);
    fresh();
    const fake = await script(EXISTING);
    const fakeMails = h.mail.map((m) => m.subject);

    expect(fake).toEqual(real);
    // The script really exercised the state machine…
    expect(real.map((s) => s.answer)).toEqual([
      60 - 10,
      ...Array(4).fill({ ok: false, error: "err.codeInvalid" }),
      { ok: false, error: "err.codeAttempts" },
      { ok: false, error: "err.codeAttempts" },
      { ok: false, error: "err.codeExpired" },
      { ok: true, data: { retryAfterSeconds: 60 } },
      55,
      { ok: false, error: "err.resendTooSoon" },
      { ok: true, data: { retryAfterSeconds: 60 } },
      { ok: false, error: "err.codeInvalid" },
      ...Array(5).fill({ ok: true, data: { retryAfterSeconds: 60 } }),
      0,
      { ok: false, error: "err.codeInvalid" },
      { ok: false, error: "err.codeExpired" },
    ]);
    // …and the only difference is who got mail: the real flow its codes (five,
    // the daily cap), the registered address one "already registered" notice.
    expect(realMails).toHaveLength(5);
    expect(fakeMails).toHaveLength(1);
  });
});

/**
 * A1 across a restart (lead ruling after R-G2). The fake flow's state is in
 * memory and Render's free tier restarts after 15 idle minutes; a fake flow
 * whose entry is gone must answer what a real flow answers by then — its code
 * has lapsed, so: codeExpired, a countdown at 0, a resend that works, and a
 * fresh twin from there on.
 */
describe("A1 after a restart that lost the fake flow's state", () => {
  async function afterRestart(email: string, restart: boolean) {
    await signUp(email);
    if (restart) resetFakeFlows();
    const verify = () => verifyEmail(null, form({ code: "000000" }));
    const t = [];
    t.push(await step("countdown at +15 min", 15 * 60_000, async () => (await getVerifyFlow())?.resendInSeconds));
    t.push(await step("wrong at +15 min", 15 * 60_000, verify));
    t.push(await step("resend", 15 * 60_000 + 1_000, () => resendVerification(null)));
    t.push(await step("countdown after resend", 15 * 60_000 + 6_000, async () => (await getVerifyFlow())?.resendInSeconds));
    t.push(await step("wrong after resend", 15 * 60_000 + 7_000, verify));
    return t;
  }

  it("answers exactly what the real flow answers by then", async () => {
    const real = await afterRestart("new.person@example.com", false);
    fresh();
    const fake = await afterRestart(EXISTING, true);
    expect(fake).toEqual(real);
    expect(real.map((s) => s.answer)).toEqual([
      0,
      { ok: false, error: "err.codeExpired" },
      { ok: true, data: { retryAfterSeconds: 60 } },
      55,
      { ok: false, error: "err.codeInvalid" },
    ]);
  });
});

/**
 * R-E3 E3-B1: an unverified user on two devices verifies on B, then taps
 * «أعد الإرسال» on A. The resend must not turn the real user's id into a fake
 * flow — which used to send their later RESET codes to the in-memory map, so
 * /reset failed with the generic key until a restart.
 */
describe("a resend after the address was verified elsewhere", () => {
  it("sends nothing, and /forgot + /reset still work for that user", async () => {
    await signUp("new.person@example.com");
    const deviceA = h.flow;
    const code = mailedCode()!;

    vi.setSystemTime(T0 + 30_000);
    expect(await outcome(() => verifyEmail(null, form({ code })))).toEqual({
      redirect: "/pending?as=owner&verified=1",
    });

    h.flow = deviceA; // device A still holds the old flow cookie
    h.mail = [];
    vi.setSystemTime(T0 + 90_000);
    expect(await resendVerification(null)).toEqual({ ok: true, data: { retryAfterSeconds: 60 } });
    await drain();
    expect(h.mail).toEqual([]);
    expect(isFakeFlow(deviceA.verify!.userId)).toBe(false);

    vi.setSystemTime(T0 + 120_000);
    await outcome(() => requestPasswordReset(null, form({ email: "new.person@example.com" })));
    await drain();
    const resetCode = mailedCode()!;
    const password = "Quiet-harbour-73";
    expect(
      await outcome(() =>
        resetPassword(null, form({ code: resetCode, newPassword: password, confirmPassword: password })),
      ),
    ).toEqual({ redirect: "/login?reset=1" });
  });
});

describe("verifyEmail", () => {
  async function newAccount(): Promise<{ code: string; userId: string }> {
    await signUp("new.person@example.com");
    return { code: mailedCode()!, userId: h.flow.verify!.userId };
  }

  it("the right code verifies the address, consumes the code, audits, and routes by the database", async () => {
    const { code, userId } = await newAccount();
    vi.setSystemTime(T0 + 30_000);
    const answer = await outcome(() => verifyEmail(null, form({ code })));

    expect(answer).toEqual({ redirect: "/pending?as=owner&verified=1" });
    const user = h.db.data.user.find((u) => u.id === userId)!;
    expect(user.emailVerifiedAt).toBeInstanceOf(Date);
    expect(h.db.data.emailCode.every((c) => c.consumedAt !== null)).toBe(true);
    expect(h.db.data.auditLog.map((a) => a.action)).toEqual(["SIGNUP", "EMAIL_VERIFIED"]);
    expect(h.flow).toEqual({});
  });

  it("accepts the code typed in Arabic-Indic digits", async () => {
    const { code } = await newAccount();
    const arabic = [...code].map((d) => String.fromCodePoint(0x0660 + Number(d))).join("");
    expect(await outcome(() => verifyEmail(null, form({ code: arabic })))).toEqual({
      redirect: "/pending?as=owner&verified=1",
    });
  });

  it("an account that is already ACTIVE goes to /login", async () => {
    const { code, userId } = await newAccount();
    h.db.data.user.find((u) => u.id === userId)!.status = "ACTIVE";
    expect(await outcome(() => verifyEmail(null, form({ code })))).toEqual({ redirect: "/login" });
  });

  it("a double submit consumes the code once", async () => {
    const { code } = await newAccount();
    const answers = await Promise.all([
      outcome(() => verifyEmail(null, form({ code }))),
      outcome(() => verifyEmail(null, form({ code }))),
    ]);
    expect(answers).toContainEqual({ redirect: "/pending?as=owner&verified=1" });
    expect(answers).toContainEqual({ ok: false, error: "err.codeInvalid" });
    expect(h.db.data.auditLog.filter((a) => a.action === "EMAIL_VERIFIED")).toHaveLength(1);
  });

  it("no flow cookie → verifySessionExpired; a malformed code → codeFormat", async () => {
    expect(await verifyEmail(null, form({ code: "123456" }))).toEqual({
      ok: false,
      error: "err.verifySessionExpired",
    });
    await newAccount();
    expect(await verifyEmail(null, form({ code: "12a456" }))).toMatchObject({
      ok: false,
      error: "err.codeFormat",
    });
  });

  it("spends the per-flow and per-IP limits (A7)", async () => {
    const { userId } = await newAccount();
    h.limits = [];
    await verifyEmail(null, form({ code: "000000" }));
    await resendVerification(null);
    expect(h.limits).toEqual([`verify:${userId}`, "verify:10.0.0.9", `resend:${userId}`]);
  });

  it("never sends mail in the response: the resend's mail waits for after()", async () => {
    await newAccount();
    h.mail = [];
    vi.setSystemTime(T0 + 61_000);
    await resendVerification(null);
    expect(h.mail).toHaveLength(0);
    await drain();
    expect(h.mail.map((m) => m.to)).toEqual(["new.person@example.com"]);
  });
});
