import { afterEach, describe, expect, it, vi } from "vitest";

import {
  JITTER_MS,
  TICK_MS,
  USER_AGENT,
  getKeepAliveStatus,
  resetKeepAliveForTests,
  startKeepAlive,
  type KeepAliveDeps,
} from "./keepAlive";

const SECRET = "s3cr3t-never-in-logs-5f1c9a";

function harness(env: Record<string, string | undefined>, fetchImpl?: KeepAliveDeps["fetch"]) {
  const logs: string[] = [];
  const timers: { fn: () => void; ms: number; unref: ReturnType<typeof vi.fn> }[] = [];
  const fetchMock = vi.fn(fetchImpl ?? (async () => new Response(null, { status: 200 })));
  const deps: Partial<KeepAliveDeps> = {
    env,
    fetch: fetchMock as unknown as KeepAliveDeps["fetch"],
    log: (line) => logs.push(line),
    setTimeout: (fn, ms) => {
      const timer = { fn, ms, unref: vi.fn() };
      timers.push(timer);
      return timer;
    },
    random: () => 0.5,
    now: () => new Date("2026-09-30T08:00:00Z"),
  };
  /** Fire the latest timer and wait for its tick (and the reschedule) to settle. */
  async function fire() {
    const before = timers.length;
    timers[timers.length - 1].fn();
    await vi.waitFor(() => expect(timers.length).toBe(before + 1));
  }
  return { deps, logs, timers, fetchMock, fire };
}

afterEach(() => resetKeepAliveForTests());

describe("startKeepAlive", () => {
  it("does not start when RENDER_EXTERNAL_URL is absent or blank", () => {
    for (const env of [{}, { RENDER_EXTERNAL_URL: "  " }, { CRON_SECRET: SECRET }]) {
      const h = harness(env);
      expect(startKeepAlive(h.deps)).toBe(false);
      expect(h.timers).toHaveLength(0);
      expect(h.fetchMock).not.toHaveBeenCalled();
    }
  });

  it("starts only once per process", () => {
    const h = harness({ RENDER_EXTERNAL_URL: "https://zakham.onrender.com/" });
    expect(startKeepAlive(h.deps)).toBe(true);
    expect(startKeepAlive(h.deps)).toBe(false);
    expect(startKeepAlive(h.deps)).toBe(false);
    expect(h.timers).toHaveLength(1);
    expect(h.timers[0].unref).toHaveBeenCalled();
    expect(h.timers[0].ms).toBeGreaterThanOrEqual(TICK_MS - JITTER_MS);
    expect(h.timers[0].ms).toBeLessThanOrEqual(TICK_MS + JITTER_MS);
  });

  it("pings health, then reminders with the bearer header, and records the tick", async () => {
    const h = harness({ RENDER_EXTERNAL_URL: "https://zakham.onrender.com/", CRON_SECRET: SECRET });
    startKeepAlive(h.deps);
    await h.fire();
    const [health, reminders] = h.fetchMock.mock.calls as unknown as [string, RequestInit][];
    expect(health[0]).toBe("https://zakham.onrender.com/api/health");
    expect(health[1].headers).toEqual({ "User-Agent": USER_AGENT });
    expect(reminders[0]).toBe("https://zakham.onrender.com/api/reminders/run");
    expect(reminders[1].headers).toEqual({ "User-Agent": USER_AGENT, Authorization: `Bearer ${SECRET}` });
    expect(getKeepAliveStatus()).toEqual({
      lastTick: "2026-09-30T08:00:00.000Z",
      lastStatus: "health=200 reminders=200",
    });
    expect(h.timers[1].unref).toHaveBeenCalled();
  });

  it("skips reminders without CRON_SECRET", async () => {
    const h = harness({ RENDER_EXTERNAL_URL: "https://zakham.onrender.com" });
    startKeepAlive(h.deps);
    await h.fire();
    expect(h.fetchMock).toHaveBeenCalledTimes(1);
    expect(getKeepAliveStatus().lastStatus).toBe("health=200");
  });

  it("never logs the secret and never throws, even when fetch fails with it in the message", async () => {
    const h = harness({ RENDER_EXTERNAL_URL: "https://zakham.onrender.com", CRON_SECRET: SECRET }, async () => {
      throw new TypeError(`fetch failed: Authorization: Bearer ${SECRET}`);
    });
    startKeepAlive(h.deps);
    await h.fire();
    await h.fire();
    expect(h.logs.length).toBeGreaterThanOrEqual(3);
    for (const line of h.logs) expect(line).not.toContain(SECRET);
    expect(JSON.stringify(getKeepAliveStatus())).not.toContain(SECRET);
    expect(getKeepAliveStatus().lastStatus).toBe("health=TypeError reminders=TypeError");
  });
});

describe("register()", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("does not start during next build or next dev", async () => {
    const { register } = await import("../instrumentation");
    vi.stubEnv("RENDER_EXTERNAL_URL", "https://zakham.onrender.com");
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    await register();
    vi.stubEnv("NEXT_PHASE", "");
    vi.stubEnv("NODE_ENV", "development");
    await register();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_RUNTIME", "edge");
    await register();
    // Nothing started, so a start with test deps still succeeds.
    const h = harness({ RENDER_EXTERNAL_URL: "https://zakham.onrender.com" });
    expect(startKeepAlive(h.deps)).toBe(true);
  });
});
