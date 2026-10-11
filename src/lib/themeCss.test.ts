/**
 * v1.5 token layer (docs/V15-SPEC.md C1, C3, C4; D11, D32). Pins, on the text
 * of src/app/globals.css:
 *  - light mode is unchanged: every pre-v1.5 token keeps its value from `main`
 *    3369686, and the new tokens' light values are the raw colours they replace;
 *  - the two dark blocks (explicit choice, and "system") are identical, sit
 *    inside @media screen, and redefine every colour token (print stays light);
 *  - Tailwind's default palette is never restated outside the dark blocks;
 *  - no raw colour is left in a screen rule (every colour is a token);
 *  - the girih art and the wordmark follow the theme.
 * Contrast and PALETTE: themeContrast.test.ts.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { blocks, decls, only, readThemeCss } from "./themeCss.testkit";

const { css: CSS, top: TOP, screen: SCREEN, system: SYSTEM, theme: THEME, themeStatic: STATIC, darkExplicit: DARK_EXPLICIT, darkSystem: DARK_SYSTEM } =
  readThemeCss();

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
  "--color-on-gold": "#171717", // new (D40): gray-900's light value
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

  it("sets color-scheme light on :root, the same art files and no blending", () => {
    const roots = TOP.filter((b) => b.header === ":root" && b.body.includes("color-scheme"));
    expect(roots).toHaveLength(1);
    const root = decls(roots[0]!.body);
    expect(root.get("color-scheme")).toBe("light");
    expect(root.get("--page-art-auth")).toBe("url(/brand/zakham-bg-v3/auth-bg.svg)");
    expect(root.get("--page-art-app")).toBe("url(/brand/zakham-bg-v3/app-bg.svg)");
    expect(root.get("--page-blend")).toBe("normal");
    expect(root.get("--wordmark-light")).toBe("inline");
    expect(root.get("--wordmark-dark")).toBe("none");
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
    for (const k of ["--color-white", "--page-blend"]) expect(DARK_EXPLICIT.has(k), k).toBe(true);
  });

  it("draw the girih art multiplied onto the dark page (the files are never edited)", () => {
    expect(DARK_EXPLICIT.get("--page-blend")).toBe("multiply");
    expect(DARK_EXPLICIT.get("--color-page-veil")).toBe("rgb(14 20 17 / 0)");
    for (const sel of [".auth-bg", ".app-bg"]) {
      expect(only(TOP, sel).body, sel).toMatch(/background-blend-mode: var\(--page-blend\);/);
      expect(only(TOP, sel).body, sel).toMatch(/var\(--page-art-(auth|app)\)/);
    }
  });

  it("swap the green wordmark for the white file on the auth card and the root 404 (D33)", () => {
    expect(DARK_EXPLICIT.get("--wordmark-light")).toBe("none");
    expect(DARK_EXPLICIT.get("--wordmark-dark")).toBe("inline");
    expect(only(TOP, ".wordmark-light").body).toMatch(/display: var\(--wordmark-light\);/);
    expect(only(TOP, ".wordmark-dark").body).toMatch(/display: var\(--wordmark-dark\);/);
    const pairs: [string, string][] = [
      ["src/features/auth/components/AuthCard.tsx", "zakham-wordmark-%-tagline.png"],
      ["src/app/not-found.tsx", "zakham-wordmark-%.png"],
    ];
    for (const [file, name] of pairs) {
      const src = readFileSync(join(process.cwd(), file), "utf8");
      const img = (colour: string) => src.match(new RegExp(`<img\\s+src="/brand/zakham-brand/${name.replace("%", colour)}"[^>]*>`))?.[0] ?? "";
      expect(img("green"), file).toMatch(/className="wordmark-light /);
      expect(img("white"), file).toMatch(/className="wordmark-dark /);
      expect(img("white"), file).toMatch(/loading="lazy"/);
    }
  });

  it("the browser bar (layout themeColor) is the top bar's colour in each scheme (D43 T11)", () => {
    const src = readFileSync(join(process.cwd(), "src/app/layout.tsx"), "utf8");
    const colour = (scheme: string) => src.match(new RegExp(`prefers-color-scheme: ${scheme}\\)", color: "(#[0-9a-f]{6})"`))?.[1];
    expect(colour("light")).toBe(STATIC.get("--color-topbar"));
    expect(colour("dark")).toBe(DARK_EXPLICIT.get("--color-topbar"));
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
