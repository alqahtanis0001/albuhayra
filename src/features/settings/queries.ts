import "server-only";

import { db } from "@/lib/db";
import type { DirectionValue } from "@/lib/validation";

/** `establishmentId` always comes from requireX(), never from the client. */

export type CategoryRow = {
  id: string;
  nameAr: string;
  type: DirectionValue;
  active: boolean;
  sortOrder: number;
};

/**
 * Every category of one establishment, including the inactive ones — the
 * settings tab lists both. Callers that fill a form filter on `active`.
 */
export async function listCategories(
  establishmentId: string,
): Promise<CategoryRow[]> {
  return db.category.findMany({
    where: { establishmentId },
    select: {
      id: true,
      nameAr: true,
      type: true,
      active: true,
      sortOrder: true,
    },
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { nameAr: "asc" }],
  });
}
