"use server";

/**
 * The three ledger mutations.
 *
 * Every write is an `updateMany` / `create` carrying `establishmentId`, never an
 * `update({ where: { id } })`. Prisma's `update` needs a *unique* where, and
 * `{ id, establishmentId }` is not unique, so `update` structurally cannot hold
 * the tenant scope — it can only be made safe by trusting the read above it.
 * `updateMany` puts the boundary in the SQL, where a future edit cannot drop it
 * by moving a line.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertUnlocked } from "@/features/locks/assertUnlocked";
import { checkCategory, EXISTING_SELECT, snapshot } from "@/features/transactions/links";
import { CONFLICT, inEntryTransaction, paymentOf, resolveEntry } from "@/features/transactions/payments";
import { writeAudit } from "@/lib/audit";
import { requireCanEdit, requireMember, requireOwner } from "@/lib/auth";
import { isoToDate, monthKey } from "@/lib/dates";
import { db } from "@/lib/db";
import { TransactionInputSchema, invalid, type ActionResult } from "@/lib/validation";

export type TransactionState = ActionResult<null> | null;

const idSchema = z.string().trim().min(1, "err.required").max(64, "err.tooLong");

/**
 * Every page under both layouts can show ledger numbers since v1.2a — party
 * balances, إضافة totals, plans, dues, the owner's overdue badge — so the two
 * role segments are revalidated whole.
 */
function revalidateLedger(): void {
  revalidatePath("/owner", "layout");
  revalidatePath("/staff", "layout");
}

/**
 * `FormData` is all strings, but the schema wants an integer count of halalas —
 * the form computes it with `parseSAR` and submits the integer as text. A
 * non-numeric value becomes NaN here and the schema answers `err.amountInvalid`.
 */
function transactionInput(formData: FormData): Record<string, unknown> {
  const raw = Object.fromEntries(formData) as Record<string, unknown>;
  return {
    ...raw,
    amountHalalas:
      raw.amountHalalas === undefined ? undefined : Number(raw.amountHalalas),
  };
}

/**
 * A rejection attributable to one input goes in `fieldErrors`, so the message
 * lands under that input rather than in a form-level toast (docs/BACKEND.md).
 * `err.monthLocked` has no field to blame and stays bare.
 */
function fieldError(
  field: string,
  key: string,
): { ok: false; error: string; fieldErrors: Record<string, string> } {
  return { ok: false, error: key, fieldErrors: { [field]: key } };
}

const refusal = (r: { key: string; field?: string }): ActionResult<null> =>
  r.field ? fieldError(r.field, r.key) : { ok: false, error: r.key };

/** Any ACTIVE member of the establishment may add an entry. */
export async function createTransaction(
  _prev: TransactionState,
  formData: FormData,
): Promise<ActionResult<null>> {
  const { user, establishmentId } = await requireMember();

  const parsed = TransactionInputSchema.safeParse(transactionInput(formData));
  if (!parsed.success) return invalid(parsed.error);
  const input = parsed.data;
  const when = isoToDate(input.date);
  // Payments (instalmentId) check canEdit before anything else (W3).
  const entry = await resolveEntry(establishmentId, user, input);
  if (!entry.ok) return refusal(entry);
  const links = entry.links;

  const locked = await assertUnlocked(establishmentId, [monthKey(when)]);
  if (locked) return { ok: false, error: locked };

  const badCategory = await checkCategory(establishmentId, input.categoryId, input.direction);
  if (badCategory) return fieldError("categoryId", badCategory);

  const done = await inEntryTransaction(entry.payment, establishmentId, user.id, async (tx) => {
    const row = await tx.transaction.create({
      data: {
        establishmentId,
        date: when,
        direction: input.direction,
        amountHalalas: input.amountHalalas,
        categoryId: input.categoryId,
        paymentMethod: input.paymentMethod,
        ...links,
        note: input.note ?? null,
        createdById: user.id,
      },
      select: { id: true },
    });
    await writeAudit({
      establishmentId,
      userId: user.id,
      action: "CREATE",
      entity: "Transaction",
      entityId: row.id,
      after: { ...snapshot({ ...input, ...links, date: when }) },
      client: tx,
    });
  });
  if (done === CONFLICT) return { ok: false, error: "err.concurrentChange" };

  revalidateLedger();
  return { ok: true, data: null };
}

