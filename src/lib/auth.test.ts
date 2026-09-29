import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The `requireCanEdit` matrix, tested against the **wrapper** rather than the
 * predicate.
 *
 * `permissions.test.ts` already covers `canEditTransactions` as a truth table, so
 * a predicate-only version of this file would duplicate it and add nothing. The
 * fourth row is what makes the wrapper the subject: for PENDING the predicate
 * returns `false`, but the wrapper's observable behaviour is a **destination** —
 * `/pending`, not `/login`. Only the wrapper can express that, so every case here
 * asserts *where* a refused caller is sent, not merely that it was refused.
 *
 * Six rows, not the doc's four: DISABLED and an inactive establishment are
 * Security rule 5's lockout paths, and a matrix that stops at four leaves them
 * untested.
 *
 * These tests only observe `src/lib/auth.ts`. Nothing in it, `session.ts` or
 * `permissions.ts` was changed to make them pass.
 */

const stub = vi.hoisted(() => ({
  userId: "user_1" as string | undefined,
  row: null as unknown,
  destroyCalls: 0,
  destroyThrows: false,
}));

vi.mock("server-only", () => ({}));

/** Mimics `redirect()`: navigates by throwing, and carries where it went. */
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw Object.assign(new Error(`NEXT_REDIRECT ${to}`), {
      digest: `NEXT_REDIRECT;replace;${to};307;`,
      destination: to,
    });
  },
}));

vi.mock("./session", () => ({
  getSession: async () => ({
    userId: stub.userId,
    destroy: () => {
      stub.destroyCalls += 1;
      if (stub.destroyThrows) {
        // What Next.js actually throws when a server component render tries to
        // write a cookie: "Cookies can only be modified in a Server Action or
        // Route Handler."
        throw new Error("ReadonlyRequestCookiesError");
      }
    },
  }),
}));

vi.mock("./db", () => ({
  db: { user: { findUnique: async () => stub.row } },
}));

const { requireCanEdit, requireUser } = await import("./auth");

type Row = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "OWNER" | "STAFF";
  status: "PENDING" | "ACTIVE" | "DISABLED";
  canEdit: boolean;
  establishmentId: string | null;
  establishment: { name: string; active: boolean } | null;
};

function row(overrides: Partial<Row> = {}): Row {
  return {
    id: "user_1",
    name: "تجربة",
    email: "t@example.com",
    role: "STAFF",
    status: "ACTIVE",
    canEdit: false,
    establishmentId: "est_1",
    establishment: { name: "منشأة", active: true },
    ...overrides,
  };
}

/** The path a call was sent to, or null when it returned instead. */
async function destinationOf(fn: () => Promise<unknown>): Promise<string | null> {
  try {
    await fn();
    return null;
  } catch (error: unknown) {
    const to = (error as { destination?: string }).destination;
    if (typeof to === "string") return to;
    throw error;
  }
}

beforeEach(() => {
  stub.userId = "user_1";
  stub.row = row();
  stub.destroyCalls = 0;
  stub.destroyThrows = false;
});

describe("requireCanEdit — the six rows", () => {
  it("OWNER: allowed", async () => {
    stub.row = row({ role: "OWNER", canEdit: false });
    expect(await destinationOf(requireCanEdit)).toBeNull();
  });

  it("STAFF with canEdit true: allowed", async () => {
    stub.row = row({ role: "STAFF", canEdit: true });
    expect(await destinationOf(requireCanEdit)).toBeNull();
  });

  it("STAFF with canEdit false: sent to its own area, not to a login form", async () => {
    stub.row = row({ role: "STAFF", canEdit: false });
    // Their account is fine; they simply lack the permission — so /staff, not
    // /login, which they would have no use for.
    expect(await destinationOf(requireCanEdit)).toBe("/staff");
  });

  it("PENDING: sent to /pending, which is the row the predicate cannot express", async () => {
    stub.row = row({ status: "PENDING", canEdit: true });
    expect(await destinationOf(requireCanEdit)).toBe("/pending");
  });

  it("DISABLED: signed out, with the marker that prevents the proxy looping", async () => {
    stub.row = row({ status: "DISABLED", canEdit: true });
    expect(await destinationOf(requireCanEdit)).toBe("/login?signedOut=1");
  });

  it("inactive establishment: locks out an otherwise-valid member", async () => {
    stub.row = row({
      role: "OWNER",
      status: "ACTIVE",
      establishment: { name: "منشأة", active: false },
    });
    expect(await destinationOf(requireCanEdit)).toBe("/login?signedOut=1");
  });
});

