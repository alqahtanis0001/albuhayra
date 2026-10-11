import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { t } from "@/i18n/ar";

/**
 * v1.5 (docs/V15-SPEC.md A home order, A4, D21, D32): the owner home renders,
 * with every read mocked, in exactly the spec's order; the recent list is five
 * with «عرض الكل»; the staff list stays ten; recharts' greys are token props.
 */

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => undefined }), usePathname: () => "/owner" }));
vi.mock("@/lib/auth", () => ({ requireOwner: async () => ({ establishmentId: "est_1" }) }));
vi.mock("@/features/payroll/generate", () => ({ ensureSalaryInstalments: async () => undefined }));

const ROW = {
  id: "tx1", date: "2026-10-10", direction: "IN", amountHalalas: 50_000, categoryNameAr: "مبيعات",
  paymentMethod: "CASH", partyName: null, counterparty: null, createdByName: "مالك",
};

vi.mock("@/features/dashboard/queries", () => ({
  getOwnerDashboard: async () => ({
    balanceTotalHalalas: 1_245_000,
    balanceByMethod: [{ method: "CASH", balanceHalalas: 1_245_000 }],
    monthInHalalas: 820_000,
    monthOutHalalas: 510_000,
    monthNetHalalas: 310_000,
    topOutCategories: [{ categoryId: "c1", nameAr: "إيجار", totalHalalas: 300_000 }],
    last6Months: [{ ym: "2026-10", inHalalas: 820_000, outHalalas: 510_000, openingBalanceHalalas: 935_000 }],
    recent: [ROW],
    daily30: [{ date: "2026-10-10", inHalalas: 0, outHalalas: 0, balanceHalalas: 1_245_000 }],
    prevMonthToDateNetHalalas: 276_786,
    firstRun: { hasEntry: true, hasParty: false, hasPlan: false, hasEmployee: false },
  }),
}));
vi.mock("@/features/dashboard/overviewReads", () => ({
  getOwnerOverview: async () => ({
    commitments: { toUsHalalas: 950_000, fromUsHalalas: 420_000, salariesHalalas: 1_200_000 },
    dial: [{ instalmentId: "s1", planId: "ps", employeeId: "e1", partyName: "سعد", kind: "SALARY", remainingHalalas: 1_200_000, dueDate: "2026-10-15", dayOffset: 4 }],
    overdue: { recent: [], count: 0, totalHalalas: 0 },
  }),
}));
vi.mock("@/features/plans/dues", () => ({
  getDues: async () => ({
    today: "2026-10-11", weekEnd: "2026-10-17", overdue: [], thisWeek: [],
    totals: { overdueInHalalas: 0, overdueOutHalalas: 0, weekInHalalas: 0, weekOutHalalas: 0 }, hasPlans: true,
  }),
}));
vi.mock("@/features/projects/queries", () => ({ topActiveProjects: async () => [] }));
vi.mock("@/features/establishments/queries", () => ({ listPendingStaffNames: async () => ["نورة"] }));

const { default: OwnerHomePage } = await import("@/app/(owner)/owner/page");

describe("the owner home (v1.5 order)", () => {
  it("quick actions → first-run → money cards → wheel → يحتاج انتباهك → آخر الحركات → التفاصيل والرسوم", async () => {
    const html = renderToStaticMarkup(await OwnerHomePage());
    const at = [
      `aria-label="${t.quickActions.title}"`,
      t.firstRun.title,
      t.dashboard.balanceTotal,
      t.wheel.title,
      t.attention.title,
      t.dashboard.recent,
      t.homeDetails.title,
      `>${t.dashboard.last6Months}</h2>`,
      `>${t.dashVisual.donutTitle}</h2>`,
      `>${t.dashboard.balanceByMethod}</h2>`,
    ].map((s) => html.indexOf(s));
    expect(at.every((i) => i >= 0), JSON.stringify(at)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    // The three retired pieces are gone; their content lives in «يحتاج انتباهك».
    expect(html).not.toContain(t.dues.thisWeek);
    expect(html).toContain("طلب انضمام من نورة");
    expect(html).toContain("الرواتب بعد 4 أيام");
  });

  it("the recent list links «عرض الكل» to the ledger", async () => {
    const html = renderToStaticMarkup(await OwnerHomePage());
    expect(html).toMatch(new RegExp(`<a [^>]*href="/owner/transactions"[^>]*>${t.homeDetails.viewAll}</a>`));
  });

  it("the page source: the overview read takes the same today as the dues", () => {
    const page = readFileSync("src/app/(owner)/owner/page.tsx", "utf8");
    expect(page).toMatch(/getOwnerOverview\(establishmentId, today\)/);
    expect(page).toMatch(/getDues\(establishmentId, today\)/);
    expect(page).toMatch(/listPendingStaffNames\(establishmentId\)/);
  });
});

describe("D21 and D32 (static)", () => {
  it("owner recent = 5, staff recent stays 10", () => {
    const source = readFileSync("src/features/dashboard/queries.ts", "utf8");
    expect(source).toMatch(/export const OWNER_RECENT_COUNT = 5;/);
    expect(source).toMatch(/export const RECENT_COUNT = 10;/);
    expect(source).toMatch(/recentTransactions\(establishmentId, OWNER_RECENT_COUNT\)/);
    expect(source).toMatch(/recentTransactions\(establishmentId, RECENT_COUNT, \{ createdById: userId \}/);
  });

  it("SixMonthChart passes token colours to grid, axes, ticks, tooltip box and cursor; the donut's stroke is a token", () => {
    const chart = readFileSync("src/features/dashboard/components/SixMonthChart.tsx", "utf8");
    expect(chart).toMatch(/<CartesianGrid [^>]*stroke=\{CHART_TOKENS\.grid\}/);
    expect(chart.match(/tick=\{CHART_TOKENS\.tick\}/g)).toHaveLength(2);
    expect(chart.match(/stroke=\{CHART_TOKENS\.axis\}/g)).toHaveLength(2);
    for (const prop of ["contentStyle={CHART_TOKENS.tooltipBox}", "cursor={CHART_TOKENS.cursor}"]) {
      expect(chart).toContain(prop);
    }
    expect(chart).toMatch(/grid: "var\(--color-chart-grid\)"/);
    expect(chart).toMatch(/axis: "var\(--color-gray-500\)"/);
    expect(chart).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    const donut = readFileSync("src/features/dashboard/components/ExpenseDonut.tsx", "utf8");
    expect(donut).toContain('stroke="var(--color-white)"');
  });
});
