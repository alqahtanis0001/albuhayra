/**
 * v1.5 token layer (docs/V15-SPEC.md C1, C3, C4; D11, D32). Pins, on the text
 * of src/app/globals.css:
 *  - light mode is unchanged: every pre-v1.5 token keeps its value from `main`
 *    3369686, and the new tokens' light values are the raw colours they replace;
 *  - the two dark blocks (explicit choice, and "system") are identical, sit
 *    inside @media screen, and redefine every colour token (print stays light);
 *  - Tailwind's default palette is never restated outside the dark blocks;
 *  - no raw colour is left in a screen rule (every colour is a token);
 *  - every dark text/surface pair used by the app reaches 4.5:1.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

// THEME_CSS lets a mutation run read a scratch copy instead of the shared file.
const RAW = readFileSync(process.env.THEME_CSS ?? join(process.cwd(), "src/app/globals.css"), "utf8");
const CSS = RAW.replace(/\/\*[\s\S]*?\*\//g, "");

type Block = { header: string; body: string; start: number; end: number };

/** Top-level `header { body }` blocks of a stylesheet (nested braces kept in body). */
function blocks(css: string): Block[] {
  const out: Block[] = [];
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf("{", i);
    if (open < 0) break;
    const semi = css.lastIndexOf(";", open);
    const headStart = Math.max(semi + 1, css.lastIndexOf("}", open) + 1, i);
    let depth = 0;
    let j = open;
    for (; j < css.length; j++) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}" && --depth === 0) break;
    }
    out.push({ header: css.slice(headStart, open).trim(), body: css.slice(open + 1, j), start: headStart, end: j + 1 });
    i = j + 1;
  }
  return out;
}

function only(list: Block[], header: string): Block {
  const found = list.filter((b) => b.header === header);
  expect(found, header).toHaveLength(1);
  return found[0]!;
}

/** `--name: value;` declarations, in order. */
function decls(body: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of body.matchAll(/(--[\w-]+|color-scheme)\s*:\s*([^;]+);/g)) map.set(m[1]!, m[2]!.trim());
  return map;
}

const TOP = blocks(CSS);
const THEME = decls(only(TOP, "@theme").body);
const STATIC = decls(only(TOP, "@theme static").body);
const SCREENS = TOP.filter((b) => b.header === "@media screen" && b.body.includes("data-theme"));
expect(SCREENS).toHaveLength(1);
const SCREEN = SCREENS[0]!;
const SYSTEM = only(TOP, "@media screen and (prefers-color-scheme: dark)");
const DARK_EXPLICIT = decls(only(blocks(SCREEN.body), ':root[data-theme="dark"]').body);
const DARK_SYSTEM = decls(only(blocks(SYSTEM.body), ':root:not([data-theme="light"])').body);

/** The colour tokens of `main` 3369686 — the user's theme, never restyled. */
const LIGHT_AT_MAIN: Record<string, string> = {
  "--color-accent": "#006c35",
  "--color-accent-dark": "#004d26",
  "--color-accent-soft": "#e8f3ec",
  "--color-accent-line": "#a7cdb6",
  "--color-money-in": "#15803d",
  "--color-money-in-soft": "#f0fdf4",
  "--color-money-out": "#b91c1c",
  "--color-money-out-soft": "#fef2f2",
  "--color-gray-50": "#fafafa",
  "--color-gray-100": "#f4f4f4",
  "--color-gray-200": "#e5e5e5",
  "--color-gray-300": "#d4d4d4",
  "--color-gray-400": "#a3a3a3",
  "--color-gray-500": "#666666",
  "--color-gray-600": "#525252",
  "--color-gray-700": "#404040",
  "--color-gray-800": "#262626",
  "--color-gray-900": "#171717",
  "--color-tint-in": "#dcfce7",
  "--color-tint-out": "#fee2e2",
  "--color-tint-amber": "#fef3c7",
  "--color-tint-blue": "#dbeafe",
  "--color-tint-teal": "#ccfbf1",
  "--color-tint-grey": "#e5e5e5",
  "--color-heat-1": "#e8f3ec",
  "--color-heat-2": "#c9e7d3",
  "--color-heat-3": "#9fd3b1",
  "--color-heat-4": "#6fbb8b",
};

/** New tokens: light value = the raw colour or default it replaces (or the mock's, for the wheel). */
const LIGHT_NEW: Record<string, string> = {
  "--color-on-accent": "#ffffff", // text-white on fills
  "--color-on-accent-muted": "rgb(255 255 255 / 0.85)",
  "--color-topbar": "#006c35", // TopBar bg-accent
  "--color-topbar-dark": "#004d26", // TopBar border/hover accent-dark
  "--color-on-topbar": "#ffffff",
  "--color-gold": "#c9a227", // PALETTE.gold = mock --gold
  "--color-gold-2": "#e3cf7e",
  "--color-accent-2": "#2e8b57",
  "--color-accent-3": "#8fb5a0",
  "--color-chart-muted": "#c9d1cc",
  "--color-track": "#e8ede9",
  "--color-chart-amber": "#b45309", // PALETTE.amber
  "--color-chart-blue": "#1d4ed8",
  "--color-chart-teal": "#0f766e",
  "--color-chart-grey": "#737373",
  "--color-chart-grid": "#cccccc", // recharts' default grid / cursor / tooltip border
  "--color-page": "#f4f6f5", // .auth-bg / .app-bg base
  "--color-page-veil": "rgb(244 246 245 / 0.5)",
  "--color-nav-pulse": "#d2e7da",
  "--color-paid-wash": "#c9e7d3",
  "--color-paid-static": "#dcf3e4",
  "--color-progress": "#a7cdb6", // .nav-progress was accent-line
  "--color-ripple": "rgb(255 255 255 / 0.35)",
  "--color-backdrop": "rgb(0 0 0 / 0.5)",
};

