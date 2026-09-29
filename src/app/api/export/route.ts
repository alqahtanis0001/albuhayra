import { NextResponse } from "next/server";

import { getReport } from "@/features/reports/queries";
import { listTransactions } from "@/features/transactions/queries";
import { requireOwner } from "@/lib/auth";
import { PAGE_SIZE, ReportRangeSchema } from "@/lib/validation";

import packageJson from "../../../../package.json";
import { buildWorkbook } from "./workbook";

/**
 * The only route besides `/api/health`, per docs/BACKEND.md.
 *
 * A route handler sits outside the server-action path, so nothing here inherits
 * the checks a Server Action gets: `requireOwner()` is the gate, and the
 * establishment comes from the session it returns — never from a query
 * parameter, which is the obvious way a caller would try to read someone else's
 * books. `from`/`to` are the only thing the URL is trusted for, and they go
 * through the same `ReportRangeSchema` the reports screen uses.
 *
 * The workbook itself is built by `./workbook`, which is pure: everything it
 * shows arrives from here, fetched with the session's establishment.
 */

export const dynamic = "force-dynamic";

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
  const { user, establishmentId } = await requireOwner();

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

  const book = buildWorkbook({
    rows,
    report,
    meta: {
      establishmentName: user.establishmentName ?? "",
      from,
      to,
      generatedBy: user.displayName,
      generatedAt: new Date(),
      appVersion: packageJson.version,
    },
  });

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
