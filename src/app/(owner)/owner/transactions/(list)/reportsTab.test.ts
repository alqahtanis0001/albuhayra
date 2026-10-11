import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { t } from "@/i18n/ar";

/**
 * v1.5 (docs/V15-SPEC.md B2, D14, D24): /owner/transactions?tab=reports — the
 * third ledger tab holds the two reports, unchanged: the category report by
 * default, the aging report with `&report=aging`; «طباعة» and «تصدير Excel»
 * (same export URL) stay; exactly one heading prints; no ledger read runs.
 */
const h = vi.hoisted(() => ({ reads: [] as string[], aging: null as unknown }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("next/navigation", () => ({ usePathname: () => "/owner/transactions" }));
vi.mock("@/lib/auth", () => ({
  requireOwner: async () => ({
    user: { id: "owner_1", role: "OWNER", canEdit: true, establishmentName: "منشأة النور" },
    establishmentId: "est_1",
  }),
}));
vi.mock("@/features/transactions/queries", () => ({
  listTransactions: async () => (
    h.reads.push("listTransactions"),
    { rows: [], total: 0, filterTotals: { inHalalas: 0, outHalalas: 0, netHalalas: 0 } }
  ),
}));
vi.mock("@/features/settings/queries", () => ({ listCategories: async () => (h.reads.push("listCategories"), []) }));
vi.mock("@/features/locks/queries", () => ({ listLocks: async () => (h.reads.push("listLocks"), []) }));
vi.mock("@/features/projects/queries", () => ({ listProjects: async () => (h.reads.push("listProjects"), []) }));
vi.mock("@/features/parties/queries", () => ({ listPartyOptions: async (id: string) => (h.reads.push(`listPartyOptions:${id}`), []) }));
vi.mock("@/features/reports/queries", () => ({
  getReport: async (id: string, from: string, to: string) => (
    h.reads.push(`getReport:${id}:${from}:${to}`),
    { from, to, inRows: [], outRows: [], totalIn: 0, totalOut: 0, net: 0, party: undefined }
  ),
}));
vi.mock("@/features/payroll/generate", () => ({ ensureSalaryInstalments: async (id: string) => void h.reads.push(`ensure:${id}`) }));
vi.mock("@/features/reports/aging", () => ({ getAgingReport: async (id: string) => (h.reads.push(`aging:${id}`), h.aging) }));
vi.mock("@/features/reports/components/ReportTables", () => ({ ReportTables: () => createElement("table", { id: "category-report" }) }));
vi.mock("@/features/reports/components/AgingTable", () => ({
  AgingTable: ({ title }: { title: string }) => createElement("table", { "data-aging": title }),
}));

const { default: OwnerLedgerPage, generateMetadata } = await import("./page");

const side = (n: number) => ({
  rows: Array.from({ length: n }, (_, i) => ({ partyId: `p${i}`, partyName: "x", upTo30: 1, upTo60: 0, upTo90: 0, over90: 0, total: 1 })),
  totals: { upTo30: n, upTo60: 0, upTo90: 0, over90: 0, total: n },
  counts: { upTo30: n, upTo60: 0, upTo90: 0, over90: 0, total: n },
});

async function page(params: Record<string, string>): Promise<string> {
  return renderToStaticMarkup(await OwnerLedgerPage({ searchParams: Promise.resolve(params) }));
}

const strip = (html: string, label: string) => {
  const nav = new RegExp(`<nav aria-label="${label}"[^>]*>([\\s\\S]*?)</nav>`).exec(html)?.[1] ?? "";
  return [...nav.matchAll(/<a ([^>]*)href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map((m) => ({
    href: m[2]!.replaceAll("&amp;", "&"),
    label: m[3],
    current: m[1]!.includes('aria-current="page"'),
  }));
};

describe("السجل › التقارير", () => {
  beforeEach(() => {
    h.reads = [];
    h.aging = { today: "2026-10-11", toUs: side(1), fromUs: side(0) };
  });

  it("the ledger strip has three tabs, التقارير current; the sub-tab strip shows «حسب التصنيف» by default", async () => {
    const html = await page({ tab: "reports" });
    expect(strip(html, t.ledger.title)).toEqual([
      { href: "/owner/transactions", label: t.ledgerTabs.entries, current: false },
      { href: "/owner/transactions?tab=activities", label: t.ledgerTabs.activities, current: false },
      { href: "/owner/transactions?tab=reports", label: t.reportsTabs.tab, current: true },
    ]);
    expect(strip(html, t.reportsTabs.label).map((s) => [s.label, s.current])).toEqual([
      [t.reportFilter.byCategoryTab, true],
      [t.aging.tab, false],
    ]);
    expect(html).toContain('id="category-report"');
    expect(html).not.toContain("data-aging");
  });

  it("the category report keeps its filters (GET, staying on the tab), «تصدير Excel» with the same export URL, and «طباعة»", async () => {
    const html = await page({ tab: "reports", from: "2026-09-01", to: "2026-09-30" });
    expect(/<form [^>]*>/.exec(html)?.[0]).toMatch(/action="\/owner\/transactions"/);
    expect(html).toContain('<input type="hidden" name="tab" value="reports"/>');
    expect(html).toMatch(new RegExp(`<a href="/api/export\\?from=2026-09-01&amp;to=2026-09-30"[^>]*>${t.common.exportExcel}</a>`));
    expect(html.match(new RegExp(`>${t.common.print}<`, "g"))).toHaveLength(1);
    expect(h.reads).toContain("getReport:est_1:2026-09-01:2026-09-30");
  });

  it("report=aging renders the aging report (after the salary rows), with «طباعة»", async () => {
    const html = await page({ tab: "reports", report: "aging" });
    expect(strip(html, t.reportsTabs.label).map((s) => s.current)).toEqual([false, true]);
    expect(html).toContain(`data-aging="${t.aging.toUs}"`);
    expect(html).toContain(`data-aging="${t.aging.fromUs}"`);
    expect(html).not.toContain('id="category-report"');
    expect(html).toContain(`>${t.common.print}<`);
    expect(html).toContain(t.aging.printTitle);
    expect(h.reads).toEqual(["ensure:est_1", "aging:est_1"]);
  });

  it("an empty aging report shows its empty state and no print button", async () => {
    h.aging = { today: "2026-10-11", toUs: side(0), fromUs: side(0) };
    const html = await page({ tab: "reports", report: "aging" });
    expect(html).toContain(t.aging.empty);
    expect(html).not.toContain(`>${t.common.print}<`);
  });

  it("D24: the ledger h1 is no-print, exactly one print header, the add button is «حركة جديدة»; no ledger read runs", async () => {
    for (const params of [{ tab: "reports" }, { tab: "reports", report: "aging" }] as Array<Record<string, string>>) {
      h.reads = [];
      const html = await page(params);
      expect(html).toContain(`<h1 class="no-print text-xl font-semibold text-gray-900">${t.ledger.title}</h1>`);
      expect(html.match(/<header class="print-only"/g)).toHaveLength(1);
      expect(html.match(/report-print-footer/g)).toHaveLength(1);
      expect(html).toMatch(new RegExp(`<a class="[^"]*" href="/owner/transactions/new">[\\s\\S]*?${t.addSheet.newEntry}</a>`));
      expect(h.reads.some((r) => /^(listTransactions|listCategories|listLocks|listProjects)/.test(r))).toBe(false);
    }
  });

  it("the entries tab is unchanged: its h1 prints, «إضافة حركة», one print header", async () => {
    const html = await page({});
    expect(html).toContain(`<h1 class="text-xl font-semibold text-gray-900">${t.ledger.title}</h1>`);
    expect(html).toContain(t.transaction.addButton);
    expect(html.match(/<header class="print-only"/g)).toHaveLength(1);
    expect(strip(html, t.ledger.title).map((s) => s.current)).toEqual([true, false, false]);
  });

  it("metadata title per tab", async () => {
    const title = async (p: Record<string, string>) => (await generateMetadata({ searchParams: Promise.resolve(p) })).title;
    expect(await title({ tab: "reports" })).toBe(t.reports.title);
    expect(await title({ tab: "reports", report: "aging" })).toBe(t.aging.title);
    expect(await title({ tab: "activities" })).toBe(t.projects.listTitle);
    expect(await title({ report: "aging" })).toBe(t.ledger.title);
  });
});
