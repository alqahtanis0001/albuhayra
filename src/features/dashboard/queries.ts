import "server-only";

import {
  currentMonthKey,
  lastMonths,
  monthEnd,
  monthKey,
  monthStart,
  ymString,
} from "@/lib/dates";
import { db } from "@/lib/db";
import type { DirectionValue, PaymentMethodValue } from "@/lib/validation";

import {
  ledgerWhere,
  recentTransactions,
  sumByDirection,
  type LedgerRow,
} from "@/features/transactions/queries";

/**
 * Dashboard reads. Every `where` starts from `ledgerWhere(establishmentId)`, so
 * the establishment scope and `deletedAt: null` are structural rather than
 * retyped per query. An aggregate is where a missing scope does the most damage:
 * it returns a wrong *number* rather than someone else's row, so nothing on the
 * screen looks wrong and the owner has no way to notice.
 */

/**
 * Every money-valued field carries a `Halalas` suffix (docs/BACKEND.md). The unit
 * belongs in the name: a field called `total` invites the next reader to format
 * it as riyals, which is the same class of wrong-number bug the scoping gate
 * exists to prevent. Counts, ids and `ym` keep plain names.
 */

export type MethodBalance = {
  method: PaymentMethodValue;
  /** IN − OUT for this method. Negative is normal and meaningful. */
  balanceHalalas: number;
};

export type CategoryTotal = {
  categoryId: string;
  nameAr: string;
  totalHalalas: number;
};

export type MonthTotals = { ym: string; inHalalas: number; outHalalas: number };

export type OwnerDashboard = {
  balanceTotalHalalas: number;
  balanceByMethod: MethodBalance[];
  monthInHalalas: number;
  monthOutHalalas: number;
  monthNetHalalas: number;
  /**
   * Amounts only, sorted descending, at most five. The share of the month's OUT
   * total is the screen's business: a first month with no OUT entries is 0/0,
   * and whether that reads "—" or "0%" is a presentation decision.
   */
  topOutCategories: CategoryTotal[];
  last6Months: MonthTotals[];
  recent: LedgerRow[];
};

export type StaffDashboard = {
  monthInHalalas: number;
  monthOutHalalas: number;
  myRecent: LedgerRow[];
  canEdit: boolean;
};

const PAYMENT_METHODS: PaymentMethodValue[] = [
  "CASH",
  "BANK_TRANSFER",
  "MADA",
  "STC_PAY",
  "OTHER",
];

const CHART_MONTHS = 6;
const RECENT_COUNT = 10;
const TOP_CATEGORIES = 5;

/** Bounds of the current Riyadh month, as the `@db.Date` columns store them. */
function currentMonthRange(): { from: Date; to: Date } {
  const { year, month } = currentMonthKey();
  return { from: monthStart(year, month), to: monthEnd(year, month) };
}

type MethodGroup = {
  paymentMethod: PaymentMethodValue;
  direction: DirectionValue;
  _sum: { amountHalalas: number | null };
};

/** Every method appears, including the ones with no entries yet. */
function methodBalances(grouped: MethodGroup[]): MethodBalance[] {
  return PAYMENT_METHODS.map((method) => {
    const at = (direction: DirectionValue) =>
      grouped.find(
        (g) => g.paymentMethod === method && g.direction === direction,
      )?._sum.amountHalalas ?? 0;

    return { method, balanceHalalas: at("IN") - at("OUT") };
  });
}

type CategoryGroup = {
  categoryId: string;
  _sum: { amountHalalas: number | null };
};

/** Attaches names to a grouped-by-category result, scoped to the establishment. */
async function namedCategoryTotals(
  establishmentId: string,
  grouped: CategoryGroup[],
): Promise<CategoryTotal[]> {
  if (grouped.length === 0) return [];

  const names = await db.category.findMany({
    where: { establishmentId, id: { in: grouped.map((g) => g.categoryId) } },
    select: { id: true, nameAr: true },
  });
  const nameOf = new Map(names.map((c) => [c.id, c.nameAr]));

  return grouped.map((g) => ({
    categoryId: g.categoryId,
    nameAr: nameOf.get(g.categoryId) ?? "",
    totalHalalas: g._sum.amountHalalas ?? 0,
  }));
}

