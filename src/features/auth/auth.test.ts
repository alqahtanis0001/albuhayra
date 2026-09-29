import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMemoryDb, type MemoryDb } from "@/lib/testing/memoryDb";

/**
 * Sign-up (v1.1e): no enumeration, by construction.
 *
 * A new address and an already-registered one must be indistinguishable to the
 * caller: the same result, the same flow cookie shape, the same redirect, and
 * the same work before the response — which, since A6, means **no** lookup of
 * the address at all before the response. That lookup, the account, the code
 * and the email all happen in `after()`, which these tests capture instead of
 * running, so they can assert the response path on its own and then drain the
 * queue to check what happened afterwards.
 *
 * B10 still holds: every join-code failure is one generic `err.joinFailed`.
 * A2: neither action calls `clearAttempts`, so the limiter is spent the same on
 * both paths.
 */

const h = vi.hoisted(() => ({
  db: null as unknown as MemoryDb,
  after: [] as Array<() => unknown>,
  flows: [] as unknown[],
  hashCalls: 0,
  cleared: 0,
  consumed: [] as string[],
  mail: [] as Array<{ to: string; subject: string; text: string }>,
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  get db() {
    return h.db;
  },
}));
vi.mock("next/server", () => ({
  after: (fn: () => unknown) => {
    h.after.push(fn);
  },
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "10.0.0.1" }),
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw Object.assign(new Error("redirect"), { digest: `NEXT_REDIRECT;replace;${to};307;` });
  },
}));
vi.mock("@/lib/auth", () => ({
  hashPassword: async () => {
    h.hashCalls += 1;
    return "$2a$12$stub";
  },
  verifyPassword: async () => false,
}));
vi.mock("@/lib/session", () => ({
  startFlow: async (data: unknown) => {
    h.flows.push(data);
  },
  clearFlow: async () => undefined,
  getFlow: async () => ({}),
  startSession: async () => undefined,
  destroySession: async () => undefined,
}));
vi.mock("@/lib/rateLimit", async (original) => ({
  ...(await original<typeof import("@/lib/rateLimit")>()),
  consumeAttempt: (key: string) => {
    h.consumed.push(key);
    return true;
  },
  clearAttempts: () => {
    h.cleared += 1;
  },
}));
vi.mock("@/lib/mail/send", () => ({
  deliver: async (message: { to: string; subject: string; text: string }) => {
    h.mail.push(message);
    return true;
  },
}));

process.env.SESSION_SECRET = "x".repeat(40);

const { signupOwner, signupStaff } = await import("./actions");
const { t } = await import("@/i18n/ar");

const PASSWORD = "Bright-river42";
const EXISTING = "taken@example.com";
const ACTIVE_OWNER = { id: "owner_1", role: "OWNER", status: "ACTIVE", establishmentId: "est_1" };

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.append(k, v);
  return data;
}

function ownerForm(email: string, extra: Record<string, string> = {}): FormData {
  return form({
    firstName: "سالم",
    lastName: "الشهري",
    email,
    password: PASSWORD,
    confirmPassword: PASSWORD,
    establishmentName: "مؤسسة سالم",
    ...extra,
  });
}

function staffForm(email: string, joinCode = "ABCD2345"): FormData {
  return form({
    firstName: "فهد",
    middleName: "علي",
    lastName: "الغامدي",
    email,
    password: PASSWORD,
    confirmPassword: PASSWORD,
    joinCode,
  });
}

type Outcome = { result: unknown; redirectedTo: string | null };

async function run(action: () => Promise<unknown>): Promise<Outcome> {
  try {
    return { result: await action(), redirectedTo: null };
  } catch (error: unknown) {
    const digest = (error as { digest?: string }).digest ?? "";
    if (digest.startsWith("NEXT_REDIRECT")) {
      return { result: null, redirectedTo: digest.split(";")[2] ?? null };
    }
    throw error;
  }
}

/** Runs everything `after()` scheduled, as Next does once the response is sent. */
async function drainAfter(): Promise<void> {
  while (h.after.length) await h.after.shift()!();
}

/** The flow cookie with its random id and the typed address masked, so two flows can be compared. */
function flowShape(flow: unknown): string {
  return JSON.stringify(flow)
    .replace(/[0-9a-f-]{36}/g, "<id>")
    .replace(/"email":"[^"]*"/g, '"email":"<typed>"')
    .replace(/"startedAt":\d+/g, '"startedAt":<time>');
}

