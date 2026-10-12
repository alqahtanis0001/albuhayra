/**
 * v1.5 follow-up (docs/V15-SPEC.md D47): one colour per expense category on
 * the home page. The expense donut and the wheel's ring 2 both draw
 * `donutSlices` (top five by amount, then «أخرى») and colour a slice by its
 * rank through this one function, so a category has the same colour in both.
 * Client-safe: tokens only (`PALETTE` is `var(--color-…)` references).
 */
import { PALETTE } from "@/components/visualPalette";

/**
 * D52: by rank, largest first — cat-1 … cat-5. None is a semantic colour
 * (money in/out, accent, gold): a category never reads as income, expense or
 * salary. Neighbours (and 6–1 around the ring) are ΔE ≥ 20 apart; each is
 * ≥ 3:1 on the card in both themes (src/lib/categoryPalette.test.ts).
 */
export const CATEGORY_COLOURS = [PALETTE.cat1, PALETTE.cat2, PALETTE.cat3, PALETTE.cat4, PALETTE.cat5] as const;

/** «أخرى» (and any rank past five): cat-6, the most neutral of the six. */
export const OTHER_COLOUR = PALETTE.cat6;

/** A slice's colour by its rank in the top five; «أخرى» (and any rank past five) is cat-6. */
export function categoryColour(key: string, rank: number): string {
  return key === "other" ? OTHER_COLOUR : (CATEGORY_COLOURS[rank] ?? OTHER_COLOUR);
}
