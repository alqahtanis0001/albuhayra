/**
 * v1.5 (docs/V15-SPEC.md A1, D7, D25, D28): everything the wheel draws, built
 * on the server from the dashboard and overview reads and handed to the client
 * as plain props — names, amounts, ids, dates, hrefs and the computed
 * geometry. Client-safe and pure like `./wheel`.
 */
import { formatSAR } from "@/lib/money";
import { plural, type PluralForms } from "@/lib/plural";

import { categoryColour } from "./categoryColours";
import { fillText, momentum, type Momentum } from "./visuals";
import { COMMITMENT_HREF, ROW_HREF, categoryHref, directionHref, monthLedgerHref } from "./wheelHrefs";
import {
  DIAL_R,
  RINGS,
  clusterDots,
  dotRadius,
  polar,
  ring2Slices,
  ringArcs,
  type DialMark,
  type OwnerOverview,
  type RingNo,
} from "./wheel";

/** Colour roles of rings 1 and 3 and the dial. */
export type Tone = "green" | "red" | "gold";

/** Tone → token (theme's v1.5 layer). Shapes only, never text (D33). */
export const TONE_VAR: Record<Tone, string> = {
  green: "var(--color-accent)",
  red: "var(--color-money-out)",
  gold: "var(--color-gold)",
};

export type WheelSegment = {
  id: string;
  ring: RingNo;
  name: string;
  amountHalalas: number;
  /** A `var(--color-…)` token: the arc's stroke and its row's swatch. Ring 2 uses `categoryColour` (D47). */
  colour: string;
  a0: number;
  a1: number;
  href: string;
  /** `t.wheel.segment` with the exact amount (D29). */
  aria: string;
};

export type WheelRing = { ring: RingNo; r: number; w: number; totalHalalas: number; segments: WheelSegment[] };

export type WheelDot = DialMark & { cx: number; cy: number; r: number; aria: string; name: string };

export type WheelModel = {
  rings: [WheelRing, WheelRing, WheelRing];
  /** D48: each explanation row's «عرض» link — ring 1, ring 2, ring 3, the dial. */
  rowHrefs: [string, string, string, string];
  dots: WheelDot[];
  /** D28: no entry, every ring zero and no dial mark. */
  empty: boolean;
  balanceHalalas: number;
  netHalalas: number;
  momentum: Momentum;
};

/** The strings the model needs — `t.wheel` satisfies it. */
export type WheelWords = {
  inMonth: string;
  outMonth: string;
  other: string;
  toUs: string;
  fromUs: string;
  salaries: string;
  segment: string;
  dotToday: string;
  dotOverdueIn: PluralForms;
  dotOverdueOut: PluralForms;
  dotOverdueSalary: PluralForms;
  dotIn: PluralForms;
  dotOut: PluralForms;
  dotSalary: PluralForms;
  cluster: PluralForms;
  clusterOverdue: PluralForms;
};

export type WheelInput = {
  today: string;
  hasEntry: boolean;
  balanceTotalHalalas: number;
  monthNetHalalas: number;
  prevMonthToDateNetHalalas: number;
  monthInHalalas: number;
  monthOutHalalas: number;
  topOutCategories: Array<{ categoryId: string; nameAr: string; totalHalalas: number }>;
  overview: OwnerOverview;
};

const round1 = (v: number) => Math.round(v * 10) / 10;

function ring(no: RingNo, items: Array<Omit<WheelSegment, "a0" | "a1" | "ring" | "aria">>, words: WheelWords): WheelRing {
  const arcs = ringArcs(items.map((i) => i.amountHalalas));
  const segments: WheelSegment[] = [];
  items.forEach((item, i) => {
    const arc = arcs[i];
    if (!arc) return;
    const aria = fillText(words.segment, { name: item.name, amount: formatSAR(item.amountHalalas) });
    segments.push({ ...item, ring: no, a0: arc[0], a1: arc[1], aria });
  });
  const totalHalalas = items.reduce((s, i) => s + Math.max(0, i.amountHalalas), 0);
  return { ring: no, ...RINGS[no], totalHalalas, segments };
}

/** A dot's accessible name (plural forms; D18 cluster labels). */
export function dotLabel(m: DialMark, words: WheelWords): string {
  if (m.id === "overdue") return plural(words.clusterOverdue, m.count);
  if (m.count > 1) return plural(words.cluster, m.count).replace("{date}", m.dueDate ?? "");
  const name = m.partyName ?? "";
  const days = m.dayOffset ?? 0;
  if (m.overdue) {
    // D42 (N7): an overdue dot says which way the money goes.
    const late = m.kind === "SALARY" ? words.dotOverdueSalary : m.kind === "IN" ? words.dotOverdueIn : words.dotOverdueOut;
    return plural(late, -days).replace("{name}", name);
  }
  if (days === 0) return words.dotToday.replace("{name}", name);
  const forms = m.kind === "SALARY" ? words.dotSalary : m.kind === "IN" ? words.dotIn : words.dotOut;
  return plural(forms, days).replace("{name}", name);
}

export function buildWheelModel(input: WheelInput, words: WheelWords): WheelModel {
  const { today, overview } = input;
  const r1 = ring(
    1,
    [
      { id: "r1:IN", name: words.inMonth, amountHalalas: input.monthInHalalas, colour: TONE_VAR.green, href: directionHref("IN", today) },
      { id: "r1:OUT", name: words.outMonth, amountHalalas: input.monthOutHalalas, colour: TONE_VAR.red, href: directionHref("OUT", today) },
    ],
    words,
  );
  const slices = ring2Slices(input.topOutCategories, input.monthOutHalalas, words.other);
  const r2 = ring(
    2,
    slices.map((s, i) => ({
      id: `r2:${s.key}`,
      name: s.name,
      amountHalalas: s.totalHalalas,
      // D47: the donut's colour for the same rank of the same slices.
      colour: categoryColour(s.key, i),
      href: categoryHref(s.key, today),
    })),
    words,
  );
  const c = overview.commitments;
  const r3 = ring(
    3,
    [
      { id: "r3:toUs", name: words.toUs, amountHalalas: c.toUsHalalas, colour: TONE_VAR.green, href: COMMITMENT_HREF.toUs },
      { id: "r3:fromUs", name: words.fromUs, amountHalalas: c.fromUsHalalas, colour: TONE_VAR.red, href: COMMITMENT_HREF.fromUs },
      { id: "r3:salaries", name: words.salaries, amountHalalas: c.salariesHalalas, colour: TONE_VAR.gold, href: COMMITMENT_HREF.salaries },
    ],
    words,
  );

  const marks = clusterDots(overview.dial, overview.overdue);
  const max = Math.max(0, ...marks.map((m) => m.totalHalalas));
  const dots = marks.map((m): WheelDot => {
    const [cx, cy] = polar(DIAL_R, m.angle);
    const aria = dotLabel(m, words);
    const r = dotRadius(m.totalHalalas, max);
    return { ...m, cx: round1(cx), cy: round1(cy), r: round1(r), aria, name: m.partyName ?? aria };
  });

  const rings: [WheelRing, WheelRing, WheelRing] = [r1, r2, r3];
  return {
    rings,
    rowHrefs: [monthLedgerHref(today), ROW_HREF.ring2, ROW_HREF.ring3, ROW_HREF.dial],
    dots,
    empty: !input.hasEntry && rings.every((r) => r.segments.length === 0) && dots.length === 0,
    balanceHalalas: input.balanceTotalHalalas,
    netHalalas: input.monthNetHalalas,
    momentum: momentum(input.monthNetHalalas, input.prevMonthToDateNetHalalas),
  };
}
