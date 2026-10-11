/**
 * v1.5 token-lint rules (docs/V15-SPEC.md C4, D12, D32, D43), used by
 * src/lib/tokenLint.test.ts only — not imported by the app. Each matcher works
 * on one comment-stripped source line.
 */
import { stripComments } from "./themeCss.testkit";

/** A hex in a colour context: after a quote, backtick, `:`, `[`, `(`, `=`, `,`, `{`, a space or `_` (Tailwind's space in arbitrary values). */
export const HEX = /(?<=["'`:[(=,{\s_])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![0-9a-z_-])/gi;
/** Colour functions: all of them in CSS; in TS the rgb() family and color-mix(). */
export const FN_CSS = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\(/g;
export const FN_TS = /\b(?:rgba?|hsla?|hwb|oklab|oklch|color-mix)\(/g;

/**
 * CSS named colours (and system colours) as a value of a colour prop or style
 * key in TS/TSX — `fill="white"`, `stroke={"black"}`, `{ color: "red" }` —
 * would stay the same in dark. `none`, `currentColor`, `transparent`,
 * `inherit` and var() are not in the list, so they pass.
 */
export const NAMED = new Set(
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
export const COLOUR_PROP = /\b(?:fill|stroke|stopColor|floodColor|lightingColor|color|backgroundColor|background|borderColor|outlineColor|textDecorationColor|caretColor|accentColor)\s*[=:]\s*\{?\s*["'`]([A-Za-z]+)["'`]/g;

export function namedColour(text: string): boolean {
  return [...text.matchAll(COLOUR_PROP)].some((m) => NAMED.has(m[1]!.toLowerCase()));
}

/** A named colour inside a Tailwind arbitrary value: `fill-[white]`, `bg-[color:red]`, `[--focus-ring:white]`. */
const ARBITRARY = /(?:-\[(?:[a-z-]+:)?|\[--[\w-]+:)([A-Za-z]+)\]/g;
export function namedInArbitrary(text: string): boolean {
  return [...text.matchAll(ARBITRARY)].some((m) => NAMED.has(m[1]!.toLowerCase()));
}

const UTIL_BASE = "bg|text|border(?:-[xytrblse])?|fill|stroke|ring|ring-offset|outline|divide|from|via|to|decoration|accent|caret|placeholder|shadow";
/** Compound utilities first, so `drop-shadow-sky-100` is not read as `shadow-sky-100`. */
export const UTIL = `drop-shadow|text-shadow|inset-ring|inset-shadow|${UTIL_BASE}`;

/**
 * `black` as a Tailwind colour class (`text-black`, `bg-black/50` …) stays
 * black in dark. The one allowed use is the `backdrop:` variant — a modal's
 * ::backdrop dims the page in both themes (and the unlayered dialog::backdrop
 * rule paints --color-backdrop over it anyway). Recorded in progress/v15/theme.md.
 */
const BLACK_CLASS = new RegExp(`(?<![\\w-])((?:[\\w-]+:)*)(?:${UTIL})-black(?:/\\d+)?(?![\\w-])`, "g");
export function blackClass(text: string): boolean {
  return [...text.matchAll(BLACK_CLASS)].some((m) => !m[1]!.endsWith("backdrop:"));
}

/** Every rule for one comment-stripped line of `file`. */
export function lineHasColour(file: string, text: string): boolean {
  if (file.endsWith(".css")) return Boolean(text.match(HEX) || text.match(FN_CSS));
  return Boolean(text.match(HEX) || text.match(FN_TS) || namedColour(text) || namedInArbitrary(text) || blackClass(text));
}

/**
 * A Tailwind default-palette class (bg-sky-100, hover:text-emerald-700,
 * border-t-red-200/50 …) flips in dark only if the dark block defines its
 * variable. gray-* is the app's own scale (@theme), white is the surface
 * (D36); black is the backdrop-only rule above.
 */
export const PALETTES = "slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
export const PALETTE_CLASS = new RegExp(`(?<![\\w-])(?:${UTIL})-(${PALETTES})-(\\d{2,3})(?:/\\d+)?(?![\\w-])`, "g");

export function paletteVars(src: string): string[] {
  return [...stripComments(src).matchAll(PALETTE_CLASS)].map((m) => `--color-${m[1]}-${m[2]}`);
}

