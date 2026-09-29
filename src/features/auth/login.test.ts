import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMemoryDb, type MemoryDb } from "@/lib/testing/memoryDb";

/**
 * Login in v1.1e (docs/BACKEND.md A8). The order of the branches is the
 * contract: wrong password → DISABLED or inactive establishment → unverified
 * → PENDING. Everything after the password speaks only to someone who has
 * just proved it. An unverified account never gets a session — it gets the
 * flow cookie and `/verify`, and a code if none is still usable.
 */

type Flow = { verify?: { userId: string; email: string }; reset?: { email: string } };

const h = vi.hoisted(() => ({
  db: null as unknown as MemoryDb,
  after: [] as Array<() => unknown>,
  flow: {} as Flow,
  flowCleared: 0,
  session: null as unknown,
  destroyed: 0,
  passwordOk: true,
  mail: [] as Array<{ to: string; subject: string }>,
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  get db() {
    return h.db;
  },
}));
vi.mock("next/server", () => ({ after: (fn: () => unknown) => void h.after.push(fn) }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "10.0.0.5" }),
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw Object.assign(new Error("redirect"), { digest: `NEXT_REDIRECT;replace;${to};307;` });
  },
}));
vi.mock("@/lib/auth", () => ({
  hashPassword: async () => "$2a$12$decoy",
  verifyPassword: async () => h.passwordOk,
}));
vi.mock("@/lib/session", () => ({
  getFlow: async () => h.flow,
  startFlow: async (data: Flow) => {
    h.flow = { ...data };
  },
  clearFlow: async () => {
    h.flowCleared += 1;
    h.flow = {};
  },
  startSession: async (data: unknown) => {
    h.session = data;
  },
  destroySession: async () => {
    h.destroyed += 1;
  },
}));
vi.mock("@/lib/rateLimit", async (original) => ({
  ...(await original<typeof import("@/lib/rateLimit")>()),
  consumeAttempt: () => true,
  clearAttempts: () => undefined,
}));
vi.mock("@/lib/mail/send", () => ({
  deliver: async (message: { to: string; subject: string }) => {
    h.mail.push(message);
    return true;
  },
}));

process.env.SESSION_SECRET = "l".repeat(40);

const { login, logout } = await import("./actions");

const EMAIL = "salem@example.com";

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

function signIn(): Promise<unknown> {
  const data = new FormData();
  data.append("email", EMAIL);
  data.append("password", "whatever-1234");
  return outcome(() => login(null, data));
}

function account(overrides: Record<string, unknown> = {}): void {
  h.db.data.user.push({
    id: "user_1",
    email: EMAIL,
    firstName: "سالم",
    lastName: "الشهري",
    passwordHash: "hash",
    role: "OWNER",
    status: "ACTIVE",
    emailVerifiedAt: new Date(0),
    establishmentId: "est_1",
    establishment: { active: true },
    ...overrides,
  });
}

beforeEach(() => {
  h.db = createMemoryDb();
  h.after = [];
  h.flow = {};
  h.flowCleared = 0;
  h.session = null;
  h.destroyed = 0;
  h.passwordOk = true;
  h.mail = [];
});

const FAILED = { ok: false, error: "err.loginFailed" };

describe("the branch order (A8)", () => {
  it("wrong password → loginFailed, before anything else is looked at", async () => {
    account({ status: "DISABLED", emailVerifiedAt: null });
    h.passwordOk = false;
    expect(await signIn()).toEqual(FAILED);
    expect(h.flow).toEqual({});
  });

  it("DISABLED → loginFailed, even when unverified", async () => {
    account({ status: "DISABLED", emailVerifiedAt: null });
    expect(await signIn()).toEqual(FAILED);
    expect(h.flow).toEqual({});
    expect(h.after).toHaveLength(0);
  });

  it("an inactive establishment → loginFailed, even when unverified", async () => {
    account({ establishment: { active: false }, emailVerifiedAt: null, status: "PENDING" });
    expect(await signIn()).toEqual(FAILED);
    expect(h.flow).toEqual({});
  });

  it("unverified → flow cookie and /verify, never a session, before PENDING", async () => {
    account({ status: "PENDING", emailVerifiedAt: null });
    expect(await signIn()).toEqual({ redirect: "/verify" });
    expect(h.flow).toEqual({ verify: { userId: "user_1", email: EMAIL, startedAt: expect.any(Number) } });
    expect(h.session).toBeNull();
    // A stale session from another account in this browser is dropped too.
    expect(h.destroyed).toBe(1);
  });

  it("verified and PENDING → /pending, no session, flow cleared", async () => {
    account({ status: "PENDING" });
    expect(await signIn()).toEqual({ redirect: "/pending?as=owner" });
    expect(h.session).toBeNull();
    expect(h.destroyed).toBe(1);
    expect(h.flowCleared).toBe(1);
  });

  it("verified and ACTIVE → a session and the role home, flow cleared", async () => {
    account();
    expect(await signIn()).toEqual({ redirect: "/owner" });
    expect(h.session).toEqual({ userId: "user_1", role: "OWNER", establishmentId: "est_1" });
    expect(h.flowCleared).toBe(1);
  });

  it("an unknown address → loginFailed", async () => {
    expect(await signIn()).toEqual(FAILED);
  });
});

describe("the code an unverified login gets", () => {
  it("is issued after the response when none is usable", async () => {
    account({ status: "PENDING", emailVerifiedAt: null });
    await signIn();
    expect(h.mail).toHaveLength(0);
    await drain();
    expect(h.mail.map((m) => m.to)).toEqual([EMAIL]);
    expect(h.db.data.emailCode).toHaveLength(1);
  });

  it("is not re-issued while the last one is still usable", async () => {
    account({ status: "PENDING", emailVerifiedAt: null });
    await signIn();
    await drain();
    await signIn();
    await drain();
    expect(h.mail).toHaveLength(1);
    expect(h.db.data.emailCode).toHaveLength(1);
  });
});

describe("logout", () => {
  it("clears the flow cookie as well as the session", async () => {
    h.flow = { verify: { userId: "x", email: EMAIL } };
    expect(await outcome(() => logout())).toEqual({ redirect: "/login" });
    expect(h.flowCleared).toBe(1);
    expect(h.destroyed).toBe(1);
  });
});
