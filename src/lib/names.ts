/**
 * How a person's name is shown (v1.1e). Pure: no database, no Next.js import,
 * so client components, queries and the export can all use it.
 *
 * - **Display name** (first + last) everywhere a person is named in passing:
 *   the top bar, "entered by", "locked by", the export's generated-by line.
 * - **Full name** (first + middle + last) on the lists where an admin or owner
 *   decides about a person: pending owners, establishments, the staff list.
 *
 * Expand step (docs/BACKEND.md A9): a row the previous release inserted while
 * Render was building has `firstName = ''` and its whole name in `legacyName`
 * (the old `name` column). Both helpers fall back to it, so such a person is
 * never shown as a blank.
 */

export type NameParts = {
  firstName: string;
  middleName?: string | null;
  lastName: string;
  legacyName?: string | null;
};

function join(parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => (part ?? "").trim())
    .filter((part) => part !== "")
    .join(" ");
}

export function displayName(user: NameParts): string {
  if (user.firstName.trim() === "") return (user.legacyName ?? "").trim();
  return join([user.firstName, user.lastName]);
}

export function fullName(user: NameParts): string {
  if (user.firstName.trim() === "") return (user.legacyName ?? "").trim();
  return join([user.firstName, user.middleName, user.lastName]);
}

/** The select every caller that shows a name needs — one place, so none forgets `legacyName`. */
export const NAME_SELECT = {
  firstName: true,
  middleName: true,
  lastName: true,
  legacyName: true,
} as const;
