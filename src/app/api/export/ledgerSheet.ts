import type ExcelJS from "exceljs";

import type { LedgerRow } from "@/features/transactions/queries";
import { t } from "@/i18n/ar";
import { isoToDate } from "@/lib/dates";

import {
  COLOUR,
  DATE_FORMAT,
  moneyText,
  riyals,
  styleBody,
  styleHeader,
  styleMoney,
  styleTotal,
  titleLine,
  totalValue,
  widthFor,
} from "./style";

/**
 * Sheet 1, «الحركات»: a title block in rows 1–3, the header in row 5 (frozen
 * and filtered), one row per entry from row 6, then a blank row and the totals.
 * The columns are the ledger's eight, in the order the old export had them —
 * including the وارد/صادر text column, so the sign is never the only signal.
 */

export const HEADER_ROW = 5;
export const FIRST_DATA_ROW = HEADER_ROW + 1;

/** The amount column's letter, used in the totals formulas. */
const AMOUNT_COL = "C";

const HEADERS = [
  t.transaction.date,
  t.direction.label,
  t.transaction.amount,
  t.transaction.category,
  t.paymentMethod.label,
  t.transaction.counterparty,
  t.transaction.note,
  t.transaction.addedBy,
];

const NOTE_COL = 7;

/** IN positive, OUT negative — the same sign the ledger screen shows. */
export function signedHalalas(row: LedgerRow): number {
  return row.direction === "IN" ? row.amountHalalas : -row.amountHalalas;
}

export function addLedgerSheet(
  book: ExcelJS.Workbook,
  rows: LedgerRow[],
  title: { establishment: string; period: string; generatedAt: string },
): void {
  const sheet = book.addWorksheet(t.export.ledgerSheet, {
    views: [
      {
        rightToLeft: true,
        state: "frozen",
        xSplit: 0,
        ySplit: HEADER_ROW,
        topLeftCell: `A${FIRST_DATA_ROW}`,
        activeCell: `A${FIRST_DATA_ROW}`,
      },
    ],
  });

  titleLine(sheet, "A1:H1", t.export.ledgerTitle, "title");
  titleLine(sheet, "A2:H2", title.establishment, "subtitle");
  titleLine(sheet, "A3:D3", title.period, "meta");
  titleLine(sheet, "E3:H3", title.generatedAt, "meta");

  // Widths are measured on the header and body only — the merged title lines
  // above would otherwise stretch the first column to the title's length.
  const measured: string[][] = HEADERS.map((label) => [label]);

  HEADERS.forEach((label, i) => {
    const cell = sheet.getCell(HEADER_ROW, i + 1);
    cell.value = label;
    styleHeader(cell);
  });

  rows.forEach((row, i) => {
    const r = FIRST_DATA_ROW + i;
    const signed = signedHalalas(row);
    const values: ExcelJS.CellValue[] = [
      isoToDate(row.date),
      t.direction[row.direction],
      riyals(signed),
      row.categoryNameAr,
      t.paymentMethod[row.paymentMethod],
      // v1.2a: a linked party is the name; free text only without one.
      row.partyName ?? row.counterparty ?? "",
      row.note ?? "",
      row.createdByName,
    ];
    const texts = [row.date, String(values[1]), moneyText(signed)];

    values.forEach((value, c) => {
      const cell = sheet.getCell(r, c + 1);
      cell.value = value;
      styleBody(cell, i % 2 === 1);
      measured[c]!.push(texts[c] ?? String(value));
    });

    sheet.getCell(r, 1).numFmt = DATE_FORMAT;
    const colour = { argb: row.direction === "IN" ? COLOUR.in : COLOUR.out };
    sheet.getCell(r, 2).font = { color: colour };
    styleMoney(sheet.getCell(r, 3), { direction: row.direction });
    sheet.getCell(r, NOTE_COL).alignment = { vertical: "top", wrapText: true };
  });

  const lastDataRow = HEADER_ROW + rows.length;
  // The filter covers the data only; the blank row keeps a sort from dragging
  // the totals in among the entries.
  sheet.autoFilter = `A${HEADER_ROW}:H${lastDataRow}`;

  writeTotals(sheet, rows, lastDataRow + 2, measured);

  measured.forEach((texts, i) => {
    sheet.getColumn(i + 1).width = widthFor(texts);
  });
}

/**
 * Three rows under the amount column: وارد = SUMIF >0, صادر = SUMIF <0,
 * الصافي = SUM. They always cover the whole period — an active filter does not
 * change them, which is what an owner comparing against the reports screen wants.
 */
function writeTotals(
  sheet: ExcelJS.Worksheet,
  rows: LedgerRow[],
  firstRow: number,
  measured: string[][],
): void {
  let inHalalas = 0;
  let outHalalas = 0;
  for (const row of rows) {
    if (row.direction === "IN") inHalalas += row.amountHalalas;
    else outHalalas += row.amountHalalas;
  }

  const range =
    rows.length === 0
      ? null
      : `${AMOUNT_COL}${FIRST_DATA_ROW}:${AMOUNT_COL}${HEADER_ROW + rows.length}`;

  const lines: Array<[string, string | null, number, "IN" | "OUT" | undefined]> = [
    [t.reports.totalIn, range && `SUMIF(${range},">0")`, inHalalas, "IN"],
    [t.reports.totalOut, range && `SUMIF(${range},"<0")`, -outHalalas, "OUT"],
    [t.reports.net, range && `SUM(${range})`, inHalalas - outHalalas, undefined],
  ];

  lines.forEach(([label, formula, halalas, direction], i) => {
    const r = firstRow + i;
    // The label spans the date and direction cells and is left out of the
    // measurement, so the date column keeps its own width.
    sheet.mergeCells(r, 1, r, 2);
    const labelCell = sheet.getCell(r, 1);
    labelCell.value = label;
    styleTotal(labelCell);

    const amount = sheet.getCell(r, 3);
    amount.value = totalValue(formula, halalas);
    styleTotal(amount);
    styleMoney(amount, { bold: true, direction });
    measured[2]!.push(moneyText(halalas));
  });
}
