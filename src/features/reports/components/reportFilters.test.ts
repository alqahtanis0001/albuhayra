import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { t } from "@/i18n/ar";

import { ReportFilters, type ReportFiltersRange } from "./ReportFilters";
import { afterDateTyped, afterMonthChoice, monthOptions, monthRange } from "./reportMonths";
import { ReportTabs } from "./ReportTabs";

/**
 * v1.4 part 3 — D29 R11 / D31c / D32 B1: one GET form with one «عرض»; a month
 * choice fills the dates, a typed date selects «فترة مخصصة»; the client leaf
 * never imports the validation barrel; the report renders above the filters
 * on phones.
 */
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({
  requireOwner: async () => ({ user: { id: "owner_1", role: "OWNER", establishmentName: "منشأة" }, establishmentId: "est_1" }),
}));
vi.mock("@/features/parties/queries", () => ({ listPartyOptions: async () => [] }));
vi.mock("@/features/reports/queries", () => ({
  getReport: async () => ({ from: "2026-10-01", to: "2026-10-31", inRows: [], outRows: [], totalIn: 0, totalOut: 0, net: 0, party: undefined }),
}));
vi.mock("@/features/reports/components/ReportTables", () => ({ ReportTables: () => createElement("table", { id: "report" }) }));

const { default: OwnerReportsPage } = await import("@/app/(owner)/owner/reports/(summary)/page");

const RANGE: ReportFiltersRange = { from: "2026-10-01", to: "2026-10-31", month: "2026-10" };
const render = (range = RANGE, partyId = "") =>
  renderToStaticMarkup(
    createElement(ReportFilters, { range, basePath: "/owner/reports", parties: [{ id: "p1", name: "محمد", active: true }], partyId }),
  );

describe("ReportFilters (R11)", () => {
  it("is one GET form with exactly one submit, labelled «عرض»", () => {
    const html = render();
    expect(html.match(/<form/g)).toHaveLength(1);
    const form = /<form [^>]*>/.exec(html)?.[0] ?? "";
    expect(form).toMatch(/\bmethod="get"/);
    expect(form).toMatch(/\baction="\/owner\/reports"/);
    expect(html.match(/type="submit"/g)).toHaveLength(1);
    expect(html).toContain(`>${t.common.apply}</button>`);
  });

  it("carries month, from, to and partyId as fields; «فترة مخصصة» is the empty option on top", () => {
    const html = render();
    for (const name of ["month", "from", "to", "partyId"]) expect(html).toContain(`name="${name}"`);
    expect(html).toMatch(new RegExp(`<select [^>]*name="month"[^>]*><option value="">${t.reports.customRange}</option><option value="2026-10"`));
    expect(html).toContain(t.reportFilter.allParties);
    expect(html).toContain("محمد");
  });

  it("a custom range starts with month «» and the rejected dates echoed, with the error under «إلى»", () => {
    const html = render({ from: "2026-10-01", to: "2026-10-31", month: null, rejected: { from: "2026-01-01", to: "2027-12-31", toError: "err.rangeTooLong" } });
    expect(html).toMatch(/<input [^>]*name="from"[^>]*value="2026-01-01"/);
    expect(html).toMatch(/<input [^>]*name="to"[^>]*value="2027-12-31"/);
    // React's static markup writes an <input>'s name/value last, so match the element, then the flag.
    expect(/<input [^>]*name="to"[^>]*>/.exec(html)?.[0]).toMatch(/aria-invalid="true"/);
  });

  it("the month select's onChange goes through afterMonthChoice and the dates through afterDateTyped (static, qa-tests p3 F7)", () => {
    const source = readFileSync("src/features/reports/components/ReportFilters.tsx", "utf8");
    expect(source).toMatch(/name="month"[\s\S]*?onChange=\{\(e\) => setPeriod\(\(s\) => afterMonthChoice\(s, e\.target\.value\)\)\}/);
    expect(source.match(/afterDateTyped\(s, "(from|to)", e\.target\.value\)/g)).toHaveLength(2);
  });

  it("neither the client leaf nor reportMonths mentions the validation barrel or reportRange (D32 B1)", () => {
    for (const file of ["ReportFilters.tsx", "reportMonths.ts"]) {
      const source = readFileSync(`src/features/reports/components/${file}`, "utf8");
      expect(source).not.toContain("@/lib/validation");
      expect(source).not.toContain("./reportRange");
    }
  });
});

describe("the month ↔ range helpers (pure)", () => {
  it("monthRange covers the whole month", () => {
    expect(monthRange("2026-02")).toEqual({ from: "2026-02-01", to: "2026-02-28", month: "2026-02" });
  });

  it("choosing a month sets from/to to that month", () => {
    expect(afterMonthChoice({ month: "", from: "2026-01-05", to: "2026-01-09" }, "2026-10")).toEqual({
      month: "2026-10", from: "2026-10-01", to: "2026-10-31",
    });
  });

  it("choosing «فترة مخصصة» keeps the dates and clears the month", () => {
    expect(afterMonthChoice({ month: "2026-10", from: "2026-10-01", to: "2026-10-31" }, "")).toEqual({
      month: "", from: "2026-10-01", to: "2026-10-31",
    });
  });

  it("typing a date clears the month and keeps the other date", () => {
    expect(afterDateTyped({ month: "2026-10", from: "2026-10-01", to: "2026-10-31" }, "from", "2026-09-15")).toEqual({
      month: "", from: "2026-09-15", to: "2026-10-31",
    });
  });

  it("monthOptions prepends an out-of-window selection", () => {
    expect(monthOptions("2010-01")[0]).toEqual({ value: "2010-01", label: "يناير 2010" });
    expect(monthOptions()).toHaveLength(24);
  });
});

describe("the summary page order and the aging tab label", () => {
  it("renders the filters after the report on phones (order-last) while the DOM keeps them first", async () => {
    const html = renderToStaticMarkup(await OwnerReportsPage({ searchParams: Promise.resolve({ month: "2026-10" }) }));
    expect(html).toMatch(/<div class="no-print order-last md:order-none"><form/);
    expect(html.indexOf("<form")).toBeLessThan(html.indexOf('id="report"'));
    expect(html.match(/<form/g)).toHaveLength(1);
    expect(html.match(/type="submit"/g)).toHaveLength(1);
  });

  it("the tabs read «المتأخرات حسب المدة» through t.aging.tab", () => {
    const html = renderToStaticMarkup(createElement(ReportTabs, { active: "category" }));
    expect(html).toContain(t.aging.tab);
    expect(t.aging.tab).toBe("المتأخرات حسب المدة");
  });
});
