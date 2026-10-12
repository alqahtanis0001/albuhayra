/**
 * v1.5 theme choice (docs/V15-SPEC.md C2, D11, D31, D32; follow-up D45). Client-safe: no
 * `server-only`, no `next/headers` — the root layout and the ThemeToggle
 * server wrapper read the cookie and hand the value here; the client button
 * uses the rest.
 *
 * The choice lives in two places: the `theme` cookie (the server renders
 * `data-theme` from it, so there is no flash) and localStorage `ui:theme` (a
 * per-device copy). No choice is no attribute at all: CSS follows the OS
 * (`prefers-color-scheme`). `color-scheme` is set by the CSS selectors only.
 *
 * D45: the toggle is two-state. With no stored choice the page follows the
 * device; a tap stores the opposite of what is shown, so only "light" and
 * "dark" are ever written. "system" is still parsed (v1.5 wrote it) and read
 * as no choice.
 */
export type ThemeChoice = "light" | "dark" | "system";
/** What a tap can store, and what a page can show. */
export type ThemeMode = "light" | "dark";

export const THEME_CHOICES: readonly ThemeChoice[] = ["light", "dark", "system"];
export const THEME_COOKIE = "theme";
export const THEME_STORAGE_KEY = "ui:theme";
/** One year, in seconds. */
export const THEME_MAX_AGE = 60 * 60 * 24 * 365;

/** A stored/cookie value → a choice; anything absent or unknown → null. */
export function parseTheme(value: string | null | undefined): ThemeChoice | null {
  return THEME_CHOICES.find((c) => c === value) ?? null;
}

/** D45: a parsed value as a choice — "system" (or nothing) is no choice. */
export function explicitTheme(choice: ThemeChoice | null): ThemeMode | null {
  return choice === "light" || choice === "dark" ? choice : null;
}

/** What the page shows: the stored choice, else the device's scheme. */
export function shownTheme(choice: ThemeMode | null, deviceDark: boolean): ThemeMode {
  return choice ?? (deviceDark ? "dark" : "light");
}

/** D45: a tap stores the opposite of what is shown. */
export function toggleTheme(shown: ThemeMode): ThemeMode {
  return shown === "dark" ? "light" : "dark";
}

/** The `theme` cookie's value in a `document.cookie` string, or null. */
export function themeFromCookies(cookieHeader: string | null | undefined): ThemeChoice | null {
  const pair = (cookieHeader ?? "").split(";").find((p) => p.trim().startsWith(`${THEME_COOKIE}=`));
  return parseTheme(pair?.trim().slice(THEME_COOKIE.length + 1));
}

/**
 * The `Set-Cookie`-style string the client writes to `document.cookie`. Not
 * HttpOnly (the client writes it); Lax; Secure on https.
 */
export function themeCookie(choice: ThemeMode, secure: boolean): string {
  const parts = [`${THEME_COOKIE}=${choice}`, "Path=/", `Max-Age=${THEME_MAX_AGE}`, "SameSite=Lax"];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

/** The attributes for `<html>`: `data-theme` for an explicit choice, none for system. */
export function htmlThemeAttrs(choice: ThemeChoice | null): { "data-theme"?: "light" | "dark" } {
  return choice === "light" || choice === "dark" ? { "data-theme": choice } : {};
}

/** The few DOM/browser pieces the toggle touches — stubs in tests. */
export type ThemeEnv = {
  root: { setAttribute(name: string, value: string): void };
  setCookie(cookie: string): void;
  storage: { getItem(key: string): string | null; setItem(key: string, value: string): void } | null;
  secure: boolean;
};

function store(env: ThemeEnv, choice: ThemeMode): void {
  try {
    env.storage?.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // Private mode / blocked storage: the cookie still carries the choice.
  }
}

function stored(env: ThemeEnv): ThemeChoice | null {
  try {
    return parseTheme(env.storage?.getItem(THEME_STORAGE_KEY));
  } catch {
    return null;
  }
}

/** A tap: write localStorage and the cookie, and set the attribute at once (no reload). */
export function chooseTheme(choice: ThemeMode, env: ThemeEnv): ThemeMode {
  store(env, choice);
  env.setCookie(themeCookie(choice, env.secure));
  env.root.setAttribute("data-theme", choice);
  return choice;
}

/**
 * On mount. A present light/dark cookie wins (the server rendered from it) and
 * localStorage is brought in line; otherwise a valid stored light/dark choice
 * rewrites the cookie and is applied; neither → null (the device), nothing
 * written. A "system" cookie or stored value counts as absent (D45).
 */
export function reconcileTheme(cookieChoice: ThemeChoice | null, env: ThemeEnv): ThemeMode | null {
  const cookie = explicitTheme(cookieChoice);
  if (cookie) {
    if (stored(env) !== cookie) store(env, cookie);
    return cookie;
  }
  const local = explicitTheme(stored(env));
  return local ? chooseTheme(local, env) : null;
}
