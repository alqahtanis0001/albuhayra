"use server";

/**
 * What the platform administrator does to owners and their establishments.
 *
 * Every target is looked up by id **and** `role: "OWNER"`, so an admin action
 * can never land on a STAFF account or on the admin themselves. ADMIN has
 * `establishmentId: null`, so unlike every other actions file these queries are
 * deliberately not establishment-scoped — that is the job.
 *
 * Writes use `updateMany` per Security rule 2b, even here where there is no
 * tenant to scope by: a 0-row result then means "no such owner" rather than a
 * throw, and the shape stays the same as everywhere else in the codebase.
 *
 * **These are the one place in the app where an id legitimately comes from the
 * client.** `setEstablishmentActive(id, …)` and `resetOwnerPassword(userId, …)`
 * take the target as a parameter because an admin acts across establishments and
 * has none of their own. Three things stand in for the session scope, and all
 * three are load-bearing: zod on the id, a `findUnique`/`findFirst` confirming
 * the row exists *before* the write, and `requireAdmin()` as the sole
 * authorisation. Do not add an invented establishment scope here, and do not drop
 * the existence check — without it this is exactly the shape the B3 gate rejects.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { writeAudit } from "@/lib/audit";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { commonPasswordError } from "@/lib/passwords/server";
import {
  SetPasswordSchema,
  invalid,
  type ActionResult,
  type DirectionValue,
} from "@/lib/validation";

export type AdminState = ActionResult<null> | null;

const ADMIN_PATHS = ["/admin", "/admin/establishments"];

const idSchema = z.string().trim().min(1, "err.required").max(64, "err.tooLong");

const flagSchema = z.object({
  establishmentId: idSchema,
  value: z.boolean({ error: "err.invalidInput" }),
});

/**
 * The starter set every new establishment gets, from docs/BACKEND.md. Created on
 * approval rather than in the seed, because they belong to an establishment and
 * no establishment exists until an owner signs up.
 */
const DEFAULT_CATEGORIES: ReadonlyArray<{ nameAr: string; type: DirectionValue }> = [
  { nameAr: "مبيعات", type: "IN" },
  { nameAr: "دفعة من عميل", type: "IN" },
  { nameAr: "رصيد افتتاحي / رأس مال", type: "IN" },
  { nameAr: "أخرى", type: "IN" },
  { nameAr: "إيجار", type: "OUT" },
  { nameAr: "رواتب", type: "OUT" },
  { nameAr: "مشتريات", type: "OUT" },
  { nameAr: "كهرباء وماء", type: "OUT" },
  { nameAr: "اتصالات", type: "OUT" },
  { nameAr: "صيانة", type: "OUT" },
  { nameAr: "مواصلات", type: "OUT" },
  { nameAr: "رسوم حكومية", type: "OUT" },
  { nameAr: "أخرى", type: "OUT" },
];

function revalidateAdmin(): void {
  for (const path of ADMIN_PATHS) revalidatePath(path);
}

type OwnerTarget = {
  id: string;
  emailVerifiedAt: Date | null;
  status: "PENDING" | "ACTIVE" | "DISABLED";
  establishmentId: string | null;
};

/** An OWNER, by id. Never a STAFF row and never the admin's own account. */
async function findOwner(userId: string): Promise<OwnerTarget | null> {
  return db.user.findFirst({
    where: { id: userId, role: "OWNER" },
    select: { id: true, emailVerifiedAt: true, status: true, establishmentId: true },
  });
}

