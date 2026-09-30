/**
 * v1.3 (docs/V13-SPEC.md item 2): the `d` strings behind `Sparkline`. Pure, so
 * the geometry is tested without rendering. The time axis runs right → left
 * (lead ruling): the oldest point sits at the right edge and the path starts
 * there, so `.v13-draw` draws from the oldest point. Coordinates are rounded to
 * one decimal — the whole rendered SVG must stay under 1 KB per card.
 */

export const SPARK_W = 120;
export const SPARK_H = 32;
const PAD = 2;

/** One decimal, no trailing `.0`. */
export function r1(n: number): string {
  const v = Math.round(n * 10) / 10;
  return String(Object.is(v, -0) ? 0 : v);
}

/** A polyline through every value, scaled between its own min and max. */
export function linePath(values: number[], w = SPARK_W, h = SPARK_H): string {
  if (values.length === 0) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const step = values.length > 1 ? w / (values.length - 1) : 0;
  const y = (v: number) =>
    span === 0 ? h / 2 : PAD + ((max - v) / span) * (h - 2 * PAD);

  return values
    .map((v, i) => `${i === 0 ? "M" : "L"}${r1(w - i * step)} ${r1(y(v))}`)
    .join("");
}

/**
 * One path of bars from the baseline up, scaled so the largest value fills the
 * height. Negative values count as 0; zero bars are left out entirely.
 */
export function barsPath(values: number[], w = SPARK_W, h = SPARK_H): string {
  if (values.length === 0) return "";
  const max = Math.max(0, ...values);
  if (max === 0) return "";
  const slot = w / values.length;
  const bar = Math.max(1, slot - 1);

  return values
    .map((v, i) => {
      const height = (Math.max(0, v) / max) * (h - PAD);
      if (height <= 0) return "";
      const x = w - (i + 1) * slot + (slot - bar) / 2;
      return `M${r1(x)} ${h}v${r1(-height)}h${r1(bar)}V${h}z`;
    })
    .join("");
}
