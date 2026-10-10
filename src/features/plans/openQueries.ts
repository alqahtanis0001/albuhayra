import "server-only";

import { dateToISO, todayISO } from "@/lib/dates";
import { db } from "@/lib/db";
import type { PlanStatus } from "@/lib/instalments";
import { displayName, NAME_SELECT } from "@/lib/names";
import type { DirectionValue, PartyTypeValue } from "@/lib/validation";

import type { OpenPlanDetail, OpenPlanRow, PaymentLink } from "./types";

/**
 * v1.4 (docs/V14-SPEC.md C) — reads for OPEN_ENDED agreements. Every `where`
 * starts with the page's `establishmentId`; a foreign id reads as missing
 * (rule 11). "Received" is always Σ of the plan's **non-deleted** payments
 * (`Transaction.planId`, `deletedAt: null`) — an amount read, never a cache
 * (C4). Server-only and in the scoping gate's static sweep.
 */

/** Σ received per plan, non-deleted rows only. Plans with no payment are absent from the map. */
export async function receivedByPlan(establishmentId: string, planIds: string[]): Promise<Map<string, number>> {
  if (planIds.length === 0) return new Map();
  const sums = await db.transaction.groupBy({
    by: ["planId"],
    where: { establishmentId, deletedAt: null, planId: { in: planIds } },
    _sum: { amountHalalas: true },
  });
  const out = new Map<string, number>();
  for (const s of sums) if (s.planId) out.set(s.planId, Number(s._sum.amountHalalas ?? 0));
  return out;
}

type OpenRead = {
  id: string;
  title: string;
  partyId: string;
  direction: DirectionValue;
  startDate: Date;
  totalHalalas: number | null;
  state: "OPEN" | "ARCHIVED" | "CANCELLED";
  expectedEndDate: Date | null;
  party: { name: string; type: PartyTypeValue };
};

/** OPEN reads جارية; the two closed states read as themselves. */
export function openPlanStatus(state: OpenRead["state"]): PlanStatus {
  return state === "OPEN" ? "ACTIVE" : state;
}

export function toOpenRow(plan: OpenRead, receivedHalalas: number): OpenPlanRow {
  return {
    id: plan.id,
    title: plan.title,
    partyId: plan.partyId,
    partyName: plan.party.name,
    partyType: plan.party.type,
    direction: plan.direction,
    startDate: dateToISO(plan.startDate),
    status: openPlanStatus(plan.state),
    kind: "OPEN_ENDED",
    employeeId: null,
    totalHalalas: plan.totalHalalas,
    receivedHalalas,
    remainingHalalas: plan.totalHalalas === null ? null : plan.totalHalalas - receivedHalalas,
    expectedEndDate: plan.expectedEndDate ? dateToISO(plan.expectedEndDate) : null,
  };
}

/** The open agreement's page. `null` for a missing, foreign or scheduled id. */
export async function getOpenPlan(establishmentId: string, id: string): Promise<OpenPlanDetail | null> {
  const plan = await db.plan.findFirst({
    where: { establishmentId, id, kind: "OPEN_ENDED" },
    select: {
      id: true, title: true, partyId: true, direction: true, startDate: true, totalHalalas: true, state: true,
      expectedEndDate: true, categoryId: true, notes: true, closedAt: true,
      party: { select: { name: true, type: true } },
      category: { select: { nameAr: true } },
    },
  });
  if (!plan) return null;
  const [payments, referenced] = await Promise.all([
    db.transaction.findMany({
      where: { establishmentId, deletedAt: null, planId: plan.id },
      select: { id: true, date: true, createdAt: true, amountHalalas: true, paymentMethod: true, createdBy: { select: NAME_SELECT } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    }),
    // Reference probe (D5, P7): a deleted payment still fixes party, direction, start and category.
    db.transaction.count({ where: { establishmentId, planId: plan.id } }),
  ]);
  const receivedHalalas = payments.reduce((s, p) => s + p.amountHalalas, 0);
  return {
    ...toOpenRow(plan, receivedHalalas),
    categoryId: plan.categoryId,
    categoryNameAr: plan.category.nameAr,
    notes: plan.notes,
    closedAt: plan.closedAt ? todayISO(plan.closedAt) : null,
    canClose: plan.state === "OPEN",
    canReopen: plan.state === "ARCHIVED",
    partyLocked: referenced > 0,
    payments: payments.map((p) => ({
      transactionId: p.id,
      date: dateToISO(p.date),
      amountHalalas: p.amountHalalas,
      paymentMethod: p.paymentMethod,
      createdByName: displayName(p.createdBy),
    })),
  };
}

/**
 * D9 (Q4 ruling): the banner for editing an open-plan payment, keyed by the
 * entry the page already has. Any plan state; `null` when the entry is not a
 * non-deleted open-plan payment of this establishment.
 */
export async function getOpenPlanPaymentLink(establishmentId: string, transactionId: string): Promise<PaymentLink | null> {
  const row = await db.transaction.findFirst({
    where: { establishmentId, id: transactionId, deletedAt: null, planId: { not: null } },
    select: { planId: true },
  });
  if (!row?.planId) return null;
  const plan = await db.plan.findFirst({
    where: { establishmentId, id: row.planId, kind: "OPEN_ENDED" },
    select: { id: true, title: true, direction: true, partyId: true, party: { select: { name: true } } },
  });
  if (!plan) return null;
  return { planId: plan.id, planTitle: plan.title, direction: plan.direction, partyId: plan.partyId, partyName: plan.party.name };
}
