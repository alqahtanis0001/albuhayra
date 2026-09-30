import "server-only";

import type { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { SALARY_CATEGORY_NAME, salaryLinkedPlanWhere, salaryLinkedWhere } from "@/lib/payroll";

/**
 * Salary privacy for STAFF (spec §3.5; docs/V12B-DESIGN.md D13 as amended by
 * Y3 and the lead's ruling 2). Every staff-facing read adds these clauses
 * beside its own filters — `AND`, never spread (the ledger search already
 * carries an `OR`).
 */

/**
 * S-L3a: the establishment's salary categories — every `Employee.salaryCategoryId`,
 * every SALARY plan's category, and every category named «رواتب». Built from
 * ids already in use, so renaming «رواتب» never takes a category out of the
 * set. Also what the staff entry form needs for the Y4 note.
 */
export async function salaryCategoryIds(establishmentId: string): Promise<string[]> {
  const employees = await db.employee.findMany({
    where: { establishmentId, salaryCategoryId: { not: null } },
    select: { salaryCategoryId: true },
  });
  const plans = await db.plan.findMany({
    where: { establishmentId, kind: "SALARY" },
    select: { categoryId: true },
  });
  const named = await db.category.findMany({
    where: { establishmentId, nameAr: SALARY_CATEGORY_NAME },
    select: { id: true },
  });
  const ids = [
    ...employees.map((e) => e.salaryCategoryId),
    ...plans.map((p) => p.categoryId),
    ...named.map((c) => c.id),
  ].filter((id): id is string => id !== null);
  return [...new Set(ids)].sort();
}

/** The transaction clause: nothing salary-linked (Y3). */
export async function staffSalaryFilter(establishmentId: string): Promise<Prisma.TransactionWhereInput> {
  return { NOT: salaryLinkedWhere(await salaryCategoryIds(establishmentId)) };
}

/** The plan clause for staff dues and prefill: no salary agreement (ruling 2). */
export async function staffPlanFilter(establishmentId: string): Promise<Prisma.PlanWhereInput> {
  return { NOT: salaryLinkedPlanWhere(await salaryCategoryIds(establishmentId)) };
}

/** True when a STAFF payment on this plan must be refused like a missing id (N2). */
export async function isStaffHiddenPlan(establishmentId: string, planId: string): Promise<boolean> {
  const ids = await salaryCategoryIds(establishmentId);
  const hidden = await db.plan.count({
    where: { establishmentId, id: planId, ...salaryLinkedPlanWhere(ids) },
  });
  return hidden > 0;
}

/** `where` plus the staff clause when `hide` is set; unchanged otherwise. */
export async function withSalaryHidden(
  establishmentId: string,
  where: Prisma.TransactionWhereInput,
  hide: boolean | undefined,
): Promise<Prisma.TransactionWhereInput> {
  if (!hide) return where;
  const existing = where.AND === undefined ? [] : Array.isArray(where.AND) ? where.AND : [where.AND];
  return { ...where, AND: [...existing, await staffSalaryFilter(establishmentId)] };
}
