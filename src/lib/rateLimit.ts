/**
 * In-memory fixed-window limiter for login, sign-up and join-code attempts.
 * One process only — good enough for a single Render instance, and deliberately
 * simple (no Redis). Restarting the app clears the counters.
 */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

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
): boolean {
  const now = Date.now();
  sweep(now);
  const entry = attempts.get(key);

  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
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

/** Test-only helper. */
export function resetAllAttempts(): void {
  attempts.clear();
}
