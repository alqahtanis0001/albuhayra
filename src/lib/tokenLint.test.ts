/**
 * v1.5 token lint (docs/V15-SPEC.md C4, D12, D32): no hard-coded colour in
 * src/** outside the token file. Every colour is a token in globals.css, read
 * as a Tailwind class or `var(--color-…)`, so the dark theme reaches it.
 *
 * Walks src/** (.ts, .tsx, .css; test files skipped), strips comments, and
 * flags a hex literal (#rgb, #rgba, #rrggbb, #rrggbbaa) in a colour context
 * (after a quote, backtick, `:`, `[`, `(`, `=`, `,`, `{` or a space) and any
 * rgb()/hsl()/oklch() … literal. The allow-list is the places no custom
 * property can reach (D12).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

import { readThemeCss, stripComments } from "./themeCssParse";

const ROOT = process.cwd();

/** Whole files or folders where literal colours are allowed. */
const ALLOW_PATHS = [
  "src/app/globals.css", // the token file itself
  "src/app/api/export/", // Excel cell styles
  "src/lib/mail/", // email HTML (no CSS variables in mail clients)
];
/** Single lines allowed by exact pattern: the root layout's browser-bar colours. */
const ALLOW_LINES: { file: string; line: RegExp }[] = [
  { file: "src/app/layout.tsx", line: /^\s*\{ media: "\(prefers-color-scheme: (light|dark)\)", color: "#[0-9a-f]{6}" \},$/ },
];
// Brand assets (public/brand/**) are files, not source: outside src, never walked.

