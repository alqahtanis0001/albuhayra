"use server";

/**
 * F4 stubs for `createTransaction` / `updateTransaction` (B3), with the
 * signatures `backend` confirmed: `(prev, formData)` in, `ActionResult<null>`
 * out, id bound first on update. Deleted by W3.
 *
 * These *return* rather than redirect, which is what lets حفظ وإضافة أخرى stay
 * on the form. See the note in TransactionForm.tsx.
 */
import type { ActionResult } from "@/lib/validation";

type TransactionState = ActionResult<null> | null;

export async function createTransaction(
  _prev: TransactionState,
  _formData: FormData,
): Promise<ActionResult<null>> {
  return { ok: true, data: null };
}

export async function updateTransaction(
  _transactionId: string,
  _prev: TransactionState,
  _formData: FormData,
): Promise<ActionResult<null>> {
  return { ok: true, data: null };
}

/** OWNER only, and soft-deletes. The stub reports success and changes nothing. */
export async function deleteTransaction(
  _transactionId: string,
): Promise<ActionResult<null>> {
  return { ok: true, data: null };
}
