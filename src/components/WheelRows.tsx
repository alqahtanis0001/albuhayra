"use client";

/**
 * v1.5 (docs/V15-SPEC.md A1, D4, D6, D29): the wheel's four numbered
 * explanation rows — the mock's wording, the live values with exact amounts
 * and the mock's swatches. Each row is a real `<button>` that focuses its
 * whole ring (never navigates) beside a trailing «عرض» link to the ring's page
 * (D48 — a link never sits inside the button). They light up as their ring finishes (CSS
 * only, `backwards` fill — D30), and are the text equivalent of the wheel for
 * screen readers and print.
 */
import Link from "next/link";

import { MoneyText } from "@/components/MoneyText";
import { t } from "@/i18n/ar";
import { plural } from "@/lib/plural";
import type { Focus, Layer } from "@/features/dashboard/wheelFocus";
import type { WheelModel } from "@/features/dashboard/wheelModel";
import { fillText } from "@/features/dashboard/visuals";

import { LAYER_DELAY, TONE_VAR, delay } from "./WheelSvg";

const LIT = "motion-safe:animate-[wheel-lit_0.3s_ease-out_backwards] print:animate-none";

/** `colour: null` = a plain text value with no swatch (row 4's count). */
type Value = { key: string; name: string; colour: string | null; halalas?: number; hollow?: boolean };

function valuesOf(model: WheelModel, layer: Layer): Value[] {
  if (layer === 4) {
    // D40 (R1-H8): the dial's count, so the row states how many dues it holds.
    // N5: the D28 empty state has no «0 موعد».
    const n = model.dots.reduce((s, d) => s + d.count, 0);
    const count: Value[] = model.empty ? [] : [{ key: "count", name: plural(t.wheel.dialCount, n), colour: null }];
    return [
      ...count,
      { key: "overdue", name: t.wheel.legendOverdue, colour: TONE_VAR.red, hollow: true },
      { key: "in", name: t.wheel.legendIn, colour: TONE_VAR.green },
      { key: "out", name: t.wheel.legendOut, colour: TONE_VAR.red },
      { key: "salary", name: t.wheel.legendSalary, colour: TONE_VAR.gold },
    ];
  }
  return model.rings[layer - 1]!.segments.map((s) => ({
    key: s.id,
    name: s.name,
    colour: s.colour,
    halalas: s.amountHalalas,
  }));
}

/** Ring 1 and 3 list their parts even at zero, so the row still explains (D28). */
function zeroValues(layer: Layer): Value[] {
  if (layer === 1) {
    return [
      { key: "in", name: t.wheel.inMonth, colour: TONE_VAR.green, halalas: 0 },
      { key: "out", name: t.wheel.outMonth, colour: TONE_VAR.red, halalas: 0 },
    ];
  }
  if (layer === 3) {
    return [
      { key: "toUs", name: t.wheel.toUs, colour: TONE_VAR.green, halalas: 0 },
      { key: "fromUs", name: t.wheel.fromUs, colour: TONE_VAR.red, halalas: 0 },
      { key: "salaries", name: t.wheel.salaries, colour: TONE_VAR.gold, halalas: 0 },
    ];
  }
  return [];
}

function Swatch({ colour, hollow }: { colour: string; hollow?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={hollow ? "inline-block size-2.5 rounded-full border-2 bg-transparent" : "inline-block size-2.5 rounded-sm"}
      style={hollow ? { borderColor: colour } : { backgroundColor: colour }}
    />
  );
}

const TEXT: Record<Layer, { title: string; text: string }> = {
  1: { title: t.wheel.row1Title, text: t.wheel.row1Text },
  2: { title: t.wheel.row2Title, text: t.wheel.row2Text },
  3: { title: t.wheel.row3Title, text: t.wheel.row3Text },
  4: { title: t.wheel.row4Title, text: t.wheel.row4Text },
};

export function WheelRows({
  model,
  focused,
  animate,
  onRow,
}: {
  model: WheelModel;
  focused: Focus | null;
  animate: boolean;
  onRow: (layer: Layer) => void;
}) {
  return (
    <div className="grid gap-2 px-4">
      {([1, 2, 3, 4] as const).map((layer) => {
        const on = focused?.kind === "ring" && focused.ring === layer;
        const live = valuesOf(model, layer);
        const values = live.length > 0 ? live : zeroValues(layer);
        return (
          <div
            key={layer}
            className={`flex items-stretch rounded-xl border ${on ? "border-accent bg-accent-soft" : "border-gray-200 bg-white"} ${
              animate ? LIT : ""
            }`}
            style={delay(LAYER_DELAY[layer] + 0.3, animate)}
          >
            <button
              type="button"
              aria-pressed={on}
              onClick={() => onRow(layer)}
              className="grid min-h-11 min-w-0 flex-1 grid-cols-[1.625rem_1fr] items-start gap-2.5 rounded-xl px-3 py-2.5 text-start"
            >
              <span className="grid size-6.5 place-items-center rounded-full bg-accent text-[13px] font-bold text-on-accent">
                {layer}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-gray-900">{TEXT[layer].title}</span>
                <span className="mt-0.5 block text-xs text-gray-600">{TEXT[layer].text}</span>
                <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-gray-900">
                  {values.map((v) => (
                    <span key={v.key} className="inline-flex items-center gap-1.5">
                      {v.colour === null ? null : <Swatch colour={v.colour} hollow={v.hollow} />}
                      {v.name}
                      {v.halalas !== undefined ? <MoneyText halalas={v.halalas} className="text-xs font-semibold" /> : null}
                    </span>
                  ))}
                </span>
              </span>
            </button>
            <Link
              href={model.rowHrefs[layer - 1]!}
              aria-label={fillText(t.wheel.rowLinkLabel, { title: TEXT[layer].title })}
              className="no-print flex min-h-11 min-w-11 shrink-0 self-center items-center justify-center rounded-xl px-3 text-sm font-medium text-accent-dark underline-offset-4 hover:underline"
            >
              {t.wheel.rowLink}
            </Link>
          </div>
        );
      })}
    </div>
  );
}

export default WheelRows;
