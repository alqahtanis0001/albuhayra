/**
 * v1.4 §A (A3/A4, D17 c5): the entry form's category list is client state once
 * the owner can add and hide categories from the form, and these are the rules
 * that change it. Pure — no React, no DB — so each rule is tested on its own
 * and the components only wire them up.
 *
 * A hidden category is never removed from the list: it stays as `active: false`
 * so «إظهار» can bring it back and `categoryOptions` can keep an entry's own
 * retired category listed as «(موقوف)» (kept, never newly assigned — K4).
 */
import type { CategoryRow } from "@/features/settings/queries";
import type { DirectionValue } from "@/lib/validation";

import { categoryOptions } from "./categoryOptions";

/** The row `createCategory` returns (D12). Declared here so no client file imports the action module for a type. */
export type AddedCategory = { id: string; nameAr: string; type: DirectionValue };

export type CategoryListChange = { categories: CategoryRow[]; selected: string };

/** The active categories of one direction — the chips of edit mode. */
export function activeOf(list: CategoryRow[], direction: DirectionValue): CategoryRow[] {
  return list.filter((c) => c.type === direction && c.active);
}

/** c5: the hidden categories of one direction only — the grey «إظهار» chips. */
export function hiddenOf(list: CategoryRow[], direction: DirectionValue): CategoryRow[] {
  return list.filter((c) => c.type === direction && !c.active);
}

/**
 * A3: the returned row joins its own direction's list and becomes the selection.
 * Upsert by id (K4): `createCategory` revives a retired namesake instead of
 * inserting, and that row may already be listed — as «(موقوف)» on an edit form.
 */
export function applyAdded(list: CategoryRow[], row: AddedCategory): CategoryListChange {
  const known = list.some((c) => c.id === row.id);
  const categories = known
    ? list.map((c) => (c.id === row.id ? { ...c, nameAr: row.nameAr, active: true } : c))
    : [
        ...list,
        {
          id: row.id,
          nameAr: row.nameAr,
          type: row.type,
          active: true,
          // After the last of its direction, as the server orders it.
          sortOrder: Math.max(0, ...list.filter((c) => c.type === row.type).map((c) => c.sortOrder)) + 1,
        },
      ];
  return { categories, selected: row.id };
}

/**
 * A4: a hidden category's option leaves the select, and a selection that pointed
 * at it resets to the placeholder — unless it is the entry's own kept category
 * (`keepId`), which `categoryOptions` still lists, so the selection survives.
 */
export function applyHidden(
  list: CategoryRow[],
  id: string,
  selected: string,
  direction: DirectionValue,
  keepId?: string,
): CategoryListChange {
  const categories = list.map((c) => (c.id === id ? { ...c, active: false } : c));
  const stillOffered = categoryOptions(categories, direction, keepId).some((o) => o.value === selected);
  return { categories, selected: stillOffered ? selected : "" };
}

/** c5: «إظهار» — the option returns to the select; the current selection is untouched. */
export function applyShown(list: CategoryRow[], id: string): CategoryRow[] {
  return list.map((c) => (c.id === id ? { ...c, active: true } : c));
}

/** The FormData `createCategory` reads: the typed name and the form's current direction. */
export function quickCreateForm(nameAr: string, direction: DirectionValue): FormData {
  const form = new FormData();
  form.append("nameAr", nameAr);
  form.append("type", direction);
  return form;
}

/**
 * K6: Enter inside the inline name input must save the *category*, never submit
 * the entry form around it (implicit submission). Anything else passes through.
 */
export function swallowEnter(
  event: { key: string; preventDefault(): void },
  save: () => void,
): void {
  if (event.key !== "Enter") return;
  event.preventDefault();
  save();
}

/** `{name}` in a template, `$&`-safe (a category called "$&" must not echo the pattern). */
export function fillName(template: string, name: string): string {
  return template.replace("{name}", () => name);
}
