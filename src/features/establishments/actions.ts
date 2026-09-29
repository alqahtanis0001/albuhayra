"use server";

/**
 * What an OWNER does to their own staff, plus the join code.
 *
 * Every action re-reads the target from the database filtered by the
 * `establishmentId` requireOwner() returned, so a forged user id can only ever
 * name someone inside the caller's own establishment.
 *
 * `resetStaffPassword` backs a form, so it takes `(userId, prevState, formData)`
 * and drops into `useActionState` after a `.bind(null, userId)`. The rest back
 * buttons and take plain arguments.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { Prisma } from "@/generated/prisma";
import { writeAudit } from "@/lib/audit";
import { hashPassword, requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { allocateJoinCode } from "@/lib/joinCode";
import { commonPasswordError } from "@/lib/passwords/server";
import {
  SetPasswordSchema,
  invalid,
  type ActionResult,
} from "@/lib/validation";

export type StaffActionState = ActionResult<null> | null;

const SETTINGS_PATH = "/owner/settings";

const idSchema = z.string().trim().min(1, "err.required").max(64, "err.tooLong");

const flagSchema = z.object({
  userId: idSchema,
  value: z.boolean({ error: "err.invalidInput" }),
});

type StaffTarget = {
  id: string;
  emailVerifiedAt: Date | null;
  status: "PENDING" | "ACTIVE" | "DISABLED";
  canEdit: boolean;
};

/**
 * Rule 2b: the tenant boundary lives in the SQL, not in the `findFirst` above it.
 * `update` cannot express it — Prisma demands a *unique* where and
 * `{ id, establishmentId }` is not unique — so every write here is an
 * `updateMany` carrying the scope, and a 0-row result means the id was not this
 * establishment's. That is the same answer the scoped read gave before, which is
 * what makes the migration behaviour-preserving rather than merely equivalent on
 * the happy path.
 */
async function updateOwnStaff(
  establishmentId: string,
  userId: string,
  data: Prisma.UserUpdateManyMutationInput,
): Promise<boolean> {
  const { count } = await db.user.updateMany({
    where: { id: userId, establishmentId, role: "STAFF" },
    data,
  });
  return count > 0;
}

/** The STAFF row `userId` names — but only inside the caller's establishment. */
async function findOwnStaff(
  establishmentId: string,
  userId: string,
): Promise<StaffTarget | null> {
  return db.user.findFirst({
    where: { id: userId, establishmentId, role: "STAFF" },
    select: { id: true, emailVerifiedAt: true, status: true, canEdit: true },
  });
}

export async function approveStaff(userId: string): Promise<ActionResult<null>> {
  const { user: owner, establishmentId } = await requireOwner();
  const parsed = idSchema.safeParse(userId);
  if (!parsed.success) return invalid(parsed.error);

  const staff = await findOwnStaff(establishmentId, parsed.data);
  if (!staff) return { ok: false, error: "err.notFound" };
  if (staff.status !== "PENDING") return { ok: false, error: "err.forbidden" };
  // v1.1e: an address nobody has proved may not become an account.
  if (!staff.emailVerifiedAt) return { ok: false, error: "err.emailNotVerified" };

  const updated = await updateOwnStaff(establishmentId, staff.id, {
    status: "ACTIVE",
  });
  if (!updated) return { ok: false, error: "err.notFound" };
  await writeAudit({
    establishmentId,
    userId: owner.id,
    action: "APPROVE_STAFF",
    entity: "User",
    entityId: staff.id,
    before: { status: staff.status },
    after: { status: "ACTIVE" },
  });

  revalidatePath(SETTINGS_PATH);
  return { ok: true, data: null };
}

export async function rejectStaff(userId: string): Promise<ActionResult<null>> {
  const { user: owner, establishmentId } = await requireOwner();
  const parsed = idSchema.safeParse(userId);
  if (!parsed.success) return invalid(parsed.error);

  const staff = await findOwnStaff(establishmentId, parsed.data);
  if (!staff) return { ok: false, error: "err.notFound" };
  if (staff.status !== "PENDING") return { ok: false, error: "err.forbidden" };

  // Rejection is a disabled account, not a deletion: the audit trail stays.
  const updated = await updateOwnStaff(establishmentId, staff.id, {
    status: "DISABLED",
    canEdit: false,
  });
  if (!updated) return { ok: false, error: "err.notFound" };
  await writeAudit({
    establishmentId,
    userId: owner.id,
    action: "REJECT_STAFF",
    entity: "User",
    entityId: staff.id,
    before: { status: staff.status },
    after: { status: "DISABLED" },
  });

  revalidatePath(SETTINGS_PATH);
  return { ok: true, data: null };
}

