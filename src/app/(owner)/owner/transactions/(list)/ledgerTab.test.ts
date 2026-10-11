import { describe, expect, it } from "vitest";

import { parseLedgerFilters } from "@/features/transactions/components/ledgerParams";

import {
  ACTIVITIES_HREF,
  AGING_HREF,
  REPORTS_HREF,
  activitiesHref,
  ledgerTab,
  parseActivitiesStatus,
  reportKind,
  reportsRedirectHref,
} from "./ledgerTab";

/**
 * v1.4 B3: the two-tab ledger URL rules. `tab` and `status` are URL input, so
 * only the exact accepted values do anything, and neither reaches the ledger's
 * own filter schema.
 */
describe("ledgerTab", () => {
  it("selects the activities tab only for the exact single value", () => {
    expect(ledgerTab("activities")).toBe("activities");
    expect(ledgerTab(undefined)).toBe("entries");
    expect(ledgerTab("")).toBe("entries");
    expect(ledgerTab("entries")).toBe("entries");
    expect(ledgerTab("Activities")).toBe("entries");
    expect(ledgerTab("activities ")).toBe("entries");
    expect(ledgerTab(["activities"])).toBe("entries");
    expect(ledgerTab("projects")).toBe("entries");
  });
});

describe("activities status and hrefs (A4)", () => {
  it("keeps only a status the projects list accepts", () => {
    expect(parseActivitiesStatus("ACTIVE")).toBe("ACTIVE");
    expect(parseActivitiesStatus("COMPLETED")).toBe("COMPLETED");
    expect(parseActivitiesStatus("CANCELLED")).toBe("CANCELLED");
    expect(parseActivitiesStatus("evil")).toBeUndefined();
    expect(parseActivitiesStatus(["ACTIVE"])).toBeUndefined();
    expect(parseActivitiesStatus(undefined)).toBeUndefined();
  });

  it("links straight into the tab, never through /owner/projects", () => {
    expect(ACTIVITIES_HREF).toBe("/owner/transactions?tab=activities");
    expect(activitiesHref()).toBe(ACTIVITIES_HREF);
    expect(activitiesHref("COMPLETED")).toBe("/owner/transactions?tab=activities&status=COMPLETED");
    expect(activitiesHref("COMPLETED")).not.toContain("/owner/projects");
  });
});

describe("no collision with the ledger filters", () => {
  it("`tab` and `status` are stripped by TransactionFilterSchema, so the entries tab is unfiltered by them", () => {
    const filters = parseLedgerFilters({ tab: "activities", status: "ACTIVE" });
    expect(filters).toEqual(parseLedgerFilters({}));
    expect(filters).not.toHaveProperty("tab");
    expect(filters).not.toHaveProperty("status");
  });
});

/** v1.5 (docs/V15-SPEC.md B2, D14, D24): «التقارير» is the third tab, with two sub-tabs. */
describe("v1.5: the reports tab and its report parser", () => {
  it("selects the reports tab only for the exact single value", () => {
    expect(ledgerTab("reports")).toBe("reports");
    expect(ledgerTab("Reports")).toBe("entries");
    expect(ledgerTab("reports ")).toBe("entries");
    expect(ledgerTab(["reports"])).toBe("entries");
    expect(ledgerTab("report")).toBe("entries");
  });

  it("reportKind: only the exact single value «aging» picks the aging report; the category report is the default", () => {
    expect(reportKind("aging")).toBe("aging");
    expect(reportKind(undefined)).toBe("category");
    expect(reportKind("")).toBe("category");
    expect(reportKind("category")).toBe("category");
    expect(reportKind("Aging")).toBe("category");
    expect(reportKind(["aging"])).toBe("category");
  });

  it("the hrefs land on the tab and sub-tab", () => {
    expect(REPORTS_HREF).toBe("/owner/transactions?tab=reports");
    expect(AGING_HREF).toBe("/owner/transactions?tab=reports&report=aging");
    expect(ledgerTab(new URL(AGING_HREF, "http://x").searchParams.get("tab") ?? undefined)).toBe("reports");
    expect(reportKind(new URL(AGING_HREF, "http://x").searchParams.get("report") ?? undefined)).toBe("aging");
  });

  it("`report` is stripped by TransactionFilterSchema too", () => {
    expect(parseLedgerFilters({ tab: "reports", report: "aging" })).toEqual(parseLedgerFilters({}));
  });
});

describe("v1.5 D14/D24: reportsRedirectHref keeps the query and sets tab/report", () => {
  const params = (href: string) => new URL(href, "http://x").searchParams;

  it("the category report: tab=reports first, the old query kept", () => {
    expect(reportsRedirectHref({}, "category")).toBe("/owner/transactions?tab=reports");
    expect(reportsRedirectHref({ month: "2026-10", partyId: "p 1" }, "category")).toBe(
      "/owner/transactions?tab=reports&month=2026-10&partyId=p+1",
    );
  });

  it("the aging report adds report=aging", () => {
    expect(reportsRedirectHref({}, "aging")).toBe("/owner/transactions?tab=reports&report=aging");
    expect(reportsRedirectHref({ from: "2026-01-01" }, "aging")).toBe("/owner/transactions?tab=reports&report=aging&from=2026-01-01");
  });

  it("a stray tab or report in the old query is replaced, never duplicated", () => {
    const href = reportsRedirectHref({ tab: "activities", from: "2026-10-01", report: "aging" }, "category");
    expect(params(href).getAll("tab")).toEqual(["reports"]);
    expect(params(href).getAll("report")).toEqual([]);
    expect(params(href).get("from")).toBe("2026-10-01");
    const aging = reportsRedirectHref({ tab: ["activities", "x"], report: "category" }, "aging");
    expect(params(aging).getAll("tab")).toEqual(["reports"]);
    expect(params(aging).getAll("report")).toEqual(["aging"]);
  });

  it("repeated values survive, and an encoded value round-trips", () => {
    const href = reportsRedirectHref({ q: ["a", "b&c"] }, "category");
    expect(params(href).getAll("q")).toEqual(["a", "b&c"]);
  });
});
