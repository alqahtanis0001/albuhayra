import "server-only";

import { recentTransactions, type LedgerRow } from "@/features/transactions/queries";
import { dateToISO, todayISO } from "@/lib/dates";
import { db } from "@/lib/db";

import { getParty, type PartyDetail } from "./queries";

/**
 * كشف حساب — a party's statement (docs/BACKEND.md → v1.2a → Statement; W11).
 * Signed from the establishment's side: **+ = لنا, − = علينا**. Plans that are
 * OPEN or ARCHIVED (a cancelled plan has nothing paid and is left out):
 *   PLAN      on its startDate:   IN +total, OUT −total
 *   PAYMENT   per linked non-deleted entry: IN −amount, OUT +amount
 *   WRITE_OFF on an archived plan's closedAt (Riyadh date), cancelling the rest
 * Invariant (tested on real SQL): closing = owedToUs − owedByUs from listParties.
 */

export type StatementKind = "PLAN" | "PAYMENT" | "WRITE_OFF";

export type StatementRow = {
  date: string;
  kind: StatementKind;
  planId: string;
  planTitle: string;
  transactionId: string | null;
  deltaHalalas: number;
  balanceHalalas: number;
};

export type PartyStatement = {
  party: PartyDetail;
  rows: StatementRow[];
  closingBalanceHalalas: number;
  /** The party's entries that are not payments — informational, outside the balance. Newest 50. */
  other: LedgerRow[];
  /** More than 50 exist: the page says so and links to the filtered ledger (W11). */
  otherCapped: boolean;
};

export const STATEMENT_OTHER_LIMIT = 50;

const KIND_ORDER: Record<StatementKind, number> = { PLAN: 0, PAYMENT: 1, WRITE_OFF: 2 };

type Unsorted = Omit<StatementRow, "balanceHalalas"> & { sortKey: string };

export async function getPartyStatement(establishmentId: string, partyId: string): Promise<PartyStatement | null> {
  const party = await getParty(establishmentId, partyId);
  if (!party) return null;

  const plans = await db.plan.findMany({
    where: { establishmentId, partyId: party.id, state: { in: ["OPEN", "ARCHIVED"] } },
    select: { id: true, title: true, direction: true, totalHalalas: true, startDate: true, state: true, closedAt: true, createdAt: true },
  });
  const instalments = plans.length
    ? await db.instalment.findMany({
        where: { establishmentId, planId: { in: plans.map((p) => p.id) } },
        select: { id: true, planId: true },
      })
    : [];
  const planOf = new Map(instalments.map((i) => [i.id, i.planId]));
  const payments = instalments.length
    ? await db.transaction.findMany({
        where: { establishmentId, deletedAt: null, instalmentId: { in: instalments.map((i) => i.id) } },
        select: { id: true, instalmentId: true, date: true, createdAt: true, amountHalalas: true },
      })
    : [];

  const unsorted: Unsorted[] = [];
  for (const plan of plans) {
    const sign = plan.direction === "IN" ? 1 : -1;
    unsorted.push({
      date: dateToISO(plan.startDate),
      kind: "PLAN",
      planId: plan.id,
      planTitle: plan.title,
      transactionId: null,
      deltaHalalas: sign * plan.totalHalalas,
      sortKey: plan.createdAt.toISOString(),
    });
    let paid = 0;
    for (const p of payments.filter((x) => planOf.get(x.instalmentId!) === plan.id)) {
      paid += p.amountHalalas;
      unsorted.push({
        date: dateToISO(p.date),
        kind: "PAYMENT",
        planId: plan.id,
        planTitle: plan.title,
        transactionId: p.id,
        deltaHalalas: -sign * p.amountHalalas,
        sortKey: p.createdAt.toISOString(),
      });
    }
    const rest = plan.totalHalalas - paid;
    if (plan.state === "ARCHIVED" && rest !== 0 && plan.closedAt) {
      unsorted.push({
        date: todayISO(plan.closedAt),
        kind: "WRITE_OFF",
        planId: plan.id,
        planTitle: plan.title,
        transactionId: null,
        deltaHalalas: -sign * rest,
        sortKey: plan.closedAt.toISOString(),
      });
    }
  }

  unsorted.sort(
    (a, b) =>
      (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) ||
      KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
      (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0),
  );
  let balance = 0;
  const rows = unsorted.map(({ sortKey: _k, ...row }) => {
    balance += row.deltaHalalas;
    return { ...row, balanceHalalas: balance };
  });

  const other = await recentTransactions(establishmentId, STATEMENT_OTHER_LIMIT + 1, {
    partyId: party.id,
    instalmentId: null,
  });

  return {
    party,
    rows,
    closingBalanceHalalas: balance,
    other: other.slice(0, STATEMENT_OTHER_LIMIT),
    otherCapped: other.length > STATEMENT_OTHER_LIMIT,
  };
}
