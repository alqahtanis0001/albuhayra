import "server-only";

import { todayISO } from "@/lib/dates";
import { db } from "@/lib/db";
import { fullName, NAME_SELECT } from "@/lib/names";

/**
 * The platform administrator's view. **Security rule 10: no amounts, ever.**
 *
 * Nothing here may `select` `amountHalalas` or return a transaction row. The
 * field that makes that easy to get wrong is `lastActivityAt`: it is *derived
 * from* transactions without being one, so a convenience `include` or a
 * `findFirst` on the newest entry would pull a whole row — and its amount —
 * across a boundary the owner never agreed to. It is read with `groupBy` +
 * `_max: { createdAt: true }` for that reason, which cannot carry a value back.
 *
 * These are also **the one place in the app that is deliberately not scoped by
 * `establishmentId`**. ADMIN has `establishmentId: null` and the whole point is
 * the cross-establishment view, so the unscoped aggregate the B3 gate exists to
 * reject is correct here. `src/features/admin/**` is excluded from that gate on
 * purpose; `admin.test.ts` holds the no-amounts rule in its place.
 */

export type PendingOwner = {
  userId: string;
  /** First + middle + last (src/lib/names.ts). */
  fullName: string;
  email: string;
  /** The approve button is disabled — and the server refuses — until this is true. */
  emailVerified: boolean;
  establishmentName: string;
  /** ISO `YYYY-MM-DD` in Riyadh — a `DateTime`, so `todayISO`, not `dateToISO`. */
  requestedAt: string;
};

export type EstablishmentStatus = "PENDING" | "ACTIVE" | "DISABLED";

export type EstablishmentSummary = {
  id: string;
  name: string;
  /**
   * The OWNER's user id, which `resetOwnerPassword(userId, …)` binds to. Null
   * when an establishment somehow has no owner row — the screen drops the
   * control rather than passing an id the action would reject.
   *
   * An id carries no amount, so Security rule 10 is untouched.
   */
  ownerUserId: string | null;
  /** The owner's full name (first + middle + last). */
  ownerName: string;
  ownerEmail: string;
  /** The owner's address is verified (the owner is who the badge is about). */
  emailVerified: boolean;
  status: EstablishmentStatus;
  staffCount: number;
  transactionCount: number;
  lastActivityAt: string | null;
};

export type AdminOverview = {
  pendingOwners: PendingOwner[];
  establishments: EstablishmentSummary[];
};

/**
 * An establishment reads as PENDING while its owner is still waiting, DISABLED
 * once either the establishment or its owner is switched off, ACTIVE otherwise.
 * Owner status leads, because that is what the admin acts on.
 */
function summaryStatus(
  establishmentActive: boolean,
  ownerStatus: "PENDING" | "ACTIVE" | "DISABLED" | undefined,
): EstablishmentStatus {
  if (ownerStatus === "PENDING") return "PENDING";
  if (!establishmentActive || ownerStatus !== "ACTIVE") return "DISABLED";
  return "ACTIVE";
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const [establishments, activity, staff] = await Promise.all([
    db.establishment.findMany({
      select: {
        id: true,
        name: true,
        active: true,
        createdAt: true,
        users: {
          where: { role: "OWNER" },
          select: {
            id: true,
            ...NAME_SELECT,
            email: true,
            emailVerifiedAt: true,
            status: true,
            createdAt: true,
          },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    // Counts and the newest timestamp only. `_max: { createdAt: true }` is the
    // whole reason this is a groupBy: it cannot bring an amount with it.
    db.transaction.groupBy({
      by: ["establishmentId"],
      where: { deletedAt: null },
      _count: { _all: true },
      _max: { createdAt: true },
    }),
    db.user.groupBy({
      by: ["establishmentId"],
      where: { role: "STAFF", status: "ACTIVE" },
      _count: { _all: true },
    }),
  ]);

  const activityOf = new Map(activity.map((a) => [a.establishmentId, a]));
  const staffOf = new Map(staff.map((s) => [s.establishmentId, s._count._all]));

  const summaries: EstablishmentSummary[] = establishments.map((est) => {
    const owner = est.users[0];
    const seen = activityOf.get(est.id);
    return {
      id: est.id,
      name: est.name,
      ownerUserId: owner?.id ?? null,
      ownerName: owner ? fullName(owner) : "",
      ownerEmail: owner?.email ?? "",
      emailVerified: owner?.emailVerifiedAt != null,
      status: summaryStatus(est.active, owner?.status),
      staffCount: staffOf.get(est.id) ?? 0,
      transactionCount: seen?._count._all ?? 0,
      lastActivityAt: seen?._max.createdAt ? todayISO(seen._max.createdAt) : null,
    };
  });

  const pendingOwners: PendingOwner[] = establishments
    .filter((est) => est.users[0]?.status === "PENDING")
    .map((est) => {
      const owner = est.users[0]!;
      return {
        userId: owner.id,
        fullName: fullName(owner),
        email: owner.email,
        emailVerified: owner.emailVerifiedAt !== null,
        establishmentName: est.name,
        requestedAt: todayISO(owner.createdAt),
      };
    });

  return { pendingOwners, establishments: summaries };
}
