import { describe, expect, it } from "vitest";

import { parseLedgerFilters } from "@/features/transactions/components/ledgerParams";

import { ACTIVITIES_HREF, activitiesHref, ledgerTab, parseActivitiesStatus } from "./ledgerTab";

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
