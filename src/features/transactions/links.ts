import "server-only";

import { db } from "@/lib/db";

/**
 * The v1.2a link checks for the ledger mutations, split out of actions.ts so
 * checkpoint 2's payment path has room. Not a "use server" module: nothing here
 * is callable from a client, and every lookup is scoped by the caller's
 * `establishmentId` (it is in the scoping gate's static sweep).
 */

export type LinkProblem = { field: string; key: string };

/**
 * v1.2a links (docs/BACKEND.md → v1.2a → Transactions). Each id is resolved by
 * a scoped `findFirst`, so a foreign id and an unknown one get the same field
 * error (rule 11). Party and project follow the category rule: a retired party
 * or a closed إضافة may be **kept** by the entry that already carries it —
 * `kept` comes from the database row, never the form — but not newly assigned.
 * `instalmentId` is refused outright until checkpoint 2 implements payments.
 */
export async function checkLinks(
  establishmentId: string,
  input: { partyId?: string; projectId?: string; instalmentId?: string },
  kept: { partyId: string | null; projectId: string | null } = {
    partyId: null,
    projectId: null,
  },
): Promise<LinkProblem | null> {
  if (input.instalmentId) return { field: "instalmentId", key: "err.instalmentInvalid" };

  if (input.partyId) {
    const party = await db.party.findFirst({
      where: { establishmentId, id: input.partyId },
      select: { active: true },
    });
    if (!party || (!party.active && input.partyId !== kept.partyId)) {
      return { field: "partyId", key: "err.partyInvalid" };
    }
  }

  if (input.projectId) {
    const project = await db.project.findFirst({
      where: { establishmentId, id: input.projectId },
      select: { status: true },
    });
    if (!project) return { field: "projectId", key: "err.projectInvalid" };
    if (project.status !== "ACTIVE" && input.projectId !== kept.projectId) {
      return { field: "projectId", key: "err.projectClosed" };
    }
  }
  return null;
}

/** With a party chosen the party is the name, so free text is not stored (v1.2a). */
export function linkColumns(input: { partyId?: string; projectId?: string; counterparty?: string }) {
  return {
    partyId: input.partyId ?? null,
    projectId: input.projectId ?? null,
    counterparty: input.partyId ? null : (input.counterparty ?? null),
  };
}
