/**
 * Class strings shared by the tab bar, the المزيد button and the sheet's tiles,
 * so every nav control presses, pends and shows "active" the same way
 * (docs/FRONTEND.md, Motion v1.1d).
 */

/** Pointer-down feedback; `nav-item` is the hook for the pending pulse in globals.css. */
export const NAV_PRESS =
  "nav-item transition-[scale,background-color] duration-[80ms] ease-out active:scale-[0.97] active:bg-accent-line active:text-accent-dark";

export const TAB_CLASS = `${NAV_PRESS} flex min-h-14 w-full flex-col items-center justify-center gap-0.5 border-t-2 px-1 py-2 text-xs font-medium`;
export const TAB_ACTIVE = "border-accent bg-accent-soft text-accent-dark";
export const TAB_IDLE =
  "border-transparent text-gray-600 has-data-pending:border-accent has-data-pending:bg-accent-soft has-data-pending:text-accent-dark";
