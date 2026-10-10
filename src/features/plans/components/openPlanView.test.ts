import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { PlanStatus } from "@/lib/instalments";
import { PaymentMethodEnum } from "@/lib/validation";

import { METHODS, payable, pickRows, planHref, progressOf, recordedHref } from "./openPlanView";
import { PlanFilters } from "./PlanFilters";

/** v1.4 C3 / C6 / P11: the open agreement's view rules, without a DOM. */
describe("v1.4: progressOf", () => {
  it("is null without a ceiling", () => {
    expect(progressOf(500, null)).toBeNull();
    expect(progressOf(0, 0)).toBeNull();
  });

  it("green below 80 %, gold from 80 %, full at 100 % — the spec's boundaries", () => {
    expect(progressOf(0, 1000)).toEqual({ pct: 0, tone: "green" });
    expect(progressOf(799, 1000)).toEqual({ pct: 79, tone: "green" });
    expect(progressOf(800, 1000)).toEqual({ pct: 80, tone: "gold" });
    expect(progressOf(999, 1000)).toEqual({ pct: 99, tone: "gold" });
    expect(progressOf(1000, 1000)).toEqual({ pct: 100, tone: "full" });
  });

  it("caps at 100 when over-received (P14) and floors a fraction", () => {
    expect(progressOf(1500, 1000)).toEqual({ pct: 100, tone: "full" });
    expect(progressOf(1, 3)).toEqual({ pct: 33, tone: "green" });
  });
});

describe("v1.4: pick-mode links and the payable filter", () => {
  it("planHref: plain outside pick mode; #pay for an open card, #instalments for a scheduled one in it", () => {
    expect(planHref({ id: "p1", kind: "OPEN_ENDED" }, false)).toBe("/owner/plans/p1");
    expect(planHref({ id: "p1", kind: "OPEN_ENDED" }, true)).toBe("/owner/plans/p1#pay");
    expect(planHref({ id: "p2", kind: "STANDARD" }, true)).toBe("/owner/plans/p2#instalments");
  });

  it("payable: open statuses only", () => {
    expect(["UPCOMING", "ACTIVE"].map((s) => payable(s as never))).toEqual([true, true]);
    expect(["COMPLETED", "ARCHIVED", "CANCELLED"].map((s) => payable(s as never))).toEqual([false, false, false]);
  });

  it("pickRows (the list page's filter): pick mode keeps the payable rows only; outside it every row stays, in order", () => {
    const rows = (["ACTIVE", "COMPLETED", "UPCOMING", "ARCHIVED", "CANCELLED"] as PlanStatus[]).map((status, i) => ({ id: `p${i}`, status }));
    expect(pickRows(rows, true).map((r) => r.id)).toEqual(["p0", "p2"]);
    expect(pickRows(rows, false)).toBe(rows);
    expect(pickRows([], true)).toEqual([]);
  });

  it("PlanFilters carries ?pick=payment through the form (hidden input) and the clear link, and only then", () => {
    const html = (pick: boolean) => renderToStaticMarkup(createElement(PlanFilters, { filter: { status: "ACTIVE" }, parties: [], pick }));
    const picking = html(true);
    expect(picking).toContain('name="pick"');
    expect(picking).toContain('value="payment"');
    expect(picking).toContain('href="/owner/plans?pick=payment"');
    const plain = html(false);
    expect(plain).not.toContain('name="pick"');
    expect(plain).not.toContain("pick=payment");
    expect(plain).toContain('href="/owner/plans"');
  });

  it("recordedHref carries the payment id and closed=1 only on an auto-close", () => {
    expect(recordedHref("p1", "tx 1", false)).toBe("/owner/plans/p1?paid=tx%201");
    expect(recordedHref("p1", "tx1", true)).toBe("/owner/plans/p1?paid=tx1&closed=1");
  });
});

describe("v1.4: the payment form's method list", () => {
  it("mirrors PaymentMethodEnum exactly (the form avoids the validation bundle on purpose)", () => {
    expect([...METHODS]).toEqual(PaymentMethodEnum.options);
  });
});
