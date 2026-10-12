"use client";

/**
 * v1.5 theme toggle (docs/V15-SPEC.md C2, D11, D32; follow-up D45, D46): one
 * icon button in the top bar, two-state. With no stored choice the page
 * follows the device; a tap stores the opposite of what is shown, then each
 * tap flips light ↔ dark. Rendered by the ThemeToggle server wrapper with the
 * cookie's choice (null when there is none; a v1.5 "system" is no choice).
 *
 * Both icons are always drawn and CSS shows the one for the scheme a tap
 * leads to (D50: moon while light is shown, sun while dark is shown)
 * (`.theme-light-only` / `.theme-dark-only`, the same selectors as the
 * tokens), so the first paint is right before hydration. The button names its
 * action («التبديل إلى المظهر الداكن» …) in aria-label and title once the
 * shown scheme is known: at once for a stored choice, after mount otherwise;
 * until then a CSS-picked hidden text names it.
 *
 * Below 480 px it is hidden: the «المظهر» row in «المزيد» (or «حسابي» for
 * staff/admin) takes its place (D46). White on the green band (on-topbar).
 */
import { Svg, type IconProps } from "@/components/icons";
import { t } from "@/i18n/ar";
import { explicitTheme, shownTheme, toggleTheme, type ThemeChoice, type ThemeMode } from "@/lib/theme";

import { deviceIsDark, useThemeChoice } from "./ThemeToggleState";

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

/** The accessible name and hover title: the action a tap performs on what is shown. */
export function themeActionLabel(shown: ThemeMode): string {
  return toggleTheme(shown) === "dark" ? t.theme.toDark : t.theme.toLight;
}

/** D46: the top-bar button is hidden below 480 px. Exported for the pin. */
export const THEME_TOGGLE_CLASS =
  "flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-on-topbar hover:bg-topbar-dark max-[480px]:hidden";

export function ThemeToggleButton({ choice: initial }: { choice: ThemeChoice | null }) {
  const { choice, shown, choose } = useThemeChoice(explicitTheme(initial));
  const label = shown ? themeActionLabel(shown) : undefined;

  return (
    <button
      type="button"
      onClick={() => choose(toggleTheme(shownTheme(choice, deviceIsDark())))}
      aria-label={label}
      title={label}
      className={THEME_TOGGLE_CLASS}
    >
      {/* D50: the icon shows the target, like the label — a moon while
          light is shown, a sun while dark is shown. */}
      <MoonIcon size={20} className="theme-light-only" />
      <SunIcon size={20} className="theme-dark-only" />
      {label ? null : (
        <>
          <span className="theme-light-only sr-only">{t.theme.toDark}</span>
          <span className="theme-dark-only sr-only">{t.theme.toLight}</span>
        </>
      )}
    </button>
  );
}

export default ThemeToggleButton;
