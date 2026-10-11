/**
 * v1.5 — reads src/app/globals.css for the theme tests (themeCss, themeContrast,
 * tokenLint). Not imported by the app. A tiny block parser (enough for this
 * stylesheet: no strings containing braces), the token maps, WCAG contrast,
 * and a comment stripper for TS/TSX/CSS source.
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
