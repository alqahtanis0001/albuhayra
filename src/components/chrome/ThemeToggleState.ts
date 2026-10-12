/**
 * v1.5 follow-up (docs/V15-SPEC.md D45, D46): the browser half of the theme
 * choice, shared by the top-bar button (ThemeToggleButton) and the «المظهر»
 * control (ThemeSegmented, in «المزيد» and the staff/admin «حسابي» below
 * 480 px). The rules are pure, in src/lib/theme.ts; this file only wires them
 * to window/document.
 *
 * `choice` is the stored light/dark (null = follow the device). `shown` is
 * what the page shows; it is null until mount, because the server cannot know
 * the device's scheme — before then CSS picks what to draw (D45). The two
 * controls never show at once, but a choice made in one is announced to the
 * other (THEME_EVENT), so a resize past 480 px finds them in step.
 */
import { useEffect, useState } from "react";

import {
  chooseTheme,
  reconcileTheme,
  shownTheme,
  themeFromCookies,
  type ThemeEnv,
  type ThemeMode,
} from "@/lib/theme";

export const THEME_EVENT = "ui:theme-change";
const DARK_QUERY = "(prefers-color-scheme: dark)";

export function browserEnv(): ThemeEnv {
  let storage: ThemeEnv["storage"] = null;
  try {
    storage = window.localStorage;
  } catch {
    // Blocked storage: the cookie alone carries the choice.
  }
  return {
    root: document.documentElement,
    setCookie: (cookie) => {
      document.cookie = cookie;
    },
    storage,
    secure: window.location.protocol === "https:",
  };
}

/** The device's scheme right now (false when matchMedia is missing). */
export function deviceIsDark(): boolean {
  return window.matchMedia?.(DARK_QUERY).matches ?? false;
}

/** Store a choice, apply it, and tell the other control. */
export function applyThemeChoice(mode: ThemeMode): ThemeMode {
  chooseTheme(mode, browserEnv());
  window.dispatchEvent?.(new CustomEvent<ThemeMode>(THEME_EVENT, { detail: mode }));
  return mode;
}

export function useThemeChoice(initial: ThemeMode | null) {
  const [choice, setChoice] = useState<ThemeMode | null>(initial);
  const [deviceDark, setDeviceDark] = useState<boolean | null>(null);

  useEffect(() => {
    setChoice(reconcileTheme(themeFromCookies(document.cookie), browserEnv()));
    const media = window.matchMedia?.(DARK_QUERY);
    const onDevice = () => setDeviceDark(media?.matches ?? false);
    const onChoice = (e: Event) => setChoice((e as CustomEvent<ThemeMode>).detail);
    onDevice();
    media?.addEventListener("change", onDevice);
    window.addEventListener(THEME_EVENT, onChoice);
    return () => {
      media?.removeEventListener("change", onDevice);
      window.removeEventListener(THEME_EVENT, onChoice);
    };
  }, []);

  const shown: ThemeMode | null = choice ?? (deviceDark === null ? null : shownTheme(null, deviceDark));
  const choose = (mode: ThemeMode) => setChoice(applyThemeChoice(mode));
  return { choice, shown, choose };
}
