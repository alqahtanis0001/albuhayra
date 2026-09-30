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
/**
 * v1.3 item 14: how many overdue instalments fall in each bucket, per side
 * (a sibling of `totals`, never summed across لنا and علينا).
 */
export type AgingCounts = { upTo30: number; upTo60: number; upTo90: number; over90: number; total: number };
export type AgingSide = { rows: AgingRow[]; totals: AgingBuckets; counts: AgingCounts };
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

const COUNT_KEY: Record<BucketKey, Exclude<keyof AgingCounts, "total">> = {
  upTo30Halalas: "upTo30",
  upTo60Halalas: "upTo60",
  upTo90Halalas: "upTo90",
  over90Halalas: "over90",
};

const zeroCounts = (): AgingCounts => ({ upTo30: 0, upTo60: 0, upTo90: 0, over90: 0, total: 0 });

function side(byParty: Map<string, AgingRow>, counts: AgingCounts): AgingSide {
  const rows = [...byParty.values()].sort(
    (a, b) => b.totalHalalas - a.totalHalalas || a.partyName.localeCompare(b.partyName, "ar") || a.partyId.localeCompare(b.partyId),
  );
  const totals = zero();
  for (const row of rows) {
    for (const key of ["upTo30Halalas", "upTo60Halalas", "upTo90Halalas", "over90Halalas"] as const) add(totals, key, row[key]);
  }
  return { rows, totals, counts };
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
  const toUsCounts = zeroCounts();
  const fromUsCounts = zeroCounts();
  for (const r of rows) {
    const inbound = r.plan.direction === "IN";
    const map = inbound ? toUs : fromUs;
    const counts = inbound ? toUsCounts : fromUsCounts;
    const row = map.get(r.plan.partyId) ?? { partyId: r.plan.partyId, partyName: r.plan.party.name, ...zero() };
    const bucket = agingBucketOf(-dayOffset(dateToISO(r.dueDate), today));
    add(row, bucket, r.amountDueHalalas - r.paidHalalas);
    counts[COUNT_KEY[bucket]] += 1;
    counts.total += 1;
    map.set(r.plan.partyId, row);
  }
  return { today, toUs: side(toUs, toUsCounts), fromUs: side(fromUs, fromUsCounts) };
}
