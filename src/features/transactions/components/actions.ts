/**
 * The form's write path. Wired to the real actions by W3/W4; the stubs it used
 * to point at are gone. Kept as one module so TransactionForm and
 * DeleteEntryButton never reach into the feature's `actions.ts` directly.
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

export {
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "@/features/transactions/actions";
