"use client";

/**
 * v1.3 (docs/V13-SPEC.md item 5): one month's cash flow as a waterfall —
 * opening balance (grey), + income (green, up), − expenses (red, down),
 * closing balance (grey). Hand-written SVG, aria-hidden; the sentence beneath
 * is the text equivalent. Columns read right → left like the rest of the UI.
 */
import { useId, useState } from "react";

import { fillTemplate } from "@/components/fillTemplate";
import { MoneyText } from "@/components/MoneyText";
import { PALETTE } from "@/components/visualPalette";
import { t } from "@/i18n/ar";
import { monthNameAr } from "@/lib/dates";

import { waterfallBars, waterfallSteps, type WaterfallStep } from "../visuals";
import type { MonthTotals } from "./data";

const W = 320;
const H = 160;

const FILL: Record<WaterfallStep["key"], string> = {
  opening: PALETTE.grey,
  income: PALETTE.in,
  expenses: PALETTE.out,
  closing: PALETTE.grey,
};

const NAME: Record<WaterfallStep["key"], string> = {
  opening: t.dashVisual.opening,
  income: t.dashVisual.income,
  expenses: t.dashVisual.expenses,
  closing: t.dashVisual.closing,
};

export function CashFlowWaterfall({ months }: { months: MonthTotals[] }) {
  const selectId = useId();
  const [ym, setYm] = useState(months[months.length - 1]?.ym ?? "");
  const m = months.find((x) => x.ym === ym) ?? months[months.length - 1];
  if (!m) return null;

  const wf = waterfallSteps(m.openingBalanceHalalas, m.inHalalas, m.outHalalas);
  const { bars, zeroY } = waterfallBars(wf, W, H);
  const closing = wf.steps[3]!.to;

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <label htmlFor={selectId} className="text-sm font-medium text-gray-700">
          {t.dashVisual.waterfallMonth}
        </label>
        <select
          id={selectId}
          value={m.ym}
          onChange={(e) => setYm(e.target.value)}
          className="min-h-11 rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900"
        >
          {months.map((x) => (
            <option key={x.ym} value={x.ym}>
              {`${monthNameAr(Number(x.ym.slice(5, 7)))} ${x.ym.slice(0, 4)}`}
            </option>
          ))}
        </select>
      </div>

      <div aria-hidden="true">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-40 w-full" preserveAspectRatio="none">
          <line x1={0} x2={W} y1={zeroY} y2={zeroY} stroke={PALETTE.greySoft} strokeWidth={1} />
          {bars.map((b, i) => (
            <rect
              key={`${m.ym}-${b.key}`}
              x={b.x}
              y={b.y}
              width={b.w}
              height={b.h}
              fill={FILL[b.key]}
              className="v13-grow-block"
              // A step that goes down grows down from its top edge.
              style={wf.steps[i]!.to < wf.steps[i]!.from ? { transformOrigin: "center top" } : undefined}
            />
          ))}
        </svg>
        <div className="grid grid-cols-4 text-center text-xs text-gray-600">
          {wf.steps.map((s) => (
            <span key={s.key}>{NAME[s.key]}</span>
          ))}
        </div>
      </div>

      <p className="text-sm text-gray-700">
        {fillTemplate(t.dashVisual.waterfallText, {
          opening: <MoneyText halalas={m.openingBalanceHalalas} signed />,
          income: <MoneyText halalas={m.inHalalas} direction="IN" />,
          expenses: <MoneyText halalas={m.outHalalas} direction="OUT" />,
          closing: <MoneyText halalas={closing} signed />,
        })}
      </p>
    </div>
  );
}

export default CashFlowWaterfall;
