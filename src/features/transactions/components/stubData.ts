/**
 * F4 stubs for `listCategories` (B2), `listLocks` (B4) and
 * `getTransaction` (B3). Deleted by W3.
 */
import { currentMonthKey, lastMonths, ymString } from "@/lib/dates";

import type { CategoryRow, LockRow, TransactionRow } from "./data";

export async function listCategories(
  _establishmentId: string,
): Promise<CategoryRow[]> {
  return [
    { id: "in1", nameAr: "مبيعات", type: "IN", active: true },
    { id: "in2", nameAr: "دفعة من عميل", type: "IN", active: true },
    { id: "in3", nameAr: "رصيد افتتاحي / رأس مال", type: "IN", active: false },
    { id: "out1", nameAr: "إيجار", type: "OUT", active: true },
    { id: "out2", nameAr: "رواتب", type: "OUT", active: true },
    { id: "out3", nameAr: "مشتريات", type: "OUT", active: true },
    { id: "out4", nameAr: "صيانة", type: "OUT", active: false },
  ];
}

/**
 * Newest first, like B4. The stub closes the oldest of the three so the blocking
 * notice is reachable, and marks the open month unlockable.
 */
export async function listLocks(
  _establishmentId: string,
): Promise<LockRow[]> {
  const now = currentMonthKey();
  const months = lastMonths(3, now).reverse();
  return months.map((m, indexFromNewest) => {
    const locked = indexFromNewest === months.length - 1;
    return {
      year: m.year,
      month: m.month,
      ym: ymString(m.year, m.month),
      locked,
      lockedAt: locked ? "2026-09-01" : null,
      lockedByName: locked ? "سعد القحطاني" : null,
      lockable: !(m.year === now.year && m.month === now.month),
    };
  });
}

export async function getTransaction(
  _establishmentId: string,
  id: string,
): Promise<TransactionRow | null> {
  return {
    id,
    date: new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Riyadh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()),
    direction: "OUT",
    amountHalalas: 90000,
    categoryId: "out1",
    paymentMethod: "CASH",
    counterparty: "مكتب العقار",
    note: null,
  };
}
