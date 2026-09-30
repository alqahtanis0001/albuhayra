"use client";

import { useEffect } from "react";

/** The wash (`.v13-paid`, reused as the "look here" highlight) runs 800 ms. */
const HIGHLIGHT_MS = 800;
/** Start of the wash where `scrollend` is not supported. */
const SCROLL_FALLBACK_MS = 600;
/** Where it is: a safety net for a tap that needs no scroll (no `scrollend` fires). */
const SCROLL_SAFETY_MS = 1000;

function rowsFor(key: string): HTMLElement[] {
  const selector =
    key === "overdue"
      ? "#dues-overdue [data-due-date]"
      : `#dues-week [data-due-date="${CSS.escape(key)}"]`;
  return Array.from(document.querySelectorAll<HTMLElement>(selector));
}

/**
 * v1.3 item 6 — the only client part of the week ribbon: one click listener
 * on the server-rendered tiles (`data-jump` = a date or "overdue"). It scrolls
 * to that day's rows, washes them once and moves focus to the first, so a
 * keyboard user lands where the eye does. Renders nothing.
 */
export function RibbonJump({ ribbonId }: { ribbonId: string }) {
  useEffect(() => {
    const ribbon = document.getElementById(ribbonId);
    if (!ribbon) return;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const cleanups = new Set<() => void>();

    function onClick(event: MouseEvent) {
      const tile = (event.target as Element).closest<HTMLElement>("[data-jump]");
      const rows = tile?.dataset.jump ? rowsFor(tile.dataset.jump) : [];
      if (rows.length === 0) return;
      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      rows[0]!.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      rows[0]!.setAttribute("tabindex", "-1");
      rows[0]!.focus({ preventScroll: true });
      // The wash plays once the rows are in view: on `scrollend`, or after a
      // fallback delay where it is unsupported; at once when the scroll is instant.
      if (reduce) wash(rows);
      else afterScroll(() => wash(rows));
    }

    function later(fn: () => void, ms: number) {
      const timer = setTimeout(() => {
        timers.delete(timer);
        fn();
      }, ms);
      timers.add(timer);
    }

    function afterScroll(fn: () => void) {
      let done = false;
      const once = () => {
        if (done) return;
        done = true;
        window.removeEventListener("scrollend", once);
        fn();
      };
      if (!("onscrollend" in window)) return later(once, SCROLL_FALLBACK_MS);
      window.addEventListener("scrollend", once);
      later(once, SCROLL_SAFETY_MS);
      cleanups.add(() => window.removeEventListener("scrollend", once));
    }

    function wash(rows: HTMLElement[]) {
      for (const row of rows) {
        row.classList.remove("v13-paid");
        void row.offsetWidth; // restart the wash on a second tap
        row.classList.add("v13-paid");
      }
      later(() => rows.forEach((row) => row.classList.remove("v13-paid")), HIGHLIGHT_MS);
    }

    ribbon.addEventListener("click", onClick);
    return () => {
      ribbon.removeEventListener("click", onClick);
      timers.forEach(clearTimeout);
      cleanups.forEach((fn) => fn());
    };
  }, [ribbonId]);

  return null;
}

export default RibbonJump;
