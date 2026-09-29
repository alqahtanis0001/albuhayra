import "server-only";

import type { Prisma } from "@/generated/prisma";
import { dateToISO, isoToDate } from "@/lib/dates";
import { db } from "@/lib/db";
import {
  PAGE_SIZE,
  type DirectionValue,
  type PaymentMethodValue,
  type TransactionFilter,
} from "@/lib/validation";

/**
 * Reads for the ledger list and the edit form. `establishmentId` always comes
 * from requireX() at the page boundary — never from a URL, a form or a filter —
 * and it is the first key of every `where` below. A filter value from the client
 * can only ever narrow that scope.
 */

export type LedgerRow = {
  id: string;
  /** ISO `YYYY-MM-DD`, never a Date: these rows cross into client components. */
  date: string;
  direction: DirectionValue;
  amountHalalas: number;
  categoryId: string;
  categoryNameAr: string;
  paymentMethod: PaymentMethodValue;
  counterparty: string | null;
  note: string | null;
  createdByName: string;
};

export type LedgerPage = {
  rows: LedgerRow[];
  total: number;
  /** Totals for the whole filter, not just the visible page — the list footer. */
  pageTotals: {
    inHalalas: number;
    outHalalas: number;
    netHalalas: number;
  };
};

const ROW_SELECT = {
  id: true,
  date: true,
  direction: true,
  amountHalalas: true,
  categoryId: true,
  paymentMethod: true,
  counterparty: true,
  note: true,
  category: { select: { nameAr: true } },
  createdBy: { select: { name: true } },
} satisfies Prisma.TransactionSelect;

type SelectedRow = {
  id: string;
  date: Date;
  direction: DirectionValue;
  amountHalalas: number;
  categoryId: string;
  paymentMethod: PaymentMethodValue;
  counterparty: string | null;
  note: string | null;
  category: { nameAr: string };
  createdBy: { name: string };
};

function toRow(row: SelectedRow): LedgerRow {
  return {
    id: row.id,
    date: dateToISO(row.date),
    direction: row.direction,
    amountHalalas: row.amountHalalas,
    categoryId: row.categoryId,
    categoryNameAr: row.category.nameAr,
    paymentMethod: row.paymentMethod,
    counterparty: row.counterparty,
    note: row.note,
    createdByName: row.createdBy.name,
  };
}

/**
 * The one place a ledger `where` is built. Every caller goes through it so the
 * establishment scope and the soft-delete filter cannot be forgotten on one path.
 */
function ledgerWhere(
  establishmentId: string,
  filters: Partial<TransactionFilter> = {},
): Prisma.TransactionWhereInput {
  const { from, to, direction, categoryId, paymentMethod, q } = filters;

  const date =
    from || to
      ? {
          ...(from ? { gte: isoToDate(from) } : {}),
          ...(to ? { lte: isoToDate(to) } : {}),
        }
      : undefined;

  return {
    establishmentId,
    deletedAt: null,
    ...(direction ? { direction } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(paymentMethod ? { paymentMethod } : {}),
    ...(date ? { date } : {}),
    ...(q
      ? {
          OR: [
            { counterparty: { contains: q, mode: "insensitive" as const } },
            { note: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

export type DirectionSums = {
  inHalalas: number;
  outHalalas: number;
  netHalalas: number;
};

/** Sum by direction over any ledger `where`. A missing direction means zero. */
async function sumByDirection(
  where: Prisma.TransactionWhereInput,
): Promise<DirectionSums> {
  const grouped = await db.transaction.groupBy({
    by: ["direction"],
    where,
    _sum: { amountHalalas: true },
  });

  const find = (d: DirectionValue) =>
    grouped.find((g) => g.direction === d)?._sum.amountHalalas ?? 0;

  const inHalalas = find("IN");
  const outHalalas = find("OUT");
  return { inHalalas, outHalalas, netHalalas: inHalalas - outHalalas };
}

export async function listTransactions(
  establishmentId: string,
  filters: TransactionFilter,
): Promise<LedgerPage> {
  const where = ledgerWhere(establishmentId, filters);
  const page = filters.page ?? 1;

  const [rows, total, totals] = await Promise.all([
    db.transaction.findMany({
      where,
      select: ROW_SELECT,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.transaction.count({ where }),
    sumByDirection(where),
  ]);

  return { rows: rows.map(toRow), total, pageTotals: totals };
}

/**
 * One entry for the edit form. `findFirst`, not `findUnique`: the id alone is
 * unique but carries no scope, and Prisma refuses a non-unique field in a
 * `findUnique` where — so the tenant check would have to live outside the query.
 */
export async function getTransaction(
  establishmentId: string,
  id: string,
): Promise<LedgerRow | null> {
  const row = await db.transaction.findFirst({
    where: { establishmentId, id, deletedAt: null },
    select: ROW_SELECT,
  });
  return row === null ? null : toRow(row);
}

/**
 * The most recent entries, optionally narrowed further (the staff dashboard
 * passes `createdById`). Lives here rather than in the dashboard so `ROW_SELECT`
 * and `ledgerWhere` have exactly one home.
 */
export async function recentTransactions(
  establishmentId: string,
  take: number,
  extra: Prisma.TransactionWhereInput = {},
): Promise<LedgerRow[]> {
  const rows = await db.transaction.findMany({
    where: { ...ledgerWhere(establishmentId), ...extra },
    select: ROW_SELECT,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take,
  });
  return rows.map(toRow);
}

export { ledgerWhere, sumByDirection };
