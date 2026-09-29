import { beforeEach, describe, expect, it, vi } from "vitest";

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

const SESSION_EST = "est_from_the_session";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({
  requireOwner: async () => {
    spy.requireOwnerCalls += 1;
    return {
      user: { id: "owner_1", name: "مالك" },
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
      rows: [
        {
          id: "tx_1",
          date: "2026-09-10",
          direction: "OUT" as const,
          amountHalalas: 123450,
          categoryId: "cat_1",
          categoryNameAr: "إيجار",
          paymentMethod: "CASH" as const,
          counterparty: "مؤجر",
          note: "ملاحظة",
          createdByName: "موظف",
        },
      ],
      total: 1,
      filterTotals: { inHalalas: 0, outHalalas: 123450, netHalalas: -123450 },
    };
  },
}));
vi.mock("@/features/reports/queries", () => ({
  getReport: async (establishmentId: string, from: string, to: string) => {
    spy.reportedWith.push({ establishmentId, from, to });
    return {
      byCategoryIn: [{ categoryId: "c1", nameAr: "مبيعات", totalHalalas: 500 }],
      byCategoryOut: [{ categoryId: "c2", nameAr: "إيجار", totalHalalas: 123450 }],
      totalInHalalas: 500,
      totalOutHalalas: 123450,
      netHalalas: -122950,
    };
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

  it("produces a real xlsx with two sheets", async () => {
    const response = await GET(request("?from=2026-09-01&to=2026-09-30"));
    const bytes = new Uint8Array(await response.arrayBuffer());

    // xlsx is a zip: "PK\x03\x04".
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect(bytes.byteLength).toBeGreaterThan(1000);

    const ExcelJS = (await import("exceljs")).default;
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(bytes as unknown as ArrayBuffer);
    expect(book.worksheets).toHaveLength(2);
  });

  it("writes amounts as riyal numbers, not halalas and not text", async () => {
    const response = await GET(request("?from=2026-09-01&to=2026-09-30"));
    const ExcelJS = (await import("exceljs")).default;
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(
      new Uint8Array(await response.arrayBuffer()) as unknown as ArrayBuffer,
    );

    // 123450 halalas is 1,234.50 — a number, so the owner can sum the column.
    const amount = book.worksheets[0]!.getRow(2).getCell(3).value;
    expect(amount).toBe(1234.5);
    expect(typeof amount).toBe("number");
  });
});
