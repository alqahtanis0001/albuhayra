import type ExcelJS from "exceljs";

import { t } from "@/i18n/ar";
import { formatAmount, HALALAS_PER_SAR } from "@/lib/money";

/**
 * Colours, formats and small cell helpers shared by the three sheets.
 *
 * exceljs hands out *shared* style objects for rows and columns, so mutating
 * `cell.font.color` on one cell can repaint a whole column. Every helper here
 * therefore assigns a freshly built object — never edit a style in place.
 */

export const COLOUR = {
  accent: "FF006C35",
  white: "FFFFFFFF",
  in: "FF15803D",
  out: "FFB91C1C",
  // #FAFAFA, not Excel's usual #F2F2F2: the green on F2F2F2 is 4.48:1, under AA.
  zebra: "FFFAFAFA",
  border: "FFE5E5E5",
  muted: "FF525252",
} as const;

/** `#,##0.00 "ر.س"` — the currency word comes from ar.ts like every other label. */
export const MONEY_FORMAT = `#,##0.00 "${t.common.currency}"`;
export const DATE_FORMAT = "yyyy-mm-dd";

/**
 * Riyals for a cell. Callers sum in integer halalas and divide once, here.
 * `+ 0` turns the -0 of a negated zero (a method with no صادر) into 0.
 */
export function riyals(halalas: number): number {
  return halalas / HALALAS_PER_SAR + 0;
}

/** How a money cell reads once formatted — what the column width is measured on. */
export function moneyText(halalas: number): string {
  return `${formatAmount(halalas)} ${t.common.currency}`;
}

/**
 * A total over `range`: a formula with its cached result, so a viewer that
 * never recalculates still shows the number. With nothing to sum it is a plain
 * 0 — a formula over an empty range sitting next to it would be circular.
 *
 * v1.2c: a total of exactly 0 is the plain 0 too. exceljs drops a cached result
 * of 0 when it writes the file, so the formula form would show a blank there
 * (e.g. «صادر» of a period with only وارد) in any viewer that doesn't recalculate.
 */
export function totalValue(
  formula: string | null,
  halalas: number,
): ExcelJS.CellValue {
  return formula === null || halalas === 0 ? 0 : { formula, result: riyals(halalas) };
}

function thinBorder(): Partial<ExcelJS.Borders> {
  const side = (): Partial<ExcelJS.Border> => ({
    style: "thin",
    color: { argb: COLOUR.border },
  });
  return { top: side(), bottom: side(), left: side(), right: side() };
}

function solid(argb: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

/** Bold white on the accent green (6.57:1). */
export function styleHeader(cell: ExcelJS.Cell): void {
  cell.font = { bold: true, color: { argb: COLOUR.white } };
  cell.fill = solid(COLOUR.accent);
  cell.border = thinBorder();
  cell.alignment = { vertical: "middle", wrapText: true };
}

/** A table body cell; `stripe` gives every other row the light grey. */
export function styleBody(cell: ExcelJS.Cell, stripe: boolean): void {
  if (stripe) cell.fill = solid(COLOUR.zebra);
  cell.border = thinBorder();
}

/** A totals cell: bold on white, a neutral fill under any green text. */
export function styleTotal(cell: ExcelJS.Cell): void {
  cell.font = { bold: true };
  cell.border = thinBorder();
}

/** Money cell: the format, plus the IN green / OUT red font when a direction is given. */
export function styleMoney(
  cell: ExcelJS.Cell,
  opts: { bold?: boolean; direction?: "IN" | "OUT" } = {},
): void {
  cell.numFmt = MONEY_FORMAT;
  const argb =
    opts.direction === "IN" ? COLOUR.in : opts.direction === "OUT" ? COLOUR.out : undefined;
  cell.font = {
    bold: opts.bold ?? false,
    ...(argb ? { color: { argb } } : {}),
  };
}

/** A merged line of the title block, e.g. `A1:H1`. */
export function titleLine(
  sheet: ExcelJS.Worksheet,
  range: string,
  text: string,
  kind: "title" | "subtitle" | "meta",
): void {
  sheet.mergeCells(range);
  const cell = sheet.getCell(range.split(":")[0]!);
  cell.value = text;
  cell.font =
    kind === "title"
      ? { bold: true, size: 14, color: { argb: COLOUR.accent } }
      : kind === "subtitle"
        ? { bold: true, size: 12 }
        : { size: 10, color: { argb: COLOUR.muted } };
  cell.alignment = { vertical: "middle" };
}

/** Excel column width from the longest formatted text, clamped. */
export function widthFor(texts: string[], min = 10, max = 50): number {
  const longest = texts.reduce((m, s) => Math.max(m, s.length), 0);
  return Math.min(max, Math.max(min, longest + 2));
}
