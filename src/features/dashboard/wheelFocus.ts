/**
 * v1.5 (docs/V15-SPEC.md A1, D5, D16, D19, D27, D29): the wheel's interaction
 * rules — the focus reducer, what dims, what the centre says and the roving
 * keyboard order. Pure and client-safe (D25); `WheelCard.tsx` imports it.
 */
import { formatSAR } from "@/lib/money";
import { plural, type PluralForms } from "@/lib/plural";

import { fillText } from "./visuals";
import type { WheelModel } from "./wheelModel";
import type { RingNo } from "./wheel";

/** Ring 4 is the dial. */
export type Layer = RingNo | 4;

export type Focus = { kind: "mark"; id: string; ring: Layer } | { kind: "ring"; ring: Layer };

export type FocusState = { focused: Focus | null; navigateTo: string | null; activated: boolean };

export type FocusAction =
  | { type: "activate"; id: string; ring: Layer; href: string }
  | { type: "row"; ring: Layer }
  | { type: "clear" }
  | { type: "escape" };

export const DIM = 0.18;

export const INITIAL_FOCUS: FocusState = { focused: null, navigateTo: null, activated: false };

/**
 * D5/D19: the first activation of a segment or dot focuses it; activating the
 * same id again navigates; another id moves the focus; a row focuses its whole
 * ring and never navigates; «إظهار الكل» and Escape clear.
 */
export function focusReducer(state: FocusState, action: FocusAction): FocusState {
  switch (action.type) {
    case "activate": {
      const f = state.focused;
      if (f?.kind === "mark" && f.id === action.id) return { ...state, navigateTo: action.href };
      return { focused: { kind: "mark", id: action.id, ring: action.ring }, navigateTo: null, activated: true };
    }
    case "row":
      return { focused: { kind: "ring", ring: action.ring }, navigateTo: null, activated: state.activated };
    case "clear":
    case "escape":
      return { ...state, focused: null, navigateTo: null };
  }
}

/** D16/D19: the focused layer stays at 1 (a dot keeps the dial lit); every other layer goes to 0.18. */
export function layerOpacity(focused: Focus | null, layer: Layer): number {
  if (!focused) return 1;
  return focused.ring === layer ? 1 : DIM;
}

/** Whole riyals, en-US grouping, `−` for a negative (D29: amounts inside the SVG). */
export function wholeRiyals(halalas: number, signed = false): string {
  const body = new Intl.NumberFormat("en-US").format(Math.round(Math.abs(halalas) / 100));
  if (halalas < 0 && Math.round(Math.abs(halalas) / 100) !== 0) return `−${body}`;
  return signed && halalas > 0 ? `+${body}` : body;
}

export type CentreWords = {
  centreLabel: string;
  centreSub: string;
  centreSubCapped: string;
  centreSubNoPct: string;
  arrowUp: string;
  arrowDown: string;
  arrowFlat: string;
  empty: string;
  ring1Name: string;
  ring2Name: string;
  ring3Name: string;
  ring4Name: string;
  ring1Focus: string;
  ring2Focus: string;
  ring3Focus: string;
  ring4Focus: string;
  ring1FocusSub: string;
  ring2FocusSub: string;
  ring3FocusSub: string;
  ring4FocusSub: string;
  dialCount: PluralForms;
};

/** What the centre shows: `amount` in whole riyals, `exactHalalas` for the live line (null = no amount). */
export type CentreText = {
  /** The full label — the live line uses it. */
  label: string;
  /** What the disc draws: the label clipped to LABEL_MAX characters + «…» (D40). */
  shortLabel: string;
  amount: string;
  sub: string;
  exactHalalas: number | null;
  currency: boolean;
};

/** D40 (R1-H4): the longest label the 140-unit centre disc draws. */
export const LABEL_MAX = 20;

/** Clipped by characters (code points), never inside a surrogate pair. */
export function clipLabel(label: string, max = LABEL_MAX): string {
  const chars = Array.from(label);
  return chars.length > max ? `${chars.slice(0, max).join("")}…` : label;
}

/** Unicode isolates (LRI … PDI): a number token keeps its own left-to-right order inside RTL text (D40). */
export const LRI = "\u2066";
export const PDI = "\u2069";

const ARROW = { up: "arrowUp", down: "arrowDown", flat: "arrowFlat" } as const;

function layerWord(words: CentreWords, layer: Layer, part: "Name" | "Focus" | "FocusSub"): string {
  return words[`ring${layer}${part}` as keyof CentreWords] as string;
}

