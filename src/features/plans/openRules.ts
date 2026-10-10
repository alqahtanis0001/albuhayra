import "server-only";

import { dateToISO, isoToDate } from "@/lib/dates";
import { db } from "@/lib/db";
import type { OpenPlanInput } from "@/lib/validation";

/**
 * v1.4 — the reads and checks behind `openActions.ts` (server-only, not
 * `"use server"`: these take an establishment id, and the callable actions
 * pass the one `requireOwner()` returned). In the scoping gate's static sweep.
 */

export const OPEN_PLAN_READ = {
  id: true, kind: true, state: true, revision: true, partyId: true, direction: true, categoryId: true,
  title: true, totalHalalas: true, startDate: true, expectedEndDate: true, notes: true,
} as const;

export type OpenPlanRead = {
  id: string;
  kind: "STANDARD" | "SALARY" | "OPEN_ENDED";
  state: "OPEN" | "ARCHIVED" | "CANCELLED";
  revision: number;
  partyId: string;
  direction: "IN" | "OUT";
  categoryId: string;
  title: string;
  totalHalalas: number | null;
  startDate: Date;
  expectedEndDate: Date | null;
  notes: string | null;
};

export async function readPlan(establishmentId: string, id: string): Promise<OpenPlanRead | null> {
  return db.plan.findFirst({ where: { establishmentId, id }, select: OPEN_PLAN_READ });
}

export type FieldRefusal = { ok: false; error: string; fieldErrors: Record<string, string> };

export const fieldError = (field: string, key: string): FieldRefusal => ({
  ok: false,
  error: key,
  fieldErrors: { [field]: key },
});

/**
 * Party and category must exist here; active unless kept (V5: the plan's own
 * party/category may stay when edited, never be newly assigned); the category
 * must match the direction. The same rule as scheduled plans.
 */
export async function checkOpenRefs(
  establishmentId: string,
  input: Pick<OpenPlanInput, "partyId" | "categoryId" | "direction">,
  kept: { partyId: string | null; categoryId: string | null },
): Promise<FieldRefusal | null> {
  const [party, category] = await Promise.all([
    db.party.findFirst({ where: { establishmentId, id: input.partyId }, select: { active: true } }),
    db.category.findFirst({ where: { establishmentId, id: input.categoryId }, select: { type: true, active: true } }),
  ]);
  if (!party || (!party.active && input.partyId !== kept.partyId)) return fieldError("partyId", "err.partyInvalid");
  if (!category || (!category.active && input.categoryId !== kept.categoryId)) {
    return fieldError("categoryId", "err.categoryInvalid");
  }
  if (category.type !== input.direction) return fieldError("categoryId", "err.categoryDirectionMismatch");
  return null;
}

/**
 * P7 / D5: "does any entry reference this plan" — soft-deleted included, as
 * fixed plans count fixed rows. A reference probe: no amount, no `deletedAt`.
 */
export async function isReferenced(establishmentId: string, planId: string): Promise<boolean> {
  return (await db.transaction.count({ where: { establishmentId, planId } })) > 0;
}

/** Σ of the plan's non-deleted payments — an amount read, so `deletedAt: null`. */
export async function receivedOf(establishmentId: string, planId: string): Promise<number> {
  const sum = await db.transaction.aggregate({
    where: { establishmentId, planId, deletedAt: null },
    _sum: { amountHalalas: true },
  });
  return Number(sum._sum.amountHalalas ?? 0);
}

/** The columns an open plan's form writes. `kind` and `employeeId` are never among them (P16). */
export function openColumns(input: OpenPlanInput) {
  return {
    partyId: input.partyId,
    direction: input.direction,
    title: input.title,
    totalHalalas: input.totalHalalas ?? null,
    categoryId: input.categoryId,
    startDate: isoToDate(input.startDate),
    expectedEndDate: input.expectedEndDate ? isoToDate(input.expectedEndDate) : null,
    notes: input.notes ?? null,
  };
}

/** The audit shape of the columns: ISO dates, no Date objects. */
export function openAuditOf(c: ReturnType<typeof openColumns>) {
  return {
    ...c,
    startDate: dateToISO(c.startDate),
    expectedEndDate: c.expectedEndDate ? dateToISO(c.expectedEndDate) : null,
  };
}
