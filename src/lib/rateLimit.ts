/**
 * In-memory fixed-window limiter for login, sign-up and join-code attempts —
 * and, from v1.1e, the code, reset and mail limits below.
 * One process only — good enough for a single Render instance, and deliberately
 * simple (no Redis). Restarting the app clears the counters.
 */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * v1.1e limits (docs/BACKEND.md A7). Each is consumed identically on a real and
 * a fake flow, so hitting one says nothing about whether an address exists.
 * The mail caps never change a response: a capped send is skipped silently.
 * Brevo's free plan is 300 mails a day for the whole app.
 */
export const LIMITS = {
  /** Per flow and per IP. A burnt code (5 tries) plus one fresh code fit. */
  verifyFlow: { max: 10, windowMs: WINDOW_MS },
  verifyIp: { max: 20, windowMs: WINDOW_MS },
  resendFlow: { max: 5, windowMs: WINDOW_MS },
  forgotIp: { max: 5, windowMs: WINDOW_MS },
  resetEmail: { max: 10, windowMs: WINDOW_MS },
  resetIp: { max: 20, windowMs: WINDOW_MS },
  mailIp: { max: 20, windowMs: DAY_MS },
  mailTo: { max: 5, windowMs: HOUR_MS },
  /**
   * v1.2c (E3): every owner digest together, per day. Brevo's free 300/day is
   * shared with auth mail; this leaves it 150. In memory like the rest, so a
   * restart resets it.
   */
  digestDay: { max: 150, windowMs: DAY_MS },
} as const;

type Entry = { count: number; resetAt: number };

const attempts = new Map<string, Entry>();

function sweep(now: number): void {
  if (attempts.size < 5_000) return;
  for (const [key, entry] of attempts) {
    if (entry.resetAt <= now) attempts.delete(key);
  }
}

/** Call before doing the work. `false` means the caller must refuse. */
export function consumeAttempt(
  key: string,
  max: number = MAX_ATTEMPTS,
  windowMs: number = WINDOW_MS,
): boolean {
  const now = Date.now();
  sweep(now);
  const entry = attempts.get(key);

  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count += 1;
  return true;
}

/** Called after a success so a legitimate user is not punished for typos. */
export function clearAttempts(key: string): void {
  attempts.delete(key);
}

/** `consumeAttempt` with one of the named LIMITS. */
export function consumeLimit(
  key: string,
  limit: { max: number; windowMs: number },
): boolean {
  return consumeAttempt(key, limit.max, limit.windowMs);
}

/** Test-only helper. */
export function resetAllAttempts(): void {
  attempts.clear();
}
