/**
 * v1.4 part 3 (D29 R8, D32 S7): the agreement forms' prefills — the title
 * «اتفاقية مع {الجهة}» once a party is chosen, and the category from the
 * direction (receivable → the active IN category named «سداد من عميل», else
 * «دفعة من عميل», else the first active IN; payable → the first active OUT).
 * A prefill only ever replaces an empty field or the previous prefill, never
 * the owner's own text; the previous prefills travel with the form's state.
 * Pure; no validation import.
 */
import type { CategoryRow } from "@/features/settings/queries";
import { t } from "@/i18n/ar";
import { CUSTOMER_PAYMENT_CATEGORY, LEGACY_CUSTOMER_PAYMENT_CATEGORY } from "@/lib/categoryNames";

/** The seeded IN category names a customer payment may carry (R7 renamed the first; older rows keep the second). */
const CUSTOMER_PAYMENT_NAMES = [CUSTOMER_PAYMENT_CATEGORY, LEGACY_CUSTOMER_PAYMENT_CATEGORY] as const;

export type Prefills = { title: string; categoryId: string };
export const NO_PREFILLS: Prefills = { title: "", categoryId: "" };

export function titlePrefillFor(partyName: string): string {
  return t.plans.titlePrefill.replace("{name}", partyName);
}

/** The new title: the prefill when `current` is empty or is the previous prefill, else the owner's own text. */
export function prefillTitle(current: string, previousPrefill: string, partyName: string): string {
  return current === "" || current === previousPrefill ? titlePrefillFor(partyName) : current;
}

/** The category id for a direction, per R8; "" when the direction is unset or nothing is active. */
export function prefillCategory(categories: CategoryRow[], direction: "IN" | "OUT" | ""): string {
  if (!direction) return "";
  const active = categories.filter((c) => c.active && c.type === direction);
  if (direction === "IN") {
    for (const name of CUSTOMER_PAYMENT_NAMES) {
      const hit = active.find((c) => c.nameAr === name);
      if (hit) return hit.id;
    }
  }
  return active[0]?.id ?? "";
}

type Values = { title: string; categoryId: string; direction: "IN" | "OUT" | "" };

/**
 * Applies both prefills to a form state (after `applyPartyChoice`, or after a
 * direction change — pass no `partyName` then) and returns the prefills to
 * remember. The category is prefilled only while empty or still the previous
 * prefill, so a chosen category survives a party or direction change that
 * keeps it; the title likewise.
 */
export function applyPlanPrefill<V extends Values>(
  values: V,
  prefills: Prefills,
  partyName: string | undefined,
  categories: CategoryRow[],
): { values: V; prefills: Prefills } {
  let title = values.title;
  let titlePrefill = prefills.title;
  if (partyName) {
    title = prefillTitle(values.title, prefills.title, partyName);
    titlePrefill = titlePrefillFor(partyName);
  }
  let categoryId = values.categoryId;
  let categoryPrefill = prefills.categoryId;
  if (categoryId === "" || categoryId === prefills.categoryId) {
    categoryPrefill = prefillCategory(categories, values.direction);
    categoryId = categoryPrefill;
  }
  return { values: { ...values, title, categoryId }, prefills: { title: titlePrefill, categoryId: categoryPrefill } };
}
