import "server-only";

import type { Prisma } from "@/generated/prisma";
import { bumpRevision, ConcurrentChangeError, reallocatePlan } from "@/features/plans/allocate";
import type { AuthedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canEditTransactions } from "@/lib/permissions";
import type { TransactionInput } from "@/lib/validation";

import { checkLinks, linkColumns } from "./links";

/**
 * The payment path of the three ledger mutations (docs/BACKEND.md → v1.2a →
 * Payments; CP2 additions; Confirmed readings; W3, W14). A payment is an
 * ordinary entry carrying `instalmentId`; this module decides whether it may
 * be written and wraps the write in the plan's revision lock + re-allocation.
 * Server-only and in the scoping gate's static sweep.
 */

/** The plan a write touches: bumped first, re-allocated after. */
export type PaymentRef = { planId: string; revision: number };

type Refusal = { ok: false; key: string; field?: string };
export type EntryResolution =
  | { ok: true; links: Record<string, string | null>; payment: PaymentRef | null }
  | Refusal;

const refuse = (key: string, field?: string): Refusal => ({ ok: false, key, field });

type Existing = {
  id: string;
  amountHalalas: number;
  partyId: string | null;
  projectId: string | null;
  instalmentId: string | null;
};

/**
 * Resolve what an entry links to. Ordinary entries go straight to `checkLinks`.
 * A payment (W3): canEdit **first** (read per request from the DB by
 * `requireUser`), then the instalment and its plan, then direction and party
 * are **refused** on mismatch — never forced — and an absent party is set to
 * the plan's (V5: no active check). Only `projectId` reaches `checkLinks`.
 */
export async function resolveEntry(
  establishmentId: string,
  user: Pick<AuthedUser, "role" | "status" | "canEdit" | "establishmentId">,
  input: TransactionInput,
  existing?: Existing,
): Promise<EntryResolution> {
  const linkedId = existing?.instalmentId ?? null;
  if (existing && input.instalmentId && input.instalmentId !== linkedId) {
    return refuse("err.paymentLinkFixed", "instalmentId");
  }
  const instalmentId = linkedId ?? (existing ? null : input.instalmentId ?? null);

  if (!instalmentId) {
    const bad = await checkLinks(establishmentId, input, existing);
    return bad ? refuse(bad.key, bad.field) : { ok: true, links: linkColumns(input), payment: null };
  }

  if (!canEditTransactions(user)) return refuse("err.forbidden");

  const instalment = await db.instalment.findFirst({
    where: { establishmentId, id: instalmentId },
    select: { planId: true, amountDueHalalas: true, paidHalalas: true },
  });
  if (!instalment) return refuse("err.instalmentInvalid", "instalmentId");
  // V4: revision in the same read as state/total/direction, before any sum.
  const plan = await db.plan.findFirst({
    where: { establishmentId, id: instalment.planId },
    select: { id: true, state: true, revision: true, totalHalalas: true, direction: true, partyId: true },
  });
  if (!plan) return refuse("err.instalmentInvalid", "instalmentId");
  // Confirmed reading 2: an ARCHIVED plan's payments may be corrected, never added.
  if (plan.state === "CANCELLED" || (plan.state === "ARCHIVED" && !existing)) return refuse("err.planClosed");
  // Read before the revision, so a payment racing in can make it stale (N-P3b).
  // Harmless: the remaining check below is post-revision, so the new payment
  // rolls over and can never over-allocate.
  if (!existing && instalment.paidHalalas >= instalment.amountDueHalalas) return refuse("err.instalmentPaid");
  if (input.direction !== plan.direction) return refuse("err.paymentDirectionMismatch", "direction");
  if (input.partyId && input.partyId !== plan.partyId) return refuse("err.paymentPartyMismatch", "partyId");

  // Confirmed reading 1: total − Σ the plan's other non-deleted payments, read
  // after the revision (W14). On an edit the entry itself is excluded by id —
  // never added back from `existing`, which was read before the revision and
  // may be stale if another edit of it committed in between (S-P3a).
  const others = await db.transaction.aggregate({
    where: {
      establishmentId,
      deletedAt: null,
      instalment: { planId: plan.id },
      ...(existing ? { id: { not: existing.id } } : {}),
    },
    _sum: { amountHalalas: true },
  });
  const remaining = plan.totalHalalas - Number(others._sum.amountHalalas ?? 0);
  if (input.amountHalalas > remaining) return refuse("err.paymentExceedsRemaining", "amountHalalas");

  const bad = await checkLinks(establishmentId, { projectId: input.projectId }, existing);
  if (bad) return refuse(bad.key, bad.field);

  return {
    ok: true,
    links: {
      partyId: plan.partyId,
      projectId: input.projectId ?? null,
      counterparty: null,
      // Written on create only; on edit the link is fixed and not rewritten.
      ...(existing ? {} : { instalmentId }),
    },
    payment: { planId: plan.id, revision: plan.revision },
  };
}

/** The plan a stored payment belongs to, for `deleteTransaction`. */
export async function paymentOf(establishmentId: string, instalmentId: string | null): Promise<PaymentRef | null> {
  if (!instalmentId) return null;
  const instalment = await db.instalment.findFirst({
    where: { establishmentId, id: instalmentId },
    select: { planId: true },
  });
  if (!instalment) return null;
  const plan = await db.plan.findFirst({
    where: { establishmentId, id: instalment.planId },
    select: { id: true, revision: true },
  });
  return plan ? { planId: plan.id, revision: plan.revision } : null;
}

export const CONFLICT = Symbol("concurrentChange");

/**
 * The write, inside one `$transaction`: for a payment, the revision bump is the
 * first statement and `reallocatePlan` runs after the write. A lost race
 * rolls everything back and returns `CONFLICT` — matched by class only (W14).
 */
export async function inEntryTransaction<T>(
  payment: PaymentRef | null,
  establishmentId: string,
  userId: string,
  body: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T | typeof CONFLICT> {
  try {
    return await db.$transaction(async (tx) => {
      if (payment) await bumpRevision(tx, establishmentId, payment.planId, payment.revision);
      const result = await body(tx);
      if (payment) await reallocatePlan(tx, establishmentId, payment.planId, userId);
      return result;
    });
  } catch (error) {
    if (error instanceof ConcurrentChangeError) return CONFLICT;
    throw error;
  }
}
