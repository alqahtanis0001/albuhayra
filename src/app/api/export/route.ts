import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

import { getReport } from "@/features/reports/queries";
import { listTransactions } from "@/features/transactions/queries";
import { requireOwner } from "@/lib/auth";
import { HALALAS_PER_SAR } from "@/lib/money";
import { PAGE_SIZE, ReportRangeSchema } from "@/lib/validation";
import { t } from "@/i18n/ar";

/**
 * The only route besides `/api/health`, per docs/BACKEND.md.
 *
 * A route handler sits outside the server-action path, so nothing here inherits
 * the checks a Server Action gets: `requireOwner()` is the gate, and the
 * establishment comes from the session it returns — never from a query
 * parameter, which is the obvious way a caller would try to read someone else's
 * books. `from`/`to` are the only thing the URL is trusted for, and they go
 * through the same `ReportRangeSchema` the reports screen uses.
 */

export const dynamic = "force-dynamic";

/** Amounts are written as riyals so the cells are arithmetic, not text. */
function toRiyals(halalas: number): number {
  return halalas / HALALAS_PER_SAR;
}

const MONEY_FORMAT = "#,##0.00";

/** Every page of the range. The ledger is small; an owner expects the lot. */
async function allRows(establishmentId: string, from: string, to: string) {
  const rows = [];
  for (let page = 1; ; page++) {
    const result = await listTransactions(establishmentId, { from, to, page });
    rows.push(...result.rows);
    if (rows.length >= result.total || result.rows.length < PAGE_SIZE) break;
  }
  return rows;
}

export async function GET(request: Request): Promise<Response> {
  const { establishmentId } = await requireOwner();

  // Plain `Request` rather than `NextRequest`: a route handler is handed a
  // web-standard request, and reading the URL this way keeps the handler
  // callable from a test without constructing a Next-specific object.
  const params = new URL(request.url).searchParams;
  const parsed = ReportRangeSchema.safeParse({
    from: params.get("from"),
    to: params.get("to"),
  });
  if (!parsed.success) {
    // The schema distinguishes a malformed range from one over
    // MAX_REPORT_SPAN_DAYS, so return its key rather than flattening both to
    // "invalid" — an owner who asked for three years needs to be told that.
    const key = parsed.error.issues[0]?.message ?? "err.rangeInvalid";
    return NextResponse.json({ error: key }, { status: 400 });
  }
  const { from, to } = parsed.data;

  const [rows, report] = await Promise.all([
    allRows(establishmentId, from, to),
    getReport(establishmentId, from, to),
  ]);

  const book = new ExcelJS.Workbook();
  book.created = new Date();

  const ledger = book.addWorksheet(t.ledger.title, {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }],
  });
  ledger.columns = [
    { header: t.transaction.date, key: "date", width: 14 },
    { header: t.direction.label, key: "direction", width: 10 },
    { header: t.transaction.amount, key: "amount", width: 16, style: { numFmt: MONEY_FORMAT } },
    { header: t.transaction.category, key: "category", width: 22 },
    { header: t.paymentMethod.label, key: "method", width: 16 },
    { header: t.transaction.counterparty, key: "counterparty", width: 22 },
    { header: t.transaction.note, key: "note", width: 32 },
    { header: t.transaction.addedBy, key: "addedBy", width: 18 },
  ];
  ledger.getRow(1).font = { bold: true };

  for (const row of rows) {
    ledger.addRow({
      date: row.date,
      direction: t.direction[row.direction],
      amount: toRiyals(row.amountHalalas),
      category: row.categoryNameAr,
      method: t.paymentMethod[row.paymentMethod],
      counterparty: row.counterparty ?? "",
      note: row.note ?? "",
      addedBy: row.createdByName,
    });
  }

  const totals = book.addWorksheet(t.reports.title, {
    views: [{ rightToLeft: true }],
  });
  totals.columns = [
    { header: t.transaction.category, key: "category", width: 26 },
    { header: t.direction.label, key: "direction", width: 10 },
    { header: t.common.total, key: "total", width: 18, style: { numFmt: MONEY_FORMAT } },
  ];
  totals.getRow(1).font = { bold: true };

  for (const line of report.byCategoryIn) {
    totals.addRow({
      category: line.nameAr,
      direction: t.direction.IN,
      total: toRiyals(line.totalHalalas),
    });
  }
  for (const line of report.byCategoryOut) {
    totals.addRow({
      category: line.nameAr,
      direction: t.direction.OUT,
      total: toRiyals(line.totalHalalas),
    });
  }

  totals.addRow({});
  for (const [label, halalas] of [
    [t.reports.totalIn, report.totalInHalalas],
    [t.reports.totalOut, report.totalOutHalalas],
    [t.reports.net, report.netHalalas],
  ] as const) {
    totals.addRow({ category: label, total: toRiyals(halalas) }).font = {
      bold: true,
    };
  }

  const buffer = await book.xlsx.writeBuffer();

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="ledger_${from}_${to}.xlsx"`,
      // Someone's books must not sit in a shared cache or a browser's history.
      "Cache-Control": "private, no-store",
    },
  });
}