function seed(): void {
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
  h.db.data.establishment.push({
    id: "est_1",
    joinCode: "ABCD2345",
    active: true,
    users: [ACTIVE_OWNER],
  });
}

beforeEach(() => {
  h.db = createMemoryDb();
  h.after = [];
  h.flows = [];
  h.hashCalls = 0;
  h.cleared = 0;
  h.consumed = [];
  h.mail = [];
  seed();
});

/** The establishment lookup in signupStaff reads `users` as a relation. */
function withRelations(): void {
  const est = h.db.establishment;
  const original = est.findUnique;
  est.findUnique = async (args) => {
    const row = await original(args);
    return row ? { ...row, users: (row.users as unknown[]) ?? [] } : null;
  };
}

describe.each([
  ["signupOwner", (email: string) => signupOwner(null, ownerForm(email))],
  ["signupStaff", (email: string) => signupStaff(null, staffForm(email))],
] as const)("%s: a registered address is indistinguishable before the response", (_name, act) => {
  beforeEach(withRelations);

  it("same result, same redirect, same cookie shape, same work", async () => {
    const fresh = await run(() => act("new.person@example.com"));
    const freshLog = [...h.db.log];
    const freshHashes = h.hashCalls;
    const freshAfter = h.after.length;
    h.db.log.length = 0;
    h.hashCalls = 0;
    h.after = [];

    const taken = await run(() => act(EXISTING));

    expect(fresh).toEqual({ result: null, redirectedTo: "/verify" });
    expect(taken).toEqual(fresh);
    expect(flowShape(h.flows[1])).toBe(flowShape(h.flows[0]));
    // Nothing about the address is read before the response: the owner path
    // makes no query at all, the staff path only the join-code lookup.
    expect(h.db.log).toEqual(freshLog);
    expect(freshLog.every((q) => q === "establishment.findUnique")).toBe(true);
    expect(h.hashCalls).toBe(freshHashes);
    expect(h.hashCalls).toBe(1);
    expect(h.after.length).toBe(freshAfter);
    expect(h.after.length).toBe(1);
  });

  it("never clears the limiter (A2)", async () => {
    await run(() => act("new.person@example.com"));
    await run(() => act(EXISTING));
    await drainAfter();
    expect(h.cleared).toBe(0);
    expect(h.consumed).toHaveLength(2);
  });
});

describe("after the response: what each address actually gets", () => {
  beforeEach(withRelations);

  it("a new address becomes a PENDING, unverified account with a code in its inbox", async () => {
    await run(() => signupOwner(null, ownerForm("new.person@example.com")));
    const flowId = (h.flows[0] as { verify: { userId: string } }).verify.userId;
    expect(h.db.data.user).toHaveLength(1); // nothing written before the response
    expect(h.mail).toHaveLength(0); // and nothing sent: mail waits for after()
    await drainAfter();

    const user = h.db.data.user.find((u) => u.email === "new.person@example.com")!;
    expect(user).toMatchObject({
      id: flowId,
      role: "OWNER",
      status: "PENDING",
      emailVerifiedAt: null,
      firstName: "سالم",
      middleName: null,
      lastName: "الشهري",
      legacyName: "سالم الشهري",
    });
    expect(h.db.data.establishment).toHaveLength(2);
    expect(h.db.data.emailCode).toHaveLength(1);
    expect(h.mail.map((m) => [m.to, m.subject])).toEqual([
      ["new.person@example.com", t.mail.verifySubject],
    ]);
    expect(h.db.data.auditLog.map((a) => a.action)).toEqual(["SIGNUP"]);
  });

  it("a registered address gets no write, no code row, and the 'already registered' email", async () => {
    await run(() => signupOwner(null, ownerForm(EXISTING)));
    await drainAfter();

    expect(h.db.data.user).toHaveLength(1);
    expect(h.db.data.establishment).toHaveLength(1);
    expect(h.db.data.emailCode).toHaveLength(0);
    expect(h.db.data.auditLog).toHaveLength(0);
    expect(h.mail.map((m) => [m.to, m.subject])).toEqual([[EXISTING, t.mail.existsSubject]]);
  });

  it("staff: the full name is dual-written into the legacy column (A9)", async () => {
    await run(() => signupStaff(null, staffForm("new.staff@example.com")));
    await drainAfter();
    const user = h.db.data.user.find((u) => u.email === "new.staff@example.com")!;
    expect(user).toMatchObject({
      role: "STAFF",
      establishmentId: "est_1",
      middleName: "علي",
      legacyName: "فهد علي الغامدي",
    });
  });

  it("a failure after the response is logged without data and leaves no account", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    h.db.user.create = async () => {
      throw new Error("Unique constraint failed on the fields: (`email`) new.person@example.com");
    };
    await run(() => signupOwner(null, ownerForm("new.person@example.com")));
    await drainAfter();

    expect(h.db.data.establishment).toHaveLength(1); // rolled back with the user
    expect(h.mail).toHaveLength(0);
    const logged = errors.mock.calls.flat().join(" ");
    expect(logged).not.toContain("new.person");
    errors.mockRestore();
  });
});

