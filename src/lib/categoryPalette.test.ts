/**
 * v1.5 D52 — the category palette (the user's ruling, 2026-10-12): the expense
 * donut and the wheel's ring 2 colour categories with `--color-cat-1` … `-6`,
 * never with a semantic colour. Pins, on the text of src/app/globals.css:
 *  - the six light and dark values;
 *  - exclusion: no category colour equals, or is within CIEDE2000 ΔE 15 of,
 *    money-in, money-out, accent or gold in its theme;
 *  - read apart: neighbours in donut order (1–2 … 5–6 and 6–1 around the ring)
 *    and cat-1 against every rank k (a ring without «أخرى» closes on k → 1,
 *    D52-S1): ΔE ≥ 20, and contrast ≥ 1.3:1 or ΔE ≥ 30;
 *  - each colour ≥ 3:1 against the card (WCAG 1.4.11) in its theme;
 *  - «أخرى» (cat-6) is the most neutral of the six.
 * The measured table is in progress/v15/theme.md › D52.
 */
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { PALETTE } from "@/components/visualPalette";

import { chromaOf, contrastOf, deltaE2000, deltaE2000Lab, readThemeCss } from "./themeCss.testkit";

const { theme: THEME, themeStatic: STATIC, darkExplicit: DARK, darkSystem: DARK_SYSTEM } = readThemeCss();

const PINNED = {
  light: ["#2298c3", "#a63f73", "#127c78", "#6865bd", "#ac7339", "#4f5259"],
  dark: ["#6cc5e5", "#cb76a1", "#1b7e73", "#989ac7", "#c18244", "#6c6f7a"],
};
const SEMANTIC = ["accent", "money-in", "money-out", "gold"];
const N = [1, 2, 3, 4, 5, 6];

const light = (name: string) => STATIC.get(`--color-${name}`) ?? THEME.get(`--color-${name}`) ?? (name === "white" ? "#ffffff" : undefined);
const dark = (name: string) => DARK.get(`--color-${name}`);
const THEMES = [
  ["light", light],
  ["dark", dark],
] as const;
const cats = (value: (n: string) => string | undefined) => N.map((n) => value(`cat-${n}`)!);

/** Pairs that can touch on the ring: consecutive ranks, 6–1, and 1–k (the ring closes on rank k → 1 when there is no «أخرى»). */
const NEIGHBOURS: [number, number][] = [
  ...N.map((n): [number, number] => [n, (n % 6) + 1]),
  ...[3, 4, 5].map((k): [number, number] => [1, k]),
];

describe("CIEDE2000 (the testkit's maths, against Sharma, Wu & Dalal's reference pairs)", () => {
  it.each([
    [[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425],
    [[50, 0, 0], [50, -1, 2], 2.3669],
    [[50, 2.5, 0], [73, 25, -18], 27.1492],
    [[50, 2.5, 0], [50, 3.1736, 0.5854], 1.0],
    [[60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387], 1.2644],
    [[2.0776, 0.0795, -1.135], [0.9033, -0.0636, -0.5514], 0.9082],
    // Rows 9–15: the hue wrap-around at 180° (mean hue and Δh branches).
    [[50, 2.49, -0.001], [50, -2.49, 0.0009], 7.1792],
    [[50, 2.49, -0.001], [50, -2.49, 0.001], 7.1792],
    [[50, 2.49, -0.001], [50, -2.49, 0.0011], 7.2195],
    [[50, 2.49, -0.001], [50, -2.49, 0.0012], 7.2195],
    [[50, -0.001, 2.49], [50, 0.0009, -2.49], 4.8045],
    [[50, -0.001, 2.49], [50, 0.001, -2.49], 4.8045],
    [[50, -0.001, 2.49], [50, 0.0011, -2.49], 4.7461],
  ])("%j vs %j → %d", (p, q, expected) => {
    expect(deltaE2000Lab(p, q)).toBeCloseTo(expected, 4);
    expect(deltaE2000Lab(q, p)).toBeCloseTo(expected, 4);
  });

  it("a colour is ΔE 0 from itself and far from its opposite", () => {
    expect(deltaE2000("#2298c3", "#2298c3")).toBe(0);
    expect(deltaE2000("#000000", "#ffffff")).toBeCloseTo(100, 0);
  });
});

describe("the six tokens (D52)", () => {
  it.each(THEMES)("%s values are pinned", (theme, value) => {
    expect(cats(value)).toEqual(PINNED[theme]);
  });

  it("the system dark block carries the same values", () => {
    expect(N.map((n) => DARK_SYSTEM.get(`--color-cat-${n}`))).toEqual(PINNED.dark);
  });

  it("PALETTE.cat1…cat6 read the tokens", () => {
    expect(N.map((n) => PALETTE[`cat${n}` as keyof typeof PALETTE])).toEqual(N.map((n) => `var(--color-cat-${n})`));
  });

  it("the donut and ring 2 colour through the one function", () => {
    // Whitespace-free, so a reformatted or merged import still counts (reviewer N2).
    for (const file of ["src/features/dashboard/components/ExpenseDonut.tsx", "src/features/dashboard/wheelModel.ts"]) {
      const src = readFileSync(file, "utf8").replace(/\s+/g, "");
      expect(src, file).toMatch(/import\{(?:[^}]*,)?categoryColour(?:,[^}]*)?\}from"(?:\.\.?\/)+categoryColours"/);
      expect(src, file).toMatch(/categoryColour\(/);
    }
  });
});

describe.each(THEMES)("%s theme", (_theme, value) => {
  const palette = cats(value);

  it.each(SEMANTIC)("no category colour equals or is within ΔE 15 of %s", (name) => {
    const semantic = value(name)!;
    expect(semantic).toMatch(/^#[0-9a-f]{6}$/);
    for (const c of palette) {
      expect(c, `${c} vs ${name}`).not.toBe(semantic);
      expect(deltaE2000(c, semantic), `${c} vs ${name} ${semantic}`).toBeGreaterThanOrEqual(15);
    }
  });

  it("the pairs cover 1–2 … 5–6, 6–1 and 1–k for every k", () => {
    const keys = new Set(NEIGHBOURS.map(([i, j]) => [i, j].sort().join("-")));
    expect([...keys].sort()).toEqual(["1-2", "1-3", "1-4", "1-5", "1-6", "2-3", "3-4", "4-5", "5-6"]);
  });

  it.each(NEIGHBOURS)("cat-%i and cat-%i read apart", (i, j) => {
    const [a, b] = [palette[i - 1]!, palette[j - 1]!];
    const dE = deltaE2000(a, b);
    expect(dE, `${a} vs ${b}`).toBeGreaterThanOrEqual(20);
    expect(contrastOf(a, b) >= 1.3 || dE >= 30, `${a} vs ${b}: contrast or ΔE 30`).toBe(true);
  });

  it.each(N)("cat-%i is ≥ 3:1 on the card", (n) => {
    expect(contrastOf(palette[n - 1]!, value("white")!)).toBeGreaterThanOrEqual(3);
  });

  it("«أخرى» (cat-6) is the most neutral", () => {
    const chroma = palette.map(chromaOf);
    expect(Math.min(...chroma.slice(0, 5))).toBeGreaterThan(chroma[5]!);
  });
});