export async function approveOwner(userId: string): Promise<ActionResult<null>> {
  const { user: admin } = await requireAdmin();
  const parsed = idSchema.safeParse(userId);
  if (!parsed.success) return invalid(parsed.error);

  const owner = await findOwner(parsed.data);
  if (!owner || !owner.establishmentId) return { ok: false, error: "err.notFound" };
  if (owner.status !== "PENDING") return { ok: false, error: "err.forbidden" };
  // v1.1e: an address nobody has proved may not become an account.
  if (!owner.emailVerifiedAt) return { ok: false, error: "err.emailNotVerified" };
  const establishmentId = owner.establishmentId;

  await db.$transaction(async (tx) => {
    await tx.user.updateMany({
      where: { id: owner.id, role: "OWNER" },
      data: { status: "ACTIVE" },
    });
    // A rejected owner who is later approved needs their establishment switched
    // back on, so this is set rather than assumed.
    await tx.establishment.updateMany({
      where: { id: establishmentId },
      data: { active: true },
    });

    // Only if the establishment has none: approving twice must not double them,
    // and an owner rejected then approved keeps the categories they already use.
    const existing = await tx.category.count({ where: { establishmentId } });
    if (existing === 0) {
      await tx.category.createMany({
        data: DEFAULT_CATEGORIES.map((category, index) => ({
          establishmentId,
          nameAr: category.nameAr,
          type: category.type,
          sortOrder: index + 1,
        })),
      });
    }

    await writeAudit({
      establishmentId,
      userId: admin.id,
      action: "APPROVE_OWNER",
      entity: "User",
      entityId: owner.id,
      before: { status: owner.status },
      after: { status: "ACTIVE", defaultCategories: existing === 0 },
      client: tx,
    });
  });

  revalidateAdmin();
  return { ok: true, data: null };
}

export async function rejectOwner(userId: string): Promise<ActionResult<null>> {
  const { user: admin } = await requireAdmin();
  const parsed = idSchema.safeParse(userId);
  if (!parsed.success) return invalid(parsed.error);

  const owner = await findOwner(parsed.data);
  if (!owner || !owner.establishmentId) return { ok: false, error: "err.notFound" };
  if (owner.status !== "PENDING") return { ok: false, error: "err.forbidden" };
  const establishmentId = owner.establishmentId;

  await db.$transaction(async (tx) => {
    await tx.user.updateMany({
      where: { id: owner.id, role: "OWNER" },
      data: { status: "DISABLED" },
    });
    await tx.establishment.updateMany({
      where: { id: establishmentId },
      data: { active: false },
    });
    await writeAudit({
      establishmentId,
      userId: admin.id,
      action: "REJECT_OWNER",
      entity: "User",
      entityId: owner.id,
      before: { status: owner.status },
      after: { status: "DISABLED", establishmentActive: false },
      client: tx,
    });
  });

  revalidateAdmin();
  return { ok: true, data: null };
}

/**
 * Switching an establishment off locks out its owner and all of its staff. No
 * enforcement is needed here: `requireUser()` re-reads `establishment.active` on
 * every request, so existing sessions stop working at their next page load.
 */
export async function setEstablishmentActive(
  establishmentId: string,
  active: boolean,
): Promise<ActionResult<null>> {
  const { user: admin } = await requireAdmin();
  const parsed = flagSchema.safeParse({ establishmentId, value: active });
  if (!parsed.success) return invalid(parsed.error);

  const establishment = await db.establishment.findUnique({
    where: { id: parsed.data.establishmentId },
    select: { id: true, active: true },
  });
  if (!establishment) return { ok: false, error: "err.notFound" };

  await db.$transaction(async (tx) => {
    await tx.establishment.updateMany({
      where: { id: establishment.id },
      data: { active: parsed.data.value },
    });
    await writeAudit({
      establishmentId: establishment.id,
      userId: admin.id,
      action: parsed.data.value
        ? "ENABLE_ESTABLISHMENT"
        : "DISABLE_ESTABLISHMENT",
      entity: "Establishment",
      entityId: establishment.id,
      before: { active: establishment.active },
      after: { active: parsed.data.value },
      client: tx,
    });
  });

  revalidateAdmin();
  return { ok: true, data: null };
}

/** Form-backed with a bound id, like `resetStaffPassword`. */
export async function resetOwnerPassword(
  userId: string,
  _prev: AdminState,
  formData: FormData,
): Promise<ActionResult<null>> {
  const { user: admin } = await requireAdmin();
  const parsed = SetPasswordSchema.safeParse({
    userId,
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) return invalid(parsed.error);
  const common = commonPasswordError(parsed.data.newPassword);
  if (common) return { ok: false, error: "err.invalidInput", fieldErrors: { newPassword: common } };

  const owner = await findOwner(parsed.data.userId);
  if (!owner) return { ok: false, error: "err.notFound" };

  await db.user.updateMany({
    where: { id: owner.id, role: "OWNER" },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });
  // The hash never reaches the audit payload.
  await writeAudit({
    establishmentId: owner.establishmentId,
    userId: admin.id,
    action: "RESET_PASSWORD",
    entity: "User",
    entityId: owner.id,
  });

  revalidateAdmin();
  return { ok: true, data: null };
}
