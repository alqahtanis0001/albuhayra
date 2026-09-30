import { describe, expect, it } from "vitest";

import { balanceKind, statementPoints, summaryDate } from "./statementVisual";

describe("balanceKind (v1.3 item 13; + = لنا, − = علينا)", () => {
  it("maps the sign to the words", () => {
    expect(balanceKind(1)).toBe("owesUs");
    expect(balanceKind(-1)).toBe("weOwe");
    expect(balanceKind(0)).toBe("settled");
  });
});

describe("statementPoints", () => {
  it("one point per date, the balance after that date's last row", () => {
    expect(
      statementPoints([
        { date: "2026-01-01", balanceHalalas: 1000 },
        { date: "2026-01-01", balanceHalalas: 700 },
        { date: "2026-02-10", balanceHalalas: 200 },
        { date: "2026-03-05", balanceHalalas: -50 },
        { date: "2026-03-05", balanceHalalas: 0 },
      ]),
    ).toEqual([
      { date: "2026-01-01", value: 700 },
      { date: "2026-02-10", value: 200 },
      { date: "2026-03-05", value: 0 },
    ]);
  });

  it("empty in, empty out", () => {
    expect(statementPoints([])).toEqual([]);
  });
});

describe("summaryDate", () => {
  it("Gregorian then Hijri, as DateText shows them", () => {
    expect(summaryDate("2026-09-29")).toBe("2026-09-29 (1448/04/18 هـ)");
  });
});
