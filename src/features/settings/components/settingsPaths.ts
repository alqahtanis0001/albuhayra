/**
 * v1.2a split the settings tabs into pages (docs/FRONTEND.md, Settings split),
 * because a nav item must be a path. /owner/settings?tab=… still arrives from
 * old links and bookmarks, so it redirects to the page that tab became.
 */
const TAB_PATHS = new Map<string, string>([
  ["categories", "/owner/settings/categories"],
  ["staff", "/owner/staff/logins"],
  ["joinCode", "/owner/settings/join-code"],
  ["locks", "/owner/settings/locks"],
  ["account", "/owner/settings/account"],
]);

/** Anything unrecognised (or no tab) goes to التصنيفات, as the first tab did. */
export function settingsRedirectPath(tab: string | string[] | undefined): string {
  return (typeof tab === "string" && TAB_PATHS.get(tab)) || "/owner/settings/categories";
}
