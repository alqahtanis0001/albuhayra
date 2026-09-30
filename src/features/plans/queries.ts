import "server-only";

import { allocate } from "@/lib/allocation";
import { dateToISO, todayISO } from "@/lib/dates";
import { db } from "@/lib/db";
import {
  dayOffset,
  instalmentStatus,
  planStatus,
  type InstalmentStatus,
  type PlanStatus,
} from "@/lib/instalments";
import { displayName, NAME_SELECT } from "@/lib/names";
import { planTitleOf } from "@/lib/payroll";
import type { DirectionValue, PartyTypeValue } from "@/lib/validation";

/**
 * الاتفاقيات — reads (docs/BACKEND.md → v1.2a → Plans, W7, W8). Every `where`
 * starts with the page's `establishmentId`; a foreign id reads as missing
 * (rule 11). Statuses are derived here from the server's `todayISO()` and
 * passed down — no client decides "today". Dues live in `./dues.ts`.
 */

export type NextDue = {
  instalmentId: string;
  periodYm: string | null;
  dueDate: string;
  remainingHalalas: number;
  status: InstalmentStatus;
  dayOffset: number;
};

export type PlanRow = {
  id: string;
  title: string;
  partyId: string;
  partyName: string;
  partyType: PartyTypeValue;
  direction: DirectionValue;
  startDate: string;
  totalHalalas: number;
  paidHalalas: number;
  remainingHalalas: number;
  status: PlanStatus;
  instalmentCount: number;
  paidCount: number;
  nextDue: NextDue | null;
  /** v1.3 item 7: each instalment's derived status, in schedule order (the list card's bar). */
  instalmentStatuses: InstalmentStatus[];
  /** v1.2b: SALARY plans are managed from the employee profile (D1); title derived (X13). */
  kind: "STANDARD" | "SALARY";
  employeeId: string | null;
};

export type PlanPayment = { transactionId: string; date: string; amountHalalas: number; createdByName: string };

export type PlanInstalment = {
  id: string;
  seq: number;
  /** v1.2b: the month of a SALARY row — shown instead of `seq`. */
  periodYm: string | null;
  dueDate: string;
  amountDueHalalas: number;
  paidHalalas: number;
  remainingHalalas: number;
  status: InstalmentStatus;
  dayOffset: number;
  /** Paid, or referenced by any entry (deleted included): read-only on edit. */
  fixed: boolean;
  /** Payments recorded **against** this instalment (allocation may spread them). */
  payments: PlanPayment[];
};

export type PlanDetail = PlanRow & {
  categoryId: string;
  categoryNameAr: string;
  reminderDays: number;
  notes: string | null;
  /** Riyadh date of the archive/cancel instant. */
  closedAt: string | null;
  canCancel: boolean;
  overpaidHalalas: number;
  instalments: PlanInstalment[];
  /** v1.2c C10: what the owner's «تذكير» button needs — never the address itself. */
  partyRemindersOptIn: boolean;
  partyHasEmail: boolean;
};

export type PlanFilter = { direction?: DirectionValue; status?: PlanStatus; partyId?: string };

const PLAN_SELECT = {
  id: true,
  title: true,
  partyId: true,
  direction: true,
  startDate: true,
  totalHalalas: true,
  reminderDays: true,
  state: true,
  kind: true,
  employeeId: true,
  party: { select: { name: true, type: true } },
  employee: { select: { status: true } },
} as const;

type InstalmentRead = {
  id: string; planId: string; seq: number; periodYm: string | null; dueDate: Date; amountDueHalalas: number; paidHalalas: number;
};

async function instalmentsOf(establishmentId: string, planIds: string[]): Promise<InstalmentRead[]> {
  if (planIds.length === 0) return [];
  return db.instalment.findMany({
    where: { establishmentId, planId: { in: planIds } },
    select: { id: true, planId: true, seq: true, periodYm: true, dueDate: true, amountDueHalalas: true, paidHalalas: true },
    orderBy: [{ dueDate: "asc" }, { seq: "asc" }, { id: "asc" }],
  });
}

type PlanRead = {
  id: string;
  title: string;
  partyId: string;
  direction: DirectionValue;
  startDate: Date;
  totalHalalas: number;
  reminderDays: number;
  state: "OPEN" | "ARCHIVED" | "CANCELLED";
  kind: "STANDARD" | "SALARY";
  employeeId: string | null;
  party: { name: string; type: PartyTypeValue };
  employee: { status: "ACTIVE" | "ENDED" } | null;
};

