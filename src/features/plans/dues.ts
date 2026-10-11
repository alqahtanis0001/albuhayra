import "server-only";

import type { Prisma } from "@/generated/prisma";
import { staffPlanFilter } from "@/features/payroll/privacy";
import { dateToISO, isoToDate, todayISO } from "@/lib/dates";
import { db } from "@/lib/db";
import { dayOffset, instalmentStatus, type InstalmentStatus } from "@/lib/instalments";
import { planTitleOf } from "@/lib/payroll";
import type { DirectionValue } from "@/lib/validation";

import { scheduledKind, scheduledTotal } from "./kind";
import type { DueRow, Dues, InstalmentForPayment, PaymentLink, StaffDueRow, StaffPaymentPrefill } from "./types";

/**
 * المستحقات and the payment-form reads (docs/BACKEND.md → v1.2a → Plans; CP2
 * additions; W1, W2, W7, W8). Every `where` starts with the page's
 * `establishmentId`. "Unpaid" is `paidHalalas < amountDueHalalas` through a
 * Prisma field reference, so the database compares the two columns. The
 * exported shapes live in `./types.ts` (v1.4) and are re-exported here.
 *
 * v1.4 (C5, D4): an OPEN_ENDED plan never produces a due. It has no
 * instalments by construction, but every read here still filters
 * `kind: { not: "OPEN_ENDED" }` explicitly, so a corrupt instalment row on an
 * open plan (the D4 fixture) yields nothing — and the D6 narrowing after the
 * read fails loud instead of defaulting a missing total.
 */

export type { DueRow, Dues, InstalmentForPayment, PaymentLink, StaffDueRow, StaffPaymentPrefill } from "./types";

/** "This week" = the next 7 days including today; UTC arithmetic on the ISO day (W8). */
export function weekEndOf(today: string): string {
  return new Date(Date.parse(`${today}T00:00:00Z`) + 6 * 86_400_000).toISOString().slice(0, 10);
}

const STAFF_DUES_LIMIT = 20;

/**
 * Unpaid instalments of OPEN plans due on or before `until`, in (dueDate, seq,
 * id) order. `staff` (the staff plan clause) leaves out every salary
 * agreement (spec §3.5, ruling 2).
 */
async function unpaidUntil(establishmentId: string, until: string, take?: number, staff?: Prisma.PlanWhereInput) {
  return db.instalment.findMany({
    where: {
      establishmentId,
      dueDate: { lte: isoToDate(until) },
      paidHalalas: { lt: db.instalment.fields.amountDueHalalas },
      plan: { state: "OPEN", kind: { not: "OPEN_ENDED" }, ...(staff ? { AND: [staff] } : {}) },
    },
    select: {
      id: true,
      planId: true,
      seq: true,
      periodYm: true,
      dueDate: true,
      amountDueHalalas: true,
      paidHalalas: true,
      plan: {
        select: {
          title: true, kind: true, direction: true, partyId: true, reminderDays: true,
          party: { select: { name: true, remindersOptIn: true, email: true } },
        },
      },
    },
    orderBy: [{ dueDate: "asc" }, { seq: "asc" }, { id: "asc" }],
    ...(take ? { take } : {}),
  });
}

export async function getDues(establishmentId: string, today: string = todayISO()): Promise<Dues> {
  const weekEnd = weekEndOf(today);
  // v1.4 (D17 c9): one scoped count, any kind or state — the home card hides on 0.
  const [unpaid, planCount] = await Promise.all([
    unpaidUntil(establishmentId, weekEnd),
    db.plan.count({ where: { establishmentId } }),
  ]);
  const rows = unpaid.map((r): DueRow => {
    const dueDate = dateToISO(r.dueDate);
    return {
      instalmentId: r.id,
      planId: r.planId,
      planTitle: planTitleOf(r.plan, r.plan.party.name),
      partyId: r.plan.partyId,
      partyName: r.plan.party.name,
      direction: r.plan.direction,
      seq: r.seq,
      dueDate,
      remainingHalalas: r.amountDueHalalas - r.paidHalalas,
      status: instalmentStatus({ ...r, dueDate }, today, r.plan.reminderDays),
      dayOffset: dayOffset(dueDate, today),
      kind: scheduledKind(r.plan.kind, r.planId),
      periodYm: r.periodYm,
      partyRemindersOptIn: r.plan.party.remindersOptIn,
      partyHasEmail: Boolean(r.plan.party.email),
    };
  });
  const overdue = rows.filter((r) => r.dueDate < today);
  const thisWeek = rows.filter((r) => r.dueDate >= today);
  const sum = (list: DueRow[], d: DirectionValue) =>
    list.filter((r) => r.direction === d).reduce((s, r) => s + r.remainingHalalas, 0);
  return {
    today,
    weekEnd,
    overdue,
    thisWeek,
    totals: {
      overdueInHalalas: sum(overdue, "IN"),
      overdueOutHalalas: sum(overdue, "OUT"),
      weekInHalalas: sum(thisWeek, "IN"),
      weekOutHalalas: sum(thisWeek, "OUT"),
    },
    hasPlans: planCount > 0,
  };
}

