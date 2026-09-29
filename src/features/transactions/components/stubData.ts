/**
 * F4 stub for
 * `getTransaction` (B3). Deleted by W3.
 */

import type { TransactionRow } from "./data";

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
