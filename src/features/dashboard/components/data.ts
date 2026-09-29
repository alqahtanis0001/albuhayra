/**
 * The dashboard's data contract and its single import point. W2 changes the last
 * line to "@/features/dashboard/queries" and deletes stubDashboard.ts.
 *
 * `docs/BACKEND.md` names getOwnerDashboard's top-level fields but not the shape
 * of its four arrays, so those are spelled out here and have been sent to
 * `backend` before B3 is written. Amounts are halalas integers; nothing here is a
 * Date or a Decimal, because these values cross into a client component for the
 * chart and must be plain and serialisable.
 */
import type { DirectionValue, PaymentMethodValue } from "@/lib/validation";

export type MethodBalance = {
  method: PaymentMethodValue;
  /** IN minus OUT for this method, so it may be negative. */
  balanceHalalas: number;
};

export type TopOutCategory = {
  categoryId: string;
  nameAr: string;
  /** This month's OUT total for the category. The *percentage* is computed in the
   *  UI, because the divide-by-zero case is a presentation decision. */
  totalHalalas: number;
};

export type MonthTotals = {
  /** "2026-09" — from ymString(), so it sorts and needs no Date. */
  ym: string;
  inHalalas: number;
  outHalalas: number;
};

export type RecentTransaction = {
  id: string;
  /** ISO "YYYY-MM-DD", never a Date: <DateText> takes the string. */
  date: string;
  direction: DirectionValue;
  amountHalalas: number;
  categoryNameAr: string;
  paymentMethod: PaymentMethodValue;
  counterparty: string | null;
  /** For the "أضافه: <name>" line the ledger also shows. */
  createdByName: string;
};

export type OwnerDashboard = {
  balanceTotalHalalas: number;
  balanceByMethod: MethodBalance[];
  monthInHalalas: number;
  monthOutHalalas: number;
  monthNetHalalas: number;
  /** This month's top 5 OUT categories, already sorted and truncated. */
  topOutCategories: TopOutCategory[];
  /** Six entries, oldest first, from lastMonths(6). */
  last6Months: MonthTotals[];
  /** Ten most recent entries of the establishment, newest first. */
  recent: RecentTransaction[];
};

export { getOwnerDashboard } from "./stubDashboard";
