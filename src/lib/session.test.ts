import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The v1.1e flow cookie (`zk_flow`, docs/BACKEND.md A8, reviewer N2). It must
 * never be mistaken for a session: its payload has no top-level `userId`, and
 * it is sealed with a key derived from the secret rather than the secret
 * itself, so pasting it into the session cookie yields nothing.
 */

type Cookie = { value: string; options?: Record<string, unknown> };
const jar = vi.hoisted(() => new Map<string, Cookie>());

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)!.value } : undefined),
    set: (...args: unknown[]) => {
      if (typeof args[0] === "string") {
        jar.set(args[0], { value: args[1] as string, options: args[2] as Record<string, unknown> });
      } else {
        const { name, value, ...options } = args[0] as { name: string; value: string };
        jar.set(name, { value, options });
      }
    },
  }),
}));

process.env.SESSION_SECRET = "f".repeat(40);

const { FLOW_COOKIE, clearFlow, getFlow, getSession, startFlow, startSession, SESSION_COOKIE } =
  await import("./session");

beforeEach(() => jar.clear());

describe("zk_flow", () => {
  it("round-trips a verify flow with the documented cookie flags", async () => {
    await startFlow({ verify: { userId: "flow_1", email: "a@example.com", startedAt: 1 } });
    expect((await getFlow()).verify).toEqual({ userId: "flow_1", email: "a@example.com", startedAt: 1 });
    const cookie = jar.get(FLOW_COOKIE)!;
    expect(cookie.options).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/", maxAge: 1800 });
  });

  it("has no top-level userId, role or establishmentId", async () => {
    await startFlow({ verify: { userId: "flow_1", email: "a@example.com", startedAt: 1 } });
    const flow = (await getFlow()) as unknown as Record<string, unknown>;
    expect(flow.userId).toBeUndefined();
    expect(flow.role).toBeUndefined();
    expect(flow.establishmentId).toBeUndefined();
  });

  it("pasted into the session cookie, it is not a session", async () => {
    await startFlow({ verify: { userId: "user_1", email: "a@example.com", startedAt: 1 } });
    jar.set(SESSION_COOKIE, { value: jar.get(FLOW_COOKIE)!.value });
    expect((await getSession()).userId).toBeUndefined();
  });

  it("and a session cookie pasted into zk_flow is not a flow", async () => {
    await startSession({ userId: "user_1", role: "OWNER", establishmentId: "est_1" });
    jar.set(FLOW_COOKIE, { value: jar.get(SESSION_COOKIE)!.value });
    const flow = await getFlow();
    expect(flow.verify).toBeUndefined();
    expect(flow.reset).toBeUndefined();
  });

  it("is sealed with a derived key, not the session secret itself", async () => {
    const { unsealData } = await import("iron-session");
    await startFlow({ verify: { userId: "user_1", email: "a@example.com", startedAt: 1 } });
    const sealed = jar.get(FLOW_COOKIE)!.value;
    expect(await unsealData(sealed, { password: process.env.SESSION_SECRET! })).toEqual({});
  });

  it("a new flow replaces the old one; clearFlow empties it", async () => {
    await startFlow({ verify: { userId: "flow_1", email: "a@example.com", startedAt: 1 } });
    await startFlow({ reset: { email: "b@example.com" } });
    const flow = await getFlow();
    expect(flow.verify).toBeUndefined();
    expect(flow.reset).toEqual({ email: "b@example.com" });
    await clearFlow();
    expect((await getFlow()).reset).toBeUndefined();
  });
});
