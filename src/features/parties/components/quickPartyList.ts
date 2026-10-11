/**
 * v1.4 part 2 (D23, D27 S5/S6): the rules behind the inline «+ جهة جديدة» box
 * on the entry and agreement forms, pure so each is pinned on its own.
 *
 * The party option list becomes client state once the owner can add a party
 * from the form (as the v1.4 categories do); `applyAddedParty` upserts by id so
 * a second add — or a row the list already shows — never duplicates an option.
 * `NEW_PARTY` is the select's sentinel: it opens the box and must never be the
 * posted value, so every form posts `postedPartyId(choice)` through a hidden
 * `partyId` input and the select itself carries no `name`. While the box is
 * open the select *shows* the sentinel (`shownPartyChoice`) but the form's own
 * choice is left alone, so «إلغاء» restores party, direction and category
 * exactly (R-p2-1-S1).
 */
import type { PartyOption } from "@/features/parties/queries";
import { PartyInputSchema, type PartyTypeValue } from "@/lib/validation";

/** The sentinel option; never reaches the server. */
export const NEW_PARTY = "__new";

/** عميل / مورد / أخرى — never موظف: an employee is created only through الموظفون. */
export const QUICK_PARTY_TYPES = ["CUSTOMER", "SUPPLIER", "OTHER"] as const satisfies readonly PartyTypeValue[];
export type QuickPartyType = (typeof QUICK_PARTY_TYPES)[number];

/** What the select shows: the sentinel while the box is open, otherwise the form's choice. */
export function shownPartyChoice(choice: string, adding: boolean): string {
  return adding ? NEW_PARTY : choice;
}

/** The value the hidden `partyId` input posts: "" while the sentinel is chosen, the id otherwise. */
export function postedPartyId(choice: string): string {
  return choice === NEW_PARTY ? "" : choice;
}

/** The FormData `createParty` reads: the typed name and the chosen type (phone, email, notes stay empty). */
export function quickPartyForm(name: string, type: QuickPartyType): FormData {
  const form = new FormData();
  form.append("name", name);
  form.append("type", type);
  return form;
}

/** S5: the option the form shows for the row `createParty` created — its name as the server normalised it. */
export function addedParty(id: string, name: string, type: QuickPartyType): PartyOption {
  const parsed = PartyInputSchema.shape.name.safeParse(name);
  return { id, name: parsed.success ? parsed.data : name.trim(), type, active: true };
}

/** Upsert by id: a known id is replaced in place (name, type, active), an unknown one is appended. */
export function applyAddedParty(list: PartyOption[], row: PartyOption): PartyOption[] {
  return list.some((p) => p.id === row.id)
    ? list.map((p) => (p.id === row.id ? { ...p, name: row.name, type: row.type, active: true } : p))
    : [...list, row];
}
