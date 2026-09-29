import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "in" | "out" | "accent" | "warn";

const TONES: Record<BadgeTone, string> = {
  neutral: "border-gray-300 bg-gray-100 text-gray-700",
  in: "border-green-300 bg-money-in-soft text-money-in",
  out: "border-red-300 bg-money-out-soft text-money-out",
  accent: "border-teal-300 bg-accent-soft text-accent-dark",
  warn: "border-amber-300 bg-amber-50 text-amber-800",
};

/** Shared shape for DirectionBadge / StatusBadge / LockBadge. */
export function Badge({
  tone = "neutral",
  icon,
  children,
}: {
  tone?: BadgeTone;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}

export default Badge;
