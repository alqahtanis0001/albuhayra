import "server-only";

import { dateToISO } from "@/lib/dates";
import { db } from "@/lib/db";
import type { DirectionValue } from "@/lib/validation";

/**
 * The per-entry checks and shapes of the ledger mutations — category, v1.2a
 * links, the audit snapshot — split out of actions.ts so checkpoint 2's
 * payment path has room. Not a "use server" module: nothing here
 * is callable from a client, and every lookup is scoped by the caller's
 * `establishmentId` (it is in the scoping gate's static sweep).
 */

export type LinkProblem = { field: string; key: string };

/** v1.2b D13/Y3: a STAFF edit reads the entry through the staff salary filter (→ err.notFound). */
export { withSalaryHidden } from "@/features/payroll/privacy";

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

export type CategoryProblem = "err.categoryInvalid" | "err.categoryDirectionMismatch";

/**
 * The category must exist in this establishment and match the direction.
 *
 * It must also be active — **unless** it is the one the entry already carries.
 * An owner who retires a category does not thereby freeze every old entry that
 * used it: without this, fixing a typo in the note of a two-year-old expense
 * would be impossible without also re-categorising it, which rewrites history to
 * satisfy a validation rule. `keptCategoryId` is the existing row's category,
 * read from the database, never from the form.
 */
export async function checkCategory(
  establishmentId: string,
  categoryId: string,
  direction: DirectionValue,
  keptCategoryId?: string,
): Promise<CategoryProblem | null> {
  const category = await db.category.findFirst({
    where: { establishmentId, id: categoryId },
    select: { type: true, active: true },
  });

  if (!category) return "err.categoryInvalid";
  if (category.type !== direction) return "err.categoryDirectionMismatch";
  if (!category.active && categoryId !== keptCategoryId) {
    return "err.categoryInvalid";
  }
  return null;
}

export type Snapshot = {
  date: string;
  direction: DirectionValue;
  amountHalalas: number;
  categoryId: string;
  paymentMethod: string;
  partyId: string | null;
  projectId: string | null;
  instalmentId: string | null;
};

export function snapshot(row: {
  date: Date;
  direction: DirectionValue;
  amountHalalas: number;
  categoryId: string;
  paymentMethod: string;
  partyId?: string | null;
  projectId?: string | null;
  instalmentId?: string | null;
}): Snapshot {
  return {
    date: dateToISO(row.date),
    direction: row.direction,
    amountHalalas: row.amountHalalas,
    categoryId: row.categoryId,
    paymentMethod: row.paymentMethod,
    partyId: row.partyId ?? null,
    projectId: row.projectId ?? null,
    instalmentId: row.instalmentId ?? null,
  };
}

export const EXISTING_SELECT = {
  id: true,
  date: true,
  direction: true,
  amountHalalas: true,
  categoryId: true,
  paymentMethod: true,
  partyId: true,
  projectId: true,
  instalmentId: true,
} as const;
