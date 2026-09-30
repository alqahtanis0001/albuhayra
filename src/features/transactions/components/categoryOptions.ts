/**
 * The entry form's التصنيف options: active categories of the chosen direction
 * — plus the entry's own even if since deactivated, labelled as such. Without
 * that exception, editing an old entry would drop its category from the select
 * and silently reassign it. It is kept, never newly assigned.
 */
import type { CategoryRow } from "@/features/settings/queries";
import { t } from "@/i18n/ar";
import type { DirectionValue } from "@/lib/validation";

export function categoryOptions(
  categories: CategoryRow[],
  direction: DirectionValue,
  keepId?: string,
): { value: string; label: string }[] {
  return categories
    .filter((c) => c.type === direction && (c.active || c.id === keepId))
    .map((c) => ({
      value: c.id,
      label: c.active ? c.nameAr : `${c.nameAr} (${t.status.DISABLED})`,
    }));
}
