/**
 * v1.4 part 2 (D24, D27 B1/S7): the rules behind the entry form's «تفاصيل
 * أكثر» disclosure, pure so each arm is pinned on its own.
 *
 * The disclosure opens on its own — whatever the device remembers — when the
 * entry being edited already has a party, a counterparty, a project or a note
 * (collapsing would hide a value), when a `?partyId=` / `?projectId=` preset
 * arrives (the preset lands in a field the user must be able to see), or when
 * the server's `fieldErrors` names one of the three fields (B1: an error under
 * a `hidden` field would leave only the generic toast). Otherwise the device's
 * remembered choice decides, and with nothing remembered the form is compact.
 *
 * `localStorage` is the third sanctioned use (docs/FRONTEND.md, Do not; D24):
 * read after mount only, every access guarded exactly as `DirectionToggle`.
 */
export const DETAILS_KEY = "ledger:detailsOpen";

/** The three fields the disclosure holds, plus the «أخرى» free text that belongs to الجهة. */
export const DETAIL_FIELDS = ["partyId", "counterparty", "projectId", "note"] as const;

export type DetailsInitial = {
  partyId: string | null;
  counterparty: string | null;
  projectId: string | null;
  note: string | null;
};

export function shouldOpenDetails({
  initial,
  presetPartyId,
  presetProjectId,
  fieldErrors,
  remembered,
}: {
  initial?: DetailsInitial;
  presetPartyId?: string;
  presetProjectId?: string;
  fieldErrors?: Record<string, string>;
  remembered: boolean;
}): boolean {
  if (initial && DETAIL_FIELDS.some((field) => Boolean(initial[field]))) return true;
  if (presetPartyId || presetProjectId) return true;
  if (fieldErrors && DETAIL_FIELDS.some((field) => field in fieldErrors)) return true;
  return remembered;
}

export function readDetailsOpen(): boolean {
  try {
    return localStorage.getItem(DETAILS_KEY) === "1";
  } catch {
    return false;
  }
}

export function rememberDetailsOpen(open: boolean): void {
  try {
    localStorage.setItem(DETAILS_KEY, open ? "1" : "0");
  } catch {
    // No storage available. The form simply starts compact next time.
  }
}