/** B10: every join-code failure is one answer. */
const JOIN_FAILURES: Array<[string, () => void]> = [
  ["the join code matches no establishment", () => h.db.data.establishment.splice(0)],
  ["the establishment has been disabled", () => (h.db.data.establishment[0]!.active = false)],
  ["the owner is not ACTIVE", () => (h.db.data.establishment[0]!.users = [])],
];

describe("signupStaff gives one answer to every join-code failure (B10)", () => {
  beforeEach(withRelations);

  it.each(JOIN_FAILURES)("%s", async (_label, setup) => {
    setup();
    const outcome = await run(() => signupStaff(null, staffForm("new.staff@example.com")));
    expect(outcome).toEqual({ result: { ok: false, error: "err.joinFailed" }, redirectedTo: null });
    expect(h.hashCalls).toBe(1); // bcrypt spent whatever the answer
    expect(h.after).toHaveLength(0);
    expect(h.flows).toHaveLength(0);
  });

  it("a valid code with a registered address is not a join failure — it is the fake flow", async () => {
    const outcome = await run(() => signupStaff(null, staffForm(EXISTING)));
    expect(outcome.redirectedTo).toBe("/verify");
  });
});

describe("malformed forms answer on their own terms", () => {
  it("reports field errors rather than the generic key, before any query or hash", async () => {
    const outcome = await run(() =>
      signupStaff(
        null,
        form({ firstName: "x", lastName: "1", email: "not-an-email", password: "short", confirmPassword: "s", joinCode: "TOO-SHORT" }),
      ),
    );
    expect(outcome.result).toMatchObject({ ok: false, error: "err.signupFailed" });
    const fieldErrors = (outcome.result as { fieldErrors: Record<string, string> }).fieldErrors;
    expect(fieldErrors).toMatchObject({
      firstName: "err.nameShort",
      lastName: "err.nameDigits",
      email: "err.emailInvalid",
      password: "err.passwordShort",
      joinCode: "err.joinCodeInvalid",
    });
    expect(h.db.log).toHaveLength(0);
    expect(h.hashCalls).toBe(0);
  });

  it.each([
    ["signupOwner", () => signupOwner(null, ownerForm("new@example.com", { password: "Password123", confirmPassword: "Password123" }))],
    ["signupStaff", () => signupStaff(null, form({ firstName: "فهد", lastName: "الغامدي", email: "n@example.com", password: "Password123", confirmPassword: "Password123", joinCode: "ABCD2345" }))],
  ] as const)("%s refuses a common password on the server (A12 amended), before any query or hash", async (_n, act) => {
    const outcome = await run(act);
    expect(outcome.result).toEqual({
      ok: false,
      error: "err.signupFailed",
      fieldErrors: { password: "err.passwordCommon" },
    });
    expect(h.db.log).toHaveLength(0);
    expect(h.hashCalls).toBe(0);
  });

  it("refuses a disposable address with its own key, before any query or hash", async () => {
    const outcome = await run(() => signupOwner(null, ownerForm("someone@sub.mailinator.com")));
    expect(outcome.result).toEqual({
      ok: false,
      error: "err.signupFailed",
      fieldErrors: { email: "err.emailDisposable" },
    });
    expect(h.db.log).toHaveLength(0);
    expect(h.hashCalls).toBe(0);
  });
});
