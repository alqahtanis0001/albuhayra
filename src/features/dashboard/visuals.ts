/**
 * v1.3 (docs/V13-SPEC.md items 1, 3, 4, 5): the numbers behind the dashboard
 * visuals. Pure and client-safe; each function is unit-tested in
 * visuals.test.ts. Money is integer halalas.
 */
import { isoToDate, toGregorian, toHijri } from "@/lib/dates";
import { formatSAR } from "@/lib/money";

export type Trend = "up" | "down" | "flat";
/** `capped`: the change was beyond ±999% and `pct` is held at ±999 («أو أكثر»). */
export type Momentum = { pct: number | null; trend: Trend; capped: boolean };

export const MOMENTUM_CAP = 999;

/**
 * Change of the net, in whole percent. `null` when there is nothing to compare
 * with (previous net 0 — also the first month). The base is `|previous|`, so
 * the sign always follows the direction of change: −1,000 → −500 is an
 * improvement of +50%, not −50%. `flat` when the rounded change is 0, so the
 * arrow and the printed «0%» never disagree. A tiny previous net (1 halala)
 * makes any change astronomical, so a rounded change beyond ±999% is held
 * at ±999 with `capped` set (lead review note 1).
 */
export function momentum(current: number, previous: number): Momentum {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) {
    return { pct: null, trend: "flat", capped: false };
  }
  const raw = Math.round(((current - previous) * 100) / Math.abs(previous));
  if (raw === 0) return { pct: 0, trend: "flat", capped: false };
  const capped = Math.abs(raw) > MOMENTUM_CAP;
  const pct = capped ? Math.sign(raw) * MOMENTUM_CAP : raw;
  return { pct, trend: pct > 0 ? "up" : "down", capped };
}

/** `+12%` / `−12%` (U+2212) / `0%` — Western digits, en-US grouping. */
export function formatSignedPercent(pct: number): string {
  const body = `${new Intl.NumberFormat("en-US").format(Math.abs(pct))}%`;
  if (pct > 0) return `+${body}`;
  if (pct < 0) return `−${body}`;
  return body;
}

export type DonutSlice = {
  /** A category id, or "other". */
  key: string;
  name: string;
  totalHalalas: number;
  /** Share of the month's OUT total, 0–100. */
  share: number;
};

/**
 * The top categories (already sorted, at most five) plus «أخرى» for whatever
 * the month's OUT total holds beyond them. No «أخرى» slice when it would be
 * zero or negative; no slices at all when the month has no OUT total.
 */
export function donutSlices(
  top: Array<{ categoryId: string; nameAr: string; totalHalalas: number }>,
  monthOutHalalas: number,
  otherName: string,
  limit = 5,
): DonutSlice[] {
  if (monthOutHalalas <= 0) return [];
  const shown = top.slice(0, limit).filter((c) => c.totalHalalas > 0);
  const rest = monthOutHalalas - shown.reduce((s, c) => s + c.totalHalalas, 0);
  const share = (v: number) => (v / monthOutHalalas) * 100;

  const slices: DonutSlice[] = shown.map((c) => ({
    key: c.categoryId,
    name: c.nameAr,
    totalHalalas: c.totalHalalas,
    share: share(c.totalHalalas),
  }));
  if (rest > 0) {
    slices.push({ key: "other", name: otherName, totalHalalas: rest, share: share(rest) });
  }
  return slices;
}

/** The owner ledger filtered to one OUT category over one date range. */
export function categoryLedgerHref(categoryId: string, from: string, to: string): string {
  const q = new URLSearchParams({ direction: "OUT", categoryId, from, to });
  return `/owner/transactions?${q.toString()}`;
}

export type WaterfallStep = {
  key: "opening" | "income" | "expenses" | "closing";
  /** Where the bar starts and ends on the value axis; `from === to` is a zero bar. */
  from: number;
  to: number;
};

export type Waterfall = { steps: WaterfallStep[]; min: number; max: number };

/**
 * Opening (from 0), income stacked on it going up, expenses going down from
 * there, closing (from 0). `min`/`max` span every bar end and 0, so the axis
 * always shows the zero line; both 0 means an all-zero month.
 */
export function waterfallSteps(opening: number, income: number, expenses: number): Waterfall {
  const afterIn = opening + income;
  const closing = afterIn - expenses;
  const steps: WaterfallStep[] = [
    { key: "opening", from: 0, to: opening },
    { key: "income", from: opening, to: afterIn },
    { key: "expenses", from: afterIn, to: closing },
    { key: "closing", from: 0, to: closing },
  ];
  const ends = [0, opening, afterIn, closing];
  return { steps, min: Math.min(...ends), max: Math.max(...ends) };
}

/**
 * The value a count-up shows `elapsed` ms into a `duration` ms run: ease-out
 * cubic from 0, whole halalas, exactly `target` from `duration` on.
 */
export function countUpValue(target: number, elapsed: number, duration: number): number {
  if (duration <= 0 || elapsed >= duration) return target;
  if (elapsed <= 0) return 0;
  const p = elapsed / duration;
  const eased = 1 - (1 - p) ** 3;
  return Math.round(target * eased);
}

/** `{key}` placeholders in one pass; inserted text is never re-scanned. */
export function fillText(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string) => (Object.hasOwn(values, key) ? values[key]! : m));
}

/**
 * A date inside a plain-text summary, with DateText's own formatters:
 * Gregorian, then the Hijri in brackets — "2026-09-29 (1448/04/07 هـ)".
 */
export function summaryDate(iso: string): string {
  const d = isoToDate(iso);
  return `${toGregorian(d)} (${toHijri(d)})`;
}

/**
 * A sparkline's text equivalent: first and last date (Gregorian with Hijri), highest and lowest
 * value as signed amounts (`−` for a negative). Empty with no points.
 */
export function sparkSummaryText(
  template: string,
  points: Array<{ date: string; value: number }>,
): string {
  if (points.length === 0) return "";
  const values = points.map((p) => p.value);
  return fillText(template, {
    from: summaryDate(points[0]!.date),
    to: summaryDate(points[points.length - 1]!.date),
    max: formatSAR(Math.max(...values)),
    min: formatSAR(Math.min(...values)),
  });
}

export type WaterfallBar = { key: WaterfallStep["key"]; x: number; y: number; w: number; h: number };

/**
 * The waterfall's rectangles in a `width × height` viewBox. Columns run right →
 * left (RTL: the opening balance is at the right). A zero step is 1 unit tall
 * on its level so it is still visible; `zeroY` is where the 0 line sits.
 */
export function waterfallBars(
  wf: Waterfall,
  width: number,
  height: number,
): { bars: WaterfallBar[]; zeroY: number } {
  const pad = 4;
  const span = wf.max - wf.min;
  const y = (v: number) => (span === 0 ? height - pad : pad + ((wf.max - v) / span) * (height - 2 * pad));
  const slot = width / wf.steps.length;
  const w = Math.round(slot * 0.6);

  const bars = wf.steps.map((s, i) => {
    const top = Math.min(y(s.from), y(s.to));
    const h = Math.max(1, Math.abs(y(s.from) - y(s.to)));
    return {
      key: s.key,
      x: Math.round(width - (i + 1) * slot + (slot - w) / 2),
      y: Math.round(Math.min(top, height - h)),
      w,
      h: Math.round(h),
    };
  });
  return { bars, zeroY: Math.round(y(0)) };
}
