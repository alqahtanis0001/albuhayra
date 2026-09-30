import "server-only";

import { dateToISO, todayISO } from "@/lib/dates";
import { db } from "@/lib/db";
import type { ActionResult } from "@/lib/validation";

/**
 * The checks behind a client reminder (docs/V12C-DESIGN.md C9–C12, E8).
 * Server-only, not `"use server"`: these take an establishment id, and the
 * callable actions in `client.ts` pass the one `requireOwner()` returned.
 */

/** E8: client emails per establishment per Riyadh day, counted from the audit log. */
export const CLIENT_EMAILS_PER_DAY = 20;

export type ReminderTarget = {
  instalmentId: string;
  planId: string;
  planTitle: string;
  partyId: string;
  partyEmail: string | null;
  remainingHalalas: number;
  dueDate: string;
};

/**
 * The instalment, if a reminder may be sent for it: in this establishment
 * (else `notFound`, rule 11), on an OPEN plan the party owes us (IN), still
 * unpaid (else `reminderNotApplicable`), and the party opted in (C9).
 */
export async function reminderTarget(
  establishmentId: string,
  instalmentId: string,
): Promise<ActionResult<ReminderTarget>> {
  const row = await db.instalment.findFirst({
    where: { establishmentId, id: instalmentId },
    select: {
      id: true,
      planId: true,
      dueDate: true,
      amountDueHalalas: true,
      paidHalalas: true,
      plan: {
        select: {
          title: true, direction: true, state: true, partyId: true,
          party: { select: { email: true, remindersOptIn: true } },
        },
      },
    },
  });
  if (!row) return { ok: false, error: "err.notFound" };
  if (row.plan.direction !== "IN" || row.plan.state !== "OPEN" || row.paidHalalas >= row.amountDueHalalas) {
    return { ok: false, error: "err.reminderNotApplicable" };
  }
  if (!row.plan.party.remindersOptIn) return { ok: false, error: "err.remindersNotOptedIn" };
  // Computed before the result object: W5 scans every data key for the cache column.
  const remainingHalalas = row.amountDueHalalas - row.paidHalalas;
  return {
    ok: true,
    data: {
      instalmentId: row.id,
      planId: row.planId,
      // IN plans are never SALARY (salary is always OUT), so the stored title is the title.
      planTitle: row.plan.title,
      partyId: row.plan.partyId,
      partyEmail: row.plan.party.email,
      remainingHalalas,
      dueDate: dateToISO(row.dueDate),
    },
  };
}

/** Midnight at the start of `now`'s Riyadh day, as an instant (UTC+3, no DST). */
export function riyadhDayStart(now: Date): Date {
  return new Date(`${todayISO(now)}T00:00:00+03:00`);
}

/** E8, durable: has this instalment been emailed since Riyadh midnight? */
export async function emailedToday(establishmentId: string, instalmentId: string, since: Date): Promise<boolean> {
  const found = await db.auditLog.findFirst({
    where: {
      establishmentId,
      action: "CLIENT_REMINDER_EMAIL",
      entity: "Instalment",
      entityId: instalmentId,
      createdAt: { gte: since },
    },
    select: { id: true },
  });
  return found !== null;
}

/** E8: client emails this establishment sent since Riyadh midnight. */
export async function emailsToday(establishmentId: string, since: Date): Promise<number> {
  return db.auditLog.count({
    where: { establishmentId, action: "CLIENT_REMINDER_EMAIL", createdAt: { gte: since } },
  });
}
