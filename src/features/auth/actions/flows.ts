import "server-only";

import type { Prisma } from "@/generated/prisma";
import { writeAudit } from "@/lib/audit";
import { hasLiveCode, isFakeFlow, issueCode, startFakeFlow } from "@/lib/codes";
import { db } from "@/lib/db";
import { deliver } from "@/lib/mail/send";
import { existsMail, resetMail, verifyMail } from "@/lib/mail/templates";

/**
 * The work that depends on whether an address is registered. Every function
 * here runs inside `after()` — after the response has gone — so neither its
 * answer nor its duration can tell a caller anything (docs/BACKEND.md A6).
 * A failure is logged by the caller and simply never yields a working code;
 * the user can sign up or ask again.
 */

type NewAccount = {
  flowId: string;
  email: string;
  ip: string;
  role: "OWNER" | "STAFF";
  /** Creates the user (with `id: flowId`) and anything it needs; returns its establishment id. */
  create(tx: Prisma.TransactionClient): Promise<string>;
};

/**
 * A new address becomes a PENDING, unverified account and gets a code. A
 * registered address gets no write at all: its flow id becomes a fake flow
 * that runs the same code state machine, and the address's real owner is told
 * by email that someone tried to sign up with it.
 */
export async function completeSignup(account: NewAccount): Promise<void> {
  const taken = await db.user.findUnique({
    where: { email: account.email },
    select: { id: true },
  });
  if (taken) {
    startFakeFlow(account.flowId);
    await issueCode({ userId: account.flowId, purpose: "VERIFY" });
    await deliver(existsMail(account.email), account.ip);
    return;
  }

  await db.$transaction(async (tx) => {
    const establishmentId = await account.create(tx);
    await writeAudit({
      establishmentId,
      userId: account.flowId,
      action: "SIGNUP",
      entity: "User",
      entityId: account.flowId,
      after: { role: account.role, status: "PENDING" },
      client: tx,
    });
  });
  await sendVerifyCode(account.flowId, account.ip);
}

/** Issues a VERIFY code and mails it — to the address in the database, never one from a cookie. */
async function sendVerifyCode(userId: string, ip: string): Promise<void> {
  const issued = await issueCode({ userId, purpose: "VERIFY" });
  if (issued.status !== "issued" || isFakeFlow(userId)) return;
  const user = await db.user.findFirst({
    where: { id: userId, emailVerifiedAt: null },
    select: { email: true },
  });
  if (user) await deliver(verifyMail(user.email, issued.code), ip);
}

/** Login with the right password on an unverified account: a code unless one is still usable. */
export async function ensureVerifyCode(userId: string, ip: string): Promise<void> {
  if (await hasLiveCode({ userId, purpose: "VERIFY" })) return;
  await sendVerifyCode(userId, ip);
}

/**
 * «أعد الإرسال». Three cases, by the row the flow id names (R-E3 E3-B1):
 * - **no row** — the fake flow, or one whose state a restart lost: (re)start
 *   the twin, so it keeps behaving exactly like a real flow and never reaches
 *   an insert that would fail;
 * - **already verified** — e.g. verified on another device while this one
 *   still shows the code screen: nothing to send, and above all never mark a
 *   real user's id as a fake flow;
 * - **unverified** — send a fresh code.
 */
export async function resendVerifyCode(flowId: string, ip: string): Promise<void> {
  if (!isFakeFlow(flowId)) {
    const user = await db.user.findUnique({
      where: { id: flowId },
      select: { emailVerifiedAt: true },
    });
    if (!user) startFakeFlow(flowId);
    else if (user.emailVerifiedAt !== null) return;
  }
  await sendVerifyCode(flowId, ip);
}

/** `/forgot`: a RESET code only when the address exists; nothing otherwise. */
export async function sendResetCode(email: string, ip: string): Promise<void> {
  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return;
  const issued = await issueCode({ userId: user.id, purpose: "RESET" });
  if (issued.status === "issued") await deliver(resetMail(email, issued.code), ip);
}