describe("the destinations are distinct, which is the point of the matrix", () => {
  it("a permission refusal and a lockout do not go to the same place", async () => {
    stub.row = row({ role: "STAFF", canEdit: false });
    const refused = await destinationOf(requireCanEdit);

    stub.row = row({ status: "DISABLED" });
    const lockedOut = await destinationOf(requireCanEdit);

    stub.row = row({ status: "PENDING" });
    const waiting = await destinationOf(requireCanEdit);

    expect(new Set([refused, lockedOut, waiting]).size).toBe(3);
  });
});

describe("requireUser's entry and lockout paths", () => {
  it("no session at all: /login, with no marker and no database read", async () => {
    stub.userId = undefined;
    expect(await destinationOf(requireUser)).toBe("/login");
  });

  it("a session naming a user who no longer exists: signed out", async () => {
    stub.row = null;
    expect(await destinationOf(requireUser)).toBe("/login?signedOut=1");
  });

  it("ADMIN is not locked out by having no establishment", async () => {
    stub.row = row({ role: "ADMIN", establishmentId: null, establishment: null });
    expect(await destinationOf(requireUser)).toBeNull();
  });

  it("reads status and canEdit from the row, not from the session", async () => {
    // Security rule 2: the cookie is trusted for the user id and nothing else.
    // The session stub carries no status or canEdit at all, so a wrapper reading
    // them from there could not produce these answers.
    stub.row = row({ role: "STAFF", canEdit: true, status: "ACTIVE" });
    expect(await destinationOf(requireCanEdit)).toBeNull();

    stub.row = row({ role: "STAFF", canEdit: false, status: "ACTIVE" });
    expect(await destinationOf(requireCanEdit)).toBe("/staff");
  });
});

/**
 * H1, pinned. `forget()` wraps `session.destroy()` in try/catch because a server
 * component render cannot write cookies — Next throws
 * `ReadonlyRequestCookiesError`. Without the catch, the throw escapes *before*
 * the redirect, and every page load for a disabled user is a 500 instead of a
 * trip to the login form. It was a HIGH finding, and until now nothing tested it:
 * simplifying `forget()` back to a bare `destroy()` would have failed no test.
 */
describe("H1: a throwing destroy() must not swallow the redirect", () => {
  it("DISABLED still reaches /login?signedOut=1 when destroy() throws", async () => {
    stub.row = row({ status: "DISABLED" });
    stub.destroyThrows = true;

    expect(await destinationOf(requireUser)).toBe("/login?signedOut=1");
    expect(stub.destroyCalls).toBe(1);
  });

  it("an inactive establishment likewise", async () => {
    stub.row = row({
      role: "OWNER",
      establishment: { name: "منشأة", active: false },
    });
    stub.destroyThrows = true;

    expect(await destinationOf(requireUser)).toBe("/login?signedOut=1");
    expect(stub.destroyCalls).toBe(1);
  });

  it("a missing user row likewise", async () => {
    stub.row = null;
    stub.destroyThrows = true;

    expect(await destinationOf(requireUser)).toBe("/login?signedOut=1");
    expect(stub.destroyCalls).toBe(1);
  });

  it("clearing the cookie is still attempted when it can succeed", async () => {
    stub.row = row({ status: "DISABLED" });
    stub.destroyThrows = false;

    await destinationOf(requireUser);
    // Best-effort, not abandoned: inside a Server Action the write does work.
    expect(stub.destroyCalls).toBe(1);
  });

  it("PENDING keeps its session — it is waiting, not refused", async () => {
    stub.row = row({ status: "PENDING" });
    expect(await destinationOf(requireUser)).toBe("/pending");
    expect(stub.destroyCalls).toBe(0);
  });
});
