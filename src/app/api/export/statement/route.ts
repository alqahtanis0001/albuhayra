import { NextResponse } from "next/server";
import { z } from "zod";

import { getPartyStatement } from "@/features/parties/statement";
import { requireOwner } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { cuid } from "@/lib/validation/primitives";

import { asciiFilename, utf8Filename } from "../statementFilename";
import { buildStatementWorkbook } from "../statementSheet";

/**
 * كشف حساب to Excel (docs/V12C-DESIGN.md C14, E11). OWNER only —
 * `requireOwner()` first — and the establishment comes from the session; the
 * URL is trusted for the party id alone, which `getPartyStatement` resolves
 * inside that establishment (another's reads as missing → 404). Every figure
 * comes from `getPartyStatement`: nothing under `api/export/` touches the
 * database (export.test.ts scans the folder).
 */

export const dynamic = "force-dynamic";

const QuerySchema = z.object({ partyId: cuid });

export async function GET(request: Request): Promise<Response> {
  const { user, establishmentId } = await requireOwner();

  const params = new URL(request.url).searchParams;
  const parsed = QuerySchema.safeParse({ partyId: params.get("partyId") ?? undefined });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "err.invalidInput" }, { status: 400 });
  }

  const statement = await getPartyStatement(establishmentId, parsed.data.partyId);
  if (!statement) return NextResponse.json({ error: "err.notFound" }, { status: 404 });

  const generatedAt = new Date();
  const book = buildStatementWorkbook({
    statement,
    establishmentName: user.establishmentName ?? "",
    generatedAt,
  });
  const buffer = await book.xlsx.writeBuffer();
  const date = todayISO(generatedAt);

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${asciiFilename(statement.party.id, date)}"; filename*=UTF-8''${utf8Filename(statement.party.name, date)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
