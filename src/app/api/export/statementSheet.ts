import ExcelJS from "exceljs";

import type { PartyStatement, StatementRow } from "@/features/parties/statement";
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
import { riyadhStamp } from "./workbook";

/**
 * The party statement workbook (docs/V12C-DESIGN.md C14), in the v1.1c style:
 * one right-to-left sheet — title block in rows 1–3, the header in row 5
 * (frozen), one row per statement line with its running balance, the closing
 * balance, then «حركات أخرى» below, outside the balance. Pure: every figure is
 * `getPartyStatement`'s, handed over by the route; nothing here reads data.
 *
 * Each balance is `SUM(C6:Cn)` with the statement's own number as its cached
 * result, so Excel recalculating on open shows the same figures. A balance of
 * exactly 0 is written as the plain number: exceljs drops a cached result of 0,
 * which would leave the cell blank in a viewer that does not recalculate.
 */

export const STATEMENT_HEADER_ROW = 5;
export const STATEMENT_FIRST_ROW = STATEMENT_HEADER_ROW + 1;

/** One placeholder, filled with a function so `$&` in a name stays literal. */
function fillOne(template: string, key: string, value: string): string {
  return template.replaceAll(`{${key}}`, () => value);
}

/** The same wording the printable statement uses (PartyStatementView). */
export function statementDescription(row: StatementRow): string {
  const template =
    row.kind === "PLAN"
      ? t.statement.planCharge
      : row.kind === "WRITE_OFF"
        ? t.statement.writeOff
        : row.deltaHalalas < 0
          ? t.statement.paymentReceived
          : t.statement.paymentMade;
  return fillOne(template, "title", row.planTitle);
}

const tone = (halalas: number) => (halalas > 0 ? "IN" : halalas < 0 ? "OUT" : undefined);

export function buildStatementWorkbook(input: {
  statement: PartyStatement;
  establishmentName: string;
  generatedAt: Date;
}): ExcelJS.Workbook {
  const { statement, establishmentName, generatedAt } = input;
  const book = new ExcelJS.Workbook();
  book.created = generatedAt;
  const sheet = book.addWorksheet(t.statementExport.sheetName, {
    views: [{ rightToLeft: true, state: "frozen", xSplit: 0, ySplit: STATEMENT_HEADER_ROW }],
  });

  titleLine(sheet, "A1:E1", fillOne(t.statementExport.title, "name", statement.party.name), "title");
  titleLine(sheet, "A2:E2", establishmentName, "subtitle");
  titleLine(sheet, "A3:E3", `${t.export.generatedAt}: ${riyadhStamp(generatedAt)}`, "meta");

  const headers = [t.statement.date, t.statement.description, t.statement.amount, t.statement.balance];
  const measured: string[][] = headers.map((h) => [h]);
  headers.forEach((label, i) => {
    const cell = sheet.getCell(STATEMENT_HEADER_ROW, i + 1);
    cell.value = label;
    styleHeader(cell);
  });

  statement.rows.forEach((row, i) => {
    const r = STATEMENT_FIRST_ROW + i;
    const description = statementDescription(row);
    const values: ExcelJS.CellValue[] = [
      isoToDate(row.date),
      description,
      riyals(row.deltaHalalas),
      totalValue(`SUM(C${STATEMENT_FIRST_ROW}:C${r})`, row.balanceHalalas),
    ];
    values.forEach((value, c) => {
      const cell = sheet.getCell(r, c + 1);
      cell.value = value;
      styleBody(cell, i % 2 === 1);
    });
    sheet.getCell(r, 1).numFmt = DATE_FORMAT;
    styleMoney(sheet.getCell(r, 3), { direction: tone(row.deltaHalalas) });
    styleMoney(sheet.getCell(r, 4));
    measured[0]!.push(row.date);
    measured[1]!.push(description);
    measured[2]!.push(moneyText(row.deltaHalalas));
    measured[3]!.push(moneyText(row.balanceHalalas));
  });

  const last = STATEMENT_HEADER_ROW + statement.rows.length;
  const closingRow = last + 2;
  sheet.mergeCells(closingRow, 1, closingRow, 3);
  const label = sheet.getCell(closingRow, 1);
  label.value = t.statement.closingBalance;
  styleTotal(label);
  const closing = sheet.getCell(closingRow, 4);
  const range = statement.rows.length ? `SUM(C${STATEMENT_FIRST_ROW}:C${last})` : null;
  closing.value = totalValue(range, statement.closingBalanceHalalas);
  styleTotal(closing);
  styleMoney(closing, { bold: true, direction: tone(statement.closingBalanceHalalas) });
  measured[3]!.push(moneyText(statement.closingBalanceHalalas));

  addOther(sheet, statement.other, statement.otherCapped, closingRow + 2);

  measured.forEach((texts, i) => {
    sheet.getColumn(i + 1).width = widthFor(texts);
  });
  return book;
}

/** «حركات أخرى»: the party's entries outside any agreement — listed, never summed. */
function addOther(sheet: ExcelJS.Worksheet, other: LedgerRow[], capped: boolean, firstRow: number): void {
  titleLine(sheet, `A${firstRow}:E${firstRow}`, t.statement.otherTransactions, "subtitle");
  titleLine(sheet, `A${firstRow + 1}:E${firstRow + 1}`, t.statement.otherHint, "meta");
  const header = firstRow + 2;
  [t.transaction.date, t.direction.label, t.transaction.amount, t.transaction.category, t.transaction.note].forEach((h, i) => {
    const cell = sheet.getCell(header, i + 1);
    cell.value = h;
    styleHeader(cell);
  });
  other.forEach((row, i) => {
    const r = header + 1 + i;
    const signed = row.direction === "IN" ? row.amountHalalas : -row.amountHalalas;
    [isoToDate(row.date), t.direction[row.direction], riyals(signed), row.categoryNameAr, row.note ?? ""].forEach((value, c) => {
      const cell = sheet.getCell(r, c + 1);
      cell.value = value;
      styleBody(cell, i % 2 === 1);
    });
    sheet.getCell(r, 1).numFmt = DATE_FORMAT;
    sheet.getCell(r, 2).font = { color: { argb: row.direction === "IN" ? COLOUR.in : COLOUR.out } };
    styleMoney(sheet.getCell(r, 3), { direction: row.direction });
  });
  if (capped) {
    const r = header + 1 + other.length;
    titleLine(sheet, `A${r}:E${r}`, t.statement.otherCapped, "meta");
  }
}
