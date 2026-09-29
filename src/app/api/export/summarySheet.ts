import type ExcelJS from "exceljs";

import type { Report, ReportCategoryRow } from "@/features/reports/queries";
import type { LedgerRow } from "@/features/transactions/queries";
import { t } from "@/i18n/ar";
import { PaymentMethodEnum, type PaymentMethodValue } from "@/lib/validation";

import {
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
 * Sheet 2, «الملخص»: وارد by category, صادر by category (negative, as on sheet
 * 1), the net, then «حسب طريقة الدفع». The category tables come from
 * `getReport`; the payment-method table is derived from the rows the route
 * already fetched — no read of its own.
 */

export type MethodTotals = {
  method: PaymentMethodValue;
  inHalalas: number;
  outHalalas: number;
};

/** Per-method totals in enum order; a method with no entries in the period is left out. */
export function byPaymentMethod(rows: LedgerRow[]): MethodTotals[] {
  const totals = new Map<PaymentMethodValue, MethodTotals>();
  for (const row of rows) {
    const line = totals.get(row.paymentMethod) ?? {
      method: row.paymentMethod,
      inHalalas: 0,
      outHalalas: 0,
    };
    if (row.direction === "IN") line.inHalalas += row.amountHalalas;
    else line.outHalalas += row.amountHalalas;
    totals.set(row.paymentMethod, line);
  }
  return PaymentMethodEnum.options.flatMap((m) => totals.get(m) ?? []);
}

export function addSummarySheet(
  book: ExcelJS.Workbook,
  rows: LedgerRow[],
  report: Report,
  title: { establishment: string; period: string },
): void {
  const sheet = book.addWorksheet(t.export.summarySheet, {
    views: [{ rightToLeft: true }],
  });

  titleLine(sheet, "A1:D1", t.export.summaryTitle, "title");
  titleLine(sheet, "A2:D2", title.establishment, "subtitle");
  titleLine(sheet, "A3:D3", title.period, "meta");

  const measured: string[][] = [[], [], [], []];

  const inTable = categoryTable(sheet, 5, "IN", report.byCategoryIn, report.totalInHalalas, measured);
  const outTable = categoryTable(
    sheet,
    inTable.nextRow + 1,
    "OUT",
    report.byCategoryOut,
    report.totalOutHalalas,
    measured,
  );

  const netRow = outTable.nextRow + 1;
  const netLabel = sheet.getCell(netRow, 1);
  netLabel.value = t.reports.net;
  styleTotal(netLabel);
  const net = sheet.getCell(netRow, 2);
  const nothing = report.byCategoryIn.length + report.byCategoryOut.length === 0;
  // صادر is already negative, so the net is their sum.
  net.value = totalValue(nothing ? null : `${inTable.totalRef}+${outTable.totalRef}`, report.netHalalas);
  styleTotal(net);
  styleMoney(net, { bold: true });
  measured[0]!.push(t.reports.net);

  methodTable(sheet, netRow + 2, byPaymentMethod(rows), measured);

  measured.forEach((texts, i) => {
    sheet.getColumn(i + 1).width = widthFor(texts, i === 0 ? 16 : 14);
  });
}

/** Header, one row per category, and a totals row. Returns the total's cell ref. */
function categoryTable(
  sheet: ExcelJS.Worksheet,
  headerRow: number,
  direction: "IN" | "OUT",
  lines: ReportCategoryRow[],
  totalHalalas: number,
  measured: string[][],
): { totalRef: string; nextRow: number } {
  const sign = direction === "IN" ? 1 : -1;
  const labels = [
    direction === "IN" ? t.reports.inByCategory : t.reports.outByCategory,
    t.common.total,
  ];
  labels.forEach((label, c) => {
    const cell = sheet.getCell(headerRow, c + 1);
    cell.value = label;
    styleHeader(cell);
    measured[c]!.push(label);
  });

  lines.forEach((line, i) => {
    const r = headerRow + 1 + i;
    const name = sheet.getCell(r, 1);
    name.value = line.nameAr;
    styleBody(name, i % 2 === 1);
    const amount = sheet.getCell(r, 2);
    amount.value = riyals(sign * line.totalHalalas);
    styleBody(amount, i % 2 === 1);
    styleMoney(amount, { direction });
    measured[0]!.push(line.nameAr);
    measured[1]!.push(moneyText(sign * line.totalHalalas));
  });

  const totalRow = headerRow + 1 + lines.length;
  const label = sheet.getCell(totalRow, 1);
  label.value = direction === "IN" ? t.reports.totalIn : t.reports.totalOut;
  styleTotal(label);
  const total = sheet.getCell(totalRow, 2);
  const range = lines.length === 0 ? null : `B${headerRow + 1}:B${totalRow - 1}`;
  total.value = totalValue(range && `SUM(${range})`, sign * totalHalalas);
  styleTotal(total);
  styleMoney(total, { bold: true, direction });
  measured[0]!.push(String(label.value));

  return { totalRef: `B${totalRow}`, nextRow: totalRow + 1 };
}

/** طريقة الدفع | وارد | صادر | الصافي, with a totals row. */
function methodTable(
  sheet: ExcelJS.Worksheet,
  titleRow: number,
  lines: MethodTotals[],
  measured: string[][],
): void {
  const heading = sheet.getCell(titleRow, 1);
  heading.value = t.export.byPaymentMethod;
  heading.font = { bold: true, size: 12 };
  measured[0]!.push(t.export.byPaymentMethod);

  const headerRow = titleRow + 1;
  [t.paymentMethod.label, t.direction.IN, t.direction.OUT, t.reports.net].forEach((label, c) => {
    const cell = sheet.getCell(headerRow, c + 1);
    cell.value = label;
    styleHeader(cell);
    measured[c]!.push(label);
  });

  lines.forEach((line, i) => {
    const r = headerRow + 1 + i;
    const amounts: Array<[number, "IN" | "OUT" | undefined]> = [
      [line.inHalalas, "IN"],
      [-line.outHalalas, "OUT"],
      [line.inHalalas - line.outHalalas, undefined],
    ];
    const name = sheet.getCell(r, 1);
    name.value = t.paymentMethod[line.method];
    styleBody(name, i % 2 === 1);
    measured[0]!.push(t.paymentMethod[line.method]);
    amounts.forEach(([halalas, direction], c) => {
      const cell = sheet.getCell(r, c + 2);
      cell.value = riyals(halalas);
      styleBody(cell, i % 2 === 1);
      styleMoney(cell, { direction });
      measured[c + 1]!.push(moneyText(halalas));
    });
  });

  const totalRow = headerRow + 1 + lines.length;
  const label = sheet.getCell(totalRow, 1);
  label.value = t.export.totalsRow;
  styleTotal(label);
  const sums = lines.reduce(
    (acc, l) => [acc[0]! + l.inHalalas, acc[1]! - l.outHalalas, acc[2]! + l.inHalalas - l.outHalalas],
    [0, 0, 0],
  );
  (["B", "C", "D"] as const).forEach((col, c) => {
    const cell = sheet.getCell(totalRow, c + 2);
    const range = lines.length === 0 ? null : `${col}${headerRow + 1}:${col}${totalRow - 1}`;
    cell.value = totalValue(range && `SUM(${range})`, sums[c]!);
    styleTotal(cell);
    styleMoney(cell, { bold: true, direction: c === 0 ? "IN" : c === 1 ? "OUT" : undefined });
  });
}
