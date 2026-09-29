import "server-only";

import { currentMonthKey } from "@/lib/dates";
import { db } from "@/lib/db";

export type MonthRef = { year: number; month: number };

/**
 * The month-lock gate every transaction mutation passes through.
 *
 * Named "assert" in docs/BACKEND.md but it **returns** rather than throws: an
 * action has to answer with an `ActionResult`, and an exception thrown here
 * would reach the error boundary instead of the form. `null` means every month
 * given is open.
 *
 * `updateTransaction` passes two months — the entry's current one and the one it
 * is moving to — because moving an entry *out* of a locked month edits that
 * locked month just as much as moving one in.
 */
export async function assertUnlocked(
  establishmentId: string,
  months: MonthRef[],
): Promise<"err.monthLocked" | null> {
  if (months.length === 0) return null;

  const lock = await db.periodLock.findFirst({
    where: {
      establishmentId,
      OR: months.map(({ year, month }) => ({ year, month })),
    },
    select: { id: true },
  });

  return lock === null ? null : "err.monthLocked";
}

/**
 * Strictly before the current Riyadh month — the only months a lock may cover.
 * Lives here rather than in actions.ts because a `"use server"` module may only
 * export async functions, and this is the piece most worth testing directly.
 */
export function isClosedMonth(
  year: number,
  month: number,
  now: { year: number; month: number } = currentMonthKey(),
): boolean {
  return year * 12 + month < now.year * 12 + now.month;
}
