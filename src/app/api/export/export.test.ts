import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ExcelJS from "exceljs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { t } from "@/i18n/ar";
import { isoToDate } from "@/lib/dates";

import packageJson from "../../../../package.json";
import { MONEY_FORMAT } from "./style";
import { riyadhStamp } from "./workbook";

/**
 * The export route is the only place outside the server-action path that reads
 * an owner's books, so nothing here inherits the checks an action gets. What
 * matters is that the URL is trusted for the date range and for **nothing else**:
 * the establishment comes from the session, and a caller adding
 * `?establishmentId=…` must change nothing at all.
 */

const spy = vi.hoisted(() => ({
  listedWith: [] as Array<{ establishmentId: string; from?: string; to?: string }>,
  reportedWith: [] as Array<{ establishmentId: string; from: string; to: string }>,
  requireOwnerCalls: 0,
}));

/**
 * What the mocked queries return. Several IN and OUT entries over two months and
 * four payment methods (OTHER has none, so the «حسب طريقة الدفع» table must leave
 * it out). The first row is the OUT 1,234.50 the older cases were written for.
 */
const fixture = vi.hoisted(() => {
  type Row = {
    id: string;
    date: string;
    direction: "IN" | "OUT";
    amountHalalas: number;
    categoryId: string;
    categoryNameAr: string;
    paymentMethod: "CASH" | "BANK_TRANSFER" | "MADA" | "STC_PAY" | "OTHER";
    counterparty: string | null;
    note: string | null;
    createdByName: string;
    partyName: string | null;
  };
  const row = (
    id: string,
    date: string,
    direction: Row["direction"],
    amountHalalas: number,
    categoryNameAr: string,
    paymentMethod: Row["paymentMethod"],
    counterparty: string | null,
    note: string | null,
    createdByName: string,
  ): Row => ({
    id,
    date,
    direction,
    amountHalalas,
    categoryId: `cat_${categoryNameAr}`,
    categoryNameAr,
    paymentMethod,
    counterparty,
    note,
    createdByName,
    partyName: null,
  });
  const ROWS: Row[] = [
    row("tx_1", "2026-09-10", "OUT", 123450, "إيجار", "CASH", "مؤجر", "ملاحظة", "موظف"),
    row("tx_2", "2026-09-08", "IN", 250000, "مبيعات", "MADA", "عميل", null, "مالك"),
    row("tx_3", "2026-09-03", "IN", 87525, "مبيعات", "CASH", null, "دفعة نقدية", "موظف"),
    row("tx_4", "2026-08-28", "OUT", 45000, "كهرباء", "BANK_TRANSFER", "شركة الكهرباء", "فاتورة أغسطس", "مالك"),
    row("tx_5", "2026-08-20", "IN", 1200000, "مبيعات", "BANK_TRANSFER", "مؤسسة النور", null, "مالك"),
    row("tx_6", "2026-08-15", "OUT", 9999, "ضيافة", "STC_PAY", null, "قهوة وماء للمكتب، وملاحظة أطول من غيرها لتجربة التفاف النص في العمود", "موظف"),
    row("tx_7", "2026-08-02", "OUT", 300000, "رواتب", "BANK_TRANSFER", "موظفو المنشأة", "رواتب يوليو", "مالك"),
  ];
  // v1.2a: a linked party. The action stores counterparty null with a party, so
  // the text here only proves which one the column prefers.
  ROWS[1] = { ...ROWS[1]!, partyName: "مؤسسة الأمل" };

  /** What getReport would say about `rows`, built the same way it groups. */
  function reportOf(rows: Row[]) {
    const byCategory = (direction: Row["direction"]) => {
      const totals = new Map<string, number>();
      for (const r of rows.filter((x) => x.direction === direction)) {
        totals.set(r.categoryNameAr, (totals.get(r.categoryNameAr) ?? 0) + r.amountHalalas);
      }
      return [...totals]
        .map(([nameAr, totalHalalas]) => ({ categoryId: `cat_${nameAr}`, nameAr, totalHalalas }))
        .sort((a, b) => b.totalHalalas - a.totalHalalas);
    };
    const sum = (d: Row["direction"]) =>
      rows.filter((r) => r.direction === d).reduce((s, r) => s + r.amountHalalas, 0);
    return {
      byCategoryIn: byCategory("IN"),
      byCategoryOut: byCategory("OUT"),
      totalInHalalas: sum("IN"),
      totalOutHalalas: sum("OUT"),
      netHalalas: sum("IN") - sum("OUT"),
    };
  }

  return { ROWS, rows: ROWS, reportOf };
});

