/**
 * v1.3 item 14 (docs/V13-SPEC.md) — pure helpers for the aging tiles and the
 * per-party stacked bars. Tints are Tailwind classes (never inline styles),
 * youngest to oldest, amber-soft → red; text on a tile is gray-900.
 */
import type { AgingBuckets } from "@/features/reports/aging";

export const BUCKET_KEYS = ["upTo30Halalas", "upTo60Halalas", "upTo90Halalas", "over90Halalas"] as const;
export type BucketKey = (typeof BUCKET_KEYS)[number];

/** Tile backgrounds by age (gray-900 text ≥ 4.5:1 on every one). */
export const TILE_TINT: Record<BucketKey, string> = {
  upTo30Halalas: "bg-tint-amber",
  upTo60Halalas: "bg-orange-100",
  upTo90Halalas: "bg-tint-out",
  over90Halalas: "bg-red-200",
};

/** Bar segment fills by age: each step visibly darker; decoration only. */
export const SEGMENT_FILL: Record<BucketKey, string> = {
  upTo30Halalas: "bg-amber-500",
  upTo60Halalas: "bg-orange-600",
  upTo90Halalas: "bg-red-700",
  over90Halalas: "bg-red-900",
};

/**
 * Each bucket's share of the row, in % with two decimals, summing to exactly
 * 100 (largest remainder on basis points); all zeros when the row is empty.
 */
export function bucketShares(row: Pick<AgingBuckets, BucketKey>): Record<BucketKey, number> {
  const total = BUCKET_KEYS.reduce((sum, k) => sum + row[k], 0);
  const out = { upTo30Halalas: 0, upTo60Halalas: 0, upTo90Halalas: 0, over90Halalas: 0 };
  if (total <= 0) return out;
  const exact = BUCKET_KEYS.map((k) => (row[k] / total) * 10_000);
  const floors = exact.map(Math.floor);
  let left = 10_000 - floors.reduce((a, b) => a + b, 0);
  const order = BUCKET_KEYS.map((_, i) => i).sort((a, b) => exact[b]! - floors[b]! - (exact[a]! - floors[a]!) || a - b);
  for (const i of order) {
    if (left <= 0) break;
    floors[i]! += 1;
    left -= 1;
  }
  BUCKET_KEYS.forEach((k, i) => (out[k] = floors[i]! / 100));
  return out;
}
