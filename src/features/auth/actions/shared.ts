import "server-only";
import { randomUUID } from "node:crypto";
import { headers } from "next/headers";

import { hashPassword, verifyPassword } from "@/lib/auth";

/**
 * Helpers the auth actions share. Deliberately **not** a `"use server"` module:
 * every export of one of those becomes a callable endpoint, and none of these
 * should be.
 */

/** `/pending` names who approves from this, having no session to read. */
export function pendingPath(role: "OWNER" | "STAFF" | "ADMIN", verified = false): string {
  const as = role === "OWNER" ? "owner" : "staff";
  return verified ? `/pending?as=${as}&verified=1` : `/pending?as=${as}`;
}

/**
 * Client address for the rate limiter. `x-forwarded-for` is `client, proxy1, …`
 * and a caller can put anything at the front, so the leftmost entry is
 * attacker-controlled: keying on it would let one attacker spend five attempts
 * per made-up address. The **last** entry is the one our own proxy appended, so
 * that is the one we trust.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded.split(",").map((v) => v.trim()).filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1]!;
  }
  return h.get("x-real-ip") ?? "unknown";
}

let decoyHash: string | undefined;

/**
 * Spend the same bcrypt time when the email is unknown, so the reply time does
 * not separate "no such account" from "wrong password".
 */
export async function burnPasswordTime(plain: string): Promise<void> {
  decoyHash ??= await hashPassword(randomUUID());
  await verifyPassword(plain, decoyHash);
}

/** Logs a failure inside `after()` without a message that could carry data. */
export function logAfterFailure(where: string, error: unknown): void {
  const name = error instanceof Error ? error.name : "unknown";
  console.error(`[auth] ${where} failed after the response: ${name}`);
}
