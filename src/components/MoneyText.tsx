/**
 * The only way an amount reaches the screen. Western digits, en-US grouping,
 * and never colour alone: IN carries a `+`, OUT a `−` (from formatSAR).
 * <bdi> isolates the number from the surrounding RTL text.
 */
import { formatAmount, formatSAR } from "@/lib/money";

export type MoneyTextProps = {
  halalas: number;
  /** Adds the sign and the colour. Omit for a neutral total. */
  direction?: "IN" | "OUT";
  /** false drops the ر.س suffix — for dense table columns. */
  withCurrency?: boolean;
  /** Colour the neutral value red when it is negative (net totals). */
  signed?: boolean;
  className?: string;
};

export function MoneyText({
  halalas,
  direction,
  withCurrency = true,
  signed = false,
  className = "",
}: MoneyTextProps) {
  const text = withCurrency
    ? formatSAR(halalas, direction)
    : signOnly(halalas, direction) + formatAmount(Math.abs(halalas));

  const tone =
    direction === "IN"
      ? "text-money-in"
      : direction === "OUT"
        ? "text-money-out"
        : signed && halalas < 0
          ? "text-money-out"
          : "text-gray-900";

  return (
    <bdi className={`font-medium tabular-nums ${tone} ${className}`}>{text}</bdi>
  );
}

function signOnly(halalas: number, direction?: "IN" | "OUT"): string {
  if (direction === "IN") return "+";
  if (direction === "OUT") return "−";
  return halalas < 0 ? "−" : "";
}

export default MoneyText;