/**
 * Buckets rows into the chart's months in JS. A SQL `date_trunc` would need
 * `$queryRaw`, which carries no `where` object for the scoping test to inspect,
 * and this window is a few thousand rows for a business this size.
 */
function bucketByMonth(
  rows: Array<{ date: Date; direction: DirectionValue; amountHalalas: number }>,
  months: Array<{ year: number; month: number }>,
): MonthTotals[] {
  const buckets = new Map(
    months.map((m) => [
      ymString(m.year, m.month),
      { inHalalas: 0, outHalalas: 0 },
    ]),
  );

  for (const row of rows) {
    const { year, month } = monthKey(row.date);
    const bucket = buckets.get(ymString(year, month));
    if (!bucket) continue;
    if (row.direction === "IN") bucket.inHalalas += row.amountHalalas;
    else bucket.outHalalas += row.amountHalalas;
  }

  return months.map((m) => {
    const ym = ymString(m.year, m.month);
    const bucket = buckets.get(ym) ?? { inHalalas: 0, outHalalas: 0 };
    return { ym, inHalalas: bucket.inHalalas, outHalalas: bucket.outHalalas };
  });
}

export async function getOwnerDashboard(
  establishmentId: string,
): Promise<OwnerDashboard> {
  const { from, to } = currentMonthRange();
  const months = lastMonths(CHART_MONTHS);
  const windowStart = monthStart(months[0]!.year, months[0]!.month);

  const allTime = ledgerWhere(establishmentId);
  const thisMonth = { ...allTime, date: { gte: from, lte: to } };

  const [balance, month, byMethod, topOut, windowRows, recent] =
    await Promise.all([
      sumByDirection(allTime),
      sumByDirection(thisMonth),
      db.transaction.groupBy({
        by: ["paymentMethod", "direction"],
        where: allTime,
        _sum: { amountHalalas: true },
      }),
      db.transaction.groupBy({
        by: ["categoryId"],
        where: { ...thisMonth, direction: "OUT" },
        _sum: { amountHalalas: true },
        orderBy: { _sum: { amountHalalas: "desc" } },
        take: TOP_CATEGORIES,
      }),
      db.transaction.findMany({
        where: { ...allTime, date: { gte: windowStart, lte: to } },
        select: { date: true, direction: true, amountHalalas: true },
      }),
      recentTransactions(establishmentId, RECENT_COUNT),
    ]);

  return {
    balanceTotalHalalas: balance.netHalalas,
    balanceByMethod: methodBalances(byMethod),
    monthInHalalas: month.inHalalas,
    monthOutHalalas: month.outHalalas,
    monthNetHalalas: month.netHalalas,
    topOutCategories: await namedCategoryTotals(establishmentId, topOut),
    last6Months: bucketByMonth(windowRows, months),
    recent,
  };
}

export async function getStaffDashboard(
  establishmentId: string,
  userId: string,
): Promise<StaffDashboard> {
  const { from, to } = currentMonthRange();
  const allTime = ledgerWhere(establishmentId);

  const [month, myRecent, self] = await Promise.all([
    // Establishment-wide, per docs/FRONTEND.md — staff see the whole month.
    sumByDirection({ ...allTime, date: { gte: from, lte: to } }),
    // Y4: even a staff member's own salary-linked entry leaves «حركاتي الأخيرة»;
    // the month totals above may include it (spec §3.5 allows aggregates).
    recentTransactions(establishmentId, RECENT_COUNT, { createdById: userId }, { hideSalary: true }),
    // Scoped by establishmentId as well as id. The session's user id is trusted,
    // but the query still states which establishment that user must belong to.
    db.user.findFirst({
      where: { id: userId, establishmentId },
      select: { canEdit: true },
    }),
  ]);

  return {
    monthInHalalas: month.inHalalas,
    monthOutHalalas: month.outHalalas,
    myRecent,
    canEdit: self?.canEdit === true,
  };
}
