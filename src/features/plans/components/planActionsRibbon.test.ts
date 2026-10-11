import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { t } from "@/i18n/ar";

/** v1.4 part 3 — D29 R15 / D31f: «إلغاء الاتفاقية» is secondary; the dues ribbon is a phone grid. */
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => undefined }) }));
vi.mock("@/features/plans/actions", () => ({ archivePlan: async () => ({ ok: true }), cancelPlan: async () => ({ ok: true }) }));

const { PlanActions } = await import("./PlanActions");
const { RIBBON_LIST, WeekRibbon } = await import("@/features/dues/components/WeekRibbon");

describe("PlanActions (R15)", () => {
  it("the cancel button is secondary — no danger look", () => {
    const html = renderToStaticMarkup(createElement(PlanActions, { planId: "plan_1", canCancel: true }));
    const button = new RegExp(`<button [^>]*>${t.plans.cancel}</button>`).exec(html)?.[0] ?? "";
    expect(button).not.toBe("");
    expect(button).not.toMatch(/\bbg-money-out\b/);
    expect(button).toMatch(/\bbg-white\b/);
    expect(html).toContain("<dialog");
  });
});

describe("WeekRibbon (R15, D31f)", () => {
  const totals = { count: 1, inHalalas: 1000, outHalalas: 0 };
  const html = renderToStaticMarkup(
    createElement(WeekRibbon, {
      overdue: { count: 0, inHalalas: 0, outHalalas: 0 },
      days: [
        { date: "2026-10-11", isToday: true, ...totals },
        { date: "2026-10-12", isToday: false, count: 0, inHalalas: 0, outHalalas: 0 },
      ],
    }),
  );

  it("the list is a two-column grid on phones and the snap strip from sm", () => {
    expect(RIBBON_LIST).toMatch(/^grid grid-cols-2 gap-2\b/);
    expect(RIBBON_LIST).toMatch(/\bsm:flex\b/);
    expect(RIBBON_LIST).toMatch(/\bsm:snap-x\b/);
    expect(RIBBON_LIST).toMatch(/\bsm:overflow-x-auto\b/);
    expect(RIBBON_LIST).not.toMatch(/(^| )(flex|snap-x|overflow-x-auto)( |$)/);
    expect(/<ul [^>]*>/.exec(html)?.[0]).toContain(`class="${RIBBON_LIST}"`);
  });

  it("tiles are full-width on phones and w-36 from sm; items snap only from sm", () => {
    expect(html).toMatch(/class="flex h-full w-full flex-col rounded-lg border bg-white p-2\.5 sm:w-36 /);
    expect(html).not.toMatch(/(^|[" ])w-36 /);
    expect(html).toMatch(/<li class="sm:shrink-0 sm:snap-start">/);
    expect(html).not.toMatch(/<li class="shrink-0 snap-start">/);
  });
});
