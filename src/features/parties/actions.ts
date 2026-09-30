"use server";

/**
 * الجهات — mutations (docs/BACKEND.md → v1.2a → Parties). OWNER only: staff
 * pick existing parties on the entry form and never create them.
 *
 * Every write is scoped in the SQL — `create` carries `establishmentId` in
 * `data`, the rest are `updateMany`/`deleteMany` on `{ id, establishmentId }` —
 * so a forged id reaches 0 rows and answers `err.notFound` (rules 2b and 11).
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { writeAudit } from "@/lib/audit";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { PartyInputSchema, invalid, type ActionResult } from "@/lib/validation";

import { columns, employeeIdOfParty, findOwnParty, isForeignKeyViolation, nameTaken } from "./rules";

export type PartyState = ActionResult<{ id: string }> | ActionResult<null> | null;

const idSchema = z.string().trim().min(1, "err.required").max(64, "err.tooLong");
const activeSchema = z.boolean({ error: "err.invalidInput" });

/** Party names show on the ledger, the entry form and (CP2) the dues and plans. */
function revalidateParties(): void {
  revalidatePath("/owner/parties");
  revalidatePath("/owner", "layout");
  revalidatePath("/staff", "layout");
}

function fieldError(field: string, key: string) {
  return { ok: false as const, error: key, fieldErrors: { [field]: key } };
}

export async function createParty(
  _prev: PartyState,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const { user, establishmentId } = await requireOwner();
  const parsed = PartyInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  if (await nameTaken(establishmentId, parsed.data.name)) {
    return fieldError("name", "err.partyDuplicate");
  }

  const data = columns(parsed.data);
  const id = await db.$transaction(async (tx) => {
    const row = await tx.party.create({
      data: { establishmentId, ...data },
      select: { id: true },
    });
    await writeAudit({
      establishmentId,
      userId: user.id,
      action: "PARTY_CREATE",
      entity: "Party",
      entityId: row.id,
      after: { ...data, active: true },
      client: tx,
    });
    return row.id;
  });

  revalidateParties();
  return { ok: true, data: { id } };
}

export async function updateParty(
  partyId: string,
  _prev: PartyState,
  formData: FormData,
): Promise<ActionResult<null>> {
  const { user, establishmentId } = await requireOwner();
  const parsedId = idSchema.safeParse(partyId);
  if (!parsedId.success) return invalid(parsedId.error);
  const parsed = PartyInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  const existing = await findOwnParty(establishmentId, parsedId.data);
  if (!existing) return { ok: false, error: "err.notFound" };
  // D14: an employee's party is managed from the profile — no retyping here.
  if (parsed.data.type !== existing.type && (await employeeIdOfParty(establishmentId, existing.id))) {
    return fieldError("type", "err.partyIsEmployee");
  }

  // Only an active party can clash: an inactive one is checked on reactivation.
  if (existing.active && (await nameTaken(establishmentId, parsed.data.name, existing.id))) {
    return fieldError("name", "err.partyDuplicate");
  }

  const data = columns(parsed.data);
  const changed = await db.$transaction(async (tx) => {
    const { count } = await tx.party.updateMany({
      where: { establishmentId, id: existing.id },
      data,
    });
    if (count === 0) return 0;
    const { id: _id, ...before } = existing;
    await writeAudit({
      establishmentId,
      userId: user.id,
      action: "PARTY_UPDATE",
      entity: "Party",
      entityId: existing.id,
      before,
      after: { ...data, active: existing.active },
      client: tx,
    });
    return count;
  });
  if (changed === 0) return { ok: false, error: "err.notFound" };

  revalidateParties();
  return { ok: true, data: null };
}

export async function setPartyActive(
  partyId: string,
  active: boolean,
): Promise<ActionResult<null>> {
  const { user, establishmentId } = await requireOwner();
  const parsedId = idSchema.safeParse(partyId);
  if (!parsedId.success) return invalid(parsedId.error);
  const parsedActive = activeSchema.safeParse(active);
  if (!parsedActive.success) return invalid(parsedActive.error);

  const existing = await findOwnParty(establishmentId, parsedId.data);
  if (!existing) return { ok: false, error: "err.notFound" };
  if (!parsedActive.data && (await employeeIdOfParty(establishmentId, existing.id))) {
    return { ok: false, error: "err.partyIsEmployee" }; // D14
  }

  if (
    parsedActive.data &&
    !existing.active &&
    (await nameTaken(establishmentId, existing.name, existing.id))
  ) {
    return { ok: false, error: "err.partyDuplicate" };
  }

  const changed = await db.$transaction(async (tx) => {
    const { count } = await tx.party.updateMany({
      where: { establishmentId, id: existing.id },
      data: { active: parsedActive.data },
    });
    if (count === 0) return 0;
    await writeAudit({
      establishmentId,
      userId: user.id,
      action: "PARTY_ACTIVE",
      entity: "Party",
      entityId: existing.id,
      before: { active: existing.active },
      after: { active: parsedActive.data },
      client: tx,
    });
    return count;
  });
  if (changed === 0) return { ok: false, error: "err.notFound" };

  revalidateParties();
  return { ok: true, data: null };
}

/**
 * Refused once anything references the party — a transaction (soft-deleted
 * included: its foreign key still points here) or a plan. The check gives the
 * friendly answer; the `Restrict` foreign key is what holds under a race.
 */
export async function deleteParty(partyId: string): Promise<ActionResult<null>> {
  const { user, establishmentId } = await requireOwner();
  const parsedId = idSchema.safeParse(partyId);
  if (!parsedId.success) return invalid(parsedId.error);

  const existing = await findOwnParty(establishmentId, parsedId.data);
  if (!existing) return { ok: false, error: "err.notFound" };
  if (await employeeIdOfParty(establishmentId, existing.id)) return { ok: false, error: "err.partyIsEmployee" }; // D14

  const [transactions, plans] = await Promise.all([
    db.transaction.count({ where: { establishmentId, partyId: existing.id } }),
    db.plan.count({ where: { establishmentId, partyId: existing.id } }),
  ]);
  if (transactions > 0 || plans > 0) return { ok: false, error: "err.partyHasHistory" };

  let changed: number;
  try {
    changed = await db.$transaction(async (tx) => {
      const { count } = await tx.party.deleteMany({
        where: { establishmentId, id: existing.id },
      });
      if (count === 0) return 0;
      const { id: _id, ...before } = existing;
      await writeAudit({
        establishmentId,
        userId: user.id,
        action: "PARTY_DELETE",
        entity: "Party",
        entityId: existing.id,
        before,
        client: tx,
      });
      return count;
    });
  } catch (error) {
    if (isForeignKeyViolation(error)) return { ok: false, error: "err.partyHasHistory" };
    throw error;
  }
  if (changed === 0) return { ok: false, error: "err.notFound" };

  revalidateParties();
  return { ok: true, data: null };
}
