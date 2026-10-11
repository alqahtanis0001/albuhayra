/**
 * v1.4 (docs/V14-SPEC.md D6): the read boundary between the three plan kinds.
 * `Plan.totalHalalas` is `Int?` for every kind at the type level, but only an
 * OPEN_ENDED plan may lack a total. STANDARD / SALARY code narrows here and
 * **fails loud** on a null total or an open-ended row — that is corruption,
 * never a value to default (`?? 0` is forbidden by D6).
 *
 * Pure: no `server-only`, no db — usable from the statement, the payment path
 * and the plan queries alike. Checks are `=== null` / `=== "OPEN_ENDED"`, so a
 * SALARY plan whose total is 0 (a generated plan with no months yet) passes.
 */

export type ScheduledKind = "STANDARD" | "SALARY";
export type PlanKindValue = ScheduledKind | "OPEN_ENDED";

/** The total of a scheduled plan. Throws on null — a scheduled plan without a total is corruption. */
export function scheduledTotal(total: number | null, planId: string): number {
  if (total === null) throw new Error(`plan ${planId}: scheduled plan without a total`);
  return total;
}

/** The kind of a scheduled plan. Throws on OPEN_ENDED — such a row must never reach instalment code. */
export function scheduledKind(kind: PlanKindValue, planId: string): ScheduledKind {
  if (kind === "OPEN_ENDED") throw new Error(`plan ${planId}: open-ended plan in scheduled code`);
  return kind;
}

/** Both narrowings at once, for a row read with the shared plan select. */
export function asScheduled<T extends { id: string; kind: PlanKindValue; totalHalalas: number | null }>(
  plan: T,
): Omit<T, "kind" | "totalHalalas"> & { kind: ScheduledKind; totalHalalas: number } {
  return { ...plan, kind: scheduledKind(plan.kind, plan.id), totalHalalas: scheduledTotal(plan.totalHalalas, plan.id) };
}