/**
 * OWNER, or STAFF the owner has given `canEdit` — who may edit any entry of the
 * establishment, not only their own. **Both** months must be open: moving an
 * entry *out* of a locked month edits that locked month too.
 */
export async function updateTransaction(
  transactionId: string,
  _prev: TransactionState,
  formData: FormData,
): Promise<ActionResult<null>> {
  const { user, establishmentId } = await requireCanEdit();

  const parsedId = idSchema.safeParse(transactionId);
  if (!parsedId.success) return invalid(parsedId.error);
  const parsed = TransactionInputSchema.safeParse(transactionInput(formData));
  if (!parsed.success) return invalid(parsed.error);
  const input = parsed.data;
  const when = isoToDate(input.date);

  const existing = await db.transaction.findFirst({
    where: { establishmentId, id: parsedId.data, deletedAt: null },
    select: EXISTING_SELECT,
  });
  if (!existing) return { ok: false, error: "err.notFound" };

  const locked = await assertUnlocked(establishmentId, [
    monthKey(existing.date),
    monthKey(when),
  ]);
  if (locked) return { ok: false, error: locked };

  const badCategory = await checkCategory(establishmentId, input.categoryId, input.direction, existing.categoryId);
  if (badCategory) return fieldError("categoryId", badCategory);
  // instalmentId is never rewritten: absent on edit means "keep" (V12).
  const entry = await resolveEntry(establishmentId, user, input, existing);
  if (!entry.ok) return refusal(entry);
  const links = entry.links;

  const changed = await inEntryTransaction(entry.payment, establishmentId, user.id, async (tx) => {
    const { count } = await tx.transaction.updateMany({
      where: { establishmentId, id: existing.id, deletedAt: null },
      data: {
        date: when,
        direction: input.direction,
        amountHalalas: input.amountHalalas,
        categoryId: input.categoryId,
        paymentMethod: input.paymentMethod,
        ...links,
        note: input.note ?? null,
      },
    });
    if (count === 0) return 0;

    await writeAudit({
      establishmentId,
      userId: user.id,
      action: "UPDATE",
      entity: "Transaction",
      entityId: existing.id,
      before: { ...snapshot(existing) },
      after: {
        ...snapshot({ ...input, ...links, instalmentId: existing.instalmentId, date: when }),
      },
      client: tx,
    });
    return count;
  });
  if (changed === CONFLICT) return { ok: false, error: "err.concurrentChange" };
  if (changed === 0) return { ok: false, error: "err.notFound" };

  revalidateLedger();
  return { ok: true, data: null };
}

/** OWNER only, and a soft delete — the row and its audit trail both survive. */
export async function deleteTransaction(
  transactionId: string,
): Promise<ActionResult<null>> {
  const { user, establishmentId } = await requireOwner();

  const parsedId = idSchema.safeParse(transactionId);
  if (!parsedId.success) return invalid(parsedId.error);

  const existing = await db.transaction.findFirst({
    where: { establishmentId, id: parsedId.data, deletedAt: null },
    select: EXISTING_SELECT,
  });
  if (!existing) return { ok: false, error: "err.notFound" };

  const locked = await assertUnlocked(establishmentId, [
    monthKey(existing.date),
  ]);
  if (locked) return { ok: false, error: locked };

  // A payment's plan is re-allocated after the soft delete (un-pays).
  const payment = await paymentOf(establishmentId, existing.instalmentId);
  const changed = await inEntryTransaction(payment, establishmentId, user.id, async (tx) => {
    const { count } = await tx.transaction.updateMany({
      where: { establishmentId, id: existing.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (count === 0) return 0;

    await writeAudit({
      establishmentId,
      userId: user.id,
      action: "DELETE",
      entity: "Transaction",
      entityId: existing.id,
      before: { ...snapshot(existing) },
      client: tx,
    });
    return count;
  });
  if (changed === CONFLICT) return { ok: false, error: "err.concurrentChange" };
  if (changed === 0) return { ok: false, error: "err.notFound" };

  revalidateLedger();
  return { ok: true, data: null };
}
