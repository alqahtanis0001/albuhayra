import "server-only";

import { db } from "@/lib/db";
import type { DirectionValue } from "@/lib/validation";

import { ledgerWhere, sumByDirection } from "@/features/transactions/queries";

/**
 * The by-category report for a date range. Two `groupBy` calls' worth of work in
 * one: grouping by category *and* direction lets a single query fill both tables.
 * Both the group and the name lookup carry `establishmentId`.
 *
 * v1.2c C16 «بحسب الجهة»: an optional party narrows every figure. The party is
 * looked up in this establishment first; an unknown or foreign id answers
 * `null` — never the unfiltered report — and the page says it is invalid.
 */

export type ReportCategoryRow = {
  categoryId: string;
  nameAr: string;
  totalHalalas: number;
};

export type Report = {
  byCategoryIn: ReportCategoryRow[];
  byCategoryOut: ReportCategoryRow[];
  totalInHalalas: number;
  totalOutHalalas: number;
  netHalalas: number;
  /** v1.2c C16: the party the figures are narrowed to; null = all parties. */
  party: { id: string; name: string } | null;
};

type Group = {
  categoryId: string;
  direction: DirectionValue;
  _sum: { amountHalalas: number | null };
};

export async function getReport(establishmentId: string, from: string, to: string): Promise<Report>;
export async function getReport(
  establishmentId: string,
  from: string,
  to: string,
  partyId: string | undefined,
): Promise<Report | null>;
export async function getReport(
  establishmentId: string,
  from: string,
  to: string,
  partyId?: string,
): Promise<Report | null> {
  const party = partyId === undefined ? null : await reportParty(establishmentId, partyId);
  if (partyId !== undefined && party === null) return null;
  const where = ledgerWhere(establishmentId, { from, to, ...(party ? { partyId: party.id } : {}) });

  const [grouped, totals] = await Promise.all([
    db.transaction.groupBy({
      by: ["categoryId", "direction"],
      where,
      _sum: { amountHalalas: true },
    }),
    sumByDirection(where),
  ]);

  const nameOf = await categoryNames(
    establishmentId,
    grouped.map((g) => g.categoryId),
  );

  const rowsFor = (direction: DirectionValue): ReportCategoryRow[] =>
    grouped
      .filter((g) => g.direction === direction)
      .map((g) => ({
        categoryId: g.categoryId,
        nameAr: nameOf.get(g.categoryId) ?? "",
        totalHalalas: g._sum.amountHalalas ?? 0,
      }))
      .sort((a, b) => b.totalHalalas - a.totalHalalas);

  return {
    byCategoryIn: rowsFor("IN"),
    byCategoryOut: rowsFor("OUT"),
    totalInHalalas: totals.inHalalas,
    totalOutHalalas: totals.outHalalas,
    netHalalas: totals.netHalalas,
    party,
  };
}

/** Rule 11: another establishment's party reads exactly like a missing one. */
async function reportParty(establishmentId: string, partyId: string): Promise<{ id: string; name: string } | null> {
  return db.party.findFirst({ where: { establishmentId, id: partyId }, select: { id: true, name: true } });
}

async function categoryNames(
  establishmentId: string,
  ids: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();

  const rows = await db.category.findMany({
    where: { establishmentId, id: { in: unique } },
    select: { id: true, nameAr: true },
  });
  return new Map(rows.map((c) => [c.id, c.nameAr]));
}

/** Kept separate so getReport(_, from, to) and the grouping above share one type. */
export type { Group as ReportGroup };
