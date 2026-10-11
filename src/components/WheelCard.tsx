"use client";

/**
 * v1.5 (docs/V15-SPEC.md A1, D5, D7, D17, D19, D25, D27, D28): «نظرة شاملة على
 * المنشأة» — the card around the wheel. It owns the focus (the pure
 * `focusReducer`), the roving keyboard cursor (one Tab stop; arrows ring 1 → 2
 * → 3 → dial, Home/End, Enter/Space, Escape) and the replay key. Everything it
 * draws arrives computed from the server (`buildWheelModel`); this file and
 * its two leaves import types, the pure focus rules and constants only.
 */
import { useRouter } from "next/navigation";
import { useCallback, useReducer, useRef, useState, type KeyboardEvent } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { t } from "@/i18n/ar";
import {
  INITIAL_FOCUS,
  centreText,
  focusReducer,
  liveText,
  rovingIds,
  rovingMove,
  type FocusAction,
  type Layer,
} from "@/features/dashboard/wheelFocus";
import type { WheelModel } from "@/features/dashboard/wheelModel";

import { WheelRows } from "./WheelRows";
import { WheelSvg, type MarkHandlers } from "./WheelSvg";

const TREND_TONE = { up: "fill-money-in", down: "fill-money-out", flat: "fill-gray-500" } as const;

export function WheelCard({ model }: { model: WheelModel }) {
  const router = useRouter();
  const [state, setState] = useState(INITIAL_FOCUS);
  const [replay, bumpReplay] = useReducer((n: number) => n + 1, 0);
  const [cursor, setCursor] = useState(0);
  const refs = useRef(new Map<string, SVGGElement>());
  const order = rovingIds(model);

  const dispatch = useCallback(
    (action: FocusAction) => {
      const next = focusReducer(state, action);
      setState(next);
      if (next.navigateTo) router.push(next.navigateTo);
    },
    [state, router],
  );

  const handlers: MarkHandlers = {
    tabIndexOf: (id) => (order[Math.min(cursor, order.length - 1)]?.id === id ? 0 : -1),
    refOf: (id) => (el) => {
      if (el) refs.current.set(id, el);
      else refs.current.delete(id);
    },
    onActivate: (id, ring, href) => {
      const at = order.findIndex((o) => o.id === id);
      if (at >= 0) setCursor(at);
      dispatch({ type: "activate", id, ring, href });
    },
    onKeyDown: (e: KeyboardEvent<SVGGElement>, id, ring, href) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handlers.onActivate(id, ring, href);
        return;
      }
      if (e.key === "Escape") {
        dispatch({ type: "escape" });
        return;
      }
      const at = order.findIndex((o) => o.id === id);
      const next = rovingMove(at, e.key, order.length);
      if (next === null) return;
      e.preventDefault();
      setCursor(next);
      refs.current.get(order[next]!.id)?.focus();
    },
  };

  const centre = centreText(state.focused, model, t.wheel);
  const centreTone = state.focused ? "fill-gray-500" : TREND_TONE[model.momentum.trend];
  const animate = !model.empty;

  return (
    <Card title={t.wheel.title} bodyClassName="flex flex-col gap-3 pb-4">
      <p className="px-4 pt-3 text-xs text-gray-600">{t.wheel.hint}</p>
      {/* D27: full-bleed — no inline padding on the wheel's wrapper. */}
      <div className="w-full">
        <WheelSvg
          key={replay}
          model={model}
          focused={state.focused}
          centre={centre}
          centreTone={centreTone}
          animate={animate}
          handlers={handlers}
        />
      </div>
      <p className="sr-only" aria-live="polite">
        {state.focused ? liveText(centre) : ""}
        {state.focused?.kind === "mark" && state.activated ? ` ${t.wheel.openHint}` : ""}
      </p>
      <WheelRows
        key={`rows${replay}`}
        model={model}
        focused={state.focused}
        animate={animate}
        onRow={(layer: Layer) => dispatch({ type: "row", ring: layer })}
      />
      <div className="no-print flex flex-wrap gap-2 px-4">
        <Button type="button" onClick={() => { dispatch({ type: "clear" }); bumpReplay(); }}>
          {t.wheel.replay}
        </Button>
        <Button type="button" variant="secondary" onClick={() => dispatch({ type: "clear" })}>
          {t.wheel.showAll}
        </Button>
      </div>
    </Card>
  );
}

export default WheelCard;
