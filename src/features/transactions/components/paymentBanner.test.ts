import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { periodLabel } from "@/features/plans/components/PlanBits";
import { t } from "@/i18n/ar";

import { isSalaryPayment, PaymentBanner, upcomingHalalas, type PaymentBannerProps } from "./PaymentBanner";

/**
 * v1.4 part 3 — D29 R6 / D31i: a salary month (periodYm set) is worded as a
 * salary — never «القسط n», never «المتبقي على الاتفاقية»; a STANDARD
 * instalment and the staff banner (no plan) read exactly as before.
 */
const common = { direction: "OUT" as const, partyId: "party_1", partyName: "سعد", instalmentId: "i_1", instalmentRemainingHalalas: 400000 };
const salary: PaymentBannerProps = {
  ...common, mode: "new", plan: { planId: "plan_s", planTitle: "راتب شهري — سعد", seq: 3, periodYm: "2026-10", planRemainingHalalas: 1200000 },
};
const standard: PaymentBannerProps = {
  ...common, mode: "new", plan: { planId: "plan_1", planTitle: "عقد", seq: 2, periodYm: null, planRemainingHalalas: 900000 },
};
const render = (props: PaymentBannerProps) => renderToStaticMarkup(createElement(PaymentBanner, props));

describe("PaymentBanner — salary wording (R6)", () => {
  it("a salary month says «راتب شهر {month} — {name}», «المتبقي من راتب الشهر», «الرواتب القادمة» = plan − month", () => {
    const html = render(salary);
    expect(html).toContain(t.payment.salaryTitle.replace("{month}", periodLabel("2026-10")).replace("{name}", "سعد"));
    expect(html).toContain("أكتوبر 2026");
    expect(html).toContain(t.payment.salaryRemaining);
    expect(html).toContain(t.payment.upcomingSalaries);
    expect(html).toContain("8,000.00"); // 1,200,000 − 400,000 halalas
    expect(html).toContain(t.payment.salaryRollsOver);
    expect(html).not.toContain("القسط");
    expect(html).not.toContain(t.payment.planRemaining);
    expect(html).not.toContain(t.payment.remaining);
    expect(html).not.toContain(t.payment.rollsOver);
  });

  it("«الرواتب القادمة» is omitted when nothing remains beyond this month", () => {
    const last = render({ ...salary, plan: { ...salary.plan!, planRemainingHalalas: 400000 } });
    expect(last).not.toContain(t.payment.upcomingSalaries);
    expect(upcomingHalalas(1200000, 400000)).toBe(800000);
    expect(upcomingHalalas(400000, 400000)).toBeNull();
    expect(upcomingHalalas(300000, 400000)).toBeNull();
  });

  it("a STANDARD instalment keeps «القسط n من …», «المتبقي على هذا القسط» and «المتبقي على الاتفاقية»", () => {
    const html = render(standard);
    expect(html).toContain(t.payment.forInstalment.replace("{seq}", "2").replace("{title}", "عقد"));
    expect(html).toContain(t.payment.remaining);
    expect(html).toContain(t.payment.planRemaining);
    expect(html).toContain(t.payment.rollsOver);
    expect(html).not.toContain(t.payment.salaryRemaining);
    expect(html).not.toContain(t.payment.upcomingSalaries);
  });

  it("the staff banner (no plan) is generic (D31i), and the mode is derived from periodYm", () => {
    const staff = render({ ...common, mode: "new" });
    expect(staff).toContain(t.payment.remaining);
    expect(staff).toContain(t.payment.rollsOver);
    expect(staff).not.toContain(t.payment.salaryRemaining);
    expect(isSalaryPayment(salary)).toBe(true);
    expect(isSalaryPayment(standard)).toBe(false);
    expect(isSalaryPayment({ ...common, mode: "new" })).toBe(false);
    expect(isSalaryPayment({ direction: "OUT", partyId: "p", partyName: "n", mode: "edit" })).toBe(false);
  });
});
