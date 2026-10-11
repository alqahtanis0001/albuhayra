import "server-only";

import { allocate } from "@/lib/allocation";
import { dateToISO, todayISO } from "@/lib/dates";
import { db } from "@/lib/db";
import { dayOffset, instalmentStatus, planStatus } from "@/lib/instalments";
import { displayName, NAME_SELECT } from "@/lib/names";
import { planTitleOf } from "@/lib/payroll";
import type { DirectionValue, PartyTypeValue } from "@/lib/validation";

import { asScheduled, type PlanKindValue, type ScheduledKind } from "./kind";
import { receivedByPlan, toOpenRow } from "./openQueries";
import type { PlanDetail, PlanFilter, PlanRow, ScheduledPlanRow } from "./types";

/**
 * الاتفاقيات — reads (docs/BACKEND.md → v1.2a → Plans, W7, W8). Every `where`
 * starts with the page's `establishmentId`; a foreign id reads as missing
 * (rule 11). Statuses are derived here from the server's `todayISO()` and
 * passed down — no client decides "today". Dues live in `./dues.ts`; the
 * exported shapes live in `./types.ts` (v1.4) and are re-exported here.
 *
 * v1.4 (D6): these two reads are scheduled-plan reads. An OPEN_ENDED row has no
 * instalments and may have no total, so the kind branch runs **before** any
 * total is read (`asScheduled`), and a STANDARD / SALARY row without a total
 * throws — never `?? 0`.
 */

export type {
  NextDue, OpenPlanRow, PlanDetail, PlanFilter, PlanInstalment, PlanPayment, PlanRow, ScheduledPlanRow,
} from "./types";

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
  expectedEndDate: true,
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

/** A row as the database hands it over: any kind, total possibly null. */
type AnyPlanRead = {
  id: string;
  title: string;
  partyId: string;
  direction: DirectionValue;
  startDate: Date;
  totalHalalas: number | null;
  reminderDays: number;
  state: "OPEN" | "ARCHIVED" | "CANCELLED";
  kind: PlanKindValue;
  employeeId: string | null;
  expectedEndDate: Date | null;
  party: { name: string; type: PartyTypeValue };
  employee: { status: "ACTIVE" | "ENDED" } | null;
};

/** What `toRow` works on: narrowed by `asScheduled`. */
type PlanRead = Omit<AnyPlanRead, "kind" | "totalHalalas"> & { kind: ScheduledKind; totalHalalas: number };

function toRow(plan: PlanRead, rows: InstalmentRead[], today: string): ScheduledPlanRow {
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
  const plans: AnyPlanRead[] = await db.plan.findMany({
    where: {
      establishmentId,
      ...(filter.direction ? { direction: filter.direction } : {}),
      ...(filter.partyId ? { partyId: filter.partyId } : {}),
    },
    select: PLAN_SELECT,
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
  });
  // D6 / P17: the kind branch comes first — an open-ended row never reaches `toRow`.
  const open = plans.filter((p) => p.kind === "OPEN_ENDED");
  const scheduled = plans.filter((p) => p.kind !== "OPEN_ENDED").map(asScheduled);
  const [rows, received] = await Promise.all([
    instalmentsOf(establishmentId, scheduled.map((p) => p.id)),
    receivedByPlan(establishmentId, open.map((p) => p.id)),
  ]);
  const byId = new Map<string, PlanRow>();
  for (const p of scheduled) byId.set(p.id, toRow(p, rows.filter((r) => r.planId === p.id), today));
  for (const p of open) byId.set(p.id, toOpenRow(p, received.get(p.id) ?? 0));
  return plans
    .map((p) => byId.get(p.id)!)
    .filter((p) => !filter.status || p.status === filter.status);
}

/** A scheduled plan only: an open-ended id reads as missing here (its pages ask the open read first). */
export async function getPlan(
  establishmentId: string,
  id: string,
  today: string = todayISO(),
): Promise<PlanDetail | null> {
  const found = await db.plan.findFirst({
    where: { establishmentId, id, kind: { not: "OPEN_ENDED" } },
    select: {
      ...PLAN_SELECT, categoryId: true, notes: true, closedAt: true, category: { select: { nameAr: true } },
      party: { select: { name: true, type: true, remindersOptIn: true, email: true } },
    },
  });
  if (!found) return null;
  const plan = asScheduled(found);

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
