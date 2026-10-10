import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { Dues } from "@/features/plans/dues";
import { t } from "@/i18n/ar";

// DueRows reaches the reminder action, which is server-only; nothing here calls it.
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const { OverdueStrip, WeekDues } = await import("./WeekDues");

/**
 * v1.4 (docs/V14-SPEC.md D17 c9): «مستحقات هذا الأسبوع» is hidden on the owner
 * home until the establishment has a plan at all; once it has one, an empty
 * week still shows the card with its empty state, as before.
 */
function dues(hasPlans: boolean): Dues {
  return {
    today: "2026-10-10",
    weekEnd: "2026-10-16",
    overdue: [],
    thisWeek: [],
    totals: { overdueInHalalas: 0, overdueOutHalalas: 0, weekInHalalas: 0, weekOutHalalas: 0 },
    hasPlans,
  };
}

describe("WeekDues on the owner home (c9)", () => {
  it("renders nothing while there is no plan", () => {
    expect(renderToStaticMarkup(createElement(WeekDues, { dues: dues(false) }))).toBe("");
  });

  it("with a plan and no dues this week, shows the card with the existing empty state", () => {
    const html = renderToStaticMarkup(createElement(WeekDues, { dues: dues(true) }));
    expect(html).toContain(t.dues.thisWeek);
    expect(html).toContain(t.dues.empty);
    expect(html).toContain('href="/owner/dues"');
  });

  it("the overdue strip keeps hiding itself on its own rule (nothing overdue)", () => {
    expect(renderToStaticMarkup(createElement(OverdueStrip, { dues: dues(true) }))).toBe("");
  });
});
