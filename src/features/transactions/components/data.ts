/**
 * TransactionForm's reads and their contract. Wired to the real query by W3;
 * the stub it used to point at is gone.
 *
 * The form takes locked months as a list of "YYYY-MM" keys rather than a
 * boolean, because whether it is blocked depends on the date the user picks —
 * and, on edit, on the month the entry is in now. The page derives that list
 * from `listLocks`, so the component never carries fields it does not use.
 *
 * Neither `listLocks`/`LockRow` nor `listCategories`/`CategoryRow` are re-exported
 * here: they come straight from `@/features/locks/queries` and
 * `@/features/settings/queries`, one source each. Two sources for the same fact
 * is a correctness risk rather than untidiness — the hand copies that lived here
 * while B4 and B2 were unwritten had already drifted. `TransactionRow` is picked
 * from `LedgerRow` for the same reason, rather than restated.
 *
 * Only *types* may be imported from this module by a client component:
 * `getTransaction` is server-only.
 */
import type { LedgerRow } from "@/features/transactions/queries";

export type TransactionRow = Pick<
  LedgerRow,
  | "id"
  | "date"
  | "direction"
  | "amountHalalas"
  | "categoryId"
  | "paymentMethod"
  | "counterparty"
  | "note"
>;

export { getTransaction } from "@/features/transactions/queries";
