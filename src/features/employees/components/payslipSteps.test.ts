import { describe, expect, it } from "vitest";

import { payslipSteps } from "./payslipSteps";

describe("payslipSteps (v1.3 item 12)", () => {
  it("gross full, deductions the slice at its end, net from the start", () => {
    expect(payslipSteps(1_000_000, 250_000, 750_000)).toEqual([
      { key: "gross", halalas: 1_000_000, startPct: 0, widthPct: 100 },
      { key: "deductions", halalas: 250_000, startPct: 75, widthPct: 25 },
      { key: "net", halalas: 750_000, startPct: 0, widthPct: 75 },
    ]);
  });

  it("net ends where the deductions start (gross − deductions = net)", () => {
    const [, d, n] = payslipSteps(812_345, 12_345, 800_000);
    expect(n!.startPct + n!.widthPct).toBe(d!.startPct);
    expect(d!.startPct + d!.widthPct).toBeCloseTo(100, 6);
  });

  it("no deductions: an empty middle step, net = gross", () => {
    expect(payslipSteps(500_000, 0, 500_000)[1]).toEqual({ key: "deductions", halalas: 0, startPct: 100, widthPct: 0 });
    expect(payslipSteps(500_000, 0, 500_000)[2]!.widthPct).toBe(100);
  });

  it("deductions above gross are clamped at the start; zero gross does not divide by zero", () => {
    expect(payslipSteps(100, 300, 0)[1]).toMatchObject({ startPct: 0, widthPct: 100 });
    expect(payslipSteps(0, 0, 0).map((s) => s.widthPct)).toEqual([0, 0, 0]);
  });

  it("rounds to two decimals", () => {
    expect(payslipSteps(300, 100, 200)[2]!.widthPct).toBe(66.67);
  });
});