export async function setCanEdit(
  userId: string,
  canEdit: boolean,
): Promise<ActionResult<null>> {
  const { user: owner, establishmentId } = await requireOwner();
  const parsed = flagSchema.safeParse({ userId, value: canEdit });
  if (!parsed.success) return invalid(parsed.error);

  const staff = await findOwnStaff(establishmentId, parsed.data.userId);
  if (!staff) return { ok: false, error: "err.notFound" };

  const updated = await updateOwnStaff(establishmentId, staff.id, {
    canEdit: parsed.data.value,
  });
  if (!updated) return { ok: false, error: "err.notFound" };
  await writeAudit({
    establishmentId,
    userId: owner.id,
    action: "SET_CAN_EDIT",
    entity: "User",
    entityId: staff.id,
    before: { canEdit: staff.canEdit },
    after: { canEdit: parsed.data.value },
  });

  revalidatePath(SETTINGS_PATH);
  return { ok: true, data: null };
}

export async function setStaffActive(
  userId: string,
  active: boolean,
): Promise<ActionResult<null>> {
  const { user: owner, establishmentId } = await requireOwner();
  const parsed = flagSchema.safeParse({ userId, value: active });
  if (!parsed.success) return invalid(parsed.error);

  const staff = await findOwnStaff(establishmentId, parsed.data.userId);
  if (!staff) return { ok: false, error: "err.notFound" };
  // A pending request is approved or rejected, never enabled or disabled.
  if (staff.status === "PENDING") return { ok: false, error: "err.forbidden" };

  const status = parsed.data.value ? "ACTIVE" : "DISABLED";
  const updated = await updateOwnStaff(establishmentId, staff.id, {
    status,
    // Losing the account also loses the edit permission it carried.
    canEdit: parsed.data.value ? staff.canEdit : false,
  });
  if (!updated) return { ok: false, error: "err.notFound" };
  await writeAudit({
    establishmentId,
    userId: owner.id,
    action: parsed.data.value ? "ENABLE_USER" : "DISABLE_USER",
    entity: "User",
    entityId: staff.id,
    before: { status: staff.status },
    after: { status },
  });

  revalidatePath(SETTINGS_PATH);
  return { ok: true, data: null };
}

export async function resetStaffPassword(
  userId: string,
  _prev: StaffActionState,
  formData: FormData,
): Promise<ActionResult<null>> {
  const { user: owner, establishmentId } = await requireOwner();
  const parsed = SetPasswordSchema.safeParse({
    userId,
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) return invalid(parsed.error);
  const common = commonPasswordError(parsed.data.newPassword);
  if (common) return { ok: false, error: "err.invalidInput", fieldErrors: { newPassword: common } };

  const staff = await findOwnStaff(establishmentId, parsed.data.userId);
  if (!staff) return { ok: false, error: "err.notFound" };

  const updated = await updateOwnStaff(establishmentId, staff.id, {
    passwordHash: await hashPassword(parsed.data.newPassword),
  });
  if (!updated) return { ok: false, error: "err.notFound" };
  // The hash never reaches the audit payload.
  await writeAudit({
    establishmentId,
    userId: owner.id,
    action: "RESET_PASSWORD",
    entity: "User",
    entityId: staff.id,
  });

  revalidatePath(SETTINGS_PATH);
  return { ok: true, data: null };
}

/** The old code stops working the moment this returns. */
export async function regenerateJoinCode(): Promise<
  ActionResult<{ joinCode: string }>
> {
  const { user: owner, establishmentId } = await requireOwner();

  // allocateJoinCode throws if it cannot find a free code; an action returns a
  // result rather than letting an exception reach the error boundary.
  let joinCode: string;
  try {
    joinCode = await allocateJoinCode(db);
  } catch {
    return { ok: false, error: "err.unexpected" };
  }

  // The establishment's own id *is* the scope here.
  const { count } = await db.establishment.updateMany({
    where: { id: establishmentId },
    data: { joinCode },
  });
  if (count === 0) return { ok: false, error: "err.notFound" };
  // The code itself is a shared secret, so it stays out of the audit payload.
  await writeAudit({
    establishmentId,
    userId: owner.id,
    action: "REGENERATE_JOIN_CODE",
    entity: "Establishment",
    entityId: establishmentId,
  });

  revalidatePath(SETTINGS_PATH);
  return { ok: true, data: { joinCode } };
}
