/**
 * v1.5 (docs/V15-SPEC.md A1, D3, D4, D18, D23, D25): the overview wheel's pure
 * geometry — ring arcs, the dial's angles and dot sizes, the day clustering
 * and every navigation target. Client-safe (D25): no `server-only`, value
 * imports only from `@/lib/dates`, `@/lib/money`, `@/lib/plural` and
 * `./visuals`. Angles are degrees clockwise from the top; the viewBox is
 * 400 × 400 with the centre at 200, 200, as in the approved mock.
 */
import { donutSlices, type DonutSlice } from "./visuals";
import { dayHref, dueHref } from "./wheelHrefs";

export const VIEWBOX = 400;
export const CENTRE = 200;
/** Ring 1 (this month), ring 2 (OUT by category), ring 3 (commitments) — the mock's radii and widths. */
export const RINGS = {
  1: { r: 88, w: 24 },
  2: { r: 122, w: 26 },
  3: { r: 155, w: 22 },
} as const;
export const DIAL_R = 180;
export const CENTRE_R = 70;
/** Degrees left empty at each end of an arc. */
export const GAP = 3;
/** The smallest span (after gaps) a non-zero value is drawn with — recorded in progress/v15/home.md. */
export const MIN_ARC = 4;
/** Where the ring numbers sit. */
export const BADGE_ANGLE = 215;
/** D3: every dot's invisible hit circle, in viewBox units (≥ 22 CSS px at ≥ 315 px wide). */
export const HIT_RADIUS = 14;
export const DOT_MIN = 4;
export const DOT_MAX = 10;
/** The user's "max 40 dots" (A1). Day merging keeps the dial at ≤ 32 marks; the cap still holds (D18). */
export const MAX_MARKS = 40;
export const DIAL_DAYS = 30;

export type RingNo = 1 | 2 | 3;
export type DialKind = "IN" | "OUT" | "SALARY";

/** One unpaid instalment on the dial (built by `overviewReads.ts`). */
export type DialEvent = {
  instalmentId: string;
  planId: string;
  employeeId: string | null;
  partyName: string;
  kind: DialKind;
  remainingHalalas: number;
  dueDate: string;
  /** due − today in days: 0 = today, negative = overdue. */
  dayOffset: number;
};

export type Commitments = { toUsHalalas: number; fromUsHalalas: number; salariesHalalas: number };

/** The two most recent overdue dues plus the whole overdue count and sum (D35). */
export type OverdueSummary = { recent: DialEvent[]; count: number; totalHalalas: number };

export type OwnerOverview = { commitments: Commitments; dial: DialEvent[]; overdue: OverdueSummary };

/** A point on a circle of radius `r` at `angle` degrees clockwise from the top. */
export function polar(r: number, angle: number): [number, number] {
  const k = ((angle - 90) * Math.PI) / 180;
  return [CENTRE + r * Math.cos(k), CENTRE + r * Math.sin(k)];
}

