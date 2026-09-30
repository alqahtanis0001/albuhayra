import "server-only";

import type { Prisma } from "@/generated/prisma";
import { staffPlanFilter } from "@/features/payroll/privacy";
import { dateToISO, isoToDate, todayISO } from "@/lib/dates";
import { db } from "@/lib/db";
import { dayOffset, instalmentStatus, type InstalmentStatus } from "@/lib/instalments";
import { planTitleOf } from "@/lib/payroll";
import type { DirectionValue } from "@/lib/validation";

/**
 * المستحقات and the payment-form reads (docs/BACKEND.md → v1.2a → Plans; CP2
 * additions; W1, W2, W7, W8). Every `where` starts with the page's
 * `establishmentId`. "Unpaid" is `paidHalalas < amountDueHalalas` through a
 * Prisma field reference, so the database compares the two columns.
 */

export type DueRow = {
  instalmentId: string;
  planId: string;
  planTitle: string;
  partyId: string;
  partyName: string;
  direction: DirectionValue;
  seq: number;
  dueDate: string;
  remainingHalalas: number;
  status: InstalmentStatus;
  dayOffset: number;
  /** v1.2b: SALARY rows carry their month — show it instead of `seq`. */
  kind: "STANDARD" | "SALARY";
  periodYm: string | null;
  /** v1.2c C10 (N4): what the owner's «تذكير» button needs — never the address itself. */
  partyRemindersOptIn: boolean;
  partyHasEmail: boolean;
};

export type Dues = {
  today: string;
  weekEnd: string;
  overdue: DueRow[];
  thisWeek: DueRow[];
  totals: { overdueInHalalas: number; overdueOutHalalas: number; weekInHalalas: number; weekOutHalalas: number };
};

/** The staff card's rows — exactly these four fields (user's ruling; W5 pins the keys). */
export type StaffDueRow = { instalmentId: string; partyName: string; remainingHalalas: number; dueDate: string };

export type InstalmentForPayment = {
  instalmentId: string;
  planId: string;
  planTitle: string;
  seq: number;
  direction: DirectionValue;
  partyId: string;
  partyName: string;
  categoryId: string;
  instalmentRemainingHalalas: number;
  planRemainingHalalas: number;
  kind: "STANDARD" | "SALARY";
  periodYm: string | null;
};

/** W2: the staff payment form sees exactly these six fields — no plan title or totals. */
export type StaffPaymentPrefill = Pick<
  InstalmentForPayment,
  "instalmentId" | "direction" | "partyId" | "partyName" | "categoryId" | "instalmentRemainingHalalas"
>;

/** W1: the link shown when editing a payment — any plan state. */
export type PaymentLink = { planId: string; planTitle: string; direction: DirectionValue; partyId: string; partyName: string };

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
      plan: { state: "OPEN", ...(staff ? { AND: [staff] } : {}) },
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
  const rows = (await unpaidUntil(establishmentId, weekEnd)).map((r): DueRow => {
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
      kind: r.plan.kind,
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
  };
}

/** The nav badge: one `count` in the database. */
export async function getOverdueCount(establishmentId: string, today: string = todayISO()): Promise<number> {
  return db.instalment.count({
    where: {
      establishmentId,
      dueDate: { lt: isoToDate(today) },
      paidHalalas: { lt: db.instalment.fields.amountDueHalalas },
      plan: { state: "OPEN" },
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
    where: { establishmentId, id: instalmentId },
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
    planRemainingHalalas: row.plan.totalHalalas - Number(paid._sum.amountHalalas ?? 0),
    kind: row.plan.kind,
    periodYm: row.periodYm,
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
