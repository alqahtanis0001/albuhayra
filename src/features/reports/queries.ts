import "server-only";

import { db } from "@/lib/db";
import type { DirectionValue } from "@/lib/validation";

import { ledgerWhere, sumByDirection } from "@/features/transactions/queries";

/**
 * The by-category report for a date range. Two `groupBy` calls' worth of work in
 * one: grouping by category *and* direction lets a single query fill both tables.
 * Both the group and the name lookup carry `establishmentId`.
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
};

type Group = {
  categoryId: string;
  direction: DirectionValue;
  _sum: { amountHalalas: number | null };
};

export async function getReport(
  establishmentId: string,
  from: string,
  to: string,
): Promise<Report> {
  const where = ledgerWhere(establishmentId, { from, to });

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
  };
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
