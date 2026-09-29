/**
 * "% of month OUT". Two traps the doc does not mention:
 * a month with no OUT entries at all is the normal first-month state and 0/0
 * renders NaN%, and a percentage is *not* money, so <MoneyText> does not cover
 * its digits — it needs en-US formatting of its own to stay Western.
 */

/** null when there is no total to be a share of. */
export function percentOfTotal(part: number, total: number): number | null {
  if (!Number.isFinite(part) || !Number.isFinite(total)) return null;
  if (total <= 0) return null;
  return (part / total) * 100;
}

export function formatPercent(value: number): string {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
  }).format(value)}%`;
}
