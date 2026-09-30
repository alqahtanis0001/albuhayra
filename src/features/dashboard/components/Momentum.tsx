/**
 * v1.3 (docs/V13-SPEC.md item 3): the «الصافي» card's change against the same
 * days of last month (lead ruling S9). Arrow + signed % + a word for screen
 * readers — colour is never the only signal. Text colours on the white card:
 * money-in 5.0:1, money-out 6.5:1, gray-600 7.8:1.
 */
import { Svg } from "@/components/icons";
import { fillTemplate } from "@/components/fillTemplate";
import { t } from "@/i18n/ar";

import { formatSignedPercent, momentum, type Trend } from "../visuals";

const TONE: Record<Trend, string> = {
  up: "text-money-in",
  down: "text-money-out",
  flat: "text-gray-600",
};

const WORD: Record<Trend, string> = {
  up: t.dashVisual.momentumUp,
  down: t.dashVisual.momentumDown,
  flat: t.dashVisual.momentumFlat,
};

function Arrow({ trend }: { trend: Trend }) {
  return (
    <Svg size={14} className="shrink-0">
      {trend === "up" ? <path d="M12 19V5m-6 6 6-6 6 6" /> : null}
      {trend === "down" ? <path d="M12 5v14m-6-6 6 6 6-6" /> : null}
      {trend === "flat" ? <path d="M5 12h14" /> : null}
    </Svg>
  );
}

export function Momentum({ current, previous }: { current: number; previous: number }) {
  const { pct, trend, capped } = momentum(current, previous);

  if (pct === null) {
    return (
      <p className="text-gray-600">
        <span aria-hidden="true">{t.dashVisual.momentumNone} </span>
        {t.dashVisual.momentumNoneHint}
      </p>
    );
  }

  return (
    <p className={`flex items-center gap-1 ${TONE[trend]}`}>
      <Arrow trend={trend} />
      <span className="sr-only">{WORD[trend]}: </span>
      <span>
        {fillTemplate(capped ? t.dashVisual.momentumOver : t.dashVisual.momentum, {
          pct: (
            <bdi dir="ltr" className="font-medium tabular-nums">
              {formatSignedPercent(pct)}
            </bdi>
          ),
        })}
      </span>
    </p>
  );
}

export default Momentum;
