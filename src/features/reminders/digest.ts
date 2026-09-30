import "server-only";

import { dateToISO, isoToDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { dayOffset } from "@/lib/instalments";
import { planTitleOf } from "@/lib/payroll";
import { MAX_REMINDER_DAYS, type DirectionValue } from "@/lib/validation";

/**
 * The digest's contents for ONE establishment (docs/V12C-DESIGN.md C6, N11).
 * Per-establishment work: every call carries the establishment id and the file
 * is in the scoping gate's FILES. Unpaid instalments of OPEN plans, salary
 * included (the owner's own data), both directions, each in exactly one group.
 */

export type DigestGroupKey = "overdue" | "today" | "tomorrow" | "upcoming";

/** At most this many rows are listed per group; the rest become «و{n} أخرى». */
export const DIGEST_ROW_LIMIT = 50;

export type DigestRow = {
  partyName: string;
  planTitle: string;
  direction: DirectionValue;
  remainingHalalas: number;
  dueDate: string;
};

export type DigestGroup = {
  rows: DigestRow[];
  /** Rows beyond DIGEST_ROW_LIMIT, not listed. */
  moreCount: number;
  /** Over ALL the group's rows, listed or not (N11). */
  totalInHalalas: number;
  totalOutHalalas: number;
};

export type Digest = { today: string; itemCount: number; groups: Record<DigestGroupKey, DigestGroup> };

/** The group of an unpaid instalment, or null when it is outside every window. */
export function digestGroupOf(dueDate: string, today: string, reminderDays: number): DigestGroupKey | null {
  const offset = dayOffset(dueDate, today);
  if (offset < 0) return "overdue";
  if (offset === 0) return "today";
  if (offset === 1) return "tomorrow";
  if (offset <= reminderDays) return "upcoming";
  return null;
}

function addDays(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

export async function buildDigest(establishmentId: string, today: string): Promise<Digest> {
  // The widest window any plan can have; each row is then placed by its own plan.
  const horizon = addDays(today, Math.max(1, MAX_REMINDER_DAYS));
  const rows = await db.instalment.findMany({
    where: {
      establishmentId,
      dueDate: { lte: isoToDate(horizon) },
      paidHalalas: { lt: db.instalment.fields.amountDueHalalas },
      plan: { state: "OPEN" },
    },
    select: {
      dueDate: true,
      amountDueHalalas: true,
      paidHalalas: true,
      plan: { select: { title: true, kind: true, direction: true, reminderDays: true, party: { select: { name: true } } } },
    },
    orderBy: [{ dueDate: "asc" }, { seq: "asc" }, { id: "asc" }],
  });

  const empty = (): DigestGroup => ({ rows: [], moreCount: 0, totalInHalalas: 0, totalOutHalalas: 0 });
  const groups: Record<DigestGroupKey, DigestGroup> = {
    overdue: empty(),
    today: empty(),
    tomorrow: empty(),
    upcoming: empty(),
  };

  let itemCount = 0;
  for (const r of rows) {
    const dueDate = dateToISO(r.dueDate);
    const key = digestGroupOf(dueDate, today, r.plan.reminderDays);
    if (key === null) continue;
    const group = groups[key];
    const remainingHalalas = r.amountDueHalalas - r.paidHalalas;
    itemCount += 1;
    if (r.plan.direction === "IN") group.totalInHalalas += remainingHalalas;
    else group.totalOutHalalas += remainingHalalas;
    if (group.rows.length >= DIGEST_ROW_LIMIT) {
      group.moreCount += 1;
      continue;
    }
    group.rows.push({
      partyName: r.plan.party.name,
      planTitle: planTitleOf(r.plan, r.plan.party.name),
      direction: r.plan.direction,
      remainingHalalas,
      dueDate,
    });
  }
  return { today, itemCount, groups };
}
