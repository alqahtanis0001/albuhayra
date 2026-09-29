"use server";

/**
 * `/forgot` and `/reset` (v1.1e). No enumeration: `/forgot` always answers the
 * same, and every code failure on `/reset` — wrong, expired, burnt, unknown
 * address, no flow — is the one key `err.codeInvalidOrExpired`. Distinct keys
 * would let anyone probe an address by waiting out the expiry.
 */
import { after } from "next/server";
import { redirect } from "next/navigation";

import { writeAudit } from "@/lib/audit";
import { hashPassword } from "@/lib/auth";
import { checkCode, consumeCode } from "@/lib/codes";
import { db } from "@/lib/db";
import { commonPasswordError } from "@/lib/passwords/server";
import { consumeLimit, LIMITS } from "@/lib/rateLimit";
import { clearFlow, getFlow, startFlow } from "@/lib/session";
import {
  ForgotPasswordSchema,
  ResetPasswordSchema,
  invalid,
  passwordPersonalError,
  type ActionResult,
} from "@/lib/validation";

import { sendResetCode } from "./flows";
import { clientIp, logAfterFailure } from "./shared";
import type { AuthState } from "./types";

const GENERIC = { ok: false, error: "err.codeInvalidOrExpired" } as const;

/** A user id no row can have, so an unknown address runs the same statements. */
const NO_USER = "";

export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<ActionResult<null>> {
  const parsed = ForgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, "err.emailInvalid");

  const ip = await clientIp();
  if (!consumeLimit(`forgot:${ip}`, LIMITS.forgotIp)) {
    return { ok: false, error: "err.tooManyAttempts" };
  }

  const { email } = parsed.data;
  await startFlow({ reset: { email } });
  // Whether the address exists is looked at only after the response (A6).
  after(() => sendResetCode(email, ip).catch((e) => logAfterFailure("forgot", e)));
  return { ok: true, data: null };
}

/**
 * Order (A3): (1) the rules that need no account, including the email's local
 * part — the address comes from the flow, so it tells the caller nothing new;
 * (2) the code, with one generic key; (3) the name rule, only once the code
 * has proved the caller holds the mailbox — before that, a name-bearing
 * password answering `passwordPersonal` would confirm the account exists.
 */
export async function resetPassword(
  _prev: AuthState,
  formData: FormData,
): Promise<ActionResult<null>> {
  const parsed = ResetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  const email = (await getFlow()).reset?.email ?? null;
  const { code, newPassword } = parsed.data;

  // (1) The schema covered length, bytes and letter+digit; the common list and
  // the flow's own address need no account either.
  const accountFree = commonPasswordError(newPassword) ?? passwordPersonalError(newPassword, { email });
  if (accountFree) {
    return { ok: false, error: "err.invalidInput", fieldErrors: { newPassword: accountFree } };
  }

  const ip = await clientIp();
  if (
    !consumeLimit(`reset:${email ?? "none"}`, LIMITS.resetEmail) ||
    !consumeLimit(`reset:${ip}`, LIMITS.resetIp)
  ) {
    return { ok: false, error: "err.tooManyAttempts" };
  }

  const user = email
    ? await db.user.findUnique({
        where: { email },
        select: {
          id: true,
          firstName: true,
          middleName: true,
          lastName: true,
          emailVerifiedAt: true,
          establishmentId: true,
        },
      })
    : null;
  const checked = await checkCode({ userId: user?.id ?? NO_USER, purpose: "RESET" }, code);
  if (!user || !checked.ok) return GENERIC;

  const byName = passwordPersonalError(newPassword, {
    names: [user.firstName, user.middleName, user.lastName],
  });
  if (byName) return { ok: false, error: "err.invalidInput", fieldErrors: { newPassword: byName } };

  const passwordHash = await hashPassword(newPassword);
  const now = new Date();
  try {
    await db.$transaction(async (tx) => {
      if (!(await consumeCode(tx, checked.codeId, now))) throw new Error("code already used");
      await tx.user.updateMany({
        where: { id: user.id },
        // The code proved the address, so an unverified one becomes verified.
        data: { passwordHash, emailVerifiedAt: user.emailVerifiedAt ?? now },
      });
      await writeAudit({
        establishmentId: user.establishmentId,
        userId: user.id,
        action: "PASSWORD_RESET_SELF",
        entity: "User",
        entityId: user.id,
        client: tx,
      });
    });
  } catch {
    return GENERIC;
  }

  await clearFlow();
  redirect("/login?reset=1");
}
