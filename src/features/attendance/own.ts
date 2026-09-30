import "server-only";

import { requireStaff } from "@/lib/auth";
import { dateToISO } from "@/lib/dates";
import { db } from "@/lib/db";

/**
 * «حضوري» — the one way self-service finds its employee (spec §3.1; L9, Z5).
 * The session's STAFF user id is the only key: never an id from a URL, a form
 * or a search param. Scoped by the session's establishment as well.
 */

export type OwnEmployee = {
  id: string;
  name: string;
  status: "ACTIVE" | "ENDED";
  startDate: string;
  endDate: string | null;
  workDays: number;
  workStart: string | null;
  workEnd: string | null;
  graceMinutes: number | null;
};

export async function ownEmployee(): Promise<{ establishmentId: string; userId: string; employee: OwnEmployee | null }> {
  const { user, establishmentId } = await requireStaff();
  const e = await db.employee.findFirst({
    where: { establishmentId, userId: user.id },
    select: {
      id: true, status: true, startDate: true, endDate: true, workDays: true, workStart: true, workEnd: true,
      graceMinutes: true, party: { select: { name: true } },
    },
  });
  return {
    establishmentId,
    userId: user.id,
    employee: e
      ? {
          id: e.id,
          name: e.party.name,
          status: e.status,
          startDate: dateToISO(e.startDate),
          endDate: e.endDate ? dateToISO(e.endDate) : null,
          workDays: e.workDays,
          workStart: e.workStart,
          workEnd: e.workEnd,
          graceMinutes: e.graceMinutes,
        }
      : null,
  };
}

/** Z5: check-in/out need ACTIVE with hire ≤ today ≤ end; reads do not. */
export function canClock(e: OwnEmployee, today: string): boolean {
  return e.status === "ACTIVE" && e.startDate <= today && (e.endDate === null || today <= e.endDate);
}

/** M7: the staff layout shows «حضوري» only for a linked login — one scoped lookup. */
export async function hasEmployeeLink(establishmentId: string, userId: string): Promise<boolean> {
  const row = await db.employee.findFirst({ where: { establishmentId, userId }, select: { id: true } });
  return row !== null;
}
