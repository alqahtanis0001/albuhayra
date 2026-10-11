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

import { readThemeCss, stripComments } from "./themeCss.testkit";
import { HEX, lineHasColour, paletteVars } from "./tokenLint.testkit";

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

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    // src/generated is Prisma's output, not authored source.
    if (statSync(path).isDirectory()) return path.endsWith(join("src", "generated")) ? [] : walk(path);
    // Tests and their *.testkit.ts helpers hold colours as fixtures (D12: test files are allowed).
    return /\.(tsx?|css)$/.test(name) && !/\.(test|testkit)\.ts$/.test(name) ? [path] : [];
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
      if (lineHasColour(file, text)) out.push({ file, line: i + 1, text: text.trim() });
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
    // D43 holes: hex after `_` in an arbitrary value, named colours in arbitrary values, black classes, color-mix()
    ['className="shadow-[0_0_0_1px_#fff]"'],
    ['className="ring-[3px_#006c35]"'],
    ['className="fill-[white]"'],
    ['className="bg-[color:red] p-2"'],
    ['className="[--focus-ring:white]"'],
    ['className="text-black"'],
    ['className="hover:bg-black/40"'],
    ['className="border-t-black"'],
    ['style={{ color: "color-mix(in oklab, red, blue)" }}'],
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
    ['className="backdrop:bg-black/50"'],
    ['className="min-h-[44px] data-[open]:block has-[input:checked]:bg-accent"'],
    ['className="shadow-[0_0_0_1px_var(--color-white)]"'],
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
    // D43 T10: compound utilities are read whole, not as their tail.
    expect(paletteVars("drop-shadow-sky-100 text-shadow-rose-300/50 inset-ring-teal-400 inset-shadow-lime-200 ring-offset-cyan-50")).toEqual([
      "--color-sky-100",
      "--color-rose-300",
      "--color-teal-400",
      "--color-lime-200",
      "--color-cyan-50",
    ]);
  });

  it("every one is redefined in the dark block", () => {
    const missing = [...used].filter(([v]) => !dark.has(v)).map(([v, file]) => `${v} (${file})`);
    expect(missing).toEqual([]);
  });
});

/**
 * The lint skips *.testkit.ts like tests (reviewer R4-T1), so that escape hatch
 * is closed by name: only the two theme helpers may exist, and no app file may
 * import one (a testkit is test-only code).
 */
const TESTKITS = ["src/lib/themeCss.testkit.ts", "src/lib/tokenLint.testkit.ts"];

function testkits(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walkable(path) ? testkits(path) : [];
    return /\.testkit\.[cm]?[jt]sx?$/.test(name) ? [relative(BASE, path).split(sep).join("/")] : [];
  });
}
const walkable = (path: string) => !path.endsWith(join("src", "generated"));

describe("testkit escape hatch (R4-T1)", () => {
  it("the only *.testkit files under src are the two theme helpers", () => {
    expect(testkits(join(BASE, "src")).sort()).toEqual(TESTKITS);
  });

  it("no non-test file imports a .testkit module", () => {
    const importer = /(?:from\s+|import\s*\(\s*|require\s*\(\s*)["'][^"']*\.testkit(?:\.[jt]sx?)?["']/;
    expect(FILES.filter((f) => importer.test(f.src)).map((f) => f.file)).toEqual([]);
    expect(importer.test('import { HEX } from "@/lib/tokenLint.testkit";')).toBe(true);
    expect(importer.test('const m = await import("../lib/themeCss.testkit.ts");')).toBe(true);
  });
});
