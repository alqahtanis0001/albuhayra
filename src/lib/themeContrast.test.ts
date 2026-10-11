/**
 * v1.5 dark contrast and the chart palette (docs/V15-SPEC.md C1, C3): every
 * dark text/badge pair the app uses reaches 4.5:1 on its surface, and PALETTE
 * reads tokens whose light value is the hex it used to be.
 */
import { describe, expect, it } from "vitest";

import { PALETTE } from "@/components/visualPalette";

import { contrastOf, readThemeCss } from "./themeCss.testkit";

const { theme: THEME, themeStatic: STATIC, darkExplicit: DARK_EXPLICIT } = readThemeCss();

function contrast(fgName: string, bgName: string): number {
  const v = (n: string) => DARK_EXPLICIT.get(`--color-${n}`) ?? n;
  return contrastOf(v(fgName), v(bgName));
}

describe("dark contrast (C1: text and badges ≥ 4.5:1 on their surfaces)", () => {
  const SURFACES = ["gray-50", "white", "gray-100", "accent-soft", "money-in-soft", "money-out-soft"];
  const TEXTS = ["gray-500", "gray-600", "gray-700", "gray-800", "gray-900", "accent", "accent-dark", "money-in", "money-out"];
  const PAIRS: [string, string][] = [
    ...TEXTS.flatMap((fg) => SURFACES.map((bg): [string, string] => [fg, bg])),
    ...["gray-600", "gray-900"].map((fg): [string, string] => [fg, "gray-200"]),
    // text on a tint is gray-900 (V13); warn notices; nav press/pulse states
    ...["tint-in", "tint-out", "tint-amber", "tint-blue", "tint-teal", "tint-grey", "heat-1", "heat-2", "heat-3", "heat-4", "amber-50", "orange-100", "red-200", "paid-static"].map(
      (bg): [string, string] => ["gray-900", bg],
    ),
    ["accent-dark", "accent-line"],
    ["accent-dark", "nav-pulse"],
    ["amber-800", "amber-50"],
    ["amber-900", "amber-50"],
    ["amber-800", "white"],
    // fills: buttons, badges, the direction toggle, the top bar, the «+» caption
    ...["accent", "accent-dark", "money-in", "money-out", "red-800"].map((bg): [string, string] => ["on-accent", bg]),
    ["on-accent-muted", "accent"],
    ["on-gold", "gold"],
    ["on-topbar", "topbar"],
    ["on-topbar", "topbar-dark"],
  ];

  it.each(PAIRS)("%s on %s", (fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("on-gold is ink on the gold mark in light too (D40)", () => {
    const light = (n: string) => STATIC.get(`--color-${n}`) ?? THEME.get(`--color-${n}`)!;
    expect(contrastOf(light("on-gold"), light("gold"))).toBeGreaterThanOrEqual(4.5);
  });
});

/** PALETTE before v1.5 (hexes); now token references whose light value must match. */
const PALETTE_AT_MAIN: Record<keyof typeof PALETTE, string> = {
  green: "#006c35",
  greenDark: "#004d26",
  greenSoft: "#e8f3ec",
  gold: "#c9a227",
  in: "#15803d",
  inSoft: "#dcfce7",
  out: "#b91c1c",
  outSoft: "#fee2e2",
  amber: "#b45309",
  amberSoft: "#fef3c7",
  blue: "#1d4ed8",
  blueSoft: "#dbeafe",
  teal: "#0f766e",
  tealSoft: "#ccfbf1",
  grey: "#737373",
  greySoft: "#e5e5e5",
};

describe("PALETTE reads tokens (C3)", () => {
  it.each(Object.entries(PALETTE_AT_MAIN))("%s keeps its light value %s and has a dark one", (key, hex) => {
    const ref = PALETTE[key as keyof typeof PALETTE].match(/^var\((--color-[\w-]+)\)$/)?.[1];
    expect(ref, key).toBeDefined();
    expect(THEME.get(ref!) ?? STATIC.get(ref!)).toBe(hex);
    expect(DARK_EXPLICIT.has(ref!)).toBe(true);
  });
});
