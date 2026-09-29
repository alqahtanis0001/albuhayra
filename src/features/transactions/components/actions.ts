/**
 * The form's write path. W3 changes the last line to
 * `@/features/transactions/actions` and deletes stubActions.ts.
 *
 * `updateTransaction` takes the id first so the page can bind it server-side —
 * the id must never be a form field a client could edit.
 */
import type { ActionResult } from "@/lib/validation";

export type TransactionState = ActionResult<null> | null;

/** What TransactionForm accepts, after the edit page has bound the id. */
export type TransactionFormAction = (
  prev: TransactionState,
  formData: FormData,
) => Promise<ActionResult<null>>;

export { createTransaction, updateTransaction, deleteTransaction } from "./stubActions";
