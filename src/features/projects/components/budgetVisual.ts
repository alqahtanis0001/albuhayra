/**
 * v1.3 item 9 — the budget meter's and the category ring's pure rules.
 * Integer halalas in, no float thresholds: 80% is `spent × 100 ≥ budget × 80`.
 */
import type { DirectionValue } from "@/lib/validation";

export type BudgetTone = "green" | "gold" | "red";

/** green < 80%, gold 80–100% inclusive, red above; `null` without a budget. */
export function budgetTone(spentHalalas: number, budgetHalalas: number | null): BudgetTone | null {
  if (budgetHalalas === null) return null;
  if (spentHalalas > budgetHalalas) return "red";
  if (spentHalalas * 100 >= budgetHalalas * 80) return "gold";
  return "green";
}

/**
 * The whole percent shown beside the meter, rounded so it never contradicts
 * the tone: down while within budget (79.99% reads 79), up once over it
 * (100.01% reads 101). `null` without a positive budget.
 */
export function budgetPct(spentHalalas: number, budgetHalalas: number | null): number | null {
  if (budgetHalalas === null || budgetHalalas <= 0) return null;
  const exact = (spentHalalas * 100) / budgetHalalas;
  return spentHalalas > budgetHalalas ? Math.ceil(exact) : Math.floor(exact);
}

/** The fill width in % (0–100), capped at a full bar. */
export function budgetFill(spentHalalas: number, budgetHalalas: number): number {
  if (budgetHalalas <= 0) return spentHalalas > 0 ? 100 : 0;
  return Math.min(100, Math.round((spentHalalas * 100) / budgetHalalas));
}

export type RingSlice = {
  /** A categoryId, or "other". */
  key: string;
  nameAr: string | null;
  totalHalalas: number;
  /** Share of all costs, 0–100 (not rounded — the arc uses it as is). */
  share: number;
};

export const RING_TOP = 5;

/** Costs (OUT) by category: the top 5 by amount, then one «أخرى» for the rest. */
export function categorySlices(
  rows: { categoryId: string; nameAr: string; direction: DirectionValue; totalHalalas: number }[],
): RingSlice[] {
  const costs = rows
    .filter((r) => r.direction === "OUT" && r.totalHalalas > 0)
    .sort((a, b) => b.totalHalalas - a.totalHalalas || a.nameAr.localeCompare(b.nameAr));
  const total = costs.reduce((s, r) => s + r.totalHalalas, 0);
  if (total === 0) return [];
  const slice = (key: string, nameAr: string | null, totalHalalas: number): RingSlice => ({
    key,
    nameAr,
    totalHalalas,
    share: (totalHalalas * 100) / total,
  });
  const top = costs.slice(0, RING_TOP).map((r) => slice(r.categoryId, r.nameAr, r.totalHalalas));
  const rest = costs.slice(RING_TOP).reduce((s, r) => s + r.totalHalalas, 0);
  return rest > 0 ? [...top, slice("other", null, rest)] : top;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Arcs in real stroke units on a circle of radius `r` (older iOS Safari ignores
 * `pathLength` on <circle>): each slice's dash length (share of 2πr) and its
 * offset (the length of the arcs before it), so the arcs tile the ring. Rounded
 * to 2 decimals; the offset sums unrounded lengths so rounding never drifts.
 */
export function ringArcs(shares: number[], r: number): { length: number; offset: number }[] {
  const circumference = 2 * Math.PI * r;
  let start = 0;
  return shares.map((share) => {
    const length = (share / 100) * circumference;
    const arc = { length: round2(length), offset: round2(start) };
    start += length;
    return arc;
  });
}

export function ringCircumference(r: number): number {
  return round2(2 * Math.PI * r);
}
