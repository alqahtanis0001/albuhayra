import "server-only";

import type { Prisma } from "@/generated/prisma";
import { withSalaryHidden } from "@/features/payroll/privacy";
import { dateToISO, isoToDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { displayName, NAME_SELECT, type NameParts } from "@/lib/names";
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
  /** v1.2a links. The party's name replaces `counterparty` wherever one is set. */
  partyId: string | null;
  partyName: string | null;
  projectId: string | null;
  projectName: string | null;
  /** Set on a payment against an agreement's instalment (checkpoint 2). */
  instalmentId: string | null;
};

export type LedgerPage = {
  rows: LedgerRow[];
  total: number;
  /**
   * Totals of the whole filtered set, which is what the list footer shows — not
   * the visible page. Named `filterTotals` rather than `pageTotals` because the
   * old name argued against its own invariant: anyone reading it beside "footer
   * totals" reaches for the page's rows, which is the bug the multi-page test in
   * scoping.test.ts exists to catch.
   */
  filterTotals: {
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
  partyId: true,
  projectId: true,
  instalmentId: true,
  category: { select: { nameAr: true } },
  createdBy: { select: NAME_SELECT },
  party: { select: { name: true } },
  project: { select: { name: true } },
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
  partyId: string | null;
  projectId: string | null;
  instalmentId: string | null;
  category: { nameAr: string };
  createdBy: NameParts;
  party: { name: string } | null;
  project: { name: string } | null;
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
    createdByName: displayName(row.createdBy),
    // `?? null` rather than trusting the shape: a row written before v1.2a has
    // no link, and Prisma answers null for the relation — never undefined.
    partyId: row.partyId ?? null,
    partyName: row.party?.name ?? null,
    projectId: row.projectId ?? null,
    projectName: row.project?.name ?? null,
    instalmentId: row.instalmentId ?? null,
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
  const { from, to, direction, categoryId, paymentMethod, partyId, projectId, q } =
    filters;

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
    ...(partyId ? { partyId } : {}),
    ...(projectId ? { projectId } : {}),
    ...(date ? { date } : {}),
    ...(q
      ? {
          OR: [
            { counterparty: { contains: q, mode: "insensitive" as const } },
            { note: { contains: q, mode: "insensitive" as const } },
            // A relation filter on a party row — the top-level establishmentId
            // above still bounds the result, so this can only narrow it.
            { party: { name: { contains: q, mode: "insensitive" as const } } },
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

/** v1.2b `hideSalary`: staff views (spec §3.5) — rows, count and totals alike. */
export type StaffView = { hideSalary?: boolean };

export async function listTransactions(
  establishmentId: string,
  filters: TransactionFilter,
  view: StaffView = {},
): Promise<LedgerPage> {
  const where = await withSalaryHidden(establishmentId, ledgerWhere(establishmentId, filters), view.hideSalary);
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

  return { rows: rows.map(toRow), total, filterTotals: totals };
}

/**
 * One entry for the edit form. `findFirst`, not `findUnique`: the id alone is
 * unique but carries no scope, and Prisma refuses a non-unique field in a
 * `findUnique` where — so the tenant check would have to live outside the query.
 */
export async function getTransaction(
  establishmentId: string,
  id: string,
  view: StaffView = {},
): Promise<LedgerRow | null> {
  const row = await db.transaction.findFirst({
    where: await withSalaryHidden(establishmentId, { establishmentId, id, deletedAt: null }, view.hideSalary),
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
  view: StaffView = {},
): Promise<LedgerRow[]> {
  const rows = await db.transaction.findMany({
    where: await withSalaryHidden(establishmentId, { ...ledgerWhere(establishmentId), ...extra }, view.hideSalary),
    select: ROW_SELECT,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take,
  });
  return rows.map(toRow);
}

export { ledgerWhere, sumByDirection };
