import ExcelJS from "exceljs";

import type { Report } from "@/features/reports/queries";
import type { LedgerRow } from "@/features/transactions/queries";
import { t } from "@/i18n/ar";
import { TIMEZONE } from "@/lib/dates";

import { addLedgerSheet } from "./ledgerSheet";
import { styleBody, styleHeader, widthFor } from "./style";
import { addSummarySheet } from "./summarySheet";

/**
 * The export workbook, per "Export workbook (v1.1c)" in docs/BACKEND.md.
 *
 * Pure on purpose: rows, report and a few labels in, a Workbook out. It reads
 * nothing — the route fetches through `listTransactions` / `getReport` and hands
 * the results over — so the scoping of the data is entirely the route's, and a
 * test in export.test.ts keeps any data access out of this folder.
 */

export type WorkbookMeta = {
  establishmentName: string;
  from: string;
  to: string;
  /** v1.2c E10: the party a filtered export covers; null = all parties. */
  partyName: string | null;
  /** The owner's name, from `requireOwner()`. */
  generatedBy: string;
  generatedAt: Date;
  appVersion: string;
};

/**
 * `2026-09-29 14:05` in Riyadh, Western digits. Text rather than an Excel date:
 * a date-time cell holds no timezone, so it would read as UTC.
 */
export function riyadhStamp(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

function periodText(from: string, to: string): string {
  return `${t.export.from} ${from} ${t.export.to} ${to}`;
}

export function buildWorkbook(input: {
  rows: LedgerRow[];
  report: Report;
  meta: WorkbookMeta;
}): ExcelJS.Workbook {
  const { rows, report, meta } = input;
  const book = new ExcelJS.Workbook();
  book.created = meta.generatedAt;

  const stamp = riyadhStamp(meta.generatedAt);
  const period = `${t.export.period}: ${periodText(meta.from, meta.to)}`;

  addLedgerSheet(book, rows, {
    establishment: meta.establishmentName,
    period,
    generatedAt: `${t.export.generatedAt}: ${stamp}`,
  });
  addSummarySheet(book, rows, report, {
    establishment: meta.establishmentName,
    period,
  });
  addInfoSheet(book, meta, stamp);

  return book;
}

/** Sheet 3, «معلومات»: what this file is, for whoever it is forwarded to. */
function addInfoSheet(book: ExcelJS.Workbook, meta: WorkbookMeta, stamp: string): void {
  const sheet = book.addWorksheet(t.export.infoSheet, {
    views: [{ rightToLeft: true }],
  });

  const lines: Array<[string, string]> = [
    [t.export.infoItem, t.export.infoValue],
    [t.export.establishment, meta.establishmentName],
    [t.export.period, periodText(meta.from, meta.to)],
    [t.reportFilter.exportParty, meta.partyName ?? t.reportFilter.exportAllParties],
    [t.export.generatedBy, meta.generatedBy],
    [t.export.generatedAt, stamp],
    [t.export.appVersion, meta.appVersion],
  ];

  lines.forEach((line, i) => {
    line.forEach((text, c) => {
      const cell = sheet.getCell(i + 1, c + 1);
      cell.value = text;
      if (i === 0) styleHeader(cell);
      else styleBody(cell, i % 2 === 0);
    });
  });

  sheet.getColumn(1).width = widthFor(lines.map((l) => l[0]));
  sheet.getColumn(2).width = widthFor(lines.map((l) => l[1]), 16);
}