function toRow(plan: PlanRead, rows: InstalmentRead[], today: string): PlanRow {
  const startDate = dateToISO(plan.startDate);
  const paidHalalas = rows.reduce((s, r) => s + r.paidHalalas, 0);
  const next = plan.state === "OPEN" ? rows.find((r) => r.paidHalalas < r.amountDueHalalas) : undefined;
  const nextDueDate = next ? dateToISO(next.dueDate) : null;
  const derived = planStatus({ state: plan.state, startDate, instalments: rows }, today);
  // Y8: a salary plan reads جارية while its employee is ACTIVE, even prepaid.
  const status = plan.kind === "SALARY" && plan.state === "OPEN" && plan.employee?.status === "ACTIVE" ? "ACTIVE" : derived;
  return {
    id: plan.id,
    title: planTitleOf(plan, plan.party.name),
    partyId: plan.partyId,
    partyName: plan.party.name,
    partyType: plan.party.type,
    direction: plan.direction,
    startDate,
    totalHalalas: plan.totalHalalas,
    paidHalalas,
    remainingHalalas: plan.totalHalalas - paidHalalas,
    status,
    instalmentCount: rows.length,
    paidCount: rows.filter((r) => r.paidHalalas >= r.amountDueHalalas).length,
    nextDue:
      next && nextDueDate
        ? {
            instalmentId: next.id,
            periodYm: next.periodYm,
            dueDate: nextDueDate,
            remainingHalalas: next.amountDueHalalas - next.paidHalalas,
            status: instalmentStatus({ ...next, dueDate: nextDueDate }, today, plan.reminderDays),
            dayOffset: dayOffset(nextDueDate, today),
          }
        : null,
    instalmentStatuses: rows.map((r) =>
      instalmentStatus({ ...r, dueDate: dateToISO(r.dueDate) }, today, plan.reminderDays),
    ),
    kind: plan.kind,
    employeeId: plan.employeeId,
  };
}

/** Newest first. `status` is derived, so that filter applies after derivation. */
export async function listPlans(
  establishmentId: string,
  filter: PlanFilter = {},
  today: string = todayISO(),
): Promise<PlanRow[]> {
  const plans = await db.plan.findMany({
    where: {
      establishmentId,
      ...(filter.direction ? { direction: filter.direction } : {}),
      ...(filter.partyId ? { partyId: filter.partyId } : {}),
    },
    select: PLAN_SELECT,
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
  });
  const rows = await instalmentsOf(establishmentId, plans.map((p) => p.id));
  return plans
    .map((p) => toRow(p, rows.filter((r) => r.planId === p.id), today))
    .filter((p) => !filter.status || p.status === filter.status);
}

export async function getPlan(
  establishmentId: string,
  id: string,
  today: string = todayISO(),
): Promise<PlanDetail | null> {
  const plan = await db.plan.findFirst({
    where: { establishmentId, id },
    select: {
      ...PLAN_SELECT, categoryId: true, notes: true, closedAt: true, category: { select: { nameAr: true } },
      party: { select: { name: true, type: true, remindersOptIn: true, email: true } },
    },
  });
  if (!plan) return null;

  const rows = await instalmentsOf(establishmentId, [plan.id]);
  const ids = rows.map((r) => r.id);
  const [payments, referenced] = ids.length
    ? await Promise.all([
        db.transaction.findMany({
          where: { establishmentId, deletedAt: null, instalmentId: { in: ids } },
          select: { id: true, instalmentId: true, date: true, createdAt: true, amountHalalas: true, createdBy: { select: NAME_SELECT } },
          orderBy: [{ date: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        }),
        // Reference probe (V1): a deleted entry still fixes its row.
        db.transaction.groupBy({ by: ["instalmentId"], where: { establishmentId, instalmentId: { in: ids } } }),
      ])
    : [[], []];
  const linked = new Set(referenced.map((r) => r.instalmentId));

  const { overpaidHalalas } = allocate(
    rows.map((r) => ({ id: r.id, dueDate: dateToISO(r.dueDate), seq: r.seq, amountDueHalalas: r.amountDueHalalas })),
    payments.map((p) => ({
      id: p.id,
      instalmentId: p.instalmentId!,
      date: dateToISO(p.date),
      createdAt: p.createdAt.toISOString(),
      amountHalalas: p.amountHalalas,
    })),
  );

  return {
    ...toRow(plan, rows, today),
    categoryId: plan.categoryId,
    categoryNameAr: plan.category.nameAr,
    reminderDays: plan.reminderDays,
    notes: plan.notes,
    closedAt: plan.closedAt ? todayISO(plan.closedAt) : null,
    canCancel: plan.kind === "STANDARD" && plan.state === "OPEN" && payments.length === 0,
    overpaidHalalas,
    partyRemindersOptIn: plan.party.remindersOptIn,
    partyHasEmail: Boolean(plan.party.email),
    instalments: rows.map((r) => {
      const dueDate = dateToISO(r.dueDate);
      return {
        id: r.id,
        seq: r.seq,
        periodYm: r.periodYm,
        dueDate,
        amountDueHalalas: r.amountDueHalalas,
        paidHalalas: r.paidHalalas,
        remainingHalalas: r.amountDueHalalas - r.paidHalalas,
        status: instalmentStatus({ ...r, dueDate }, today, plan.reminderDays),
        dayOffset: dayOffset(dueDate, today),
        fixed: r.paidHalalas > 0 || linked.has(r.id),
        payments: payments
          .filter((p) => p.instalmentId === r.id)
          .map((p) => ({
            transactionId: p.id,
            date: dateToISO(p.date),
            amountHalalas: p.amountHalalas,
            createdByName: displayName(p.createdBy),
          })),
      };
    }),
  };
}
