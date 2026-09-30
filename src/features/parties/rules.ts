import "server-only";

import { db } from "@/lib/db";
import type { PartyInput } from "@/lib/validation";

/**
 * The lookups and shapes of the party actions, split out of actions.ts for
 * size (not a "use server" module: nothing here is callable from a client).
 * Every lookup is scoped by the caller's establishment; in the scoping gate's
 * static sweep.
 */

/**
 * v1.2b D14: the employee profile that manages this party, if any — the party
 * pages refuse to retype, deactivate or delete it (`err.partyIsEmployee`).
 */
export async function employeeIdOfParty(establishmentId: string, partyId: string): Promise<string | null> {
  const row = await db.employee.findFirst({ where: { establishmentId, partyId }, select: { id: true } });
  return row?.id ?? null;
}

/** The P2003 a `Restrict` foreign key raises when a row still points here (V2). */
export function isForeignKeyViolation(error: unknown): boolean {
  return (error as { code?: unknown } | null)?.code === "P2003";
}

const SNAPSHOT_SELECT = {
  id: true,
  name: true,
  type: true,
  phone: true,
  email: true,
  notes: true,
  active: true,
} as const;

export async function findOwnParty(establishmentId: string, partyId: string) {
  return db.party.findFirst({
    where: { establishmentId, id: partyId },
    select: SNAPSHOT_SELECT,
  });
}

/**
 * Another *active* party already carries this name (case-insensitive). An
 * inactive namesake is not a clash and is never reactivated in its place — a
 * party carries contact data, so two rows are two contacts.
 */
export async function nameTaken(
  establishmentId: string,
  name: string,
  exceptId?: string,
): Promise<boolean> {
  const clash = await db.party.findFirst({
    where: {
      establishmentId,
      active: true,
      name: { equals: name, mode: "insensitive" },
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    select: { id: true },
  });
  return clash !== null;
}

/** Clearing an optional field writes null (V12). */
export function columns(input: PartyInput) {
  return {
    name: input.name,
    type: input.type,
    phone: input.phone ?? null,
    email: input.email ?? null,
    notes: input.notes ?? null,
  };
}
