/**
 * v1.3 item 12 (docs/V13-SPEC.md) — the payslip hero's three steps, pure.
 * gross (full bar from the start) → − deductions (the slice from gross −
 * deductions up to gross) → net (from the start). Net is the slip's
 * `netHalalas` (the instalment's amount due), never recomputed here.
 * Positions are % of the widest value, measured from the inline start; the
 * SVG mirrors them for RTL.
 */
export type PayslipStep = {
  key: "gross" | "deductions" | "net";
  halalas: number;
  /** Offset from the inline start, % of the scale. */
  startPct: number;
  widthPct: number;
};

const pct = (part: number, whole: number) => Math.round((part / whole) * 10_000) / 100;

export function payslipSteps(grossHalalas: number, deductionsHalalas: number, netHalalas: number): PayslipStep[] {
  const scale = Math.max(grossHalalas, netHalalas, 1);
  const deductionStart = Math.max(0, grossHalalas - deductionsHalalas);
  return [
    { key: "gross", halalas: grossHalalas, startPct: 0, widthPct: pct(grossHalalas, scale) },
    {
      key: "deductions",
      halalas: deductionsHalalas,
      startPct: pct(deductionStart, scale),
      widthPct: pct(grossHalalas - deductionStart, scale),
    },
    { key: "net", halalas: netHalalas, startPct: 0, widthPct: pct(Math.max(0, netHalalas), scale) },
  ];
}
