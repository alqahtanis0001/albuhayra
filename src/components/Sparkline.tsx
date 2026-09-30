/**
 * v1.3 (docs/V13-SPEC.md item 2): a 30-point sparkline, hand-written SVG, no
 * library, under 1 KB rendered. No hooks and no "use client", so it renders
 * from a server component or inside a client one alike. The time axis runs
 * right → left: the oldest point is at the right. `label` names the image;
 * `summary` is its text equivalent (sr-only). Screen only — print keeps the
 * numbers it already had.
 */
import { barsPath, linePath, SPARK_H, SPARK_W } from "@/features/dashboard/sparkPaths";

import { PALETTE, type SparklineProps } from "./visualPalette";

const STROKE: Record<SparklineProps["tone"], string> = {
  in: PALETTE.in,
  out: PALETTE.out,
  neutral: PALETTE.green,
};

export function Sparkline({ points, variant, tone, label, summary, className = "" }: SparklineProps) {
  const values = points.map((p) => p.value);
  const d = variant === "line" ? linePath(values) : barsPath(values);

  return (
    <div className={`no-print ${className}`}>
      <svg
        role="img"
        aria-label={label}
        viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
        preserveAspectRatio="none"
        className="block h-8 w-full"
      >
        {d ? (
          variant === "line" ? (
            <path
              d={d}
              pathLength={1}
              fill="none"
              stroke={STROKE[tone]}
              strokeWidth={1.5}
              strokeLinejoin="round"
              className="v13-draw"
            />
          ) : (
            <path d={d} fill={STROKE[tone]} className="v13-grow-block" />
          )
        ) : null}
      </svg>
      <span className="sr-only">{summary}</span>
    </div>
  );
}

export default Sparkline;
