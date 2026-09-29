import "server-only";

import { todayISO } from "@/lib/dates";
import { db } from "@/lib/db";

/**
 * Reads for the owner's staff and join-code tabs. `establishmentId` always comes
 * from requireOwner() at the page boundary, never from a URL or a form.
 */

export type StaffRow = {
  id: string;
  name: string;
  email: string;
  status: "PENDING" | "ACTIVE" | "DISABLED";
  canEdit: boolean;
  /**
   * ISO `YYYY-MM-DD` in Riyadh, not a Date: the staff tab renders it in a client
   * component. `createdAt` is a `DateTime`, so it goes through `todayISO()` — see
   * the same note on LockRow.lockedAt.
   */
  createdAt: string;
};

/** Every STAFF of one establishment. Pending first — they are the actionable ones. */
export async function listStaff(establishmentId: string): Promise<StaffRow[]> {
  const rows = await db.user.findMany({
    where: { establishmentId, role: "STAFF" },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      canEdit: true,
      createdAt: true,
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  return rows.map((row) => ({ ...row, createdAt: todayISO(row.createdAt) }));
}

/** The code the owner reads out to a new employee, for the join-code tab. */
export async function getJoinCode(establishmentId: string): Promise<string | null> {
  const row = await db.establishment.findUnique({
    where: { id: establishmentId },
    select: { joinCode: true },
  });
  return row?.joinCode ?? null;
}
