import { readdirSync, readFileSync } from "node:fs";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `GET /api/reminders/run` (docs/V12C-DESIGN.md C2, E5, N1). Lives here, not
 * beside the route, because the `run/` folder must hold only `route.ts`. The
 * run itself is mocked — `digestRun.test.ts` covers it.
 */

const h = vi.hoisted(() => ({ runDigests: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/features/reminders/run", () => ({ runDigests: h.runDigests }));

const route = await import("@/app/api/reminders/run/route");

const SECRET = "s3cret-value-of-32-characters-xx";
let logged: string[] = [];

function call(headers: Record<string, string> = {}, query = ""): Promise<Response> {
  return route.GET(new Request(`https://ledger.test/api/reminders/run${query}`, { headers }));
}

beforeEach(() => {
  h.runDigests.mockReset();
  h.runDigests.mockResolvedValue({ sent: 2, skipped: 1 });
  vi.stubEnv("CRON_SECRET", SECRET);
  logged = [];
  const capture = (...args: unknown[]) => void logged.push(args.map(String).join(" "));
  for (const level of ["error", "warn", "log", "info"] as const) vi.spyOn(console, level).mockImplementation(capture);
});

afterEach(() => {
  expect(logged.join("\n")).not.toContain(SECRET);
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("without CRON_SECRET the endpoint is off", () => {
  it.each(["", "   "])("CRON_SECRET=%j → 503, nothing runs, no body", async (value) => {
    vi.stubEnv("CRON_SECRET", value);
    const response = await call({ authorization: `Bearer ${value}` });
    expect(response.status).toBe(503);
    expect(await response.text()).toBe("");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(h.runDigests).not.toHaveBeenCalled();
  });
});

describe("the secret check (E5)", () => {
  it.each([
    ["missing", {}],
    ["wrong", { authorization: "Bearer not-the-secret" }],
    ["empty token", { authorization: "Bearer " }],
    ["lower-case scheme", { authorization: `bearer ${SECRET}` }],
    ["two spaces", { authorization: `Bearer  ${SECRET}` }],
    ["secret as a prefix", { authorization: `Bearer ${SECRET}x` }],
    ["a truncated secret", { authorization: `Bearer ${SECRET.slice(0, -1)}` }],
    ["another scheme", { authorization: `Basic ${SECRET}` }],
    ["the bare secret", { authorization: SECRET }],
    ["another header", { "x-cron-secret": SECRET }],
  ] as const)("%s → the same empty 401, nothing runs", async (_name, headers) => {
    const response = await call(headers);
    expect(response.status).toBe(401);
    expect(await response.text()).toBe("");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(h.runDigests).not.toHaveBeenCalled();
  });

  it("ignores the secret in the query string", async () => {
    for (const query of [`?secret=${SECRET}`, `?token=${SECRET}`, `?authorization=Bearer%20${SECRET}`]) {
      expect((await call({}, query)).status).toBe(401);
    }
    expect(h.runDigests).not.toHaveBeenCalled();
  });

  it("the right header → 200 with counts only, never cached", async () => {
    const response = await call({ authorization: `Bearer ${SECRET}` });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, sent: 2, skipped: 1 });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(h.runDigests).toHaveBeenCalledTimes(1);
    expect(h.runDigests.mock.calls[0]![0]).toBeInstanceOf(Date);
  });

  it("the configured value is trimmed", async () => {
    vi.stubEnv("CRON_SECRET", `  ${SECRET}\n`);
    expect((await call({ authorization: `Bearer ${SECRET}` })).status).toBe(200);
  });

  it("a failed run → 500 with no body and no detail", async () => {
    h.runDigests.mockRejectedValue(new TypeError(`boom ${SECRET}`));
    const response = await call({ authorization: `Bearer ${SECRET}` });
    expect(response.status).toBe(500);
    expect(await response.text()).toBe("");
    expect(logged).toEqual(["[digest] run failed: TypeError"]);
  });
});

describe("the route's shape", () => {
  const SOURCE = readFileSync("src/app/api/reminders/run/route.ts", "utf8");

  it("is dynamic, on the Node runtime, and GET only", () => {
    expect(route.dynamic).toBe("force-dynamic");
    expect(route.runtime).toBe("nodejs");
    expect(Object.keys(route).sort()).toEqual(["GET", "dynamic", "runtime"]);
  });

  it("compares sha256 digests in constant time, never with ===, and reads no session", () => {
    expect(SOURCE).toMatch(/timingSafeEqual\(digest\(token\), digest\(secret\)\)/);
    expect(SOURCE).toMatch(/createHash\("sha256"\)/);
    expect(SOURCE).not.toMatch(/(?:token|secret|header)\s*[!=]==?\s*(?:token|secret)/);
    expect(SOURCE).not.toMatch(/\b(?:requireUser|requireOwner|requireMember|requireAdmin|getSession)\s*\(/);
    expect(SOURCE).not.toMatch(/searchParams|nextUrl/);
  });

  it("N1: the run/ folder holds only route.ts", () => {
    expect(readdirSync("src/app/api/reminders/run")).toEqual(["route.ts"]);
    expect(readdirSync("src/app/api/reminders")).toEqual(["run"]);
  });
});
