"use server";

/**
 * `/verify`. The specific code errors (`codeInvalid`, `codeExpired`,
 * `codeAttempts`, `resendTooSoon`) are safe only because a flow started with a
 * registered address runs the identical state machine in `src/lib/codes.ts`
 * (A1): the same answers, at the same moments, with the same queries.
 */
import { after } from "next/server";
import { redirect } from "next/navigation";

import { writeAudit } from "@/lib/audit";
import { checkCode, consumeCode, RESEND_AFTER_MS, resendWaitSeconds } from "@/lib/codes";
import { db } from "@/lib/db";
import { consumeLimit, LIMITS } from "@/lib/rateLimit";
import { clearFlow, getFlow } from "@/lib/session";
import { VerifyCodeSchema, invalid, type ActionResult } from "@/lib/validation";

import { resendVerifyCode } from "./flows";
import { clientIp, logAfterFailure, pendingPath } from "./shared";
import type { AuthState, ResendState } from "./types";

type Verified = { role: "ADMIN" | "OWNER" | "STAFF"; status: "PENDING" | "ACTIVE" | "DISABLED" };

export async function verifyEmail(
  _prev: AuthState,
  formData: FormData,
): Promise<ActionResult<null>> {
  const parsed = VerifyCodeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, "err.codeFormat");

  const flow = (await getFlow()).verify;
  if (!flow) return { ok: false, error: "err.verifySessionExpired" };

  const ip = await clientIp();
  if (
    !consumeLimit(`verify:${flow.userId}`, LIMITS.verifyFlow) ||
    !consumeLimit(`verify:${ip}`, LIMITS.verifyIp)
  ) {
    return { ok: false, error: "err.tooManyAttempts" };
  }

  const subject = { userId: flow.userId, purpose: "VERIFY" as const };
  const checked = await checkCode(subject, parsed.data.code);
  if (!checked.ok) return { ok: false, error: checked.error };

  // Consume the code and verify the address in one transaction: a double
  // submit consumes once, and a code without its user write is rolled back.
  const now = new Date();
  let verified: Verified | null = null;
  try {
    verified = await db.$transaction(async (tx) => {
      if (!(await consumeCode(tx, checked.codeId, now))) throw new Error("code already used");
      const { count } = await tx.user.updateMany({
        where: { id: flow.userId, emailVerifiedAt: null },
        data: { emailVerifiedAt: now },
      });
      if (count !== 1) throw new Error("user already verified");
      const user = await tx.user.findUniqueOrThrow({
        where: { id: flow.userId },
        select: { role: true, status: true, establishmentId: true },
      });
      await writeAudit({
        establishmentId: user.establishmentId,
        userId: flow.userId,
        action: "EMAIL_VERIFIED",
        entity: "User",
        entityId: flow.userId,
        client: tx,
      });
      return { role: user.role, status: user.status };
    });
  } catch {
    verified = null;
  }
  if (!verified) return { ok: false, error: "err.codeInvalid" };

  await clearFlow();
  // Route by the database status (A8), not by anything the flow carried.
  redirect(verified.status === "PENDING" ? pendingPath(verified.role, true) : "/login");
}

/** «أعد الإرسال». The send itself happens after the response. */
export async function resendVerification(
  _prev: ResendState,
): Promise<ActionResult<{ retryAfterSeconds: number }>> {
  const flow = (await getFlow()).verify;
  if (!flow) return { ok: false, error: "err.verifySessionExpired" };

  const ip = await clientIp();
  if (!consumeLimit(`resend:${flow.userId}`, LIMITS.resendFlow)) {
    return { ok: false, error: "err.tooManyAttempts" };
  }

  const subject = { userId: flow.userId, purpose: "VERIFY" as const };
  if ((await resendWaitSeconds(subject, flow.startedAt)) > 0) return { ok: false, error: "err.resendTooSoon" };

  after(() => resendVerifyCode(flow.userId, ip).catch((e) => logAfterFailure("resend", e)));
  return { ok: true, data: { retryAfterSeconds: RESEND_AFTER_MS / 1000 } };
}
