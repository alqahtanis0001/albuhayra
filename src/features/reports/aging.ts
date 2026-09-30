import "server-only";

import { dateToISO, isoToDate, todayISO } from "@/lib/dates";
import { db } from "@/lib/db";
import { dayOffset } from "@/lib/instalments";

/**
 * أعمار المستحقات (docs/V12C-DESIGN.md C13, N2). Overdue, unpaid instalments
 * of OPEN plans, by days past due — 1–30 · 31–60 · 61–90 · >90 (the due day
 * itself is not overdue) — one row per party per direction, لنا first.
 * Salary instalments are OUT and so count under علينا. One scoped read.
 */

export type AgingBuckets = {
  upTo30Halalas: number;
  upTo60Halalas: number;
  upTo90Halalas: number;
  over90Halalas: number;
  totalHalalas: number;
};
export type AgingRow = AgingBuckets & { partyId: string; partyName: string };
export type AgingSide = { rows: AgingRow[]; totals: AgingBuckets };
export type AgingReport = { today: string; toUs: AgingSide; fromUs: AgingSide };

type BucketKey = Exclude<keyof AgingBuckets, "totalHalalas">;

/** Days past due (≥ 1) → its bucket. */
export function agingBucketOf(daysPastDue: number): BucketKey {
  if (daysPastDue <= 30) return "upTo30Halalas";
  if (daysPastDue <= 60) return "upTo60Halalas";
  if (daysPastDue <= 90) return "upTo90Halalas";
  return "over90Halalas";
}

const zero = (): AgingBuckets => ({ upTo30Halalas: 0, upTo60Halalas: 0, upTo90Halalas: 0, over90Halalas: 0, totalHalalas: 0 });

function add(into: AgingBuckets, key: BucketKey, amount: number): void {
  into[key] += amount;
  into.totalHalalas += amount;
}

function side(byParty: Map<string, AgingRow>): AgingSide {
  const rows = [...byParty.values()].sort(
    (a, b) => b.totalHalalas - a.totalHalalas || a.partyName.localeCompare(b.partyName, "ar") || a.partyId.localeCompare(b.partyId),
  );
  const totals = zero();
  for (const row of rows) {
    for (const key of ["upTo30Halalas", "upTo60Halalas", "upTo90Halalas", "over90Halalas"] as const) add(totals, key, row[key]);
  }
  return { rows, totals };
}

export async function getAgingReport(establishmentId: string, today: string = todayISO()): Promise<AgingReport> {
  const rows = await db.instalment.findMany({
    where: {
      establishmentId,
      dueDate: { lt: isoToDate(today) },
      paidHalalas: { lt: db.instalment.fields.amountDueHalalas },
      plan: { state: "OPEN" },
    },
    select: {
      dueDate: true,
      amountDueHalalas: true,
      paidHalalas: true,
      plan: { select: { direction: true, partyId: true, party: { select: { name: true } } } },
    },
  });

  const toUs = new Map<string, AgingRow>();
  const fromUs = new Map<string, AgingRow>();
  for (const r of rows) {
    const map = r.plan.direction === "IN" ? toUs : fromUs;
    const row = map.get(r.plan.partyId) ?? { partyId: r.plan.partyId, partyName: r.plan.party.name, ...zero() };
    add(row, agingBucketOf(-dayOffset(dateToISO(r.dueDate), today)), r.amountDueHalalas - r.paidHalalas);
    map.set(r.plan.partyId, row);
  }
  return { today, toUs: side(toUs), fromUs: side(fromUs) };
}
