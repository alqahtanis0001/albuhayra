import "server-only";
import { createHmac, hkdfSync, randomInt, timingSafeEqual } from "node:crypto";

import {
  CODE_TTL_MS,
  DAY_MS,
  MAX_ATTEMPTS_PER_DAY,
  MAX_CODE_ATTEMPTS,
  MAX_CODES_PER_DAY,
  NO_CODE,
  RESEND_AFTER_MS,
  type CodeCheck,
  type CodeError,
  type CodePurpose,
  type CodeSubject,
  type IssueResult,
} from "./constants";
import { storeFor } from "./stores";

export * from "./constants";
export { isFakeFlow, resetFakeFlows, startFakeFlow } from "./stores";

/**
 * One-time 6-digit email codes (docs/BACKEND.md v1.1e "Codes" + A1, A4, A5).
 *
 * Stored only as an HMAC; the code itself is never stored, logged or returned
 * except to the caller that mails it. The HMAC key is derived from
 * SESSION_SECRET with a fixed label, so rotating the secret voids live codes.
 *
 * **The fake flow is a perfect twin (A1).** A sign-up with an address that is
 * already registered gets a flow id that matches no user. Its codes live in an
 * in-memory map instead of the database, but every function below runs the
 * *same* state machine over both stores, and the fake store runs the same
 * database statements too (they match zero rows), so the answers and the query
 * count are identical. Only the send differs, and that happens after the
 * response.
 */

/* ---------------------------------------------------------------- hashing */

let hmacKey: Buffer | undefined;

function key(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set and at least 32 characters");
  }
  hmacKey ??= Buffer.from(hkdfSync("sha256", secret, "", "zakham:email-code:v1", 32));
  return hmacKey;
}

export function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashCode(userId: string, purpose: CodePurpose, code: string): string {
  return createHmac("sha256", key()).update(`${userId}:${purpose}:${code}`).digest("hex");
}

export function codesMatch(
  storedHash: string,
  userId: string,
  purpose: CodePurpose,
  code: string,
): boolean {
  const expected = Buffer.from(hashCode(userId, purpose, code), "hex");
  const stored = Buffer.from(storedHash, "hex");
  return stored.length === expected.length && timingSafeEqual(stored, expected);
}

/* ---------------------------------------------------------- state machine */

/** Seconds until a resend is allowed (0 = now), or null when there is no code at all. */
/**
 * Seconds until a resend is allowed (0 = now). With no code at all — right
 * after a sign-up, before `after()` has written it, or a fake flow whose state
 * a restart lost — the wait counts from `flowStartedAt` (when the flow cookie
 * was set) instead, which is exactly what a real flow's first code shows.
 */
export async function resendWaitSeconds(
  subject: CodeSubject,
  flowStartedAt: number,
  now = new Date(),
): Promise<number> {
  const newest = await storeFor(subject).newest();
  const sentAt = newest ? newest.sentAt.getTime() : flowStartedAt;
  const left = sentAt + RESEND_AFTER_MS - now.getTime();
  return left > 0 ? Math.ceil(left / 1000) : 0;
}

/** True when the newest code can still be tried: unexpired and not burnt. */
export async function hasLiveCode(subject: CodeSubject, now = new Date()): Promise<boolean> {
  const newest = await storeFor(subject).newest();
  return newest !== null && newest.expiresAt > now && newest.attempts < MAX_CODE_ATTEMPTS;
}

/**
 * Issues a new code, retiring the old one. `tooSoon` inside 60 s of the last
 * send; `capped` after 5 codes or 10 attempts in 24 h — the caller then sends
 * nothing, silently (A4).
 */
export async function issueCode(subject: CodeSubject, now = new Date()): Promise<IssueResult> {
  const store = storeFor(subject);
  const newest = await store.newest();
  const stats = await store.stats(new Date(now.getTime() - DAY_MS));
  if (newest && now.getTime() - newest.sentAt.getTime() < RESEND_AFTER_MS) {
    return { status: "tooSoon" };
  }
  if (stats.issued >= MAX_CODES_PER_DAY || stats.attempts >= MAX_ATTEMPTS_PER_DAY) {
    return { status: "capped" };
  }
  await store.retire(now);
  const code = generateCode();
  await store.insert({
    codeHash: hashCode(subject.userId, subject.purpose, code),
    sentAt: now,
    expiresAt: new Date(now.getTime() + CODE_TTL_MS),
  });
  return { status: "issued", code };
}

/**
 * Checks a submitted code. Always runs the same three statements — newest,
 * stats, the conditional increment — whatever the outcome, and the increment
 * comes before the comparison so parallel guesses cannot all slip under the cap.
 * A success does not consume the code: `consumeCode` does that in the caller's
 * transaction, together with the write the code authorises.
 */
export async function checkCode(
  subject: CodeSubject,
  submitted: string,
  now = new Date(),
): Promise<CodeCheck> {
  const store = storeFor(subject);
  const live = await store.newest();
  const stats = await store.stats(new Date(now.getTime() - DAY_MS));

  let refusal: CodeError | null = null;
  // No code at all reads as expired: it is what a real flow shows once its code
  // has lapsed, so a fake flow whose in-memory state a restart lost (Render's
  // free tier restarts after 15 idle minutes) answers the same (A1).
  if (!live) refusal = "err.codeExpired";
  else if (live.expiresAt <= now) refusal = "err.codeExpired";
  else if (live.attempts >= MAX_CODE_ATTEMPTS || stats.attempts >= MAX_ATTEMPTS_PER_DAY) {
    refusal = "err.codeAttempts";
  }

  const spent = await store.spendAttempt(refusal || !live ? NO_CODE : live.id, now);
  if (refusal || !live) return { ok: false, error: refusal ?? "err.codeExpired" };
  // Lost a race with a parallel guess or the clock: the row changed under us.
  if (!spent) return { ok: false, error: live.expiresAt <= now ? "err.codeExpired" : "err.codeAttempts" };

  if (!codesMatch(live.codeHash, subject.userId, subject.purpose, submitted)) {
    const burnt =
      live.attempts + 1 >= MAX_CODE_ATTEMPTS || stats.attempts + 1 >= MAX_ATTEMPTS_PER_DAY;
    return { ok: false, error: burnt ? "err.codeAttempts" : "err.codeInvalid" };
  }
  return { ok: true, codeId: live.id };
}

type ConsumeClient = {
  emailCode: {
    updateMany(args: {
      where: { id: string; consumedAt: null };
      data: { consumedAt: Date };
    }): Promise<{ count: number }>;
  };
};

/** Marks the code used. Exactly one row or the caller must roll back (A5). */
export async function consumeCode(client: ConsumeClient, codeId: string, now = new Date()): Promise<boolean> {
  const { count } = await client.emailCode.updateMany({
    where: { id: codeId, consumedAt: null },
    data: { consumedAt: now },
  });
  return count === 1;
}
