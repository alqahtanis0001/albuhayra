"use server";

/**
 * Own password, and the establishment's categories.
 *
 * Categories are looked up by id *and* by the `establishmentId` requireOwner()
 * returned, so a forged id can only name a category the caller already owns.
 *
 * The form-backed actions take `(…ids, prevState, formData)` so they drop into
 * `useActionState` after a `.bind(null, id)`; the button-backed ones take plain
 * arguments. None of them redirect — settings stays on the page.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { Prisma } from "@/generated/prisma";
import { writeAudit } from "@/lib/audit";
import { hashPassword, requireOwner, requireUser, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  CategoryInputSchema,
  ChangePasswordSchema,
  invalid,
  type ActionResult,
  type DirectionValue,
} from "@/lib/validation";

export type SettingsState = ActionResult<null> | null;

const SETTINGS_PATH = "/owner/settings";

const idSchema = z.string().trim().min(1, "err.required").max(64, "err.tooLong");

const orderSchema = z.object({
  categoryId: idSchema,
  direction: z.enum(["UP", "DOWN"], { error: "err.invalidInput" }),
});

const activeSchema = z.object({
  categoryId: idSchema,
  active: z.boolean({ error: "err.invalidInput" }),
});

/** Any signed-in user, including ADMIN and STAFF, changing their own password. */
export async function changeOwnPassword(
  _prev: SettingsState,
  formData: FormData,
): Promise<ActionResult<null>> {
  const { user } = await requireUser();
  const parsed = ChangePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  const row = await db.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!row) return { ok: false, error: "err.unexpected" };
  if (!(await verifyPassword(parsed.data.currentPassword, row.passwordHash))) {
    return { ok: false, error: "err.passwordWrong" };
  }

  // The caller's own id is the scope: this action changes nobody else's password,
  // and an ADMIN has no establishment to scope by.
  const { count } = await db.user.updateMany({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });
  if (count === 0) return { ok: false, error: "err.unexpected" };
  await writeAudit({
    establishmentId: user.establishmentId,
    userId: user.id,
    action: "RESET_PASSWORD",
    entity: "User",
    entityId: user.id,
  });

  return { ok: true, data: null };
}

/**
 * Rule 2b: the scope is in the SQL rather than in the `findFirst` above it, and
 * a 0-row result is the same `err.notFound` the scoped read produced before.
 */
async function updateOwnCategory(
  establishmentId: string,
  categoryId: string,
  data: Prisma.CategoryUpdateManyMutationInput,
): Promise<boolean> {
  const { count } = await db.category.updateMany({
    where: { id: categoryId, establishmentId },
    data,
  });
  return count > 0;
}

type CategoryTarget = {
  id: string;
  nameAr: string;
  type: DirectionValue;
  active: boolean;
};

async function findOwnCategory(
  establishmentId: string,
  categoryId: string,
): Promise<CategoryTarget | null> {
  return db.category.findFirst({
    where: { id: categoryId, establishmentId },
    select: { id: true, nameAr: true, type: true, active: true },
  });
}

/**
 * Two *active* categories of the same direction may not share a name. Retired
 * ones are ignored on purpose: an owner who deactivated "إيجار" last year must
 * be able to add it again, which a database unique constraint would forbid — so
 * this check is application-level, and a double submit can still race it.
 */