// gray-* is not here: the app has owned the gray scale in @theme since v1.0.
const DEFAULT_PALETTE = /--color-(?:white|black|(?:slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+)\b/;

describe("light mode is unchanged", () => {
  it("keeps every pre-v1.5 colour token at its main value", () => {
    const colours = [...THEME].filter(([k]) => k.startsWith("--color-"));
    expect(Object.fromEntries(colours)).toEqual(LIGHT_AT_MAIN);
  });

  it("gives every new token the light value of what it replaces", () => {
    expect(Object.fromEntries(STATIC)).toEqual(LIGHT_NEW);
  });

  it("sets color-scheme light on :root and points the page art at the same files", () => {
    const roots = TOP.filter((b) => b.header === ":root" && b.body.includes("color-scheme"));
    expect(roots).toHaveLength(1);
    const root = decls(roots[0]!.body);
    expect(root.get("color-scheme")).toBe("light");
    expect(root.get("--page-art-auth")).toBe("url(/brand/zakham-bg-v3/auth-bg.svg)");
    expect(root.get("--page-art-app")).toBe("url(/brand/zakham-bg-v3/app-bg.svg)");
  });

  it("never restates Tailwind's default palette outside the dark blocks", () => {
    const outside = CSS.slice(0, SCREEN.start) + CSS.slice(SCREEN.end, SYSTEM.start) + CSS.slice(SYSTEM.end);
    expect(outside).not.toMatch(new RegExp(DEFAULT_PALETTE.source + "\\s*:"));
  });

  it("leaves no raw colour in a screen rule (tokens only; print and @page excepted)", () => {
    const skip = new Set(["@theme", "@theme static", "@media print", "@page"]);
    const rest = TOP.filter((b) => !skip.has(b.header) && b !== SCREEN && b !== SYSTEM)
      .map((b) => `${b.header}{${b.body}}`)
      .join("\n");
    expect(rest.length).toBeGreaterThan(2000); // guard: the comment strip did not blank the file
    expect(rest).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(rest).not.toMatch(/\b(?:rgba?|hsla?|oklch)\(/);
  });
});

describe("dark theme blocks", () => {
  it("are identical for the explicit choice and for system", () => {
    expect([...DARK_SYSTEM]).toEqual([...DARK_EXPLICIT]);
    expect(SCREEN.body.trim().startsWith(':root[data-theme="dark"]')).toBe(true);
  });

  it("redefine every colour token and set color-scheme dark", () => {
    expect(DARK_EXPLICIT.get("color-scheme")).toBe("dark");
    const tokens = [...THEME.keys(), ...STATIC.keys()].filter((k) => k.startsWith("--color-"));
    for (const k of tokens) expect(DARK_EXPLICIT.has(k), k).toBe(true);
    for (const k of ["--color-white", "--page-art-auth", "--page-art-app"]) expect(DARK_EXPLICIT.has(k), k).toBe(true);
  });

  it("live only inside @media screen, so print is light by construction", () => {
    const screenless = CSS.slice(0, SCREEN.start) + CSS.slice(SCREEN.end, SYSTEM.start) + CSS.slice(SYSTEM.end);
    expect(screenless).not.toContain('data-theme="dark"');
    expect(screenless).not.toContain('[data-theme="light"]');
    expect(screenless).not.toContain("prefers-color-scheme");
    const print = decls(only(blocks(only(TOP, "@media print").body), ":root").body);
    expect(print.get("color-scheme")).toBe("light");
  });
});

// WCAG 2.x relative luminance and contrast; `fg@a` blends fg at alpha a over bg.
const rgbOf = (v: string): number[] => {
  const hex = v.match(/^#([0-9a-f]{6})$/i);
  if (hex) return [0, 2, 4].map((i) => parseInt(hex[1]!.slice(i, i + 2), 16));
  const rgb = v.match(/^rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)\)$/);
  if (!rgb) throw new Error(`unparsed colour ${v}`);
  return [1, 2, 3].map((i) => Number(rgb[i]));
};
const lum = (c: number[]) => {
  const [r, g, b] = c.map((x) => (x / 255 <= 0.03928 ? x / 255 / 12.92 : ((x / 255 + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
function contrast(fgName: string, bgName: string): number {
  const v = (n: string) => DARK_EXPLICIT.get(`--color-${n}`) ?? n;
  const bg = rgbOf(v(bgName));
  const raw = v(fgName);
  const alpha = Number(raw.match(/\/ ([\d.]+)\)$/)?.[1] ?? 1);
  const fg = rgbOf(raw).map((c, i) => Math.round(c * alpha + bg[i]! * (1 - alpha)));
  const [hi, lo] = [lum(fg), lum(bg)].sort((a, b) => b - a);
  return (hi! + 0.05) / (lo! + 0.05);
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
    ["on-topbar", "topbar"],
    ["on-topbar", "topbar-dark"],
  ];

  it.each(PAIRS)("%s on %s", (fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
});
