/**
 * TransactionForm's reads and their contract. W3 points the last two lines at
 * `@/features/settings/queries` and `@/features/transactions/queries` and
 * deletes stubData.ts.
 *
 * The form takes locked months as a list of "YYYY-MM" keys rather than a
 * boolean, because whether it is blocked depends on the date the user picks —
 * and, on edit, on the month the entry is in now. The page derives that list
 * from `listLocks`, so the component never carries fields it does not use.
 */
import type { DirectionValue, PaymentMethodValue } from "@/lib/validation";

export type CategoryRow = {
  id: string;
  nameAr: string;
  type: DirectionValue;
  /** listCategories returns inactive rows too; the form select filters them out. */
  active: boolean;
};

/**
 * One row of `listLocks(estId)` — **newest first**, deliberately the opposite of
 * `last6Months`: an owner locks the month that just ended, so that is the cell
 * they came for. `lockable` is false for the open month and anything after it,
 * which lets F8 disable those cells without deciding "now" on the client.
 */
export type LockRow = {
  year: number;
  month: number;
  /** "2026-09". */
  ym: string;
  locked: boolean;
  /** ISO string, never a Date — these rows reach client components. */
  lockedAt: string | null;
  lockedByName: string | null;
  lockable: boolean;
};

export type TransactionRow = {
  id: string;
  date: string;
  direction: DirectionValue;
  amountHalalas: number;
  categoryId: string;
  paymentMethod: PaymentMethodValue;
  counterparty: string | null;
  note: string | null;
};

export { listCategories, listLocks, getTransaction } from "./stubData";
