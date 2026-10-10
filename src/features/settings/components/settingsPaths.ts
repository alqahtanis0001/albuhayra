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

/**
 * Anything unrecognised (or no tab) goes to رمز الانضمام — the first item of
 * the v1.4 الإعدادات group (D11). It used to be التصنيفات, which left the menus
 * in v1.4 and would make the categories page's «← الإعدادات» land on itself.
 * `?tab=categories` still goes to categories, so old bookmarks keep working.
 */
export function settingsRedirectPath(tab: string | string[] | undefined): string {
  return (typeof tab === "string" && TAB_PATHS.get(tab)) || "/owner/settings/join-code";
}
