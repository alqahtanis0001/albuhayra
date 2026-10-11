"use client";

/**
 * v1.5 theme toggle (docs/V15-SPEC.md C2, D11, D32): one icon button in the
 * top bar, cycling light → dark → system. Rendered by the ThemeToggle server
 * wrapper with the cookie's choice (null when there is none). A click writes
 * localStorage and the cookie and flips `data-theme` on <html> at once — no
 * reload; on mount the cookie and localStorage are reconciled (src/lib/theme.ts).
 * It sits on the green band, so it is white (on-topbar) like the rest of it.
 */
import { useEffect, useState } from "react";

import { Svg, type IconProps } from "@/components/icons";
import { t } from "@/i18n/ar";
import { chooseTheme, nextTheme, reconcileTheme, type ThemeChoice, type ThemeEnv } from "@/lib/theme";

const SunIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
  </Svg>
);

const MoonIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
  </Svg>
);

/** "Follow the device": a screen with a half-filled circle. */
const AutoIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="12" rx="1.5" />
    <path d="M8 20h8M12 16v4" />
    <path d="M12 7a3 3 0 0 0 0 6Z" fill="currentColor" />
  </Svg>
);

const ICON = { light: SunIcon, dark: MoonIcon, system: AutoIcon } as const;

/** The accessible name: «المظهر: فاتح» etc. — the current mode. */
export function themeLabel(choice: ThemeChoice): string {
  return t.theme.toggle.replace("{mode}", t.theme[choice]);
}

function browserEnv(): ThemeEnv {
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

export function ThemeToggleButton({ choice }: { choice: ThemeChoice | null }) {
  const [current, setCurrent] = useState<ThemeChoice>(choice ?? "system");

  useEffect(() => {
    setCurrent(reconcileTheme(choice, browserEnv()));
  }, [choice]);

  const Icon = ICON[current];
  const label = themeLabel(current);
  return (
    <button
      type="button"
      onClick={() => setCurrent(chooseTheme(nextTheme(current), browserEnv()))}
      aria-label={label}
      title={label}
      className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-on-topbar hover:bg-topbar-dark"
    >
      <Icon size={20} />
    </button>
  );
}

export default ThemeToggleButton;
