import { describe, expect, it } from "vitest";

import { ADMIN_NAV, OWNER_NAV, STAFF_NAV, activeHref } from "./nav";

/**
 * `frontend` owns nav.ts but not the tests, so these live here. The case that
 * matters is the nested one: /owner/transactions/new must light up إضافة alone,
 * not إضافة *and* السجل, which a plain prefix match would do.
 */
describe("activeHref", () => {
  it("matches a tab exactly", () => {
    expect(activeHref("/owner", OWNER_NAV)).toBe("/owner");
    expect(activeHref("/staff", STAFF_NAV)).toBe("/staff");
    expect(activeHref("/admin", ADMIN_NAV)).toBe("/admin");
  });

  it("gives the longest match to a nested path", () => {
    expect(activeHref("/owner/transactions/new", OWNER_NAV)).toBe(
      "/owner/transactions/new",
    );
    expect(activeHref("/owner/transactions", OWNER_NAV)).toBe(
      "/owner/transactions",
    );
    expect(activeHref("/owner/transactions/abc123/edit", OWNER_NAV)).toBe(
      "/owner/transactions",
    );
  });

  it("does not match a sibling whose href is a string prefix", () => {
    // /owner/settings is not under /owner/transactions, and /adminx is not /admin.
    expect(activeHref("/owner/settings", OWNER_NAV)).toBe("/owner/settings");
    expect(activeHref("/adminx", ADMIN_NAV)).toBeNull();
    expect(activeHref("/staffing", STAFF_NAV)).toBeNull();
  });

  it("returns null for a path in no nav at all", () => {
    expect(activeHref("/login", OWNER_NAV)).toBeNull();
    expect(activeHref("/owner", ADMIN_NAV)).toBeNull();
    expect(activeHref("/", OWNER_NAV)).toBeNull();
  });
});
