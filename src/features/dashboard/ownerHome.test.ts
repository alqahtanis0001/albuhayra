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
  getOwnerOverview: async (_establishmentId: string, today: string) => (seen.overviewToday.push(today), {
    commitments: { toUsHalalas: 950_000, fromUsHalalas: 420_000, salariesHalalas: 1_200_000 },
    dial: [{ instalmentId: "s1", planId: "ps", employeeId: "e1", partyName: "سعد", kind: "SALARY", remainingHalalas: 1_200_000, dueDate: "2026-10-15", dayOffset: 4 }],
    overdue: { recent: [], count: 0, totalHalalas: 0 },
  }),
}));
const seen = vi.hoisted(() => ({ overviewToday: [] as string[], duesToday: [] as string[] }));
vi.mock("@/features/plans/dues", () => ({
  getDues: async (_establishmentId: string, today: string) => (seen.duesToday.push(today), {
    today: "2026-10-11", weekEnd: "2026-10-17", overdue: [], thisWeek: [],
    totals: { overdueInHalalas: 0, overdueOutHalalas: 0, weekInHalalas: 0, weekOutHalalas: 0 }, hasPlans: true,
  }),
}));
// H27 (D43): one active project, so الأنشطة الجارية renders and its place is pinned.
vi.mock("@/features/projects/queries", () => ({
  topActiveProjects: async () => [
    { id: "pr1", name: "فرع جديد", status: "ACTIVE", budgetHalalas: 100_000, spentHalalas: 40_000, incomeHalalas: 0, remainingHalalas: 60_000, startDate: "2026-10-01", endDate: null, transactionCount: 2 },
  ],
}));
vi.mock("@/features/establishments/queries", () => ({ listPendingStaffNames: async () => ["نورة"] }));

// H27 (D43): the details wrapper is swapped for a marked <div>, so the test can tell what sits inside it.
vi.mock("@/features/dashboard/components/HomeDetails", async () => {
  const { createElement } = await import("react");
  return { HomeDetails: ({ children }: { children: unknown }) => createElement("div", { id: "DETAILS" }, children as never) };
});

const { default: OwnerHomePage } = await import("@/app/(owner)/owner/page");

/** The inner HTML of `<div id="…">`, by depth counting. */
function divById(html: string, id: string): string {
  const start = html.indexOf(`<div id="${id}">`);
  if (start < 0) return "";
  const re = /<div\b|<\/div>/g;
  re.lastIndex = start + 1;
  let depth = 1;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    depth += m[0] === "</div>" ? -1 : 1;
    if (depth === 0) return html.slice(start, m.index);
  }
  return "";
}

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
      '<div id="DETAILS">',
      `>${t.dashboard.last6Months}</h2>`,
      `>${t.dashVisual.donutTitle}</h2>`,
      `>${t.dashboard.balanceByMethod}</h2>`,
      `>${t.projects.activeOnHome}</h2>`,
    ].map((s) => html.indexOf(s));
    expect(at.every((i) => i >= 0), JSON.stringify(at)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    // The three retired pieces are gone; their content lives in «يحتاج انتباهك».
    expect(html).not.toContain(t.dues.thisWeek);
    expect(html).toContain("طلب انضمام من نورة");
    expect(html).toContain("الرواتب بعد 4 أيام");
  });

  it("H27: «التفاصيل والرسوم» holds exactly the six-month card, the donut, balance by method and الأنشطة الجارية", async () => {
    const html = renderToStaticMarkup(await OwnerHomePage());
    const inside = divById(html, "DETAILS");
    for (const title of [t.dashboard.last6Months, t.dashVisual.donutTitle, t.dashboard.balanceByMethod, t.projects.activeOnHome]) {
      expect(inside, title).toContain(`>${title}</h2>`);
    }
    for (const title of [t.wheel.title, t.attention.title, t.dashboard.recent]) expect(inside, title).not.toContain(title);
  });

  it("the recent list links «عرض الكل» to the ledger", async () => {
    const html = renderToStaticMarkup(await OwnerHomePage());
    expect(html).toMatch(new RegExp(`<a [^>]*href="/owner/transactions"[^>]*>${t.homeDetails.viewAll}</a>`));
  });

  it("the overview read and the dues read receive the same today", async () => {
    seen.overviewToday.length = 0;
    seen.duesToday.length = 0;
    await OwnerHomePage();
    expect(seen.overviewToday).toHaveLength(1);
    expect(seen.overviewToday[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(seen.duesToday).toEqual(seen.overviewToday);
  });
});

describe("D32 (static)", () => {
  // D21's counts are pinned at the call in recentCounts.test.ts (D43: no source-text regex here).
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

describe("D42 (N12): «عرض الكل» only over a list", () => {
  it("an empty «آخر الحركات» has no «عرض الكل»; with rows it links the ledger", async () => {
    const { RecentTransactions } = await import("./components/RecentTransactions");
    const { createElement } = await import("react");
    const empty = renderToStaticMarkup(createElement(RecentTransactions, { rows: [], viewAllHref: "/owner/transactions" }));
    expect(empty).not.toContain(t.homeDetails.viewAll);
    const full = renderToStaticMarkup(createElement(RecentTransactions, { rows: [ROW as never], viewAllHref: "/owner/transactions" }));
    expect(full).toContain(`>${t.homeDetails.viewAll}</a>`);
  });
});
