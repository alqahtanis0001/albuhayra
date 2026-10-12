/**
 * v1.3 shared palette for hand-written SVG (docs/V13-SPEC.md). SVG fills can't
 * use Tailwind classes everywhere, so the colours live here once. Text colours
 * stay on the Tailwind tokens; these are for shapes (bars, rings, tints), and
 * colour is never the only signal — every shape keeps a sign, letter or label.
 * v1.5 (C3): each is a `var(--color-…)` reference to a token in globals.css
 * (light value = the hex it used to be, pinned by src/lib/themeCss.test.ts),
 * so every chart follows the dark theme. SVG fill/stroke and inline styles
 * resolve var(); never do colour arithmetic on these strings.
 */
export const PALETTE = {
  green: "var(--color-accent)",
  greenDark: "var(--color-accent-dark)",
  greenSoft: "var(--color-accent-soft)",
  gold: "var(--color-gold)",
  in: "var(--color-money-in)",
  inSoft: "var(--color-tint-in)",
  out: "var(--color-money-out)",
  outSoft: "var(--color-tint-out)",
  amber: "var(--color-chart-amber)",
  amberSoft: "var(--color-tint-amber)",
  blue: "var(--color-chart-blue)",
  blueSoft: "var(--color-tint-blue)",
  teal: "var(--color-chart-teal)",
  tealSoft: "var(--color-tint-teal)",
  grey: "var(--color-chart-grey)",
  greySoft: "var(--color-tint-grey)",
  // v1.5 D52: the category colours (expense donut + the wheel's ring 2), in
  // donut order — petrol, plum, teal, indigo, clay, slate («أخرى»). Kept
  // apart from the semantic colours (money in/out, accent, gold).
  cat1: "var(--color-cat-1)",
  cat2: "var(--color-cat-2)",
  cat3: "var(--color-cat-3)",
  cat4: "var(--color-cat-4)",
  cat5: "var(--color-cat-5)",
  cat6: "var(--color-cat-6)",
} as const;

/** One point of a daily series (dashboard `daily30`, statement balance). */
export type SeriesPoint = { date: string; value: number };

/**
 * The contract for `src/components/Sparkline.tsx` (built by `dash`, reused by
 * `people` for the statement header). Pure SVG, no library, ≤ 1 KB rendered.
 * `label` is the accessible name; `summary` is the text equivalent rendered
 * beside it (sr-only on screen).
 */
export type SparklineProps = {
  points: SeriesPoint[];
  variant: "line" | "bars";
  tone: "in" | "out" | "neutral";
  label: string;
  summary: string;
  className?: string;
};
