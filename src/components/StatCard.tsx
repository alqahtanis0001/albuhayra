import type { ReactNode } from "react";

type Tone = "neutral" | "in" | "out";

export type StatCardProps = {
  label: string;
  /** Usually a <CountUp> or <MoneyText>. */
  value: ReactNode;
  hint?: string;
  tone?: Tone;
  /** v1.3: a line under the value, e.g. the momentum on «الصافي». */
  extra?: ReactNode;
  /** v1.3: a <Sparkline> at the foot of the card. */
  spark?: ReactNode;
};

const TONES: Record<Tone, string> = {
  neutral: "border-gray-200 bg-white",
  in: "border-green-200 bg-money-in-soft",
  out: "border-red-200 bg-money-out-soft",
};

export function StatCard({ label, value, hint, tone = "neutral", extra, spark }: StatCardProps) {
  return (
    <div className={`flex flex-col rounded-xl border p-4 text-start ${TONES[tone]}`}>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="mt-1 text-xl font-semibold text-gray-900">{value}</p>
      {extra ? <div className="mt-1 text-xs">{extra}</div> : null}
      {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
      {spark ? <div className="mt-auto pt-2">{spark}</div> : null}
    </div>
  );
}

export default StatCard;
