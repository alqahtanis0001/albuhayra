import { NextResponse } from "next/server";

import { getReport } from "@/features/reports/queries";
import { listTransactions } from "@/features/transactions/queries";
import { requireOwner } from "@/lib/auth";
import { PAGE_SIZE, ReportPartyFilterSchema, ReportRangeSchema } from "@/lib/validation";

import packageJson from "../../../../package.json";
import { buildWorkbook } from "./workbook";

/**
 * The ledger export (docs/BACKEND.md; v1.2c adds `./statement` beside it and
 * `/api/reminders/run` elsewhere).
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
 *
 * v1.2c C16 + E10: an optional `partyId` narrows the summary AND the ledger
 * rows; the info sheet names the party. An unknown or foreign party is a 400,
 * never the unfiltered workbook.
 */

export const dynamic = "force-dynamic";

/** Every page of the range. The ledger is small; an owner expects the lot. */
async function allRows(establishmentId: string, from: string, to: string, partyId: string | undefined) {
  const rows = [];
  for (let page = 1; ; page++) {
    const result = await listTransactions(establishmentId, { from, to, page, ...(partyId ? { partyId } : {}) });
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

  // E10: `get()` answers null for an absent key; the schema wants undefined.
  const party = ReportPartyFilterSchema.safeParse({ partyId: params.get("partyId") ?? undefined });
  if (!party.success) return NextResponse.json({ error: "err.partyInvalid" }, { status: 400 });
  const { partyId } = party.data;

  // The report first: it is what resolves the party in this establishment.
  const report = await getReport(establishmentId, from, to, partyId);
  if (report === null) return NextResponse.json({ error: "err.partyInvalid" }, { status: 400 });
  const rows = await allRows(establishmentId, from, to, partyId);

  const book = buildWorkbook({
    rows,
    report,
    meta: {
      establishmentName: user.establishmentName ?? "",
      from,
      to,
      partyName: report.party?.name ?? null,
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