const SESSION_EST = "est_from_the_session";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({
  requireOwner: async () => {
    spy.requireOwnerCalls += 1;
    return {
      user: { id: "owner_1", firstName: "مالك", middleName: null, lastName: "", displayName: "مالك", establishmentName: "منشأة الاختبار" },
      establishmentId: SESSION_EST,
    };
  },
}));
vi.mock("@/features/transactions/queries", () => ({
  listTransactions: async (
    establishmentId: string,
    filters: { from?: string; to?: string; page: number },
  ) => {
    spy.listedWith.push({ establishmentId, from: filters.from, to: filters.to });
    return {
      rows: fixture.rows,
      total: fixture.rows.length,
      filterTotals: { inHalalas: 0, outHalalas: 0, netHalalas: 0 },
    };
  },
}));
vi.mock("@/features/reports/queries", () => ({
  getReport: async (establishmentId: string, from: string, to: string) => {
    spy.reportedWith.push({ establishmentId, from, to });
    return fixture.reportOf(fixture.rows);
  },
}));

const { GET } = await import("./route");

function request(query: string): Request {
  return new Request(`https://example.test/api/export${query}`);
}

beforeEach(() => {
  spy.listedWith = [];
  spy.reportedWith = [];
  spy.requireOwnerCalls = 0;
  fixture.rows = fixture.ROWS;
});

