/**
 * v1.5 follow-up (docs/V15-SPEC.md D47): one colour per expense category on
 * the home page. The expense donut and the wheel's ring 2 both draw
 * `donutSlices` (top five by amount, then «أخرى») and colour a slice by its
 * rank through this one function, so a category has the same colour in both.
 * Client-safe: tokens only (`PALETTE` is `var(--color-…)` references).
 */
import { PALETTE } from "@/components/visualPalette";

/** The donut's v1.3 order, by rank: largest first. */
export const CATEGORY_COLOURS = [PALETTE.out, PALETTE.amber, PALETTE.gold, PALETTE.blue, PALETTE.teal] as const;

/** A slice's colour by its rank in the top five; «أخرى» (and any rank past five) is grey. */
export function categoryColour(key: string, rank: number): string {
  return key === "other" ? PALETTE.grey : (CATEGORY_COLOURS[rank] ?? PALETTE.grey);
}
