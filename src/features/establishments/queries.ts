import "server-only";

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
  createdAt: Date;
};

/** Every STAFF of one establishment. Pending first — they are the actionable ones. */
export async function listStaff(establishmentId: string): Promise<StaffRow[]> {
  return db.user.findMany({
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
}

/** The code the owner reads out to a new employee, for the join-code tab. */
export async function getJoinCode(establishmentId: string): Promise<string | null> {
  const row = await db.establishment.findUnique({
    where: { id: establishmentId },
    select: { joinCode: true },
  });
  return row?.joinCode ?? null;
}
