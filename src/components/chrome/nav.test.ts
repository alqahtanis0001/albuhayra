import { afterEach, describe, expect, it, vi } from "vitest";

import { badgeText } from "./NavBadge";
import {
  ADMIN_NAV,
  OWNER_NAV_GROUPS,
  OWNER_TAB_HREFS,
  STAFF_NAV,
  activeHref,
  groupOf,
  navItems,
} from "./nav";
import { parseUsedGroups, readUsedGroups, rememberUsedGroup, USED_GROUPS_KEY } from "./usedGroups";

const OWNER = navItems(OWNER_NAV_GROUPS);

/**
 * `frontend` owns nav.ts and (v1.2a addendum) these tests. The cases that
 * matter are the nested ones: /owner/transactions/new must light up حركة جديدة
 * alone, not it *and* السجل, which a plain prefix match would do — and with
 * v1.2a's groups the longest match must win across groups, not within one.
 */
describe("activeHref", () => {
  it("matches an item exactly", () => {
    expect(activeHref("/owner", OWNER)).toBe("/owner");
    expect(activeHref("/staff", STAFF_NAV)).toBe("/staff");
    expect(activeHref("/admin", ADMIN_NAV)).toBe("/admin");
  });

  it("gives the longest match to a nested path, across groups", () => {
    expect(activeHref("/owner/transactions/new", OWNER)).toBe("/owner/transactions/new");
    expect(activeHref("/owner/transactions", OWNER)).toBe("/owner/transactions");
    expect(activeHref("/owner/transactions/abc123/edit", OWNER)).toBe("/owner/transactions");
    expect(activeHref("/owner/projects/new", OWNER)).toBe("/owner/projects/new");
    expect(activeHref("/owner/projects/abc123", OWNER)).toBe("/owner/projects");
    expect(activeHref("/owner/projects/abc123/edit", OWNER)).toBe("/owner/projects");
    expect(activeHref("/owner/parties/abc123", OWNER)).toBe("/owner/parties");
    expect(activeHref("/owner/staff/logins", OWNER)).toBe("/owner/staff/logins");
    expect(activeHref("/owner/staff/attendance", OWNER)).toBe("/owner/staff/attendance");
    expect(activeHref("/owner/staff", OWNER)).toBe("/owner/staff");
    expect(activeHref("/owner/settings/locks", OWNER)).toBe("/owner/settings/locks");
    // Every owner page falls under /owner, so only an unrelated path is null.
    expect(activeHref("/owner/settings", OWNER)).toBe("/owner");
  });

  it("does not match a sibling whose href is a string prefix", () => {
    expect(activeHref("/owner/partiesx", OWNER)).toBe("/owner");
    expect(activeHref("/owner/staffing", OWNER)).toBe("/owner");
    expect(activeHref("/adminx", ADMIN_NAV)).toBeNull();
    expect(activeHref("/staffing", STAFF_NAV)).toBeNull();
  });

  it("returns null for a path in no nav at all", () => {
    expect(activeHref("/login", OWNER)).toBeNull();
    expect(activeHref("/owner", ADMIN_NAV)).toBeNull();
    expect(activeHref("/", OWNER)).toBeNull();
  });
});

describe("owner navigation groups (v1.2a)", () => {
  it("has the six groups in order, the three new ones collapsible", () => {
    expect(OWNER_NAV_GROUPS.map((g) => [g.key, g.collapsible])).toEqual([
      ["home", false],
      ["finance", false],
      ["additions", true],
      ["partiesAndCommitments", true],
      ["staff", true],
      ["settings", false],
    ]);
    expect(OWNER_NAV_GROUPS[0].label).toBeNull();
    expect(OWNER_NAV_GROUPS.slice(1).every((g) => g.label)).toBe(true);
  });

  it("routes every item to its documented path, once", () => {
    const hrefs = OWNER.map((i) => i.href);
    expect(hrefs).toEqual([
      "/owner",
      "/owner/transactions/new",
      "/owner/transactions",
      "/owner/reports",
      "/owner/projects",
      "/owner/projects/new",
      "/owner/parties",
      "/owner/plans",
      "/owner/dues",
      "/owner/staff",
      "/owner/staff/attendance",
      "/owner/staff/logins",
      "/owner/settings/categories",
      "/owner/settings/join-code",
      "/owner/settings/locks",
      "/owner/settings/account",
    ]);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("puts exactly four item tabs before المزيد, each a real item", () => {
    expect(OWNER_TAB_HREFS).toEqual([
      "/owner",
      "/owner/transactions/new",
      "/owner/transactions",
      "/owner/dues",
    ]);
    for (const href of OWNER_TAB_HREFS) expect(OWNER.some((i) => i.href === href)).toBe(true);
  });

  it("finds the group of the active item", () => {
    expect(groupOf(OWNER_NAV_GROUPS, "/owner/projects/new")).toBe("additions");
    expect(groupOf(OWNER_NAV_GROUPS, "/owner/staff/logins")).toBe("staff");
    expect(groupOf(OWNER_NAV_GROUPS, activeHref("/owner/parties/x/edit", OWNER))).toBe(
      "partiesAndCommitments",
    );
    expect(groupOf(OWNER_NAV_GROUPS, null)).toBeNull();
  });

  it("gives staff the spec §1 items, the new-entry one relabelled, حسابي last", () => {
    expect(STAFF_NAV.map((i) => i.href)).toEqual([
      "/staff",
      "/staff/transactions/new",
      "/staff/transactions",
      "/staff/account",
    ]);
    expect(STAFF_NAV[1].label).toBe(OWNER[1].label);
    expect(STAFF_NAV[3].label).toBe(OWNER.find((i) => i.href === "/owner/settings/account")!.label);
    expect(activeHref("/staff/account", STAFF_NAV)).toBe("/staff/account");
  });
});

describe("badgeText", () => {
  it("hides at zero and below, caps at 99+", () => {
    expect(badgeText(0)).toBeNull();
    expect(badgeText(-1)).toBeNull();
    expect(badgeText(Number.NaN)).toBeNull();
    expect(badgeText(1)).toBe("1");
    expect(badgeText(99)).toBe("99");
    expect(badgeText(100)).toBe("99+");
  });
});

describe("used nav groups (localStorage)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads anything malformed as nothing used", () => {
    expect(parseUsedGroups(null)).toEqual([]);
    expect(parseUsedGroups("not json")).toEqual([]);
    expect(parseUsedGroups('{"a":1}')).toEqual([]);
    expect(parseUsedGroups('["staff", 3, null, "additions"]')).toEqual(["staff", "additions"]);
  });

  it("remembers a group once", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
      },
    });
    expect(rememberUsedGroup("staff")).toEqual(["staff"]);
    expect(rememberUsedGroup("staff")).toEqual(["staff"]);
    expect(rememberUsedGroup("additions")).toEqual(["staff", "additions"]);
    expect(JSON.parse(store.get(USED_GROUPS_KEY)!)).toEqual(["staff", "additions"]);
  });

  it("works when storage throws", () => {
    const boom = () => {
      throw new Error("blocked");
    };
    vi.stubGlobal("window", { localStorage: { getItem: boom, setItem: boom } });
    expect(readUsedGroups()).toEqual([]);
    expect(rememberUsedGroup("staff")).toEqual(["staff"]);
  });
});