const HEX = /(?<=["'`:[(=,{\s])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![0-9a-z_-])/gi;
const FN = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/g;

/**
 * CSS named colours (and system colours) as a value of a colour prop or style
 * key in TS/TSX — `fill="white"`, `stroke={"black"}`, `{ color: "red" }` —
 * would stay the same in dark. `none`, `currentColor`, `transparent`,
 * `inherit` and var() are not in the list, so they pass.
 */
const NAMED = new Set(
  `
  aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet
  brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan
  darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen
  darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey
  darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite
  forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew
  hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue
  lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon
  lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime
  limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple
  mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue
  mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid
  palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum
  powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen
  seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal
  thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen canvas canvastext
  buttonface buttontext field fieldtext highlight highlighttext linktext graytext
`.split(/\s+/).filter(Boolean),
);
const COLOUR_PROP = /\b(?:fill|stroke|stopColor|floodColor|lightingColor|color|backgroundColor|background|borderColor|outlineColor|textDecorationColor|caretColor|accentColor)\s*[=:]\s*\{?\s*["'`]([A-Za-z]+)["'`]/g;

function namedColour(text: string): boolean {
  return [...text.matchAll(COLOUR_PROP)].some((m) => NAMED.has(m[1]!.toLowerCase()));
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    // src/generated is Prisma's output, not authored source.
    if (statSync(path).isDirectory()) return path.endsWith(join("src", "generated")) ? [] : walk(path);
    return /\.(tsx?|css)$/.test(name) && !name.endsWith(".test.ts") ? [path] : [];
  });
}

type Finding = { file: string; line: number; text: string };

/** The colour literals of one file, minus the allow-list. */
function lint(file: string, src: string): Finding[] {
  if (ALLOW_PATHS.some((p) => file === p || (p.endsWith("/") && file.startsWith(p)))) return [];
  const allowed = ALLOW_LINES.filter((a) => a.file === file).map((a) => a.line);
  const out: Finding[] = [];
  stripComments(src)
    .split("\n")
    .forEach((text, i) => {
      if (allowed.some((re) => re.test(text))) return;
      // In CSS, color() etc. are the real thing; in TS a call like `color(` would be ours, so only flag rgb()-family there.
      const fn = file.endsWith(".css") ? FN : /\b(?:rgba?|hsla?|hwb|oklab|oklch)\(/g;
      const named = !file.endsWith(".css") && namedColour(text);
      if (text.match(HEX) || text.match(fn) || named) out.push({ file, line: i + 1, text: text.trim() });
    });
  return out;
}

// TOKEN_LINT_ROOT lets a mutation run scan a scratch copy of the tree.
const BASE = process.env.TOKEN_LINT_ROOT ?? ROOT;
const FILES = walk(join(BASE, "src")).map((abs) => ({
  file: relative(BASE, abs).split(sep).join("/"),
  src: readFileSync(abs, "utf8"),
}));

describe("token lint", () => {
  it("scans the whole source tree, and stripping comments keeps the code", () => {
    expect(FILES.length).toBeGreaterThan(300);
    const raw = FILES.reduce((n, f) => n + f.src.length, 0);
    const kept = FILES.reduce((n, f) => n + stripComments(f.src).length, 0);
    expect(kept / raw).toBeGreaterThan(0.6); // guard: the stripper did not blank files
    const layout = FILES.find((f) => f.file === "src/app/layout.tsx")!;
    expect(stripComments(layout.src)).toContain("export default async function RootLayout");
  });

  it("finds no hard-coded colour outside the allow-list", () => {
    expect(FILES.flatMap((f) => lint(f.file, f.src))).toEqual([]);
  });

  it("the allow-list is live: each entry still holds a colour it excuses", () => {
    for (const p of ALLOW_PATHS) {
      const hits = FILES.filter((f) => f.file === p || (p.endsWith("/") && f.file.startsWith(p)));
      // Excel styles are ARGB strings ("FF006C35"), not CSS hexes.
      const colours = hits.flatMap((f) => stripComments(f.src).match(HEX) ?? stripComments(f.src).match(/"FF[0-9A-F]{6}"/g) ?? []);
      expect(colours.length, p).toBeGreaterThan(0);
    }
    for (const a of ALLOW_LINES) {
      const src = FILES.find((f) => f.file === a.file)!.src;
      expect(src.split("\n").filter((l) => a.line.test(l)), a.file).toHaveLength(2);
    }
  });
});

describe("token lint rules", () => {
  const flagged = (src: string, file = "src/components/X.tsx") => lint(file, src).map((f) => f.text);

  it.each([
    ['<circle fill="#fff" />'],
    ["<line stroke='#006c35' />"],
    ['<header className="bg-accent [--focus-ring:#fff]">'],
    ['<Pie stroke="#fff" />'],
    ["const c = { green: `#15803d` };"],
    ['style={{ color: "#B91C1CCC" }}'],
    ['style={{ background: "rgb(0 0 0 / 0.5)" }}'],
    ["const veil = 'rgba(255,255,255,.4)';"],
    ['fill="hsl(140 100% 21%)"'],
    ['<circle fill="white" />'],
    ["<path stroke={'Black'} />"],
    ['style={{ color: "red" }}'],
    ['style={{ backgroundColor: "whitesmoke" }}'],
    ['<stop stopColor="gold" />'],
  ])("flags %s", (line) => {
    expect(flagged(line)).toEqual([line]);
  });

  it.each([
    ['<a href="#main">'],
    ['<a href="#add-entry">'],
    ['fill="var(--color-accent)"'],
    ["// white on #004d26 is 10:1"],
    ["/* #b91c1c 6.5 */ const x = 1;"],
    ['{/* contrast #006c35 */}'],
    ['const url = "https://example.com/#fff-section";'],
    ['<path fill="none" stroke="currentColor" />'],
    ['style={{ backgroundColor: "transparent", color: "inherit" }}'],
    ['fill="var(--color-gold)"'],
    ['const tone = { label: "white" };'],
    ['<Badge tone="green" />'],
  ])("does not flag %s", (line) => {
    expect(flagged(line)).toEqual([]);
  });

  it("allows the layout's themeColor lines only, and nothing else in that file", () => {
    const ok = '    { media: "(prefers-color-scheme: dark)", color: "#14532d" },';
    expect(flagged(ok, "src/app/layout.tsx")).toEqual([]);
    expect(flagged('  themeColor: "#006c35",', "src/app/layout.tsx")).toHaveLength(1);
    expect(flagged(ok, "src/components/X.tsx")).toHaveLength(1);
  });

  it("allows whole files only under the listed paths", () => {
    expect(flagged('color: "#006c35"', "src/lib/mail/templates.ts")).toEqual([]);
    expect(flagged('fgColor: { argb: "FF006C35" }, x: "#006c35"', "src/app/api/export/route.ts")).toEqual([]);
    expect(flagged('color: "#006c35"', "src/lib/mailer.ts")).toHaveLength(1);
    expect(flagged("a { color: #006c35 }", "src/app/other.css")).toHaveLength(1);
  });
});

/**
 * A Tailwind default-palette class (bg-sky-100, hover:text-emerald-700,
 * border-t-red-200/50 …) flips in dark only if the dark block defines its
 * variable. gray-* is the app's own scale (@theme), white is the surface
 * (D36); black stays black on purpose (the dialog backdrop).
 */
const PALETTES = "slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const UTIL = "bg|text|border(?:-[xytrblse])?|fill|stroke|ring|ring-offset|outline|divide|from|via|to|decoration|accent|caret|placeholder|shadow";
const PALETTE_CLASS = new RegExp(`(?<![\\w-])(?:${UTIL})-(${PALETTES})-(\\d{2,3})(?:/\\d+)?(?![\\w-])`, "g");

function paletteVars(src: string): string[] {
  return [...stripComments(src).matchAll(PALETTE_CLASS)].map((m) => `--color-${m[1]}-${m[2]}`);
}

describe("default-palette classes have dark values (D32)", () => {
  const dark = readThemeCss().darkExplicit;
  const used = new Map<string, string>();
  for (const f of FILES) if (!f.file.endsWith(".css")) for (const v of paletteVars(f.src)) used.set(v, f.file);

  it("finds the steps in use (guard against a pattern that matches nothing)", () => {
    expect(used.has("--color-amber-50")).toBe(true);
    expect(used.has("--color-red-800")).toBe(true);
    expect(paletteVars('className="hover:bg-sky-100 border-t-red-200/50 text-gray-500 bg-white"')).toEqual([
      "--color-sky-100",
      "--color-red-200",
    ]);
  });

  it("every one is redefined in the dark block", () => {
    const missing = [...used].filter(([v]) => !dark.has(v)).map(([v, file]) => `${v} (${file})`);
    expect(missing).toEqual([]);
  });
});
