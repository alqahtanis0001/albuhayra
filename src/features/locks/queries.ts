import "server-only";

import { currentMonthKey, lastMonths, todayISO, ymString } from "@/lib/dates";
import { db } from "@/lib/db";
import { displayName, NAME_SELECT } from "@/lib/names";

export type LockRow = {
  year: number;
  month: number;
  /** `"2026-09"`, the key the settings grid renders by. */
  ym: string;
  locked: boolean;
  /**
   * ISO `YYYY-MM-DD` of the Riyadh calendar day the lock was taken — a string,
   * because the grid that shows "أقفله <name>" is a client component and a Date
   * is not a serialisable prop.
   *
   * Formatted with `todayISO(instant)` rather than `dateToISO()`: `lockedAt` is a
   * `DateTime`, not a `@db.Date`, so reading UTC getters off it would report the
   * previous day for anything locked before 03:00 Riyadh.
   */
  lockedAt: string | null;
  lockedByName: string | null;
  /** False for the open month and anything after it — the grid disables those. */
  lockable: boolean;
};

const WINDOW_MONTHS = 24;

/**
 * The last 24 months with their lock state, **newest first**: an owner locks the
 * month that has just ended, so that is the cell they came for.
 *
 * One query for the whole window rather than 24 lookups, and the months with no
 * row come back as unlocked rather than missing, so the grid never has holes.
 */
export async function listLocks(establishmentId: string): Promise<LockRow[]> {
  const months = lastMonths(WINDOW_MONTHS);
  const now = currentMonthKey();

  const locks = await db.periodLock.findMany({
    where: {
      establishmentId,
      OR: months.map(({ year, month }) => ({ year, month })),
    },
    select: {
      year: true,
      month: true,
      lockedAt: true,
      lockedBy: { select: NAME_SELECT },
    },
  });

  const lockOf = new Map(
    locks.map((l) => [ymString(l.year, l.month), l] as const),
  );

  return months
    .map(({ year, month }) => {
      const ym = ymString(year, month);
      const lock = lockOf.get(ym);
      return {
        year,
        month,
        ym,
        locked: lock !== undefined,
        lockedAt: lock ? todayISO(lock.lockedAt) : null,
        lockedByName: lock ? displayName(lock.lockedBy) : null,
        lockable: year * 12 + month < now.year * 12 + now.month,
      };
    })
    .reverse();
}
