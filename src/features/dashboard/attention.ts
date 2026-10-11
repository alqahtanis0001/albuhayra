/**
 * v1.5 (docs/V15-SPEC.md A2, D8, D34): the rows of «يحتاج انتباهك», in order,
 * each only when it has something to say. Pure and client-safe; the card
 * (`components/AttentionCard.tsx`) only renders what this returns.
 */
import type { Dues } from "@/features/plans/types";

import type { DialEvent } from "./wheel";

/** D8 (4): the salary row shows when the next unpaid salary is due within this many days. */
export const SALARY_WINDOW_DAYS = 10;

export type AttentionRow =
  | { key: "overdue"; href: "/owner/dues"; count: number; inHalalas: number; outHalalas: number }
  | { key: "week"; href: "/owner/dues"; inHalalas: number; outHalalas: number }
  | { key: "pending"; href: "/owner/staff/logins"; names: string[] }
  | { key: "salary"; href: "/owner/staff?pick=salary"; days: number };

type DueLike = { direction: "IN" | "OUT"; remainingHalalas: number };

function totals(rows: DueLike[]): { inHalalas: number; outHalalas: number } {
  const sum = (d: "IN" | "OUT") => rows.filter((r) => r.direction === d).reduce((s, r) => s + r.remainingHalalas, 0);
  return { inHalalas: sum("IN"), outHalalas: sum("OUT") };
}

/**
 * (1) overdue (every kind) → المستحقات; (2) this week's dues without the
 * salaries (D34) → المستحقات; (3) pending join requests → دخول الموظفين;
 * (4) the next unpaid salary due in [today, today + 10] → the salary pick.
 */
export function attentionRows({
  dues,
  pendingNames,
  dial,
}: {
  dues: Pick<Dues, "overdue" | "thisWeek">;
  pendingNames: string[];
  dial: DialEvent[];
}): AttentionRow[] {
  const rows: AttentionRow[] = [];
  if (dues.overdue.length > 0) {
    rows.push({ key: "overdue", href: "/owner/dues", count: dues.overdue.length, ...totals(dues.overdue) });
  }
  const week = dues.thisWeek.filter((r) => r.kind !== "SALARY");
  if (week.length > 0) rows.push({ key: "week", href: "/owner/dues", ...totals(week) });
  if (pendingNames.length > 0) rows.push({ key: "pending", href: "/owner/staff/logins", names: pendingNames });
  const salaryDays = dial
    .filter((e) => e.kind === "SALARY" && e.dayOffset >= 0 && e.dayOffset <= SALARY_WINDOW_DAYS)
    .map((e) => e.dayOffset);
  if (salaryDays.length > 0) {
    rows.push({ key: "salary", href: "/owner/staff?pick=salary", days: Math.min(...salaryDays) });
  }
  return rows;
}
