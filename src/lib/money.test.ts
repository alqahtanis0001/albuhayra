import { describe, expect, it } from "vitest";

import {
  MAX_AMOUNT_HALALAS,
  formatAmount,
  formatSAR,
  net,
  parseSAR,
  toWesternDigits,
} from "./money";

describe("formatSAR", () => {
  it("formats halalas with two decimals, grouping and the currency word", () => {
    expect(formatSAR(123450)).toBe("1,234.50 ر.س");
    expect(formatSAR(0)).toBe("0.00 ر.س");
    expect(formatSAR(1)).toBe("0.01 ر.س");
    expect(formatSAR(100)).toBe("1.00 ر.س");
  });

  it("uses Western digits even though the UI is Arabic", () => {
    expect(formatSAR(987654321)).toBe("9,876,543.21 ر.س");
    expect(formatSAR(123450)).not.toMatch(/[٠-٩]/);
  });

  it("signs the amount from the direction, not from the number", () => {
    expect(formatSAR(50000, "IN")).toBe("+500.00 ر.س");
    expect(formatSAR(50000, "OUT")).toBe("−500.00 ر.س");
  });

  it("shows a minus sign for a negative net with no direction", () => {
    expect(formatSAR(-50000)).toBe("−500.00 ر.س");
  });

  it("formatAmount omits the currency word", () => {
    expect(formatAmount(123450)).toBe("1,234.50");
  });
});

describe("parseSAR", () => {
  it("accepts plain, decimal and grouped input", () => {
    expect(parseSAR("1234")).toBe(123400);
    expect(parseSAR("1234.5")).toBe(123450);
    expect(parseSAR("1,234.50")).toBe(123450);
    expect(parseSAR("0.01")).toBe(1);
    expect(parseSAR(" 12 ")).toBe(1200);
  });

  it("accepts Arabic-Indic digits and the Arabic decimal separator", () => {
    expect(parseSAR("١٢٣٤")).toBe(123400);
    expect(parseSAR("١٢٣٤٫٥٠")).toBe(123450);
  });

  it("rejects anything that is not a positive amount", () => {
    expect(parseSAR("")).toBeNull();
    expect(parseSAR("   ")).toBeNull();
    expect(parseSAR("abc")).toBeNull();
    expect(parseSAR("-5")).toBeNull();
    expect(parseSAR("0")).toBeNull();
    expect(parseSAR("0.00")).toBeNull();
    expect(parseSAR("1.234")).toBeNull();
    expect(parseSAR("1.2.3")).toBeNull();
    expect(parseSAR("1e3")).toBeNull();
    expect(parseSAR("١٢٣ريال")).toBeNull();
  });

  it("rejects amounts above the 20M SAR ceiling (int4 columns, v1.2a)", () => {
    expect(MAX_AMOUNT_HALALAS).toBe(2_000_000_000);
    expect(MAX_AMOUNT_HALALAS).toBeLessThanOrEqual(2 ** 31 - 1);
    expect(parseSAR("20000000")).toBe(MAX_AMOUNT_HALALAS);
    expect(parseSAR("20,000,000.00")).toBe(MAX_AMOUNT_HALALAS);
    expect(parseSAR("20000000.01")).toBeNull();
    expect(parseSAR("100000000")).toBeNull();
  });

  it("round-trips through formatAmount", () => {
    for (const halalas of [1, 100, 999, 123450, 1_000_000_00]) {
      expect(parseSAR(formatAmount(halalas))).toBe(halalas);
    }
  });
});

describe("toWesternDigits", () => {
  it("converts both Arabic-Indic ranges and leaves the rest alone", () => {
    expect(toWesternDigits("٠١٢٣٤٥٦٧٨٩")).toBe("0123456789");
    expect(toWesternDigits("۰۱۲۳۴۵۶۷۸۹")).toBe("0123456789");
    expect(toWesternDigits("2026-09-29")).toBe("2026-09-29");
  });
});

describe("net", () => {
  it("subtracts OUT from IN", () => {
    expect(net(100000, 40000)).toBe(60000);
    expect(net(40000, 100000)).toBe(-60000);
    expect(net(0, 0)).toBe(0);
  });
});
