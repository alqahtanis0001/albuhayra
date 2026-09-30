/**
 * The owner home's four money cards (v1.3 items 1–3): each amount counts up,
 * balance and net carry a 30-day line, month in/out 30-day bars, and «الصافي»
 * its momentum. A server component; `CountUp` is the only client leaf.
 */
import { CountUp } from "@/components/CountUp";
import { Sparkline } from "@/components/Sparkline";
import { StatCard } from "@/components/StatCard";
import { t } from "@/i18n/ar";

import { sparkSummaryText } from "../visuals";
import type { OwnerDashboard } from "./data";
import { Momentum } from "./Momentum";

type Props = Pick<
  OwnerDashboard,
  | "balanceTotalHalalas"
  | "monthNetHalalas"
  | "monthInHalalas"
  | "monthOutHalalas"
  | "daily30"
  | "prevMonthToDateNetHalalas"
>;

export function OwnerStatCards(data: Props) {
  const series = (pick: (d: OwnerDashboard["daily30"][number]) => number) =>
    data.daily30.map((d) => ({ date: d.date, value: pick(d) }));

  const spark = (
    points: ReturnType<typeof series>,
    variant: "line" | "bars",
    tone: "in" | "out" | "neutral",
    label: string,
  ) => (
    <Sparkline
      points={points}
      variant={variant}
      tone={tone}
      label={label}
      summary={sparkSummaryText(t.dashVisual.sparkSummary, points)}
    />
  );

  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCard
        label={t.dashboard.balanceTotal}
        value={<CountUp halalas={data.balanceTotalHalalas} signed />}
        spark={spark(series((d) => d.balanceHalalas), "line", "neutral", t.dashVisual.sparkBalance)}
      />
      <StatCard
        label={t.dashboard.monthNet}
        value={<CountUp halalas={data.monthNetHalalas} signed />}
        extra={<Momentum current={data.monthNetHalalas} previous={data.prevMonthToDateNetHalalas} />}
        spark={spark(series((d) => d.inHalalas - d.outHalalas), "line", "neutral", t.dashVisual.sparkNet)}
      />
      <StatCard
        label={t.dashboard.monthIn}
        tone="in"
        value={<CountUp halalas={data.monthInHalalas} direction="IN" />}
        spark={spark(series((d) => d.inHalalas), "bars", "in", t.dashVisual.sparkIn)}
      />
      <StatCard
        label={t.dashboard.monthOut}
        tone="out"
        value={<CountUp halalas={data.monthOutHalalas} direction="OUT" />}
        spark={spark(series((d) => d.outHalalas), "bars", "out", t.dashVisual.sparkOut)}
      />
    </div>
  );
}

export default OwnerStatCards;