describe("GET /api/export", () => {
  it("requires an owner before doing anything", async () => {
    await GET(request("?from=2026-09-01&to=2026-09-30"));
    expect(spy.requireOwnerCalls).toBe(1);
  });

  it("uses the session's establishment, never one from the URL", async () => {
    await GET(
      request(
        "?from=2026-09-01&to=2026-09-30&establishmentId=est_belonging_to_someone_else",
      ),
    );

    expect(spy.listedWith.every((c) => c.establishmentId === SESSION_EST)).toBe(true);
    expect(spy.reportedWith.every((c) => c.establishmentId === SESSION_EST)).toBe(true);
    expect(JSON.stringify(spy.listedWith)).not.toContain("someone_else");
    expect(JSON.stringify(spy.reportedWith)).not.toContain("someone_else");
  });

  it("passes the range through from the URL", async () => {
    await GET(request("?from=2026-01-01&to=2026-03-31"));
    expect(spy.reportedWith[0]).toEqual({
      establishmentId: SESSION_EST,
      from: "2026-01-01",
      to: "2026-03-31",
    });
  });

  /**
   * The route returns the schema's own key rather than flattening everything to
   * "invalid": an owner who asked for three years of data needs to be told the
   * span is capped, not that their dates are wrong.
   */
  it("refuses a bad range with 400 and names which problem it is", async () => {
    const cases: Array<[string, string]> = [
      ["?from=2026-09-30&to=2026-09-01", "err.rangeInvalid"],
      ["?from=nonsense&to=2026-09-30", "err.dateInvalid"],
      ["?from=2026-09-01", "err.required"],
      ["", "err.required"],
      // Over MAX_REPORT_SPAN_DAYS: exceljs holds the whole workbook in memory,
      // so an unbounded range is a timeout rather than a slow download.
      ["?from=2020-01-01&to=2026-09-30", "err.rangeTooLong"],
    ];

    for (const [query, expected] of cases) {
      const response = await GET(request(query));
      expect(response.status, query).toBe(400);
      await expect(response.json(), query).resolves.toEqual({ error: expected });
    }
    // Nothing was read for any of them.
    expect(spy.reportedWith).toHaveLength(0);
    expect(spy.listedWith).toHaveLength(0);
  });

  it("accepts a range exactly at the cap", async () => {
    const response = await GET(request("?from=2026-01-01&to=2026-12-31"));
    expect(response.status).toBe(200);
  });

  it("sends a spreadsheet that no cache may keep", async () => {
    const response = await GET(request("?from=2026-09-01&to=2026-09-30"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Content-Type")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="ledger_2026-09-01_2026-09-30.xlsx"',
    );
  });

  it("produces a real xlsx with three sheets", async () => {
    const response = await GET(request("?from=2026-09-01&to=2026-09-30"));
    const bytes = new Uint8Array(await response.arrayBuffer());

    // xlsx is a zip: "PK\x03\x04".
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect(bytes.byteLength).toBeGreaterThan(1000);

    const book = new ExcelJS.Workbook();
    await book.xlsx.load(bytes as unknown as ArrayBuffer);
    expect(book.worksheets).toHaveLength(3);
  });

  it("writes amounts as riyal numbers, not halalas and not text", async () => {
    const response = await GET(request("?from=2026-09-01&to=2026-09-30"));
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(
      new Uint8Array(await response.arrayBuffer()) as unknown as ArrayBuffer,
    );

    // 123450 halalas is 1,234.50 — a number, so the owner can sum the column —
    // and negative, because it is صادر. Row 6 is the first entry under the header.
    const amount = book.worksheets[0]!.getRow(6).getCell(3).value;
    expect(amount).toBe(-1234.5);
    expect(typeof amount).toBe("number");
  });
});

/* ------------------------------------------------ the workbook (v1.1c) */

async function exportedBook(): Promise<ExcelJS.Workbook> {
  const response = await GET(request("?from=2026-08-01&to=2026-09-30"));
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(
    new Uint8Array(await response.arrayBuffer()) as unknown as ArrayBuffer,
  );
  return book;
}

type FixtureRow = (typeof fixture.ROWS)[number];
const signed = (r: FixtureRow) => (r.direction === "IN" ? r.amountHalalas : -r.amountHalalas);
const sumOf = (rows: FixtureRow[], d: "IN" | "OUT") =>
  rows.filter((r) => r.direction === d).reduce((s, r) => s + r.amountHalalas, 0);

/** The row whose first cell reads `label`, on a sheet. */
function rowLabelled(sheet: ExcelJS.Worksheet, label: string): ExcelJS.Row {
  for (let r = 1; r <= sheet.rowCount; r++) {
    if (sheet.getRow(r).getCell(1).value === label) return sheet.getRow(r);
  }
  throw new Error(`no row labelled ${label}`);
}

/**
 * Just enough of Excel for the three shapes the export writes: `SUM(C6:C9)`,
 * `SUMIF(C6:C9,">0")` / `"<0"`, and `B7+B11`. Anything else throws, so a new
 * shape cannot slip past the check below unevaluated.
 */
function evaluate(sheet: ExcelJS.Worksheet, formula: string): number {
  // Strict: a range or reference that drifts onto a label or a blank cell is a
  // layout bug even where Excel would quietly skip it, so it fails here.
  const numberAt = (ref: string): number => {
    const v = sheet.getCell(ref).value;
    if (typeof v === "number") return v;
    if (v && typeof v === "object" && "result" in v) return Number(v.result);
    throw new Error(`${formula} reads ${ref}, which holds no amount`);
  };
  const column = (col: string, a: number, b: number): number[] => {
    const out: number[] = [];
    for (let r = a; r <= b; r++) out.push(numberAt(`${col}${r}`));
    return out;
  };
  const add = (xs: number[]) => xs.reduce((s, x) => s + x, 0);

  let m = /^SUM\(([A-Z])(\d+):\1(\d+)\)$/.exec(formula);
  if (m) return add(column(m[1]!, Number(m[2]), Number(m[3])));
  m = /^SUMIF\(([A-Z])(\d+):\1(\d+),"([<>])0"\)$/.exec(formula);
  if (m) {
    const keep = m[4] === ">" ? (x: number) => x > 0 : (x: number) => x < 0;
    return add(column(m[1]!, Number(m[2]), Number(m[3])).filter(keep));
  }
  m = /^([A-Z]\d+)\+([A-Z]\d+)$/.exec(formula);
  if (m) return numberAt(m[1]!) + numberAt(m[2]!);
  throw new Error(`unexpected formula shape: ${formula}`);
}

describe("the exported workbook", () => {
  it("has «الحركات», «الملخص», «معلومات» in that order, all right-to-left", async () => {
    const book = await exportedBook();
    expect(book.worksheets.map((s) => s.name)).toEqual([
      t.export.ledgerSheet,
      t.export.summarySheet,
      t.export.infoSheet,
    ]);
    for (const sheet of book.worksheets) {
      expect(sheet.views[0]?.rightToLeft, sheet.name).toBe(true);
    }
  });

  it("puts the header in row 5, frozen under it and filtered over the data only", async () => {
    const sheet = (await exportedBook()).worksheets[0]!;
    expect(sheet.getRow(5).values).toEqual([
      undefined,
      t.transaction.date,
      t.direction.label,
      t.transaction.amount,
      t.transaction.category,
      t.paymentMethod.label,
      t.transaction.counterparty,
      t.transaction.note,
      t.transaction.addedBy,
    ]);
    expect(sheet.getCell("A1").value).toBe(t.export.ledgerTitle);
    expect(sheet.getCell("A2").value).toBe("منشأة الاختبار");
    expect(sheet.views[0]).toMatchObject({ state: "frozen", ySplit: 5 });
    expect(sheet.autoFilter).toBe(`A5:H${5 + fixture.ROWS.length}`);
    expect(sheet.getCell("C5").fill).toMatchObject({ fgColor: { argb: "FF006C35" } });
  });

  it("writes every amount as a number signed by direction, and every date as a Date", async () => {
    const sheet = (await exportedBook()).worksheets[0]!;
    fixture.ROWS.forEach((r, i) => {
      const row = sheet.getRow(6 + i);
      expect(row.getCell(3).value, r.id).toBe(signed(r) / 100);
      expect(row.getCell(3).numFmt, r.id).toBe(MONEY_FORMAT);
      expect(row.getCell(3).font?.color?.argb, r.id).toBe(
        r.direction === "IN" ? "FF15803D" : "FFB91C1C",
      );
      expect(row.getCell(2).value, r.id).toBe(t.direction[r.direction]);
      const date = row.getCell(1).value;
      expect(date, r.id).toBeInstanceOf(Date);
      expect(date, r.id).toEqual(isoToDate(r.date));
    });
  });

  it("v1.2a: the counterparty column shows the party's name, else the free text", async () => {
    const sheet = (await exportedBook()).worksheets[0]!;
    fixture.ROWS.forEach((r, i) => {
      expect(sheet.getRow(6 + i).getCell(6).value, r.id).toBe(r.partyName ?? r.counterparty ?? "");
    });
    expect(sheet.getRow(7).getCell(6).value).toBe("مؤسسة الأمل");
  });

  it("totals the amount column with SUMIF/SUM formulas and their cached results", async () => {
    const sheet = (await exportedBook()).worksheets[0]!;
    const last = 5 + fixture.ROWS.length;
    const range = `C6:C${last}`;
    const inH = sumOf(fixture.ROWS, "IN");
    const outH = sumOf(fixture.ROWS, "OUT");

    // One blank row between the entries and the totals.
    expect(sheet.getRow(last + 1).getCell(3).value).toBeNull();
    expect(sheet.getRow(last + 2).getCell(3).value).toEqual({
      formula: `SUMIF(${range},">0")`,
      result: inH / 100,
    });
    expect(sheet.getRow(last + 3).getCell(3).value).toEqual({
      formula: `SUMIF(${range},"<0")`,
      result: -outH / 100,
    });
    expect(sheet.getRow(last + 4).getCell(3).value).toEqual({
      formula: `SUM(${range})`,
      result: (inH - outH) / 100,
    });
  });

  it("writes plain zeros, and no formula, for an empty period", async () => {
    fixture.rows = [];
    const book = await exportedBook();
    const ledger = book.worksheets[0]!;
    expect(ledger.autoFilter).toBe("A5:H5");
    for (const r of [7, 8, 9]) expect(ledger.getRow(r).getCell(3).value, `row ${r}`).toBe(0);

    const summary = book.worksheets[1]!;
    for (const label of [t.reports.totalIn, t.reports.totalOut, t.reports.net, t.export.totalsRow]) {
      expect(rowLabelled(summary, label).getCell(2).value, label).toBe(0);
    }
  });

  it("summarises by category with صادر negative and a net that adds up", async () => {
    const summary = (await exportedBook()).worksheets[1]!;
    const report = fixture.reportOf(fixture.ROWS);
    const cached = (label: string) =>
      (rowLabelled(summary, label).getCell(2).value as { result: number }).result;

    expect(rowLabelled(summary, "مبيعات").getCell(2).value).toBe(15375.25);
    expect(rowLabelled(summary, "رواتب").getCell(2).value).toBe(-3000);
    expect(cached(t.reports.totalIn)).toBe(report.totalInHalalas / 100);
    expect(cached(t.reports.totalOut)).toBe(-report.totalOutHalalas / 100);
    expect(cached(t.reports.net)).toBe(report.netHalalas / 100);
  });

  it("breaks the period down by payment method from the rows, in enum order", async () => {
    const summary = (await exportedBook()).worksheets[1]!;
    const header = rowLabelled(summary, t.paymentMethod.label);
    expect(header.values).toEqual([
      undefined,
      t.paymentMethod.label,
      t.direction.IN,
      t.direction.OUT,
      t.reports.net,
    ]);

    const methods = ["CASH", "BANK_TRANSFER", "MADA", "STC_PAY"] as const;
    methods.forEach((method, i) => {
      const row = summary.getRow(header.number + 1 + i);
      const mine = fixture.ROWS.filter((r) => r.paymentMethod === method);
      const inH = sumOf(mine, "IN");
      const outH = sumOf(mine, "OUT");
      expect(row.getCell(1).value, method).toBe(t.paymentMethod[method]);
      expect(row.getCell(2).value, method).toBe(inH / 100);
      expect(row.getCell(3).value, method).toBe((0 - outH) / 100);
      expect(row.getCell(4).value, method).toBe((inH - outH) / 100);
    });
    // OTHER has no entries, so the totals row follows STC_PAY directly.
    const totals = summary.getRow(header.number + 5);
    expect(totals.getCell(1).value).toBe(t.export.totalsRow);
    const net = totals.getCell(4).value as { result: number };
    expect(net.result).toBe(fixture.ROWS.reduce((s, r) => s + signed(r), 0) / 100);
  });

  /**
   * The cached results come from halalas sums and `getReport`, not from the
   * formula — but desktop Excel recalculates on open, so a formula with the wrong
   * range or operator would show the owner a wrong number while every cached
   * value stays right. Evaluate each formula from the loaded cells instead.
   */
  it("has every formula on both sheets compute its own cached result", async () => {
    const book = await exportedBook();
    let checked = 0;
    for (const sheet of book.worksheets.slice(0, 2)) {
      sheet.eachRow((row) =>
        row.eachCell((cell) => {
          const value = cell.value as { formula?: string; result?: number } | null;
          if (!value || typeof value !== "object" || !("formula" in value)) return;
          const computed = evaluate(sheet, value.formula!);
          expect(Math.round(computed * 100), `${sheet.name}!${cell.address} ${value.formula}`).toBe(
            Math.round(value.result! * 100),
          );
          checked++;
        }),
      );
    }
    // 3 on the ledger, 3 category-summary cells, 3 method totals.
    expect(checked).toBe(9);
  });

  it("names who made the file, when (Riyadh) and with which version", async () => {
    const info = (await exportedBook()).worksheets[2]!;
    const value = (label: string) => rowLabelled(info, label).getCell(2).value;
    expect(value(t.export.establishment)).toBe("منشأة الاختبار");
    expect(value(t.export.generatedBy)).toBe("مالك");
    expect(value(t.export.period)).toBe(`${t.export.from} 2026-08-01 ${t.export.to} 2026-09-30`);
    expect(value(t.export.appVersion)).toBe(packageJson.version);
    expect(String(value(t.export.generatedAt))).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });

  it("stamps generated-at in Riyadh time, not UTC", () => {
    // 21:30 UTC is already the next day in Riyadh (UTC+3).
    expect(riyadhStamp(new Date("2026-09-29T21:30:00Z"))).toBe("2026-09-30 00:30");
  });

  it("builds the currency format from ar.ts, which must not contain a quote", () => {
    expect(t.common.currency).not.toContain('"');
    expect(MONEY_FORMAT).toBe(`#,##0.00 "${t.common.currency}"`);
  });

  /**
   * The B3 scoping gate lists only route.ts. Everything else in this folder must
   * stay pure — data reaches it through the route, never through a read of its own.
   */
  it("keeps every non-test file here free of database access", () => {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const files = readdirSync(dir, { recursive: true, encoding: "utf8" }).filter(
      (f) => f.endsWith(".ts") && !f.endsWith(".test.ts"),
    );
    expect(files).toEqual(expect.arrayContaining(["route.ts", "workbook.ts"]));
    for (const file of files) {
      const source = readFileSync(path.join(dir, file), "utf8");
      // Any path to the client: the alias, a relative `../lib/db`, or Prisma itself.
      expect(source, file).not.toMatch(/lib\/db\b|generated\/prisma|@prisma\//);
      expect(source, file).not.toMatch(/\b(?:db|tx|client)\./);
    }
  });
});
