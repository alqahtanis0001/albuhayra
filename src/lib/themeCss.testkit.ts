/**
 * v1.5 — reads src/app/globals.css for the theme tests (themeCss, themeContrast,
 * tokenLint). Not imported by the app. A tiny block parser (enough for this
 * stylesheet: no strings containing braces), the token maps, WCAG contrast,
 * CIEDE2000 colour difference (D52) and a comment stripper for TS/TSX/CSS source.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export type Block = { header: string; body: string; start: number; end: number };

/** Top-level `header { body }` blocks of a stylesheet (nested braces kept in body). */
export function blocks(css: string): Block[] {
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

/** The one block with this header; throws when there are none or several. */
export function only(list: Block[], header: string, where: (b: Block) => boolean = () => true): Block {
  const found = list.filter((b) => b.header === header && where(b));
  if (found.length !== 1) throw new Error(`expected one "${header}" block, found ${found.length}`);
  return found[0]!;
}

/** `--name: value;` (and color-scheme) declarations, in order. */
export function decls(body: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of body.matchAll(/(--[\w-]+|color-scheme)\s*:\s*([^;]+);/g)) map.set(m[1]!, m[2]!.trim());
  return map;
}

/**
 * Removes comments from TS/TSX/CSS source, keeping strings and template
 * literals intact (a `//` inside "https://…" is not a comment).
 */
export function stripComments(src: string): string {
  let out = "";
  let i = 0;
  let quote: string | null = null;
  while (i < src.length) {
    const c = src[i]!;
    const next = src[i + 1];
    if (quote) {
      out += c;
      if (c === "\\") {
        out += next ?? "";
        i += 2;
        continue;
      }
      if (c === quote) quote = null;
      i++;
    } else if (c === "/" && next === "*") {
      const end = src.indexOf("*/", i + 2);
      i = end < 0 ? src.length : end + 2;
    } else if (c === "/" && next === "/") {
      const end = src.indexOf("\n", i);
      i = end < 0 ? src.length : end;
    } else {
      if (c === '"' || c === "'" || c === "`") quote = c;
      out += c;
      i++;
    }
  }
  return out;
}

/** globals.css parsed into the pieces the tests pin. THEME_CSS points a mutation run at a scratch copy. */
export function readThemeCss() {
  const raw = readFileSync(process.env.THEME_CSS ?? join(process.cwd(), "src/app/globals.css"), "utf8");
  const css = raw.replace(/\/\*[\s\S]*?\*\//g, "");
  const top = blocks(css);
  const screen = only(top, "@media screen", (b) => b.body.includes("data-theme"));
  const system = only(top, "@media screen and (prefers-color-scheme: dark)");
  return {
    css,
    top,
    screen,
    system,
    theme: decls(only(top, "@theme").body),
    themeStatic: decls(only(top, "@theme static").body),
    darkExplicit: decls(only(blocks(screen.body), ':root[data-theme="dark"]').body),
    darkSystem: decls(only(blocks(system.body), ':root:not([data-theme="light"])').body),
  };
}

// WCAG 2.x relative luminance and contrast. A colour with alpha is blended over bg.
function rgbOf(v: string): number[] {
  const hex = v.match(/^#([0-9a-f]{6})$/i);
  if (hex) return [0, 2, 4].map((i) => parseInt(hex[1]!.slice(i, i + 2), 16));
  const rgb = v.match(/^rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)\)$/);
  if (!rgb) throw new Error(`unparsed colour ${v}`);
  return [1, 2, 3].map((i) => Number(rgb[i]));
}
function lum(c: number[]): number {
  const [r, g, b] = c.map((x) => (x / 255 <= 0.03928 ? x / 255 / 12.92 : ((x / 255 + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
/** Contrast of two colour values (`#rrggbb` or `rgb(r g b / a)`; fg may carry alpha). */
export function contrastOf(fgValue: string, bgValue: string): number {
  const bg = rgbOf(bgValue);
  const alpha = Number(fgValue.match(/\/ ([\d.]+)\)$/)?.[1] ?? 1);
  const fg = rgbOf(fgValue).map((c, i) => Math.round(c * alpha + bg[i]! * (1 - alpha)));
  const [hi, lo] = [lum(fg), lum(bg)].sort((a, b) => b - a);
  return (hi! + 0.05) / (lo! + 0.05);
}

// CIE Lab (D65) and CIEDE2000 colour difference (Sharma, Wu & Dalal 2005), for
// the D52 category palette. Inputs are `#rrggbb`.
function labOf(hex: string): [number, number, number] {
  const [r, g, b] = rgbOf(hex).map((x) => (x / 255 <= 0.04045 ? x / 255 / 12.92 : ((x / 255 + 0.055) / 1.055) ** 2.4)) as [number, number, number];
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  const fx = f((0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047);
  const fy = f(0.2126729 * r + 0.7151522 * g + 0.072175 * b);
  const fz = f((0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** Chroma C*ab of a `#rrggbb` colour. */
export function chromaOf(hex: string): number {
  const [, a, b] = labOf(hex);
  return Math.hypot(a, b);
}

/** CIEDE2000 ΔE between two Lab triples. */
export function deltaE2000Lab([L1, a1, b1]: number[], [L2, a2, b2]: number[]): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const deg = (r: number) => (((r * 180) / Math.PI) % 360 + 360) % 360;
  const p7 = (c: number) => Math.sqrt(c ** 7 / (c ** 7 + 25 ** 7));
  const G = 0.5 * (1 - p7((Math.hypot(a1!, b1!) + Math.hypot(a2!, b2!)) / 2));
  const [A1, A2] = [(1 + G) * a1!, (1 + G) * a2!];
  const [C1, C2] = [Math.hypot(A1, b1!), Math.hypot(A2, b2!)];
  const [h1, h2] = [deg(Math.atan2(b1!, A1)), deg(Math.atan2(b2!, A2))];
  let dh = C1 * C2 === 0 ? 0 : h2 - h1;
  if (dh > 180) dh -= 360;
  else if (dh < -180) dh += 360;
  const dH = 2 * Math.sqrt(C1 * C2) * Math.sin(rad(dh / 2));
  const [Lb, Cb] = [(L1! + L2!) / 2, (C1 + C2) / 2];
  const hb = C1 * C2 === 0 ? h1 + h2 : Math.abs(h1 - h2) <= 180 ? (h1 + h2) / 2 : h1 + h2 < 360 ? (h1 + h2 + 360) / 2 : (h1 + h2 - 360) / 2;
  const T = 1 - 0.17 * Math.cos(rad(hb - 30)) + 0.24 * Math.cos(rad(2 * hb)) + 0.32 * Math.cos(rad(3 * hb + 6)) - 0.2 * Math.cos(rad(4 * hb - 63));
  const Sl = 1 + (0.015 * (Lb - 50) ** 2) / Math.sqrt(20 + (Lb - 50) ** 2);
  const [Sc, Sh] = [1 + 0.045 * Cb, 1 + 0.015 * Cb * T];
  const Rt = -Math.sin(rad(60 * Math.exp(-(((hb - 275) / 25) ** 2)))) * 2 * p7(Cb);
  const [l, c, h] = [(L2! - L1!) / Sl, (C2 - C1) / Sc, dH / Sh];
  return Math.sqrt(l * l + c * c + h * h + Rt * c * h);
}

/** CIEDE2000 ΔE between two `#rrggbb` colours. */
export function deltaE2000(a: string, b: string): number {
  return deltaE2000Lab(labOf(a), labOf(b));
}
