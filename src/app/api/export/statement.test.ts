import ExcelJS from "exceljs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { t } from "@/i18n/ar";

import { asciiFilename, utf8Filename } from "./statementFilename";
import { STATEMENT_FIRST_ROW, STATEMENT_HEADER_ROW } from "./statementSheet";

/**
 * كشف حساب to Excel (docs/V12C-DESIGN.md C14, E11). The route trusts the URL
 * for the party id only, reads through `getPartyStatement` alone (mocked here;
 * its numbers are pinned on real SQL in plans/moneyPath.test.ts), and every
 * number in the workbook — formulas evaluated from the cells — equals it.
 */

const SESSION_EST = "est_from_the_session";
const spy = vi.hoisted(() => ({ statementFor: [] as Array<[string, string]>, requireOwnerCalls: 0, missing: false }));

const STATEMENT = vi.hoisted(() => ({
  party: { id: "party_1", name: "مؤسسة النور" },
  rows: [
    { date: "2026-08-01", kind: "PLAN", planId: "p1", planTitle: "صيانة", transactionId: null, deltaHalalas: 150000, balanceHalalas: 150000 },
    { date: "2026-08-15", kind: "PAYMENT", planId: "p1", planTitle: "صيانة", transactionId: "t1", deltaHalalas: -50025, balanceHalalas: 99975 },
    { date: "2026-09-01", kind: "PLAN", planId: "p2", planTitle: "توريد $&", transactionId: null, deltaHalalas: -30000, balanceHalalas: 69975 },
    { date: "2026-09-02", kind: "PAYMENT", planId: "p2", planTitle: "توريد $&", transactionId: "t2", deltaHalalas: 30000, balanceHalalas: 99975 },
    { date: "2026-09-20", kind: "WRITE_OFF", planId: "p1", planTitle: "صيانة", transactionId: null, deltaHalalas: -99975, balanceHalalas: 0 },
  ],
  closingBalanceHalalas: 0,
  other: [
    { id: "o1", date: "2026-09-10", direction: "IN", amountHalalas: 1234, categoryNameAr: "مبيعات", note: "نقدًا" },
    { id: "o2", date: "2026-09-11", direction: "OUT", amountHalalas: 999, categoryNameAr: "ضيافة", note: null },
  ],
  otherCapped: true,
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({
  requireOwner: async () => {
    spy.requireOwnerCalls += 1;
    return { user: { id: "owner_1", establishmentName: "منشأة الاختبار" }, establishmentId: SESSION_EST };
  },
}));
vi.mock("@/features/parties/statement", () => ({
  getPartyStatement: async (establishmentId: string, partyId: string) => {
    spy.statementFor.push([establishmentId, partyId]);
    return spy.missing ? null : STATEMENT;
  },
}));

const { GET } = await import("./statement/route");
const call = (query: string) => GET(new Request(`https://example.test/api/export/statement${query}`));

async function book(): Promise<ExcelJS.Worksheet> {
  const response = await call("?partyId=party_1");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(new Uint8Array(await response.arrayBuffer()) as unknown as ArrayBuffer);
  expect(workbook.worksheets).toHaveLength(1);
  return workbook.worksheets[0]!;
}

/** A balance cell: a formula evaluated from the cells, or the plain 0 (exceljs drops a cached 0). */
function balanceOf(sheet: ExcelJS.Worksheet, value: ExcelJS.CellValue): number {
  if (value === 0) return 0;
  const { formula, result } = value as { formula: string; result: number };
  const computed = evaluate(sheet, formula);
  expect(Math.round(computed * 100)).toBe(Math.round(result * 100));
  return Math.round(computed * 100);
}

/** Strict, like export.test.ts: only `SUM(Cn:Cm)`, and every cell it reads must hold an amount. */
function evaluate(sheet: ExcelJS.Worksheet, formula: string): number {
  const m = /^SUM\(C(\d+):C(\d+)\)$/.exec(formula);
  if (!m) throw new Error(`unexpected formula shape: ${formula}`);
  let sum = 0;
  for (let r = Number(m[1]); r <= Number(m[2]); r++) {
    const v = sheet.getCell(`C${r}`).value;
    if (typeof v !== "number") throw new Error(`${formula} reads C${r}, which holds no amount`);
    sum += v;
  }
  return sum;
}

beforeEach(() => {
  spy.statementFor = [];
  spy.requireOwnerCalls = 0;
  spy.missing = false;
});

describe("GET /api/export/statement", () => {
  it("requires an owner, and reads the session's establishment only", async () => {
    await call("?partyId=party_1&establishmentId=est_someone_else");
    expect(spy.requireOwnerCalls).toBe(1);
    expect(spy.statementFor).toEqual([[SESSION_EST, "party_1"]]);
  });

  it("a missing id is 400; an unknown or foreign party is 404; nothing built for either", async () => {
    const missing = await call("");
    expect(missing.status).toBe(400);
    expect(await missing.json()).toEqual({ error: "err.required" });
    spy.missing = true;
    const foreign = await call("?partyId=party_of_another");
    expect(foreign.status).toBe(404);
    expect(await foreign.json()).toEqual({ error: "err.notFound" });
  });

  it("is a private, uncached xlsx with an ASCII name and a UTF-8 name (E11)", async () => {
    const response = await call("?partyId=party_1");
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Content-Type")).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    const disposition = response.headers.get("Content-Disposition")!;
    expect(disposition).toMatch(/^attachment; filename="statement_party_1_\d{4}-\d{2}-\d{2}\.xlsx"; filename\*=UTF-8''[A-Za-z0-9%._~-]+$/);
    expect(decodeURIComponent(disposition.split("''")[1]!)).toMatch(/^كشف_الحساب_مؤسسة_النور_\d{4}-\d{2}-\d{2}\.xlsx$/);
  });
});

describe("the statement workbook (C14)", () => {
  it("is one right-to-left sheet with the title block and the header in row 5", async () => {
    const sheet = await book();
    expect(sheet.name).toBe(t.statementExport.sheetName);
    expect(sheet.views[0]).toMatchObject({ rightToLeft: true, state: "frozen", ySplit: STATEMENT_HEADER_ROW });
    expect(sheet.getCell("A1").value).toBe(t.statementExport.title.replace("{name}", "مؤسسة النور"));
    expect(sheet.getCell("A2").value).toBe("منشأة الاختبار");
    expect(String(sheet.getCell("A3").value)).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    expect(sheet.getRow(STATEMENT_HEADER_ROW).values).toEqual([
      undefined, t.statement.date, t.statement.description, t.statement.amount, t.statement.balance,
    ]);
  });

  it("every row, running balance and the closing balance equal getPartyStatement — formulas evaluated", async () => {
    const sheet = await book();
    STATEMENT.rows.forEach((row, i) => {
      const r = STATEMENT_FIRST_ROW + i;
      expect(sheet.getCell(r, 1).value).toEqual(new Date(`${row.date}T00:00:00Z`));
      expect(sheet.getCell(r, 3).value).toBe(row.deltaHalalas / 100);
      expect(balanceOf(sheet, sheet.getCell(r, 4).value)).toBe(row.balanceHalalas);
    });
    const closingRow = STATEMENT_FIRST_ROW + STATEMENT.rows.length + 1;
    expect(sheet.getCell(closingRow, 1).value).toBe(t.statement.closingBalance);
    expect(balanceOf(sheet, sheet.getCell(closingRow, 4).value)).toBe(STATEMENT.closingBalanceHalalas);
    // Non-vacuous: four of the five balances are formulas (the last is the plain 0).
    const formulas = STATEMENT.rows.filter((_, i) => typeof sheet.getCell(STATEMENT_FIRST_ROW + i, 4).value === "object");
    expect(formulas).toHaveLength(4);
  });

  it("a non-zero closing balance is a formula over every row", async () => {
    const original = STATEMENT.rows.pop()!;
    const closingBefore = STATEMENT.closingBalanceHalalas;
    STATEMENT.closingBalanceHalalas = 99975;
    try {
      const sheet = await book();
      const closingRow = STATEMENT_FIRST_ROW + STATEMENT.rows.length + 1;
      const closing = sheet.getCell(closingRow, 4).value as { formula: string };
      expect(closing.formula).toBe(`SUM(C${STATEMENT_FIRST_ROW}:C${STATEMENT_FIRST_ROW + STATEMENT.rows.length - 1})`);
      expect(balanceOf(sheet, closing)).toBe(99975);
    } finally {
      STATEMENT.rows.push(original);
      STATEMENT.closingBalanceHalalas = closingBefore;
    }
  });

  it("describes each row as the printed statement does, $& kept literal", async () => {
    const sheet = await book();
    const described = STATEMENT.rows.map((_, i) => sheet.getCell(STATEMENT_FIRST_ROW + i, 2).value);
    expect(described).toEqual([
      t.statement.planCharge.replace("{title}", "صيانة"),
      t.statement.paymentReceived.replace("{title}", "صيانة"),
      t.statement.planCharge.replace("{title}", () => "توريد $&"),
      t.statement.paymentMade.replace("{title}", () => "توريد $&"),
      t.statement.writeOff.replace("{title}", "صيانة"),
    ]);
  });

  it("lists «حركات أخرى» below, outside the balance, with the capped line", async () => {
    const sheet = await book();
    let at = -1;
    sheet.eachRow((row, r) => {
      if (row.getCell(1).value === t.statement.otherTransactions) at = r;
    });
    expect(at).toBeGreaterThan(STATEMENT_FIRST_ROW + STATEMENT.rows.length);
    const first = at + 3; // the title row, the hint, the header, then the rows
    expect(sheet.getCell(first, 3).value).toBe(12.34);
    expect(sheet.getCell(first + 1, 3).value).toBe(-9.99);
    expect(sheet.getCell(first + 2, 1).value).toBe(t.statement.otherCapped);
    let formulas = 0;
    sheet.eachRow((row, r) => row.eachCell((cell) => {
      if (r >= at && cell.value && typeof cell.value === "object" && "formula" in cell.value) formulas++;
    }));
    expect(formulas).toBe(0);
  });
});

describe("filenames (E11)", () => {
  it("the ASCII name keeps only safe characters", () => {
    expect(asciiFilename(`p"1\r\n/x`, "2026-10-05")).toBe("statement_p_1___x_2026-10-05.xlsx");
  });

  it("the UTF-8 name survives an Arabic name, a quote and CR/LF as one safe token", () => {
    const CRLF = String.fromCharCode(13, 10);
    const encoded = utf8Filename(`مؤسسة "النور"${CRLF}Content-Type: x (فرع)*`, "2026-10-05");
    expect(encoded).toMatch(/^[A-Za-z0-9%._~-]+$/);
    const name = decodeURIComponent(encoded);
    expect(name).toBe("كشف_الحساب_مؤسسة__النور_Content-Type__x_(فرع)__2026-10-05.xlsx");
    expect(name).not.toMatch(/["\r\n\\/]/);
  });
});
