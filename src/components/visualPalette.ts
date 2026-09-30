/**
 * v1.3 shared palette for hand-written SVG (docs/V13-SPEC.md). SVG fills can't
 * use Tailwind classes everywhere, so the hexes live here once. Text colours
 * stay on the Tailwind tokens; these are for shapes (bars, rings, tints), and
 * colour is never the only signal — every shape keeps a sign, letter or label.
 */
export const PALETTE = {
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
