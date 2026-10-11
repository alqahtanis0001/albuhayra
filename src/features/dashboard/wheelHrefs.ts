/**
 * v1.5 (docs/V15-SPEC.md D4, D23): every navigation target of the overview
 * wheel. Pure and client-safe like `./wheel` (D25).
 */
import { categoryLedgerHref } from "./visuals";
import type { DialEvent } from "./wheel";

/** Where a salary or plan due opens: the employee page for a salary, else the plan. */
export function dueHref(e: Pick<DialEvent, "kind" | "employeeId" | "planId">): string {
  if (e.kind === "SALARY" && e.employeeId) return `/owner/staff/${e.employeeId}`;
  return `/owner/plans/${e.planId}`;
}

/** D23: several dues on one day — المستحقات within its 7-day window, else one plan, else the plan list. */
export function dayHref(events: DialEvent[], day: number): string {
  if (day <= 6) return "/owner/dues";
  const plans = new Set(events.map((e) => e.planId));
  return plans.size === 1 ? dueHref(events[0]!) : "/owner/plans";
}

/** The month's first and last day (`YYYY-MM-DD`) of an ISO date. */
export function monthBounds(today: string): { from: string; to: string } {
  const [y, m] = today.split("-").map(Number) as [number, number];
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, "0");
  return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(last).padStart(2, "0")}` };
}

/** D4: ring 1 → the ledger, one direction, this month. */
export function directionHref(direction: "IN" | "OUT", today: string): string {
  const { from, to } = monthBounds(today);
  return `/owner/transactions?${new URLSearchParams({ direction, from, to }).toString()}`;
}

/** D4: ring 2 → the ledger filtered to the category this month; «أخرى» → this month's OUT. */
export function categoryHref(key: string, today: string): string {
  const { from, to } = monthBounds(today);
  return key === "other" ? directionHref("OUT", today) : categoryLedgerHref(key, from, to);
}

export type CommitmentKey = "toUs" | "fromUs" | "salaries";

/** D4/D23: ring 3 → parties by type, or the staff list for salaries. */
export const COMMITMENT_HREF: Record<CommitmentKey, string> = {
  toUs: "/owner/parties?type=CUSTOMER",
  fromUs: "/owner/parties?type=SUPPLIER",
  salaries: "/owner/staff",
};
