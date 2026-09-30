"use server";

/**
 * Settings › التذكيرات: the owner's daily digest switch and hour
 * (docs/V12C-DESIGN.md C1). The read is `getDigestSettings` in `settings.ts`.
 */
import { revalidatePath } from "next/cache";

import { writeAudit } from "@/lib/audit";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { DigestSettingsSchema, invalid, type ActionResult } from "@/lib/validation";

export type DigestSettingsState = ActionResult<null> | null;

export async function updateDigestSettings(
  _prev: DigestSettingsState,
  formData: FormData,
): Promise<ActionResult<null>> {
  const { user: owner, establishmentId } = await requireOwner();

  const parsed = DigestSettingsSchema.safeParse({
    digestEnabled: formData.get("digestEnabled") ?? undefined,
    digestHour: formData.get("digestHour") ?? undefined,
  });
  if (!parsed.success) return invalid(parsed.error);
  const { digestEnabled, digestHour } = parsed.data;

  const before = await db.establishment.findFirst({
    where: { id: establishmentId },
    select: { digestEnabled: true, digestHour: true },
  });
  if (!before) return { ok: false, error: "err.notFound" };

  const written = await db.$transaction(async (tx) => {
    // Rule 2b: the write carries its own boundary.
    const { count } = await tx.establishment.updateMany({
      where: { id: establishmentId },
      data: { digestEnabled, digestHour },
    });
    if (count !== 1) return false;
    await writeAudit({
      establishmentId,
      userId: owner.id,
      action: "DIGEST_SETTINGS",
      entity: "Establishment",
      entityId: establishmentId,
      before,
      after: { digestEnabled, digestHour },
      client: tx,
    });
    return true;
  });
  if (!written) return { ok: false, error: "err.notFound" };

  revalidatePath("/owner/settings", "layout");
  return { ok: true, data: null };
}
