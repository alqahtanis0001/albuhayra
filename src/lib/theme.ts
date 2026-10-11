/**
 * v1.5 theme choice (docs/V15-SPEC.md C2, D11, D31, D32). Client-safe: no
 * `server-only`, no `next/headers` — the root layout and the ThemeToggle
 * server wrapper read the cookie and hand the value here; the client button
 * uses the rest.
 *
 * The choice lives in two places: the `theme` cookie (the server renders
 * `data-theme` from it, so there is no flash) and localStorage `ui:theme` (a
 * per-device copy). "system" is no attribute at all: CSS follows the OS
 * (`prefers-color-scheme`). `color-scheme` is set by the CSS selectors only.
 */
export type ThemeChoice = "light" | "dark" | "system";

export const THEME_CHOICES: readonly ThemeChoice[] = ["light", "dark", "system"];
export const THEME_COOKIE = "theme";
export const THEME_STORAGE_KEY = "ui:theme";
/** One year, in seconds. */
export const THEME_MAX_AGE = 60 * 60 * 24 * 365;

/** A stored/cookie value → a choice; anything absent or unknown → null. */
export function parseTheme(value: string | null | undefined): ThemeChoice | null {
  return THEME_CHOICES.find((c) => c === value) ?? null;
}

/** The toggle's cycle: light → dark → system → light. */
export function nextTheme(choice: ThemeChoice): ThemeChoice {
  return choice === "light" ? "dark" : choice === "dark" ? "system" : "light";
}

/**
 * The `Set-Cookie`-style string the client writes to `document.cookie`. Not
 * HttpOnly (the client writes it); Lax; Secure on https.
 */
export function themeCookie(choice: ThemeChoice, secure: boolean): string {
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
  root: { setAttribute(name: string, value: string): void; removeAttribute(name: string): void };
  setCookie(cookie: string): void;
  storage: { getItem(key: string): string | null; setItem(key: string, value: string): void } | null;
  secure: boolean;
};

function applyAttr(env: ThemeEnv, choice: ThemeChoice): void {
  const attrs = htmlThemeAttrs(choice);
  if (attrs["data-theme"]) env.root.setAttribute("data-theme", attrs["data-theme"]);
  else env.root.removeAttribute("data-theme");
}

function store(env: ThemeEnv, choice: ThemeChoice): void {
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

/** A click: write localStorage and the cookie, and flip the attribute at once (no reload). */
export function chooseTheme(choice: ThemeChoice, env: ThemeEnv): ThemeChoice {
  store(env, choice);
  env.setCookie(themeCookie(choice, env.secure));
  applyAttr(env, choice);
  return choice;
}

/**
 * On mount. A present cookie wins (the server rendered from it) and
 * localStorage is brought in line; an absent cookie with a valid stored
 * choice rewrites the cookie and applies it; neither → system, nothing written.
 */
export function reconcileTheme(cookieChoice: ThemeChoice | null, env: ThemeEnv): ThemeChoice {
  if (cookieChoice) {
    if (stored(env) !== cookieChoice) store(env, cookieChoice);
    return cookieChoice;
  }
  const local = stored(env);
  if (local) return chooseTheme(local, env);
  return "system";
}