/** An SVG arc from `a0` to `a1` (clockwise) on radius `r`. */
export function arcPath(r: number, a0: number, a1: number): string {
  const [x0, y0] = polar(r, a0);
  const [x1, y1] = polar(r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M${x0.toFixed(1)},${y0.toFixed(1)} A${r},${r} 0 ${large} 1 ${x1.toFixed(1)},${y1.toFixed(1)}`;
}

/**
 * `[a0, a1]` per value, or null for a zero (no arc). Spans are proportional and
 * add up to 360 − 2·gap·n (n = the non-zero values); a non-zero value never
 * spans less than `minArc` — the shortfall is borrowed from the others in
 * proportion to their values. All zero → every entry null (the empty ring).
 */
export function ringArcs(values: number[], gap = GAP, minArc = MIN_ARC): Array<[number, number] | null> {
  const live = values.map((v, i) => ({ v, i })).filter((x) => x.v > 0);
  const out: Array<[number, number] | null> = values.map(() => null);
  if (live.length === 0) return out;

  const available = 360 - 2 * gap * live.length;
  const spans = new Map<number, number>();
  if (live.length * minArc >= available) {
    for (const x of live) spans.set(x.i, available / live.length);
  } else {
    // Pin the small ones at minArc, share the rest by value; repeat until no
    // newly shared span falls below the minimum.
    let pinned = new Set<number>();
    for (;;) {
      const free = live.filter((x) => !pinned.has(x.i));
      const room = available - pinned.size * minArc;
      const sum = free.reduce((s, x) => s + x.v, 0);
      const under = free.filter((x) => (room * x.v) / sum < minArc);
      if (under.length === 0) {
        for (const x of free) spans.set(x.i, (room * x.v) / sum);
        for (const i of pinned) spans.set(i, minArc);
        break;
      }
      pinned = new Set([...pinned, ...under.map((x) => x.i)]);
    }
  }

  let cursor = 0;
  for (const x of live) {
    const a0 = cursor + gap;
    const a1 = a0 + spans.get(x.i)!;
    out[x.i] = [a0, a1];
    cursor = a1 + gap;
  }
  return out;
}

/** Ring 2: the donut's own slices (top 5 + «أخرى» when > 0), so the two never disagree. */
export function ring2Slices(
  top: Array<{ categoryId: string; nameAr: string; totalHalalas: number }>,
  monthOutHalalas: number,
  otherName: string,
): DonutSlice[] {
  return donutSlices(top, monthOutHalalas, otherName);
}

/** D18: day d ∈ [0, 29] at 6 + 11·d degrees, so no dot touches the «اليوم» marker at 0°. */
export function dayAngle(dayOffset: number): number {
  return 6 + 11 * dayOffset;
}

/**
 * D18: at most two overdue dots, evenly in [−26°, −6°]; input is most recent
 * first, so the most overdue sits furthest from today. One dot (or the
 * cluster) sits mid-way.
 */
export function overdueAngles(n: number): number[] {
  if (n <= 0) return [];
  if (n === 1) return [-16];
  return Array.from({ length: n }, (_, i) => -6 - (20 * i) / (n - 1));
}

/** D3: 4 + 6·√(amount / max), clamped to [4, 10]. */
export function dotRadius(amount: number, max: number): number {
  if (!(max > 0) || !(amount > 0)) return DOT_MIN;
  const r = DOT_MIN + (DOT_MAX - DOT_MIN) * Math.sqrt(amount / max);
  return Math.min(DOT_MAX, Math.max(DOT_MIN, r));
}

/** A mark on the dial: one due, a day holding several, or the overdue cluster. */
export type DialMark = {
  id: string;
  kind: DialKind;
  overdue: boolean;
  /** 1 for a single due. */
  count: number;
  totalHalalas: number;
  angle: number;
  /** The single due's day offset; a day-dot's day; the overdue cluster's is null. */
  dayOffset: number | null;
  dueDate: string | null;
  /** The single due's party or employee; null for a cluster. */
  partyName: string | null;
  href: string;
};

/** The day's largest kind by amount; a tie keeps the earlier one in IN, OUT, SALARY order. */
function dominantKind(events: DialEvent[]): DialKind {
  const sums: Record<DialKind, number> = { IN: 0, OUT: 0, SALARY: 0 };
  for (const e of events) sums[e.kind] += e.remainingHalalas;
  return (["IN", "OUT", "SALARY"] as const).reduce((best, k) => (sums[k] > sums[best] ? k : best), "IN" as DialKind);
}

function singleMark(e: DialEvent, angle: number, overdue: boolean): DialMark {
  return {
    id: `i:${e.instalmentId}`, kind: e.kind, overdue, count: 1, totalHalalas: e.remainingHalalas, angle,
    dayOffset: e.dayOffset, dueDate: e.dueDate, partyName: e.partyName, href: dueHref(e),
  };
}

/**
 * D18 + D23: the dial's marks. Upcoming dues (days 0–29) merge per day — a day
 * with one due is that due's dot; overdue: ≤ 2 hollow dots, ≥ 3 one hollow
 * cluster → /owner/dues. Dues outside the window are not drawn. The `max`
 * guard folds any overflow into the last mark (unreachable with day merging:
 * 30 days + 2 overdue = 32).
 */
export function clusterDots(dial: DialEvent[], overdue: OverdueSummary, max = MAX_MARKS): DialMark[] {
  const marks: DialMark[] = [];
  if (overdue.count >= 3) {
    marks.push({
      id: "overdue", kind: "OUT", overdue: true, count: overdue.count, totalHalalas: overdue.totalHalalas,
      angle: overdueAngles(1)[0]!, dayOffset: null, dueDate: null, partyName: null, href: "/owner/dues",
    });
  } else if (overdue.count > 0) {
    const shown = overdue.recent.slice(0, overdue.count);
    const angles = overdueAngles(shown.length);
    shown.forEach((e, i) => marks.push(singleMark(e, angles[i]!, true)));
  }

  const byDay = new Map<number, DialEvent[]>();
  for (const e of dial) {
    if (e.dayOffset < 0 || e.dayOffset >= DIAL_DAYS) continue;
    byDay.set(e.dayOffset, [...(byDay.get(e.dayOffset) ?? []), e]);
  }
  for (const day of [...byDay.keys()].sort((a, b) => a - b)) {
    const events = byDay.get(day)!;
    if (events.length === 1) {
      marks.push(singleMark(events[0]!, dayAngle(day), false));
      continue;
    }
    marks.push({
      id: `d:${day}`, kind: dominantKind(events), overdue: false, count: events.length,
      totalHalalas: events.reduce((s, e) => s + e.remainingHalalas, 0), angle: dayAngle(day),
      dayOffset: day, dueDate: events[0]!.dueDate, partyName: null, href: dayHref(events, day),
    });
  }

  if (marks.length <= max) return marks;
  const kept = marks.slice(0, max - 1);
  const rest = marks.slice(max - 1);
  const last = rest[0]!;
  kept.push({
    ...last, id: `d:${last.dayOffset ?? "rest"}+`, partyName: null, href: "/owner/dues",
    count: rest.reduce((s, m) => s + m.count, 0), totalHalalas: rest.reduce((s, m) => s + m.totalHalalas, 0),
  });
  return kept;
}