async function nameTaken(
  establishmentId: string,
  type: DirectionValue,
  nameAr: string,
  exceptId?: string,
): Promise<boolean> {
  const clash = await db.category.findFirst({
    where: {
      establishmentId,
      type,
      nameAr,
      active: true,
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    select: { id: true },
  });
  return clash !== null;
}

export async function createCategory(
  _prev: SettingsState,
  formData: FormData,
): Promise<ActionResult<null>> {
  const { user: owner, establishmentId } = await requireOwner();
  const parsed = CategoryInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  const { nameAr, type } = parsed.data;
  if (await nameTaken(establishmentId, type, nameAr)) {
    return { ok: false, error: "err.categoryDuplicate" };
  }

  // This name may already be here, retired. Bring that row back instead of
  // inserting a second one: two categories reading "إيجار" in the same list is
  // not what the owner asked for, and the old entries stay attached to theirs.
  const retired = await db.category.findFirst({
    where: { establishmentId, type, nameAr, active: false },
    select: { id: true },
  });
  if (retired) {
    const revived = await updateOwnCategory(establishmentId, retired.id, {
      active: true,
    });
    if (!revived) return { ok: false, error: "err.notFound" };
    await writeAudit({
      establishmentId,
      userId: owner.id,
      action: "CATEGORY_UPDATE",
      entity: "Category",
      entityId: retired.id,
      before: { active: false },
      after: { active: true },
    });
    revalidatePath(SETTINGS_PATH);
    return { ok: true, data: null };
  }

  const last = await db.category.findFirst({
    where: { establishmentId, type },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const created = await db.category.create({
    data: {
      establishmentId,
      nameAr,
      type,
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
    select: { id: true },
  });
  await writeAudit({
    establishmentId,
    userId: owner.id,
    action: "CATEGORY_CREATE",
    entity: "Category",
    entityId: created.id,
    after: { nameAr, type },
  });

  revalidatePath(SETTINGS_PATH);
  return { ok: true, data: null };
}

/**
 * Renames a category. The direction is structural — entries already point at
 * this category and carry the same direction — so a different `type` is refused
 * rather than silently rewriting history.
 */
export async function updateCategory(
  categoryId: string,
  _prev: SettingsState,
  formData: FormData,
): Promise<ActionResult<null>> {
  const { user: owner, establishmentId } = await requireOwner();
  const parsedId = idSchema.safeParse(categoryId);
  if (!parsedId.success) return invalid(parsedId.error);
  const parsed = CategoryInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  const current = await findOwnCategory(establishmentId, parsedId.data);
  if (!current) return { ok: false, error: "err.notFound" };
  if (parsed.data.type !== current.type) {
    return { ok: false, error: "err.categoryDirectionMismatch" };
  }
  if (
    await nameTaken(establishmentId, current.type, parsed.data.nameAr, current.id)
  ) {
    return { ok: false, error: "err.categoryDuplicate" };
  }

  const renamed = await updateOwnCategory(establishmentId, current.id, {
    nameAr: parsed.data.nameAr,
  });
  if (!renamed) return { ok: false, error: "err.notFound" };
  await writeAudit({
    establishmentId,
    userId: owner.id,
    action: "CATEGORY_UPDATE",
    entity: "Category",
    entityId: current.id,
    before: { nameAr: current.nameAr },
    after: { nameAr: parsed.data.nameAr },
  });

  revalidatePath(SETTINGS_PATH);
  return { ok: true, data: null };
}

/** Deactivating is how a category retires; at least one per direction stays. */
export async function setCategoryActive(
  categoryId: string,
  active: boolean,
): Promise<ActionResult<null>> {
  const { user: owner, establishmentId } = await requireOwner();
  const parsed = activeSchema.safeParse({ categoryId, active });
  if (!parsed.success) return invalid(parsed.error);

  const current = await findOwnCategory(establishmentId, parsed.data.categoryId);
  if (!current) return { ok: false, error: "err.notFound" };

  if (!parsed.data.active) {
    const othersActive = await db.category.count({
      where: {
        establishmentId,
        type: current.type,
        active: true,
        id: { not: current.id },
      },
    });
    if (othersActive === 0) {
      return { ok: false, error: "err.lastActiveCategory" };
    }
  } else if (
    // Because the duplicate rule only looks at active rows, bringing one back
    // can collide with a name that has been reused in the meantime.
    await nameTaken(establishmentId, current.type, current.nameAr, current.id)
  ) {
    return { ok: false, error: "err.categoryDuplicate" };
  }

  const switched = await updateOwnCategory(establishmentId, current.id, {
    active: parsed.data.active,
  });
  if (!switched) return { ok: false, error: "err.notFound" };
  await writeAudit({
    establishmentId,
    userId: owner.id,
    action: "CATEGORY_UPDATE",
    entity: "Category",
    entityId: current.id,
    before: { active: current.active },
    after: { active: parsed.data.active },
  });

  revalidatePath(SETTINGS_PATH);
  return { ok: true, data: null };
}

/**
 * Moves a category one place up or down within its own direction (task B8).
 *
 * Only **active** categories take part: the settings list shows retired ones too,
 * but their position is meaningless, and letting them occupy a slot would make
 * the arrows skip visibly. Reaching the end is a no-op success rather than an
 * error — the button is simply already at the edge of the list.
 */
export async function setCategoryOrder(
  categoryId: string,
  direction: "UP" | "DOWN",
): Promise<ActionResult<null>> {
  const { user: owner, establishmentId } = await requireOwner();
  const parsed = orderSchema.safeParse({ categoryId, direction });
  if (!parsed.success) return invalid(parsed.error);

  const current = await db.category.findFirst({
    where: { id: parsed.data.categoryId, establishmentId, active: true },
    select: { id: true, type: true, sortOrder: true },
  });
  if (!current) return { ok: false, error: "err.notFound" };

  const up = parsed.data.direction === "UP";
  const neighbour = await db.category.findFirst({
    where: {
      establishmentId,
      type: current.type,
      active: true,
      sortOrder: up ? { lt: current.sortOrder } : { gt: current.sortOrder },
    },
    orderBy: { sortOrder: up ? "desc" : "asc" },
    select: { id: true, sortOrder: true },
  });
  if (!neighbour) return { ok: true, data: null };

  await db.$transaction(async (tx) => {
    await tx.category.updateMany({
      where: { establishmentId, id: current.id },
      data: { sortOrder: neighbour.sortOrder },
    });
    await tx.category.updateMany({
      where: { establishmentId, id: neighbour.id },
      data: { sortOrder: current.sortOrder },
    });
    await writeAudit({
      establishmentId,
      userId: owner.id,
      action: "CATEGORY_UPDATE",
      entity: "Category",
      entityId: current.id,
      before: { sortOrder: current.sortOrder },
      after: { sortOrder: neighbour.sortOrder, swappedWith: neighbour.id },
      client: tx,
    });
  });

  revalidatePath(SETTINGS_PATH);
  return { ok: true, data: null };
}
