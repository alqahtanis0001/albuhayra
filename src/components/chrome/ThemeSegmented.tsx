"use client";

/**
 * v1.5 follow-up (docs/V15-SPEC.md D46): the «المظهر» row — a two-segment
 * control فاتح / داكن. Below 480 px the top-bar button is hidden and this row
 * takes its place: first in the owner's «المزيد» sheet, at the top of the
 * staff and admin «حسابي» pages. From 480 px it is hidden (the button is
 * back), so the class lives here, once, for all three places.
 *
 * Pressing a segment stores that choice (D45 storage). The pressed segment is
 * what the page shows: the stored choice, else the device's scheme, known
 * after mount — before then neither is pressed (D50). On the account pages the
 * ThemeSegmentedServer wrapper hands in the cookie's choice, so a stored
 * light/dark is pressed at SSR; «المزيد» (a client component, closed at
 * hydration) reads it on mount.
 */
import { useId } from "react";

import { t } from "@/i18n/ar";
import { explicitTheme, type ThemeChoice, type ThemeMode } from "@/lib/theme";

import { useThemeChoice } from "./ThemeToggleState";

/** Exported for the pins: the row shows only below 480 px. */
export const THEME_SEGMENTED_CLASS = "flex items-center justify-between gap-3 min-[480px]:hidden";

const SEGMENTS: readonly ThemeMode[] = ["light", "dark"];

export function ThemeSegmented({ choice = null }: { choice?: ThemeChoice | null }) {
  const { shown, choose } = useThemeChoice(explicitTheme(choice));
  const labelId = useId();

  return (
    <div role="group" aria-labelledby={labelId} className={THEME_SEGMENTED_CLASS}>
      <span id={labelId} className="text-sm font-semibold text-gray-900">
        {t.theme.title}
      </span>
      <div className="flex gap-1 rounded-lg border border-gray-200 p-1">
        {SEGMENTS.map((mode) => {
          const pressed = shown === mode;
          return (
            <button
              key={mode}
              type="button"
              aria-pressed={pressed}
              onClick={() => choose(mode)}
              className={`flex min-h-11 min-w-16 items-center justify-center rounded-md px-4 text-sm font-medium ${
                pressed ? "bg-accent text-on-accent" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {t.theme[mode]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ThemeSegmented;
