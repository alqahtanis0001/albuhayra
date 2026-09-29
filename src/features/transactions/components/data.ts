/**
 * TransactionForm's reads and their contract. W3 points the last two lines at
 * `@/features/settings/queries` and `@/features/transactions/queries` and
 * deletes stubData.ts.
 *
 * The form takes locked months as a list of "YYYY-MM" keys rather than a
 * boolean, because whether it is blocked depends on the date the user picks —
 * and, on edit, on the month the entry is in now. The page derives that list
 * from `listLocks`, so the component never carries fields it does not use.
 *
 * Neither `listLocks`/`LockRow` nor `listCategories`/`CategoryRow` are re-exported
 * here any more: they come straight from `@/features/locks/queries` and
 * `@/features/settings/queries`, one source each. Hand copies lived here while B4
 * and B2 were unwritten, and two sources for the same fact is a correctness risk
 * rather than untidiness — the ledger and the settings grid disagreeing about a
 * lock, or the filter and the entry form disagreeing about which categories
 * exist, are both real bugs. The category copy had already drifted: it was
 * missing `sortOrder`.
 *
 * `getTransaction` stays stubbed deliberately. It is W3's, because the edit page
 * needs its actions wired at the same time, and a swap point pointing at one real
 * query and one stub would tell two stories.
 */
import type { DirectionValue, PaymentMethodValue } from "@/lib/validation";

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

export { getTransaction } from "./stubData";
