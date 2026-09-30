import "server-only";

import { isoToDate } from "@/lib/dates";
import { db } from "@/lib/db";

import { DIGEST_OWNER_WHERE } from "./settings";

/**
 * Who gets a digest now (docs/V12C-DESIGN.md C4, E1, N9, N12). The ONLY
 * cross-establishment read in the reminders feature, so it is kept apart from
 * the per-establishment work in `digest.ts` / `run.ts`: excluded from the
 * scoping gate's FILES by name, and held instead by its own static gate in
 * `reminders.test.ts` — receivers only `establishment` / `user` /
 * `reminderDigest`, an explicit `select`, no financial model, no amount field.
 * It returns routing data only: ids, the owner's address, the name, the hour.
 */

export type DigestTarget = {
  establishmentId: string;
  ownerId: string;
  ownerEmail: string;
  name: string;
  digestHour: number;
};

/**
 * Active establishments with the digest on, whose hour has come (Riyadh), and
 * with no claim for `today` yet — each with exactly one ACTIVE, verified
 * OWNER; anything else is skipped and logged without an address (N9). The
 * claim in `run.ts` stays the real at-most-once guard; this only saves work.
 */
export async function selectDigestTargets(today: string, hour: number): Promise<DigestTarget[]> {
  const rows = await db.establishment.findMany({
    where: {
      active: true,
      digestEnabled: true,
      digestHour: { lte: hour },
      reminderDigests: { none: { date: isoToDate(today) } },
    },
    select: {
      id: true,
      name: true,
      digestHour: true,
      users: {
        where: DIGEST_OWNER_WHERE,
        select: { id: true, email: true },
      },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  const targets: DigestTarget[] = [];
  for (const row of rows) {
    if (row.users.length !== 1) {
      console.error(`[digest] skipped: ${row.users.length} eligible owners`);
      continue;
    }
    const [owner] = row.users;
    targets.push({
      establishmentId: row.id,
      ownerId: owner.id,
      ownerEmail: owner.email,
      name: row.name,
      digestHour: row.digestHour,
    });
  }
  return targets;
}