/** The nav badge: one `count` in the database. */
export async function getOverdueCount(establishmentId: string, today: string = todayISO()): Promise<number> {
  return db.instalment.count({
    where: {
      establishmentId,
      dueDate: { lt: isoToDate(today) },
      paidHalalas: { lt: db.instalment.fields.amountDueHalalas },
      plan: { state: "OPEN", kind: { not: "OPEN_ENDED" } },
    },
  });
}

/** Same window as `getDues`, at most 20 rows, and nothing beyond the four fields. */
export async function getStaffDues(establishmentId: string, today: string = todayISO()): Promise<StaffDueRow[]> {
  const rows = await unpaidUntil(establishmentId, weekEndOf(today), STAFF_DUES_LIMIT, await staffPlanFilter(establishmentId));
  return rows.map((r) => ({
    instalmentId: r.id,
    partyName: r.plan.party.name,
    remainingHalalas: r.amountDueHalalas - r.paidHalalas,
    dueDate: dateToISO(r.dueDate),
  }));
}

/**
 * The owner's payment form. `null` when the instalment is not found in this
 * establishment, its plan is not OPEN, or it is already paid. Plan remaining =
 * total − Σ the plan's non-deleted linked payments (Confirmed reading 1).
 */
export async function getInstalmentForPayment(
  establishmentId: string,
  instalmentId: string,
): Promise<InstalmentForPayment | null> {
  const row = await db.instalment.findFirst({
    where: { establishmentId, id: instalmentId, plan: { kind: { not: "OPEN_ENDED" } } },
    select: {
      id: true,
      planId: true,
      seq: true,
      periodYm: true,
      amountDueHalalas: true,
      paidHalalas: true,
      plan: {
        select: {
          title: true, kind: true, state: true, direction: true, partyId: true, categoryId: true, totalHalalas: true,
          employeeId: true, // R6 (D31h): the salary payment returns to the employee page.
          party: { select: { name: true } },
        },
      },
    },
  });
  if (!row || row.plan.state !== "OPEN" || row.paidHalalas >= row.amountDueHalalas) return null;
  // An amount read, so `deletedAt: null` (W14) — not a V1 probe.
  const paid = await db.transaction.aggregate({
    where: { establishmentId, deletedAt: null, instalment: { planId: row.planId } },
    _sum: { amountHalalas: true },
  });
  return {
    instalmentId: row.id,
    planId: row.planId,
    planTitle: planTitleOf(row.plan, row.plan.party.name),
    seq: row.seq,
    direction: row.plan.direction,
    partyId: row.plan.partyId,
    partyName: row.plan.party.name,
    categoryId: row.plan.categoryId,
    instalmentRemainingHalalas: row.amountDueHalalas - row.paidHalalas,
    planRemainingHalalas: scheduledTotal(row.plan.totalHalalas, row.planId) - Number(paid._sum.amountHalalas ?? 0),
    kind: scheduledKind(row.plan.kind, row.planId),
    periodYm: row.periodYm,
    employeeId: row.plan.employeeId ?? null,
  };
}

/** W2: stripped on the server, so the plan's title and totals never reach the staff page. */
export async function getStaffPaymentPrefill(
  establishmentId: string,
  instalmentId: string,
): Promise<StaffPaymentPrefill | null> {
  // v1.2b ruling 2: a salary agreement's instalment is not payable by STAFF — null, like a missing id.
  const visible = await db.instalment.findFirst({
    where: { establishmentId, id: instalmentId, plan: await staffPlanFilter(establishmentId) },
    select: { id: true },
  });
  const full = visible ? await getInstalmentForPayment(establishmentId, instalmentId) : null;
  if (!full) return null;
  const { direction, partyId, partyName, categoryId, instalmentRemainingHalalas } = full;
  return { instalmentId: full.instalmentId, direction, partyId, partyName, categoryId, instalmentRemainingHalalas };
}

/** W1: for the edit pages of an entry that is a payment. No state or paid filter. */
export async function getPaymentLink(establishmentId: string, instalmentId: string): Promise<PaymentLink | null> {
  const row = await db.instalment.findFirst({
    where: { establishmentId, id: instalmentId },
    select: { planId: true, plan: { select: { title: true, kind: true, direction: true, partyId: true, party: { select: { name: true } } } } },
  });
  if (!row) return null;
  return {
    planId: row.planId,
    planTitle: planTitleOf(row.plan, row.plan.party.name),
    direction: row.plan.direction,
    partyId: row.plan.partyId,
    partyName: row.plan.party.name,
  };
}
