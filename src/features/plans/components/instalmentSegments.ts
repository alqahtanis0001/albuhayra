/**
 * v1.3 item 7 — the segmented instalment bar's pure rules. Status is the
 * server's (`instalmentStatus` in src/lib/instalments.ts); this only maps it to
 * a colour and a fill, 1:1 (lead ruling S1: DUE is amber, there is no separate
 * "due today"). Client-safe, no clock.
 */
import type { InstalmentStatus } from "@/lib/instalments";

export type SegmentTone = "in" | "out" | "amber" | "grey";

/** `fill` is the share of the segment painted in `tone`; the rest is grey-soft. */
export type SegmentState = { tone: SegmentTone; fill: 1 | 0.5 };

const STATES: Record<InstalmentStatus, SegmentState> = {
  PAID: { tone: "in", fill: 1 },
  PARTIAL: { tone: "in", fill: 0.5 },
  OVERDUE: { tone: "out", fill: 1 },
  DUE: { tone: "amber", fill: 1 },
  UPCOMING: { tone: "grey", fill: 1 },
};

export function segmentState(status: InstalmentStatus): SegmentState {
  return STATES[status];
}

/** Segments keep a 1 px gap up to 24; above that the gap would eat the bar. */
export const MAX_GAPPED_SEGMENTS = 24;

export function hasGap(count: number): boolean {
  return count <= MAX_GAPPED_SEGMENTS;
}

/**
 * Which edge a segment's popover hugs so it opens inward: the first half
 * (inline start) anchors at its start edge, the rest at its end edge.
 */
export function popoverEdge(index: number, count: number): "start" | "end" {
  return index < count / 2 ? "start" : "end";
}
