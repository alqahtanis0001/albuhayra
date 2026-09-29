"use server";

/**
 * Login and logout. Nothing here reveals whether an email exists: every failure
 * that is not a correct password answers one generic key (docs/BACKEND.md,
 * Security rule 4).
 */
import { after } from "next/server";
import { redirect } from "next/navigation";

import { writeAudit } from "@/lib/audit";
import { verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { homePathFor } from "@/lib/permissions";
import { clearAttempts, consumeAttempt } from "@/lib/rateLimit";
import { clearFlow, destroySession, startFlow, startSession } from "@/lib/session";
import { LoginSchema, type ActionResult } from "@/lib/validation";

import { ensureVerifyCode } from "./flows";
import { burnPasswordTime, clientIp, logAfterFailure, pendingPath } from "./shared";
import type { AuthState } from "./types";

/**
 * Order (A8): wrong password → DISABLED or inactive establishment → unverified
 * → PENDING. Each branch after the password tells the caller only about an
 * account whose password they have just proved.
 */
export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<ActionResult<null>> {
  const parsed = LoginSchema.safeParse(Object.fromEntries(formData));
  // A login form has nothing safe to say per field: naming the wrong one tells
  // the caller whether the address exists.
  if (!parsed.success) return { ok: false, error: "err.loginFailed" };

  const { email, password } = parsed.data;
  const ip = await clientIp();
  const key = `login:${ip}:${email}`;
  if (!consumeAttempt(key)) return { ok: false, error: "err.tooManyAttempts" };

  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      emailVerifiedAt: true,
      passwordHash: true,
      establishmentId: true,
      establishment: { select: { active: true } },
    },
  });

  if (!user) {
    await burnPasswordTime(password);
    return { ok: false, error: "err.loginFailed" };
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    return { ok: false, error: "err.loginFailed" };
  }
  if (user.status === "DISABLED") return { ok: false, error: "err.loginFailed" };
  // A disabled establishment locks out its owner and all of its staff.
  if (user.role !== "ADMIN" && user.establishment?.active !== true) {
    return { ok: false, error: "err.loginFailed" };
  }

  clearAttempts(key);

  // v1.1e: an unverified address gets the code screen, never a session — and a
  // stale session left in this browser by another account goes too (R-E0).
  if (user.emailVerifiedAt === null) {
    await destroySession();
    await startFlow({ verify: { userId: user.id, email: user.email, startedAt: Date.now() } });
    after(() => ensureVerifyCode(user.id, ip).catch((e) => logAfterFailure("login code", e)));
    redirect("/verify");
  }

  // The password was correct, so naming the wait for approval tells this caller
  // only what they already know. No session is started for a PENDING user.
  if (user.status === "PENDING") {
    await destroySession();
    await clearFlow();
    redirect(pendingPath(user.role));
  }

  await clearFlow();
  await startSession({
    userId: user.id,
    role: user.role,
    establishmentId: user.establishmentId,
  });
  await writeAudit({
    establishmentId: user.establishmentId,
    userId: user.id,
    action: "LOGIN",
    entity: "User",
    entityId: user.id,
  });

  redirect(homePathFor(user.role));
}

/**
 * The one action with no requireX(): a stale, tampered or half-valid session
 * must still be clearable, and /pending shows a logout button. Used as a bare
 * `<form action={logout}>`, so it takes nothing and never returns.
 */
export async function logout(): Promise<void> {
  await clearFlow();
  await destroySession();
  redirect("/login");
}
