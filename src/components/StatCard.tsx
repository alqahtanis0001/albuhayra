import type { ReactNode } from "react";

type Tone = "neutral" | "in" | "out";

export type StatCardProps = {
  label: string;
  /** Usually a <MoneyText>. */
  value: ReactNode;
  hint?: string;
  tone?: Tone;
};

const TONES: Record<Tone, string> = {
  neutral: "border-gray-200 bg-white",
  in: "border-green-200 bg-money-in-soft",
  out: "border-red-200 bg-money-out-soft",
};

export function StatCard({ label, value, hint, tone = "neutral" }: StatCardProps) {
  return (
    <div className={`rounded-xl border p-4 text-start ${TONES[tone]}`}>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="mt-1 text-xl font-semibold text-gray-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}

export default StatCard;
