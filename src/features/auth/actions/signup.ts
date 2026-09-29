"use server";

/**
 * Sign-up (v1.1e). **No enumeration anywhere** (Decision in PROGRESS.md): a
 * new address and an already-registered one get the same answer, the same
 * `/verify` screen, and the same work before the response.
 *
 * The response path is only: validate → bcrypt → (staff) join-code check →
 * flow cookie with a pre-made random id → `redirect("/verify")`. Whether the
 * address exists is not even looked at until `after()` (A6), where the id
 * becomes either the new user's id or a fake flow (A1).
 *
 * Neither action calls `clearAttempts` (A2): clearing only on the new-address
 * path would let the registered-address path hit the limit first.
 */
import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { redirect } from "next/navigation";

import type { Prisma } from "@/generated/prisma";
import { hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { isDisposableEmail } from "@/lib/emails/disposable";
import { allocateJoinCode } from "@/lib/joinCode";
import { fullName } from "@/lib/names";
import { commonPasswordError } from "@/lib/passwords/server";
import { consumeAttempt } from "@/lib/rateLimit";
import { startFlow } from "@/lib/session";
import {
  SignupOwnerSchema,
  SignupStaffSchema,
  invalid,
  type ActionResult,
  type SignupOwnerInput,
} from "@/lib/validation";

import { completeSignup } from "./flows";
import { clientIp, logAfterFailure } from "./shared";
import type { AuthState } from "./types";

type Person = Pick<SignupOwnerInput, "firstName" | "middleName" | "lastName" | "email">;

/** The user row both roles create. `legacyName` is dual-written for the expand step (A9). */
function userData(
  flowId: string,
  person: Person,
  passwordHash: string,
  role: "OWNER" | "STAFF",
  establishmentId: string,
): Prisma.UserUncheckedCreateInput {
  return {
    id: flowId,
    email: person.email,
    firstName: person.firstName,
    middleName: person.middleName ?? null,
    lastName: person.lastName,
    legacyName: fullName(person),
    emailVerifiedAt: null,
    passwordHash,
    role,
    status: "PENDING",
    establishmentId,
  };
}

/**
 * The two server-only rules, which the shared schema cannot carry: throwaway
 * domains and the common-password list (A12 as amended). Both describe what
 * was typed, never whether an account exists.
 */
function serverOnlyRules(email: string, password: string): ActionResult<null> | null {
  if (isDisposableEmail(email)) {
    return { ok: false, error: "err.signupFailed", fieldErrors: { email: "err.emailDisposable" } };
  }
  const common = commonPasswordError(password);
  return common ? { ok: false, error: "err.signupFailed", fieldErrors: { password: common } } : null;
}

export async function signupOwner(
  _prev: AuthState,
  formData: FormData,
): Promise<ActionResult<null>> {
  const parsed = SignupOwnerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, "err.signupFailed");
  const refused = serverOnlyRules(parsed.data.email, parsed.data.password);
  if (refused) return refused;

  const ip = await clientIp();
  if (!consumeAttempt(`signup:${ip}`)) return { ok: false, error: "err.tooManyAttempts" };

  const { email, password, establishmentName } = parsed.data;
  const passwordHash = await hashPassword(password);
  const flowId = randomUUID();

  await startFlow({ verify: { userId: flowId, email, startedAt: Date.now() } });
  after(() =>
    completeSignup({
      flowId,
      email,
      ip,
      role: "OWNER",
      create: async (tx) => {
        const establishment = await tx.establishment.create({
          data: { name: establishmentName, joinCode: await allocateJoinCode(tx) },
          select: { id: true },
        });
        await tx.user.create({
          data: userData(flowId, parsed.data, passwordHash, "OWNER", establishment.id),
          select: { id: true },
        });
        return establishment.id;
      },
    }).catch((e) => logAfterFailure("owner sign-up", e)),
  );
  redirect("/verify");
}

export async function signupStaff(
  _prev: AuthState,
  formData: FormData,
): Promise<ActionResult<null>> {
  const parsed = SignupStaffSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, "err.signupFailed");
  const refused = serverOnlyRules(parsed.data.email, parsed.data.password);
  if (refused) return refused;

  const ip = await clientIp();
  if (!consumeAttempt(`join:${ip}`)) return { ok: false, error: "err.tooManyAttempts" };

  const { email, password, joinCode } = parsed.data;

  // The join code is checked here because its answer does not depend on the
  // address. Whether the address is taken is decided in after(), so a taken
  // address and a new one are indistinguishable; B10's generic key still
  // covers every join-code failure.
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

  // Hash before deciding, so bcrypt's ~250ms is spent whatever the answer.
  const passwordHash = await hashPassword(password);

  if (!establishment || !establishment.active || establishment.users.length === 0) {
    return { ok: false, error: "err.joinFailed" };
  }
  const establishmentId = establishment.id;
  const flowId = randomUUID();

  await startFlow({ verify: { userId: flowId, email, startedAt: Date.now() } });
  after(() =>
    completeSignup({
      flowId,
      email,
      ip,
      role: "STAFF",
      create: async (tx) => {
        await tx.user.create({
          data: userData(flowId, parsed.data, passwordHash, "STAFF", establishmentId),
          select: { id: true },
        });
        return establishmentId;
      },
    }).catch((e) => logAfterFailure("staff sign-up", e)),
  );
  redirect("/verify");
}
