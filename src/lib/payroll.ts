/**
 * v1.2b salary helpers — pure, client-safe, no DB, no clock (docs/V12B-DESIGN.md
 * D2–D4, D13, Y1, Y3). "Today" is always `todayISO()` passed in by the caller.
 * Months are "YYYY-MM" strings; dates are ISO "YYYY-MM-DD" with UTC arithmetic.
 */
import type { Prisma } from "@/generated/prisma";
import { t } from "@/i18n/ar";

/**
 * The category every salary is recorded under (spec §3.2, X4). A data value —
 * the same literal the default categories are created with in
 * `features/admin/actions.ts` — not UI copy.
 */
export const SALARY_CATEGORY_NAME = "رواتب";

/** "2026-09-30" → "2026-09". */
export function ymOf(iso: string): string {
  return iso.slice(0, 7);
}

/** "2026-12" + 1 → "2027-01"; negative `n` goes back. */
export function addMonthsYm(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y!, m! - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** D3: the month's pay date — `payDay` clamped to the month's last day. */
export function payDateFor(ym: string, payDay: number): string {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(Date.UTC(y!, m!, 0)).getUTCDate();
  return `${ym}-${String(Math.min(payDay, last)).padStart(2, "0")}`;
}

/**
 * N10: an instalment's `seq` on a SALARY plan is derived from its month, never
 * from its position, so a pay-day change or a gap never renumbers a month and
 * `(dueDate, seq)` stays in calendar order. Screens show the month, not this.
 */
export function salarySeq(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  return y! * 12 + (m! - 1);
}

/** D4: basic + every allowance. */
export function grossOf(
  basicHalalas: number,
  allowances: ReadonlyArray<{ amountHalalas: number }>,
): number {
  return allowances.reduce((sum, a) => sum + a.amountHalalas, basicHalalas);
}

export type SalaryMonth = { periodYm: string; dueDate: string; seq: number };

/**
 * D2 + Y1: the months to create now. Generation runs through the end of next
 * month (relative to today); a month qualifies only when its pay date lies in
 * [startDate, endDate] and the employee has no salary period for it yet
 * (`existing` = the employee's periods across all its plans). `startDate` is
 * the plan's, which the actions set to max(hire date, today) — so nothing is
 * ever generated in the past. Oldest first.
 */
export function salaryMonthsToGenerate(args: {
  startDate: string;
  endDate: string | null;
  payDay: number;
  todayISO: string;
  existing: Iterable<string>;
}): SalaryMonth[] {
  const existing = new Set(args.existing);
  const last = addMonthsYm(ymOf(args.todayISO), 1);
  const out: SalaryMonth[] = [];
  for (let ym = ymOf(args.startDate); ym <= last; ym = addMonthsYm(ym, 1)) {
    const dueDate = payDateFor(ym, args.payDay);
    if (dueDate < args.startDate) continue;
    if (args.endDate !== null && dueDate > args.endDate) break;
    if (existing.has(ym)) continue;
    out.push({ periodYm: ym, dueDate, seq: salarySeq(ym) });
  }
  return out;
}

/**
 * Spec §3.5 at plan level (lead's ruling 2 on D13/Y3): the agreements staff
 * never see — a SALARY plan, or a plan with an EMPLOYEE party whose category is
 * «رواتب» by name or one of the establishment's salary categories. Used by the
 * staff dues card, the staff payment prefill and the STAFF payment refusal,
 * and as branch 1 of `salaryLinkedWhere`.
 */
export function salaryLinkedPlanWhere(salaryCategoryIds: readonly string[]): Prisma.PlanWhereInput {
  return {
    OR: [
      { kind: "SALARY" },
      {
        party: { type: "EMPLOYEE" },
        OR: [{ category: { nameAr: SALARY_CATEGORY_NAME } }, { categoryId: { in: [...salaryCategoryIds] } }],
      },
    ],
  };
}

/**
 * D13 as amended by Y3 — the transactions staff never see (spec §3.5): a
 * payment of an instalment of a plan `salaryLinkedPlanWhere` hides, or an
 * entry with an EMPLOYEE party whose category is «رواتب» by name or one of the
 * establishment's salary categories (`salaryCategoryIds` — see
 * `payroll/privacy.ts`, so a renamed category is still caught).
 *
 * Use only negated, beside the caller's other filters:
 * `AND: [{ NOT: salaryLinkedWhere(ids) }]` — never spread into a `where` that
 * may already carry an `OR` (the ledger's search). Each branch first requires
 * its foreign key to be non-null, so the negation is TRUE for an unlinked row
 * whatever SQL a negated relation filter renders to. Prisma 7 already gets
 * this right without the guards (checked on PGlite by removing them); the
 * guards keep it independent of that, and `payroll/privacy.test.ts` pins
 * "unlinked rows stay visible" on real SQL either way.
 */
export function salaryLinkedWhere(
  salaryCategoryIds: readonly string[],
): Prisma.TransactionWhereInput {
  return {
    OR: [
      { instalmentId: { not: null }, instalment: { plan: salaryLinkedPlanWhere(salaryCategoryIds) } },
      {
        partyId: { not: null },
        party: { type: "EMPLOYEE" },
        OR: [
          { category: { nameAr: SALARY_CATEGORY_NAME } },
          { categoryId: { in: [...salaryCategoryIds] } },
        ],
      },
    ],
  };
}

/**
 * X13: a SALARY plan's title is derived from its party's current name at read
 * time, so a rename follows; the stored title is only a snapshot.
 */
export function planTitleOf(plan: { kind: "STANDARD" | "SALARY"; title: string }, partyName: string): string {
  return plan.kind === "SALARY" ? t.employees.salaryPlanTitle.replace("{name}", partyName) : plan.title;
}
