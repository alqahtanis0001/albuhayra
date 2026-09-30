/**
 * v1.3 item 12: the payslip's top card (server component) — the net large,
 * then gross → − deductions → net as three labelled rows, each with a bar
 * (hand-written SVG, `payslipSteps`). The labels and amounts are the text;
 * the bars are decoration (`aria-hidden`, `no-print`), so print shows the
 * hero as plain numbers. Net is the slip's own `netHalalas`. No grey track:
 * the gross bar is grey, and grey on greySoft fails 3:1.
 */
import { Card } from "@/components/Card";
import { MoneyText } from "@/components/MoneyText";
import { PALETTE } from "@/components/visualPalette";
import type { Payslip } from "@/features/employees/payslip";
import { t } from "@/i18n/ar";

import { payslipSteps, type PayslipStep } from "./payslipSteps";

const FILL: Record<PayslipStep["key"], string> = { gross: PALETTE.grey, deductions: PALETTE.out, net: PALETTE.green };
const LABEL: Record<PayslipStep["key"], string> = {
  gross: t.payslipHero.gross,
  deductions: t.payslipHero.deductions,
  net: t.payslipHero.net,
};

/** A bar measured from the inline start: mirrored into SVG x for RTL. */
function Bar({ step }: { step: PayslipStep }) {
  return (
    <svg viewBox="0 0 100 8" preserveAspectRatio="none" className="no-print h-2 w-full" aria-hidden="true" focusable="false">
      {step.widthPct > 0 ? (
        <rect
          className="v13-grow-inline"
          x={100 - step.startPct - step.widthPct}
          y="0"
          width={step.widthPct}
          height="8"
          fill={FILL[step.key]}
        />
      ) : null}
    </svg>
  );
}

export function PayslipHero({ slip }: { slip: Payslip }) {
  const steps = payslipSteps(slip.grossHalalas, slip.deductionsHalalas, slip.netHalalas);
  return (
    <Card className="report-card">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">{t.payslipHero.net}</span>
          <MoneyText halalas={slip.netHalalas} className="text-3xl font-semibold" />
        </div>
        <section aria-label={t.payslipHero.stepsLabel} className="flex flex-col gap-3">
          {steps.map((s) => (
            <div key={s.key} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className={s.key === "net" ? "font-semibold text-gray-900" : "text-gray-700"}>{LABEL[s.key]}</span>
                {s.key === "deductions" ? (
                  <MoneyText halalas={s.halalas} direction="OUT" />
                ) : (
                  <MoneyText halalas={s.halalas} />
                )}
              </div>
              <Bar step={s} />
            </div>
          ))}
        </section>
      </div>
    </Card>
  );
}

export default PayslipHero;
