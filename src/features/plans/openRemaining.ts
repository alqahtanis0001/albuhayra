import "server-only";

import { db } from "@/lib/db";

import { receivedByPlan } from "./openQueries";

/**
 * v1.4 (D10 user's addition, D17 c6, D21 M4) — the ONE computation of a
 * party's open-agreement remainder: Σ max(0, total − received) over its OPEN
 * `OPEN_ENDED` plans **with a ceiling**; `received` = non-deleted payments.
 * `null` when the party has no such plan (the UI hides the line). Outside
 * every balance (D10). Called by `listParties` / `getParty` (rows) and by
 * `getPartyStatement` — never computed a second way (M4; a PGlite case pins
 * that all three agree). Server-only and in the scoping gate's static sweep.
 */
export async function openPlansRemainingByParty(
  establishmentId: string,
  partyIds: string[],
): Promise<Map<string, number | null>> {
  const out = new Map<string, number | null>(partyIds.map((id) => [id, null]));
  if (partyIds.length === 0) return out;
  const plans = await db.plan.findMany({
    where: { establishmentId, partyId: { in: partyIds }, kind: "OPEN_ENDED", state: "OPEN", totalHalalas: { not: null } },
    select: { id: true, partyId: true, totalHalalas: true },
  });
  if (plans.length === 0) return out;
  const received = await receivedByPlan(establishmentId, plans.map((p) => p.id));
  for (const plan of plans) {
    const remaining = Math.max(0, ceilingOf(plan) - (received.get(plan.id) ?? 0));
    out.set(plan.partyId, (out.get(plan.partyId) ?? 0) + remaining);
  }
  return out;
}

/** The read above filters `totalHalalas: { not: null }`; a null here is corruption — fail loud, never `?? 0` (D6, R2-3). */
function ceilingOf(plan: { id: string; totalHalalas: number | null }): number {
  if (plan.totalHalalas === null) throw new Error(`plan ${plan.id}: ceilinged read returned a null total`);
  return plan.totalHalalas;
}

/** The same rule for one party. */
export async function openPlansRemaining(establishmentId: string, partyId: string): Promise<number | null> {
  return (await openPlansRemainingByParty(establishmentId, [partyId])).get(partyId) ?? null;
}
