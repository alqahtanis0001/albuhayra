import "server-only";

import type { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";

import type { FirstRunFlags } from "./components/firstRun";

export type { FirstRunFlags };

/**
 * v1.4 D25: the four existence facts behind the owner home's first-run card.
 * Counts reduced to booleans here, so nothing numeric leaves this module. The
 * entry count goes through the caller's `ledgerWhere` object (scoped and
 * `deletedAt: null` — D27); party, plan and employee have no soft delete, so a
 * bare establishment scope is the whole rule for them. Driven by the scoping
 * gate through `getOwnerDashboard`.
 */
export async function readFirstRunFlags(
  establishmentId: string,
  allTime: Prisma.TransactionWhereInput,
): Promise<FirstRunFlags> {
  const [entries, parties, plans, employees] = await Promise.all([
    db.transaction.count({ where: allTime }),
    db.party.count({ where: { establishmentId } }),
    db.plan.count({ where: { establishmentId } }),
    db.employee.count({ where: { establishmentId } }),
  ]);

  return {
    hasEntry: entries > 0,
    hasParty: parties > 0,
    hasPlan: plans > 0,
    hasEmployee: employees > 0,
  };
}
