/**
 * In-process keep-alive and reminder scheduler (v1.2c). Started once from
 * `src/instrumentation.ts`. Every ~4 minutes the server calls its own public
 * address: `/api/health` (so Render's free plan sees traffic and does not idle
 * the service out) and, when `CRON_SECRET` is set, `/api/reminders/run` (which
 * is idempotent per owner per day and only sends at each owner's hour, so a
 * call every few minutes is safe). Replaces the external cron-job.org ping.
 *
 * Rules: one start per process (state lives on globalThis because Next.js
 * bundles instrumentation and route handlers as separate module instances);
 * never throws out of the loop; the timer is unref()'d; one log line per tick;
 * the secret is sent only as a header and never logged — errors are logged by
 * `name` only, because a message could echo a URL or header.
 */

export const TICK_MS = 4 * 60_000;
export const JITTER_MS = 5_000;
export const HEALTH_TIMEOUT_MS = 10_000;
/** The run can send several emails through Brevo; give it more room than health. */
export const REMINDERS_TIMEOUT_MS = 60_000;
export const USER_AGENT = "zakham-keepalive";

export type KeepAliveStatus = { lastTick: string | null; lastStatus: string | null };

type KeepAliveState = KeepAliveStatus & { started: boolean };

export type KeepAliveDeps = {
  env: Record<string, string | undefined>;
  fetch: typeof fetch;
  log: (line: string) => void;
  setTimeout: (fn: () => void, ms: number) => { unref?: () => unknown };
  random: () => number;
  now: () => Date;
};

const STATE_KEY = Symbol.for("zakham.keepAlive");

function state(): KeepAliveState {
  const holder = globalThis as unknown as Record<symbol, KeepAliveState | undefined>;
  holder[STATE_KEY] ??= { started: false, lastTick: null, lastStatus: null };
  return holder[STATE_KEY];
}

/** Read-only snapshot for `/api/health`. */
export function getKeepAliveStatus(): KeepAliveStatus {
  const { lastTick, lastStatus } = state();
  return { lastTick, lastStatus };
}

/** Test hook: forget that the loop started. Does not cancel a real timer. */
export function resetKeepAliveForTests(): void {
  const s = state();
  s.started = false;
  s.lastTick = null;
  s.lastStatus = null;
}

function trimmed(value: string | undefined): string | null {
  const v = value?.trim();
  return v ? v : null;
}

async function call(deps: KeepAliveDeps, url: string, timeoutMs: number, secret?: string): Promise<string> {
  const headers: Record<string, string> = { "User-Agent": USER_AGENT };
  if (secret) headers.Authorization = `Bearer ${secret}`;
  try {
    const res = await deps.fetch(url, {
      method: "GET",
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    return String(res.status);
  } catch (error) {
    return error instanceof Error ? error.name : "error";
  }
}

async function tick(deps: KeepAliveDeps, base: string): Promise<void> {
  const s = state();
  try {
    const started = deps.now();
    const parts = [`health=${await call(deps, `${base}/api/health`, HEALTH_TIMEOUT_MS)}`];
    const secret = trimmed(deps.env.CRON_SECRET);
    if (secret) {
      parts.push(`reminders=${await call(deps, `${base}/api/reminders/run`, REMINDERS_TIMEOUT_MS, secret)}`);
    }
    s.lastTick = started.toISOString();
    s.lastStatus = parts.join(" ");
    deps.log(`[keepalive] ${s.lastStatus} (${deps.now().getTime() - started.getTime()} ms)`);
  } catch (error) {
    s.lastStatus = "tick-failed";
    deps.log(`[keepalive] tick failed: ${error instanceof Error ? error.name : "unknown"}`);
  }
}

function schedule(deps: KeepAliveDeps, base: string): void {
  const delay = TICK_MS + Math.round((deps.random() * 2 - 1) * JITTER_MS);
  const timer = deps.setTimeout(() => {
    // The next tick is scheduled only after this one settles, so ticks never overlap.
    void tick(deps, base).finally(() => schedule(deps, base));
  }, delay);
  timer.unref?.();
}

const defaultDeps: KeepAliveDeps = {
  env: process.env,
  fetch: (...args) => fetch(...args),
  log: (line) => console.log(line),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  random: Math.random,
  now: () => new Date(),
};

/**
 * Starts the loop if `RENDER_EXTERNAL_URL` is set and it has not started yet
 * in this process. Returns whether this call started it. The first tick runs
 * one interval after start, by which time the server is listening.
 */
export function startKeepAlive(overrides: Partial<KeepAliveDeps> = {}): boolean {
  const deps: KeepAliveDeps = { ...defaultDeps, ...overrides };
  const s = state();
  if (s.started) return false;
  const base = trimmed(deps.env.RENDER_EXTERNAL_URL)?.replace(/\/+$/, "");
  if (!base) return false;
  s.started = true;
  deps.log(`[keepalive] started for ${base}${trimmed(deps.env.CRON_SECRET) ? " with reminders" : ""}`);
  schedule(deps, base);
  return true;
}
