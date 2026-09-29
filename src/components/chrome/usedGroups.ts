/**
 * The side nav's "used groups" (docs/FRONTEND.md, Owner navigation v1.2a): the
 * keys of the collapsible groups the owner has expanded or visited, so they
 * stay open next time. One of the two things localStorage may hold. Every
 * access is guarded — private windows and blocked storage throw — and the nav
 * works without it: the groups just start collapsed.
 */

export const USED_GROUPS_KEY = "zk_nav_groups";

/** Anything that is not a JSON array of strings reads as "nothing used". */
export function parseUsedGroups(raw: string | null): string[] {
  if (raw === null) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function readUsedGroups(): string[] {
  try {
    return parseUsedGroups(window.localStorage.getItem(USED_GROUPS_KEY));
  } catch {
    return [];
  }
}

/** Adds `key` to the stored set; returns the set as it now stands. */
export function rememberUsedGroup(key: string): string[] {
  const used = readUsedGroups();
  if (used.includes(key)) return used;
  const next = [...used, key];
  try {
    window.localStorage.setItem(USED_GROUPS_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable: the group is still open for this page view.
  }
  return next;
}
