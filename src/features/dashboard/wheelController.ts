/**
 * v1.5 (D5, D27, D42, D43): what `WheelCard` does on a tap, a key or a button,
 * as plain functions over injected effects — the state store, `router.push`
 * and the replay bump — so the node test env can drive every interaction
 * without a DOM. Client-safe and pure like `./wheelFocus` (D25).
 */
import type { Momentum } from "./visuals";
import {
  cardKeyAction,
  centreText,
  focusReducer,
  liveLine,
  rovingMove,
  showOpenHint,
  type CentreText,
  type CentreWords,
  type FocusAction,
  type FocusState,
  type Layer,
} from "./wheelFocus";
import type { WheelModel } from "./wheelModel";

export type WheelEffects = {
  getState: () => FocusState;
  setState: (next: FocusState) => void;
  /** `router.push` — a second activation of the same id navigates (D5). */
  push: (href: string) => void;
  /** Bumps the SVG's React `key`, so «إعادة العرض» remounts and the CSS draw replays (D6). */
  bumpReplay: () => void;
};

export function wheelController(fx: WheelEffects) {
  const dispatch = (action: FocusAction) => {
    const next = focusReducer(fx.getState(), action);
    fx.setState(next);
    if (next.navigateTo) fx.push(next.navigateTo);
  };
  return {
    dispatch,
    activate: (id: string, ring: Layer, href: string) => dispatch({ type: "activate", id, ring, href }),
    /** A row passes its own layer; it focuses the ring and never navigates. */
    row: (ring: Layer) => dispatch({ type: "row", ring }),
    /** Escape anywhere in the card (QV-S2). True when the key was handled. */
    cardKey: (key: string) => {
      const action = cardKeyAction(key);
      if (action) dispatch(action);
      return action !== null;
    },
    replay: () => {
      dispatch({ type: "clear" });
      fx.bumpReplay();
    },
    showAll: () => dispatch({ type: "clear" }),
  };
}

/** A key on a focused mark: Enter/Space activate it; arrows, Home and End move the roving cursor (D27). */
export function markKeyAction(key: string, index: number, length: number): { kind: "activate" } | { kind: "move"; to: number } | null {
  if (key === "Enter" || key === " ") return { kind: "activate" };
  const to = rovingMove(index, key, length);
  return to === null ? null : { kind: "move", to };
}

const TREND_TONE: Record<Momentum["trend"], string> = { up: "fill-money-in", down: "fill-money-out", flat: "fill-gray-500" };

export type WheelView = { centre: CentreText; centreTone: string; live: string; hintVisible: boolean; animate: boolean };

/** Everything the card derives from the state for one render. */
export function wheelView(state: FocusState, model: WheelModel, words: CentreWords & { openHint: string }): WheelView {
  const centre = centreText(state.focused, model, words);
  return {
    centre,
    centreTone: state.focused ? "fill-gray-500" : TREND_TONE[model.momentum.trend],
    live: liveLine(state, centre, words.openHint),
    hintVisible: showOpenHint(state),
    animate: !model.empty,
  };
}