/** `12%` — unsigned (the arrow carries the direction), Western digits, like `formatPercent`. */
export function unsignedPercent(pct: number): string {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(Math.abs(pct))}%`;
}

/** The default sub line: «الصافي ±X · ↑N%», capped «… أو أكثر», or the net alone (D29). */
export function centreSub(model: Pick<WheelModel, "netHalalas" | "momentum">, words: CentreWords): string {
  const net = wholeRiyals(model.netHalalas, true);
  const { pct, trend, capped } = model.momentum;
  if (pct === null) return fillText(words.centreSubNoPct, { net: `${LRI}${net}${PDI}` });
  // `{arrow}{pct}` is one isolate: LRI before the arrow, PDI after the percent.
  const values = { net: `${LRI}${net}${PDI}`, arrow: `${LRI}${words[ARROW[trend]]}`, pct: `${unsignedPercent(pct)}${PDI}` };
  return fillText(capped ? words.centreSubCapped : words.centreSub, values);
}

export function centreText(focused: Focus | null, model: WheelModel, words: CentreWords): CentreText {
  const c = centreParts(focused, model, words);
  return { ...c, shortLabel: clipLabel(c.label) };
}

function centreParts(focused: Focus | null, model: WheelModel, words: CentreWords): Omit<CentreText, "shortLabel"> {
  if (!focused) {
    if (model.empty) return { label: words.empty, amount: "", sub: "", exactHalalas: null, currency: false };
    return {
      label: words.centreLabel,
      amount: wholeRiyals(model.balanceHalalas),
      sub: centreSub(model, words),
      exactHalalas: model.balanceHalalas,
      currency: true,
    };
  }
  if (focused.kind === "mark") {
    const seg = model.rings.flatMap((r) => r.segments).find((s) => s.id === focused.id);
    const dot = model.dots.find((d) => d.id === focused.id);
    const name = seg?.name ?? dot?.name ?? "";
    const amount = seg?.amountHalalas ?? dot?.totalHalalas ?? 0;
    const sub = layerWord(words, focused.ring, "Name");
    return { label: name, amount: wholeRiyals(amount), sub, exactHalalas: amount, currency: true };
  }
  const label = layerWord(words, focused.ring, "Focus");
  const sub = layerWord(words, focused.ring, "FocusSub");
  if (focused.ring === 4) {
    const n = model.dots.reduce((s, d) => s + d.count, 0);
    return { label, amount: plural(words.dialCount, n), sub, exactHalalas: null, currency: false };
  }
  const total = model.rings[focused.ring - 1]!.totalHalalas;
  return { label, amount: wholeRiyals(total), sub, exactHalalas: total, currency: true };
}

/** D27: the sr-only live line — the centre with the exact amount. */
export function liveText(c: CentreText): string {
  const amount = c.exactHalalas === null ? c.amount : formatSAR(c.exactHalalas);
  return [c.label, amount, c.sub].filter(Boolean).join(" — ");
}

/** D42 (QV-S3): «اضغط مرة أخرى للفتح» shows after an activation while a mark — never a row — is focused. */
export function showOpenHint(state: FocusState): boolean {
  return state.activated && state.focused?.kind === "mark";
}

/** D27 + D42 (N6): the sr-only live line — the centre, then «. » and the hint when it shows. */
export function liveLine(state: FocusState, centre: CentreText, hint: string): string {
  if (!state.focused) return "";
  const line = liveText(centre);
  return showOpenHint(state) ? `${line}. ${hint}` : line;
}

/** D42 (QV-S2): Escape anywhere in the card — a segment, a dot or an explanation row — clears the focus. */
export function cardKeyAction(key: string): FocusAction | null {
  return key === "Escape" ? { type: "escape" } : null;
}

/** The roving order: ring 1 → 2 → 3 → dial marks (D27). */
export function rovingIds(model: WheelModel): Array<{ id: string; ring: Layer; href: string }> {
  const segs = model.rings.flatMap((r) => r.segments.map((s) => ({ id: s.id, ring: s.ring as Layer, href: s.href })));
  return [...segs, ...model.dots.map((d) => ({ id: d.id, ring: 4 as Layer, href: d.href }))];
}

/**
 * D27: the next roving index for a key, or null when the key is not a move.
 * RTL: ArrowLeft and ArrowDown go forward, ArrowRight and ArrowUp back; Home/End
 * jump; the ends wrap.
 */
export function rovingMove(index: number, key: string, length: number): number | null {
  if (length === 0) return null;
  switch (key) {
    case "ArrowLeft":
    case "ArrowDown":
      return (index + 1) % length;
    case "ArrowRight":
    case "ArrowUp":
      return (index - 1 + length) % length;
    case "Home":
      return 0;
    case "End":
      return length - 1;
    default:
      return null;
  }
}
