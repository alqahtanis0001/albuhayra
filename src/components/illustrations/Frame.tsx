import type { ReactNode } from "react";

import { PALETTE } from "@/components/visualPalette";

/**
 * v1.3 item 15: the shared frame of the empty-state line drawings — green
 * strokes, no fill, decorative only (aria-hidden, never focusable), hidden in
 * print. Each drawing adds one gold accent through `GOLD`.
 */
export const GOLD = PALETTE.gold;

export function Frame({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 120 96"
      width={112}
      height={90}
      fill="none"
      stroke={PALETTE.green}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="no-print"
    >
      {children}
    </svg>
  );
}
