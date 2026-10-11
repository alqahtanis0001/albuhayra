import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { t } from "@/i18n/ar";

import { OwnerStatCards } from "./OwnerStatCards";

/**
 * v1.4 part 3 (docs/V14-SPEC.md D29 R15): the home «الصافي» card — and only
 * that card — carries the helper «الوارد − الصادر هذا الشهر».
 */
describe("OwnerStatCards (R15)", () => {
  it("the net hint appears exactly once, inside the «الصافي» card", () => {
    const out = renderToStaticMarkup(
      createElement(OwnerStatCards, {
        balanceTotalHalalas: 120000,
        monthNetHalalas: -70000,
        monthInHalalas: 50000,
        monthOutHalalas: 120000,
        prevMonthToDateNetHalalas: 0,
        daily30: [
          { date: "2026-10-09", balanceHalalas: 100000, inHalalas: 0, outHalalas: 0 },
          { date: "2026-10-10", balanceHalalas: 120000, inHalalas: 50000, outHalalas: 120000 },
        ],
      }),
    );
    expect(out.split(t.dashboard.monthNetHint).length - 1).toBe(1);
    const net = out.indexOf(t.dashboard.monthNet);
    const next = out.indexOf(t.dashboard.monthIn);
    const hint = out.indexOf(t.dashboard.monthNetHint);
    expect(net).toBeLessThan(hint);
    expect(hint).toBeLessThan(next);
  });
});
