import "server-only";

import type { Prisma } from "@/generated/prisma";
import {
  archiveSalaryPlan,
  deleteUnfixedMonthsAfter,
  recomputePlanTotal,
  type SalaryTerms,
} from "@/features/payroll/core";
import { resnapshotFutureMonths } from "@/features/payroll/resnapshot";
import { syncSalaryPlan } from "@/features/payroll/generate";
import { reallocatePlan } from "@/features/plans/allocate";
import { writeAudit } from "@/lib/audit";
import { dateToISO, isoToDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { planTitleOf, SALARY_CATEGORY_NAME } from "@/lib/payroll";

/**
 * The salary-plan side of the employee actions (docs/V12B-DESIGN.md D1, D5,
 * D6, X4, Y1, Y10). Everything but `findOpenSalaryPlan` runs inside the
 * action's `$transaction`, after its revision bump when a plan already exists.
 */

type Tx = Prisma.TransactionClient;

export type OpenPlan = { id: string; revision: number; startDate: string };

const maxISO = (...dates: string[]) => dates.reduce((a, b) => (a > b ? a : b));

/** At most one OPEN SALARY plan per employee; read before the transaction (V4). */
export async function findOpenSalaryPlan(establishmentId: string, employeeId: string): Promise<OpenPlan | null> {
  const plan = await db.plan.findFirst({
    where: { establishmentId, employeeId, kind: "SALARY", state: "OPEN" },
    select: { id: true, revision: true, startDate: true },
    orderBy: { createdAt: "desc" },
  });
  return plan ? { id: plan.id, revision: plan.revision, startDate: dateToISO(plan.startDate) } : null;
}

/** Y10: an inactive salary category is reactivated, audited. */
async function activated(tx: Tx, establishmentId: string, userId: string, found: { id: string; active: boolean }) {
  if (found.active) return found.id;
  await tx.category.updateMany({ where: { establishmentId, id: found.id }, data: { active: true } });
  await writeAudit({
    establishmentId, userId, action: "CATEGORY_UPDATE", entity: "Category", entityId: found.id,
    before: { active: false }, after: { active: true }, client: tx,
  });
  return found.id;
}

/**
 * X4 + Y10 + S-L3a: the salary category. Ids already in use win over the
 * name, so an owner who renamed «رواتب» never gets a second one: this
 * employee's own, then the newest SALARY plan's, then any employee's; only
 * then the OUT category named «رواتب» (active first); none → created. An
 * inactive one is reactivated. Every change audited.
 */
async function resolveSalaryCategory(tx: Tx, establishmentId: string, userId: string, employeeId: string): Promise<string> {
  const own = await tx.employee.findFirst({ where: { establishmentId, id: employeeId }, select: { salaryCategoryId: true } });
  const plan = await tx.plan.findFirst({
    where: { establishmentId, kind: "SALARY" },
    select: { categoryId: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  const other = await tx.employee.findFirst({
    where: { establishmentId, salaryCategoryId: { not: null } },
    select: { salaryCategoryId: true },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
  });
  for (const id of [own?.salaryCategoryId, plan?.categoryId, other?.salaryCategoryId]) {
    if (!id) continue;
    const found = await tx.category.findFirst({ where: { establishmentId, id, type: "OUT" }, select: { id: true, active: true } });
    if (found) return activated(tx, establishmentId, userId, found);
  }
  const named = await tx.category.findFirst({
    where: { establishmentId, type: "OUT", nameAr: SALARY_CATEGORY_NAME },
    select: { id: true, active: true },
    orderBy: [{ active: "desc" }, { sortOrder: "asc" }],
  });
  if (named) return activated(tx, establishmentId, userId, named);
  const last = await tx.category.findFirst({
    where: { establishmentId, type: "OUT" },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const created = await tx.category.create({
    data: { establishmentId, nameAr: SALARY_CATEGORY_NAME, type: "OUT", sortOrder: (last?.sortOrder ?? 0) + 1 },
    select: { id: true },
  });
  await writeAudit({
    establishmentId, userId, action: "CATEGORY_CREATE", entity: "Category", entityId: created.id,
    after: { nameAr: SALARY_CATEGORY_NAME, type: "OUT" }, client: tx,
  });
  return created.id;
}

/**
 * D1 + Y1: a new «راتب شهري» plan starting max(hire date, today), then its
 * first months. The stored title is a snapshot; screens derive it from the
 * party's current name (X13).
 */
export async function startSalaryPlan(
  tx: Tx,
  establishmentId: string,
  userId: string,
  employee: { id: string; partyId: string; hireDate: string; name: string },
  terms: SalaryTerms,
  today: string,
): Promise<string> {
  const categoryId = await resolveSalaryCategory(tx, establishmentId, userId, employee.id);
  await tx.employee.updateMany({ where: { establishmentId, id: employee.id }, data: { salaryCategoryId: categoryId } });
  const startDate = maxISO(employee.hireDate, today);
  const plan = await tx.plan.create({
    data: {
      establishmentId,
      partyId: employee.partyId,
      direction: "OUT",
      title: planTitleOf({ kind: "SALARY", title: "" }, employee.name),
      totalHalalas: 0,
      categoryId,
      startDate: isoToDate(startDate),
      kind: "SALARY",
      employeeId: employee.id,
    },
    select: { id: true },
  });
  await writeAudit({
    establishmentId, userId, action: "PLAN_CREATE", entity: "Plan", entityId: plan.id,
    after: { kind: "SALARY", employeeId: employee.id, categoryId, startDate }, client: tx,
  });
  await syncSalaryPlan(tx, establishmentId, userId, { id: plan.id, startDate }, terms, today);
  return plan.id;
}

/**
 * D5/S4 on an existing OPEN plan, for an ACTIVE employee. `terms` null = the
 * salary was removed. `hadSalary` = the employee had one before this save.
 */
export async function applySalaryChange(
  tx: Tx,
  establishmentId: string,
  userId: string,
  plan: OpenPlan,
  change: { hadSalary: boolean; hireDate: string; terms: SalaryTerms | null },
  today: string,
): Promise<void> {
  const { terms } = change;
  if (terms === null) {
    // Removed: unpaid future months go (FK-safe predicate); archive when
    // nothing unpaid is left, else stay OPEN without further generation.
    const removed = await deleteUnfixedMonthsAfter(tx, establishmentId, plan.id, today);
    await recomputePlanTotal(tx, establishmentId, plan.id);
    await reallocatePlan(tx, establishmentId, plan.id, userId);
    if (removed.length > 0) {
      await writeAudit({
        establishmentId, userId, action: "SALARY_UPDATE", entity: "Plan", entityId: plan.id,
        before: { months: removed }, after: { months: [] }, client: tx,
      });
    }
    const unpaid = await tx.instalment.count({
      where: { establishmentId, planId: plan.id, paidHalalas: { lt: tx.instalment.fields.amountDueHalalas } },
    });
    if (unpaid === 0) await archiveSalaryPlan(tx, establishmentId, plan.id, userId, "SALARY_REMOVED");
    return;
  }

  // Y1: never earlier; a salary re-added after removal starts no earlier than today.
  const startDate = change.hadSalary
    ? maxISO(plan.startDate, change.hireDate)
    : maxISO(plan.startDate, change.hireDate, today);
  if (startDate !== plan.startDate) {
    await tx.plan.updateMany({ where: { establishmentId, id: plan.id }, data: { startDate: isoToDate(startDate) } });
  }
  if (change.hadSalary) {
    const diff = await resnapshotFutureMonths(tx, establishmentId, plan.id, terms, today);
    if (diff.after.length > 0) {
      await recomputePlanTotal(tx, establishmentId, plan.id);
      await reallocatePlan(tx, establishmentId, plan.id, userId);
      await writeAudit({
        establishmentId, userId, action: "SALARY_UPDATE", entity: "Plan", entityId: plan.id,
        before: { months: diff.before } as Prisma.InputJsonValue,
        after: { months: diff.after } as Prisma.InputJsonValue,
        client: tx,
      });
    }
  }
  await syncSalaryPlan(tx, establishmentId, userId, { id: plan.id, startDate }, terms, today);
}

/**
 * D6: delete the months after the end date that nothing fixes; a past end date
 * then archives the plan (write-off). A future one only bounds generation.
 */
export async function endSalaryPlan(
  tx: Tx,
  establishmentId: string,
  userId: string,
  planId: string,
  endDate: string,
  today: string,
): Promise<void> {
  const removed = await deleteUnfixedMonthsAfter(tx, establishmentId, planId, endDate);
  await recomputePlanTotal(tx, establishmentId, planId);
  await reallocatePlan(tx, establishmentId, planId, userId);
  if (removed.length > 0) {
    await writeAudit({
      establishmentId, userId, action: "SALARY_UPDATE", entity: "Plan", entityId: planId,
      before: { months: removed }, after: { months: [], endDate }, client: tx,
    });
  }
  if (endDate < today) await archiveSalaryPlan(tx, establishmentId, planId, userId, "EMPLOYMENT_ENDED");
}
