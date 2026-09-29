"use server";

/**
 * Closing and reopening a month. Only the OWNER, and only a month that has
 * already ended: locking the open month would block today's entries, and a
 * future month has nothing to close.
 *
 * Both actions are idempotent. The settings grid sends one click per cell, and
 * answering "already locked" with an error would make a double click look like a
 * failure when the state is exactly what the owner asked for.
 */
import { revalidatePath } from "next/cache";

import { writeAudit } from "@/lib/audit";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { LockInputSchema, invalid, type ActionResult } from "@/lib/validation";

import { isClosedMonth } from "./assertUnlocked";

/**
 * Settings is split into pages under one layout since v1.2a (V9), so the whole
 * segment is revalidated, not the old single page.
 */
function revalidateSettings(): void {
  revalidatePath("/owner/settings", "layout");
}

export async function lockMonth(
  year: number,
  month: number,
): Promise<ActionResult<null>> {
  const { user: owner, establishmentId } = await requireOwner();

  const parsed = LockInputSchema.safeParse({ year, month });
  if (!parsed.success) return invalid(parsed.error);
  const target = parsed.data;

  if (!isClosedMonth(target.year, target.month)) {
    return { ok: false, error: "err.cannotLockCurrentMonth" };
  }

  const existing = await db.periodLock.findFirst({
    where: { establishmentId, year: target.year, month: target.month },
    select: { id: true },
  });
  if (existing) return { ok: true, data: null };

  await db.$transaction(async (tx) => {
    const lock = await tx.periodLock.create({
      data: {
        establishmentId,
        year: target.year,
        month: target.month,
        lockedById: owner.id,
      },
      select: { id: true },
    });
    await writeAudit({
      establishmentId,
      userId: owner.id,
      action: "LOCK",
      entity: "PeriodLock",
      entityId: lock.id,
      after: { year: target.year, month: target.month },
      client: tx,
    });
  });

  revalidateSettings();
  return { ok: true, data: null };
}

export async function unlockMonth(
  year: number,
  month: number,
): Promise<ActionResult<null>> {
  const { user: owner, establishmentId } = await requireOwner();

  const parsed = LockInputSchema.safeParse({ year, month });
  if (!parsed.success) return invalid(parsed.error);
  const target = parsed.data;

  // The same window as locking: a month that could never be locked has no lock
  // to lift, and refusing here keeps the two sides of the grid symmetrical.
  if (!isClosedMonth(target.year, target.month)) {
    return { ok: false, error: "err.cannotLockCurrentMonth" };
  }

  const existing = await db.periodLock.findFirst({
    where: { establishmentId, year: target.year, month: target.month },
    select: { id: true },
  });
  if (!existing) return { ok: true, data: null };

  await db.$transaction(async (tx) => {
    await tx.periodLock.deleteMany({
      where: { establishmentId, year: target.year, month: target.month },
    });
    await writeAudit({
      establishmentId,
      userId: owner.id,
      action: "UNLOCK",
      entity: "PeriodLock",
      entityId: existing.id,
      before: { year: target.year, month: target.month },
      client: tx,
    });
  });

  revalidateSettings();
  return { ok: true, data: null };
}
