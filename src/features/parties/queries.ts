import "server-only";

import { todayISO } from "@/lib/dates";
import { db } from "@/lib/db";
import type { DirectionValue, PartyTypeValue } from "@/lib/validation";

/**
 * الجهات — reads (docs/BACKEND.md → v1.2a → Parties).
 *
 * `establishmentId` comes from the page's requireX() and is the first key of
 * every `where`; an id from the URL can only narrow it. Another establishment's
 * party therefore reads exactly like a missing one (Security rule 11).
 */

export type PartyRow = {
  id: string;
  name: string;
  type: PartyTypeValue;
  phone: string | null;
  email: string | null;
  active: boolean;
  /** Unpaid remainder of the party's OPEN IN plans — they owe us. */
  owedToUsHalalas: number;
  /** Unpaid remainder of the party's OPEN OUT plans — we owe them. */
  owedByUsHalalas: number;
  /** Any transaction (soft-deleted included) or any plan points at it. */
  hasHistory: boolean;
  /** v1.2b D14: the employee profile that manages this party, if any. */
  employeeId: string | null;
};

export type PartyDetail = PartyRow & {
  notes: string | null;
  /** ISO `YYYY-MM-DD`, Riyadh date of the instant. */
  createdAt: string;
};

export type PartyOption = {
  id: string;
  name: string;
  type: PartyTypeValue;
  active: boolean;
};

export type PartyFilter = { type?: PartyTypeValue };

const PARTY_SELECT = {
  id: true,
  name: true,
  type: true,
  phone: true,
  email: true,
  active: true,
  // v1.2b D14. A nested read the scoping harness cannot see; it is bounded by
  // the scoped party row it hangs off and returns only the id (R-L5 note 5).
  employee: { select: { id: true } },
} as const;

type Balance = { owedToUsHalalas: number; owedByUsHalalas: number };

/**
 * Σ(amountDue − paid) over the instalments of OPEN plans, split by the plan's
 * direction. Two scoped reads instead of a nested one, so the gate sees both.
 * `Number()` because Postgres widens `sum(int4)` to bigint (v1.2a V3).
 */
async function balances(
  establishmentId: string,
  partyIds: string[],
): Promise<{ balance: Map<string, Balance>; withPlans: Set<string> }> {
  const balance = new Map<string, Balance>();
  const withPlans = new Set<string>();
  if (partyIds.length === 0) return { balance, withPlans };

  const plans = await db.plan.findMany({
    where: { establishmentId, partyId: { in: partyIds } },
    select: { id: true, partyId: true, direction: true, state: true },
  });
  for (const plan of plans) withPlans.add(plan.partyId);

  const open = plans.filter((p) => p.state === "OPEN");
  if (open.length === 0) return { balance, withPlans };

  const sums = await db.instalment.groupBy({
    by: ["planId"],
    where: { establishmentId, planId: { in: open.map((p) => p.id) } },
    _sum: { amountDueHalalas: true, paidHalalas: true },
  });
  const planById = new Map(open.map((p) => [p.id, p]));
  for (const s of sums) {
    const plan = planById.get(s.planId);
    if (!plan) continue;
    const due = Number(s._sum.amountDueHalalas ?? 0);
    const paid = Number(s._sum.paidHalalas ?? 0);
    const remaining = Math.max(0, due - paid);
    const entry = balance.get(plan.partyId) ?? { owedToUsHalalas: 0, owedByUsHalalas: 0 };
    if ((plan.direction as DirectionValue) === "IN") entry.owedToUsHalalas += remaining;
    else entry.owedByUsHalalas += remaining;
    balance.set(plan.partyId, entry);
  }
  return { balance, withPlans };
}

/**
 * Which of these parties any transaction references — deleted ones included,
 * because the foreign key still points at them. A reference probe (gate
 * exemption V1): no `deletedAt`, no amount, answers "is anything linked" only.
 */
async function partiesWithTransactions(
  establishmentId: string,
  partyIds: string[],
): Promise<Set<string>> {
  if (partyIds.length === 0) return new Set();
  const linked = await db.transaction.groupBy({
    by: ["partyId"],
    where: { establishmentId, partyId: { in: partyIds } },
  });
  return new Set(linked.map((l) => l.partyId).filter((id): id is string => id !== null));
}

type SelectedParty = {
  id: string;
  name: string;
  type: PartyTypeValue;
  phone: string | null;
  email: string | null;
  active: boolean;
  employee: { id: string } | null;
};

async function toRows(
  establishmentId: string,
  parties: SelectedParty[],
): Promise<PartyRow[]> {
  const ids = parties.map((p) => p.id);
  const [{ balance, withPlans }, withTransactions] = await Promise.all([
    balances(establishmentId, ids),
    partiesWithTransactions(establishmentId, ids),
  ]);
  return parties.map(({ employee, ...p }) => ({
    ...p,
    employeeId: employee?.id ?? null,
    owedToUsHalalas: balance.get(p.id)?.owedToUsHalalas ?? 0,
    owedByUsHalalas: balance.get(p.id)?.owedByUsHalalas ?? 0,
    hasHistory: withPlans.has(p.id) || withTransactions.has(p.id),
  }));
}

/** Active first, then by name. */
export async function listParties(
  establishmentId: string,
  filter: PartyFilter = {},
): Promise<PartyRow[]> {
  const parties = await db.party.findMany({
    where: { establishmentId, ...(filter.type ? { type: filter.type } : {}) },
    select: PARTY_SELECT,
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  return toRows(establishmentId, parties);
}

/** Every party, for the entry form: it shows the active ones plus the entry's own. */
export async function listPartyOptions(establishmentId: string): Promise<PartyOption[]> {
  return db.party.findMany({
    where: { establishmentId },
    select: { id: true, name: true, type: true, active: true },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
}

export async function getParty(
  establishmentId: string,
  id: string,
): Promise<PartyDetail | null> {
  const party = await db.party.findFirst({
    where: { establishmentId, id },
    select: { ...PARTY_SELECT, notes: true, createdAt: true },
  });
  if (!party) return null;
  const { notes, createdAt, ...rest } = party;
  const [row] = await toRows(establishmentId, [rest]);
  return { ...row!, notes, createdAt: todayISO(createdAt) };
}
