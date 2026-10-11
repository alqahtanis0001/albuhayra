/**
 * v1.5 (docs/V15-SPEC.md A3, D9, D20, D31): the rules behind «التفاصيل والرسوم».
 * The device remembers the user's own choice under `home:detailsOpen`; with
 * nothing remembered the width decides (open at ≥ 768 px — the CSS rule of D20
 * does that before hydration, so the server never sets `data-open`). Every
 * storage access is guarded, exactly as `entryDetailsState.ts`.
 */
export const HOME_DETAILS_KEY = "home:detailsOpen";

/** The `md` breakpoint, as the D20 CSS uses it. */
export const WIDE_QUERY = "(min-width: 48rem)";

/** null = nothing remembered (or no storage). */
export function readHomeDetailsOpen(): boolean | null {
  try {
    const v = localStorage.getItem(HOME_DETAILS_KEY);
    return v === "1" ? true : v === "0" ? false : null;
  } catch {
    return null;
  }
}

export function rememberHomeDetailsOpen(open: boolean): void {
  try {
    localStorage.setItem(HOME_DETAILS_KEY, open ? "1" : "0");
  } catch {
    // No storage available: the width decides next time.
  }
}

/** The remembered choice wins; otherwise open on a wide screen, closed on a phone. */
export function isHomeDetailsOpen(remembered: boolean | null, wide: boolean): boolean {
  return remembered ?? wide;
}

/** D20: `data-open` only once a choice is known — absent, the screen-only CSS lets the width decide. */
export function homeDetailsDataOpen(remembered: boolean | null): "true" | "false" | undefined {
  return remembered === null ? undefined : remembered ? "true" : "false";
}

/**
 * The button's toggle (D43 H24): the opposite of what shows now — the remembered
 * choice, else the width — stored on the device and returned as the new choice.
 */
export function toggleHomeDetails(remembered: boolean | null, wide: boolean, store: (open: boolean) => void): boolean {
  const next = !isHomeDetailsOpen(remembered, wide);
  store(next);
  return next;
}
