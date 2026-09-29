import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Staff sign-up must not be an oracle (B10, Security rule 4 as hardened).
 *
 * Before this, a bad join code answered `err.joinFailed` while an already-taken
 * email answered `err.signupFailed`. Both keys are generic on their own, and the
 * *pair* was the leak: submit an email you know exists, and `signupFailed` meant
 * the code you guessed was **valid**. That is a join-code oracle that creates no
 * account and leaves nothing an owner would ever see.
 *
 * Timing is asserted structurally rather than on the clock. A wall-time
 * assertion would be flaky; the invariant that makes the timing equal is that
 * every path does the same work, so these tests assert both lookups happen and
 * bcrypt is spent on all five outcomes, including the four failures.
 */

const stubs = vi.hoisted(() => ({
  establishment: null as unknown,
  user: null as unknown,
  hashCalls: 0,
  queries: [] as string[],
  created: 0,
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", () => ({
  db: {
    establishment: {
      findUnique: async () => {
        stubs.queries.push("establishment.findUnique");
        return stubs.establishment;
      },
    },
    user: {
      findUnique: async () => {
        stubs.queries.push("user.findUnique");
        return stubs.user;
      },
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        user: {
          create: async () => {
            stubs.created += 1;
            return { id: "new_staff" };
          },
        },
        auditLog: { create: async () => ({ id: "audit" }) },
      }),
  },
}));

vi.mock("@/lib/auth", () => ({
  hashPassword: async () => {
    stubs.hashCalls += 1;
    return "$2a$12$stub";
  },
  verifyPassword: async () => false,
}));

vi.mock("@/lib/audit", () => ({ writeAudit: async () => undefined }));
vi.mock("@/lib/session", () => ({
  startSession: async () => undefined,
  destroySession: async () => undefined,
}));
vi.mock("@/lib/rateLimit", () => ({
  consumeAttempt: () => true,
  clearAttempts: () => undefined,
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "10.0.0.1" }),
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw Object.assign(new Error("redirect"), {
      digest: `NEXT_REDIRECT;replace;${to};307;`,
    });
  },
}));

const { signupStaff } = await import("./actions");

const ACTIVE_OWNER = { id: "est_1", active: true, users: [{ id: "owner_1" }] };

function form(email = "new.staff@example.com", joinCode = "ABCD2345"): FormData {
  const data = new FormData();
  data.append("name", "سالم");
  data.append("email", email);
  data.append("password", "averylongpassword");
  data.append("joinCode", joinCode);
  return data;
}

/** The redirect a successful sign-up throws, or null if it returned instead. */
async function runStaffSignup(
  data: FormData,
): Promise<{ result: unknown; redirectedTo: string | null }> {
  try {
    return { result: await signupStaff(null, data), redirectedTo: null };
  } catch (error: unknown) {
    const digest = (error as { digest?: string }).digest ?? "";
    if (digest.startsWith("NEXT_REDIRECT")) {
      return { result: null, redirectedTo: digest.split(";")[2] ?? null };
    }
    throw error;
  }
}

beforeEach(() => {
  stubs.establishment = null;
  stubs.user = null;
  stubs.hashCalls = 0;
  stubs.queries = [];
  stubs.created = 0;
});

/** The four refusals, each set up by its own precondition. */
const FAILURES: Array<[string, () => void]> = [
  [
    "the join code matches no establishment",
    () => {
      stubs.establishment = null;
    },
  ],
  [
    "the establishment has been disabled",
    () => {
      stubs.establishment = { ...ACTIVE_OWNER, active: false };
    },
  ],
  [
    "the owner is not ACTIVE",
    () => {
      stubs.establishment = { ...ACTIVE_OWNER, users: [] };
    },
  ],
  [
    "the email is already in use",
    () => {
      stubs.establishment = ACTIVE_OWNER;
      stubs.user = { id: "existing_user" };
    },
  ],
];

describe("signupStaff gives one answer to every failure", () => {
  it.each(FAILURES)("%s", async (_label, setup) => {
    setup();
    const { result, redirectedTo } = await runStaffSignup(form());

    expect(redirectedTo).toBeNull();
    expect(result).toEqual({ ok: false, error: "err.joinFailed" });
    expect(stubs.created).toBe(0);
  });

  it("the four answers are byte-identical to each other", async () => {
    const answers: string[] = [];
    for (const [, setup] of FAILURES) {
      stubs.establishment = null;
      stubs.user = null;
      setup();
      const { result } = await runStaffSignup(form());
      answers.push(JSON.stringify(result));
    }

    expect(new Set(answers).size).toBe(1);
    expect(answers[0]).toBe(JSON.stringify({ ok: false, error: "err.joinFailed" }));
  });
});

describe("signupStaff does the same work on every path", () => {
  it.each(FAILURES)("both lookups run and bcrypt is spent: %s", async (_label, setup) => {
    setup();
    await runStaffSignup(form());

    // Skipping either lookup, or the hash, would time the branch.
    expect(stubs.queries).toContain("establishment.findUnique");
    expect(stubs.queries).toContain("user.findUnique");
    expect(stubs.queries).toHaveLength(2);
    expect(stubs.hashCalls).toBe(1);
  });

  it("success does exactly the same work, plus the insert", async () => {
    stubs.establishment = ACTIVE_OWNER;
    stubs.user = null;

    const { redirectedTo } = await runStaffSignup(form());

    expect(redirectedTo).toBe("/pending?as=staff");
    expect(stubs.queries).toHaveLength(2);
    expect(stubs.hashCalls).toBe(1);
    expect(stubs.created).toBe(1);
  });
});

describe("signupStaff still rejects a malformed form on its own terms", () => {
  it("reports field errors rather than the generic key", async () => {
    stubs.establishment = ACTIVE_OWNER;
    const bad = new FormData();
    bad.append("name", "x");
    bad.append("email", "not-an-email");
    bad.append("password", "short");
    bad.append("joinCode", "TOO-SHORT");

    const { result } = await runStaffSignup(bad);

    // A malformed form is not an oracle: it describes what the submitter typed,
    // and the client-side schema already told them the same thing.
    expect(result).toMatchObject({ ok: false, error: "err.signupFailed" });
    const fieldErrors = (result as { fieldErrors?: Record<string, string> })
      .fieldErrors;
    expect(Object.keys(fieldErrors ?? {}).sort()).toEqual([
      "email",
      "joinCode",
      "name",
      "password",
    ]);
    expect(stubs.queries).toHaveLength(0);
    expect(stubs.hashCalls).toBe(0);
  });
});
