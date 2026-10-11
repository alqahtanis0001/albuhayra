"use client";

/**
 * v1.5 (docs/V15-SPEC.md A1, D5, D7, D17, D19, D25, D27, D28, D42): «نظرة شاملة
 * على المنشأة» — the card around the wheel. It holds the focus state, the
 * roving keyboard cursor (one Tab stop; arrows ring 1 → 2 → 3 → dial,
 * Home/End, Enter/Space, Escape) and the replay key; what each tap, key and
 * button does lives in the pure `wheelController` / `wheelView` (D43: tested
 * without a DOM). Everything it draws arrives computed from the server
 * (`buildWheelModel`); this file and its two leaves import types, the pure
 * rules and constants only.
 */
import { useRouter } from "next/navigation";
import { useReducer, useRef, useState, type KeyboardEvent } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { t } from "@/i18n/ar";
import { markKeyAction, wheelController, wheelView } from "@/features/dashboard/wheelController";
import { INITIAL_FOCUS, rovingIds } from "@/features/dashboard/wheelFocus";
import type { WheelModel } from "@/features/dashboard/wheelModel";

import { WheelRows } from "./WheelRows";
import { WheelSvg, type MarkHandlers } from "./WheelSvg";

export function WheelCard({ model }: { model: WheelModel }) {
  const router = useRouter();
  const [state, setState] = useState(INITIAL_FOCUS);
  const [replay, bumpReplay] = useReducer((n: number) => n + 1, 0);
  const [cursor, setCursor] = useState(0);
  const refs = useRef(new Map<string, SVGGElement>());
  const order = rovingIds(model);
  const ctl = wheelController({ getState: () => state, setState, push: (href) => router.push(href), bumpReplay });
  const view = wheelView(state, model, t.wheel);

  const handlers: MarkHandlers = {
    tabIndexOf: (id) => (order[Math.min(cursor, order.length - 1)]?.id === id ? 0 : -1),
    refOf: (id) => (el) => {
      if (el) refs.current.set(id, el);
      else refs.current.delete(id);
    },
    onActivate: (id, ring, href) => {
      const at = order.findIndex((o) => o.id === id);
      if (at >= 0) setCursor(at);
      ctl.activate(id, ring, href);
    },
    // Escape is not handled here: it bubbles to the card's own handler (QV-S2).
    onKeyDown: (e: KeyboardEvent<SVGGElement>, id, ring, href) => {
      const action = markKeyAction(e.key, order.findIndex((o) => o.id === id), order.length);
      if (!action) return;
      e.preventDefault();
      if (action.kind === "activate") {
        handlers.onActivate(id, ring, href);
        return;
      }
      setCursor(action.to);
      refs.current.get(order[action.to]!.id)?.focus();
    },
  };

  return (
    <Card title={t.wheel.title} bodyClassName="pb-4">
      <div className="flex flex-col gap-3" onKeyDown={(e) => ctl.cardKey(e.key)}>
        <p className="px-4 pt-3 text-xs text-gray-600">{t.wheel.hint}</p>
        {/* D27: full-bleed — no inline padding on the wheel's wrapper. «إعادة العرض» bumps the key (D6). */}
        <div className="w-full">
          <WheelSvg
            key={replay}
            model={model}
            focused={state.focused}
            centre={view.centre}
            centreTone={view.centreTone}
            animate={view.animate}
            handlers={handlers}
          />
        </div>
        {view.hintVisible ? <p className="no-print px-4 text-xs text-gray-500">{t.wheel.openHint}</p> : null}
        <p className="sr-only" aria-live="polite">
          {view.live}
        </p>
        <WheelRows key={`rows${replay}`} model={model} focused={state.focused} animate={view.animate} onRow={ctl.row} />
        {/* N5: nothing to replay or clear in the empty state. */}
        {model.empty ? null : (
          <div className="no-print flex flex-wrap gap-2 px-4">
            <Button type="button" onClick={ctl.replay}>
              {t.wheel.replay}
            </Button>
            <Button type="button" variant="secondary" onClick={ctl.showAll}>
              {t.wheel.showAll}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

export default WheelCard;
