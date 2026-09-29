"use server";

/**
 * Sign-up, login and logout. Nothing here reveals whether an email exists:
 * every failure that is not a malformed form returns one generic key
 * (docs/BACKEND.md, Security rule 4).
 *
 * The signatures are the shape `useActionState` calls an action with —
 * `(prevState, formData)` — because docs/FRONTEND.md builds every form on it.
 * On success they navigate rather than return, so an `ActionResult` only ever
 * carries a failure back to the form.
 */
import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { writeAudit } from "@/lib/audit";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { allocateJoinCode } from "@/lib/joinCode";
import { homePathFor } from "@/lib/permissions";
import { clearAttempts, consumeAttempt } from "@/lib/rateLimit";
import { destroySession, startSession } from "@/lib/session";
import {
  LoginSchema,
  SignupOwnerSchema,
  SignupStaffSchema,
  invalid,
  type ActionResult,
} from "@/lib/validation";

export type AuthState = ActionResult<null> | null;

/** `/pending` names who approves from this, having no session to read. */
function pendingPath(role: "OWNER" | "STAFF"): string {
  return role === "OWNER" ? "/pending?as=owner" : "/pending?as=staff";
}

/**
 * Client address for the rate limiter. `x-forwarded-for` is `client, proxy1, …`
 * and a caller can put anything at the front, so the leftmost entry is
 * attacker-controlled: keying on it would let one attacker spend five attempts
 * per made-up address. The **last** entry is the one our own proxy appended, so
 * that is the one we trust.
 */
async function clientIp(): Promise<string> {
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
async function burnPasswordTime(plain: string): Promise<void> {
  decoyHash ??= await hashPassword(randomUUID());
  await verifyPassword(plain, decoyHash);
}

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
      role: true,
      status: true,
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

  // The password was correct, so naming the wait for approval tells this caller
  // only what they already know. No session is started for a PENDING user.
  if (user.status === "PENDING") {
    clearAttempts(key);
    redirect(pendingPath(user.role === "OWNER" ? "OWNER" : "STAFF"));
  }
  if (user.status !== "ACTIVE") return { ok: false, error: "err.loginFailed" };
  // A disabled establishment locks out its owner and all of its staff.
  if (user.role !== "ADMIN" && user.establishment?.active !== true) {
    return { ok: false, error: "err.loginFailed" };
  }

  await startSession({
    userId: user.id,
    role: user.role,
    establishmentId: user.establishmentId,
  });
  clearAttempts(key);
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
  await destroySession();
  redirect("/login");
}

export async function signupOwner(
  _prev: AuthState,
  formData: FormData,
): Promise<ActionResult<null>> {
  const parsed = SignupOwnerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, "err.signupFailed");

  const ip = await clientIp();
  const key = `signup:${ip}`;
  if (!consumeAttempt(key)) return { ok: false, error: "err.tooManyAttempts" };

  const { name, email, password, establishmentName } = parsed.data;
  // An address already in use gets the same answer as any other bad sign-up.
  const taken = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (taken) return { ok: false, error: "err.signupFailed" };

  const passwordHash = await hashPassword(password);

  try {
    await db.$transaction(async (tx) => {
      const establishment = await tx.establishment.create({
        data: { name: establishmentName, joinCode: await allocateJoinCode(tx) },
        select: { id: true },
      });
      const user = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: "OWNER",
          status: "PENDING",
          establishmentId: establishment.id,
        },
        select: { id: true },
      });
      await writeAudit({
        establishmentId: establishment.id,
        userId: user.id,
        action: "SIGNUP",
        entity: "User",
        entityId: user.id,
        after: { role: "OWNER", status: "PENDING" },
        client: tx,
      });
    });
  } catch {
    // A unique-constraint race on the email or the join code. Nothing more
    // specific is safe to say, and the stack trace never leaves the server.
    return { ok: false, error: "err.signupFailed" };
  }

  clearAttempts(key);
  redirect(pendingPath("OWNER"));
}

export async function signupStaff(
  _prev: AuthState,
  formData: FormData,
): Promise<ActionResult<null>> {
  const parsed = SignupStaffSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, "err.signupFailed");

  const ip = await clientIp();
  const key = `join:${ip}`;
  if (!consumeAttempt(key)) return { ok: false, error: "err.tooManyAttempts" };

  const { name, email, password, joinCode } = parsed.data;
  const establishment = await db.establishment.findUnique({
    where: { joinCode },
    select: {
      id: true,
      active: true,
      users: {
        where: { role: "OWNER", status: "ACTIVE" },
        select: { id: true },
        take: 1,
      },
    },
  });
  // A wrong code, a disabled establishment and an owner who is not active are
  // one answer: the code is the only thing the caller gets to learn about.
  if (!establishment || !establishment.active || establishment.users.length === 0) {
    return { ok: false, error: "err.joinFailed" };
  }

  const taken = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (taken) return { ok: false, error: "err.signupFailed" };

  const passwordHash = await hashPassword(password);
  try {
    await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: "STAFF",
          status: "PENDING",
          establishmentId: establishment.id,
        },
        select: { id: true },
      });
      await writeAudit({
        establishmentId: establishment.id,
        userId: user.id,
        action: "SIGNUP",
        entity: "User",
        entityId: user.id,
        after: { role: "STAFF", status: "PENDING" },
        client: tx,
      });
    });
  } catch {
    return { ok: false, error: "err.signupFailed" };
  }

  clearAttempts(key);
  redirect(pendingPath("STAFF"));
}
