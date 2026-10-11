import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { t } from "@/i18n/ar";

/** The only Next hook the chrome reads; each render case sets the path it is on. */
const route = vi.hoisted(() => ({ pathname: "/owner" }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));

import { AddSheet, PRIMARY_ROW, SIDE_TRIGGER, TAB_TRIGGER } from "./AddSheet";
import { MoreSheet } from "./MoreSheet";
import { badgeText } from "./NavBadge";
import { BottomTabs, SideNav } from "./RoleNav";
import {
  ADD_SLOT,
  ADMIN_NAV,
  OWNER_NAV_GROUPS,
  OWNER_TAB_HREFS,
  STAFF_NAV,
  activeHref,
  addEntryOf,
  addRows,
  groupOf,
  isAdd,
  isLink,
  moreBadgeTotal,
  moreGroups,
  navItems,
  samePath,
  singleGroup,
  staffNav,
  tabEntries,
} from "./nav";
import { openGroupKeys, parseUsedGroups, readUsedGroups, rememberUsedGroup, USED_GROUPS_KEY } from "./usedGroups";

const OWNER = navItems(OWNER_NAV_GROUPS);
const STAFF = navItems(singleGroup(STAFF_NAV));
const OWNER_HREFS = [
  "/owner",
  "/owner/transactions",
  "/owner/reports",
  "/owner/parties",
  "/owner/plans",
  "/owner/dues",
  "/owner/staff",
  "/owner/staff/attendance",
  "/owner/staff/logins",
  "/owner/settings/join-code",
  "/owner/settings/locks",
  "/owner/settings/reminders",
  "/owner/settings/account",
];
const OWNER_ADD_HREFS = [
  "/owner/transactions/new",
  "/owner/plans?pick=payment",
  "/owner/plans/new",
  "/owner/parties/new",
  "/owner/projects/new",
  "/owner/staff/new",
];

function render(element: Parameters<typeof renderToStaticMarkup>[0], pathname = "/owner"): string {
  route.pathname = pathname;
  return renderToStaticMarkup(element);
}

/**
 * `add` owns nav.ts and these tests (v1.4). The cases that matter are the
 * nested ones: /owner/transactions/abc/edit must light up السجل alone, the
 * longest match must win across groups, not within one — and since v1.4 the
 * «+» must never come back from activeHref, however the path looks.
 */
describe("activeHref", () => {
  it("matches an item exactly", () => {
    expect(activeHref("/owner", OWNER)).toBe("/owner");
    expect(activeHref("/staff", STAFF)).toBe("/staff");
    expect(activeHref("/admin", ADMIN_NAV)).toBe("/admin");
  });

  it("gives the longest match to a nested path, across groups", () => {
    expect(activeHref("/owner/transactions", OWNER)).toBe("/owner/transactions");
    expect(activeHref("/owner/transactions/abc123/edit", OWNER)).toBe("/owner/transactions");
    expect(activeHref("/owner/parties/abc123", OWNER)).toBe("/owner/parties");
    expect(activeHref("/owner/plans/new", OWNER)).toBe("/owner/plans");
    expect(activeHref("/owner/staff/logins", OWNER)).toBe("/owner/staff/logins");
    expect(activeHref("/owner/staff/attendance", OWNER)).toBe("/owner/staff/attendance");
    expect(activeHref("/owner/staff", OWNER)).toBe("/owner/staff");
    expect(activeHref("/owner/staff/new", OWNER)).toBe("/owner/staff");
    expect(activeHref("/owner/settings/locks", OWNER)).toBe("/owner/settings/locks");
    expect(activeHref("/owner/settings/reminders", OWNER)).toBe("/owner/settings/reminders");
  });

  it("A2: the role root /owner is exact-match only, so a page under no item highlights nothing", () => {
    expect(activeHref("/owner/settings/categories", OWNER)).toBeNull();
    expect(activeHref("/owner/settings", OWNER)).toBeNull();
    expect(activeHref("/owner", OWNER)).toBe("/owner");
  });

  it("D13: activity pages highlight السجل through its `also` list", () => {
    expect(activeHref("/owner/projects/x/edit", OWNER)).toBe("/owner/transactions");
    expect(activeHref("/owner/projects/x", OWNER)).toBe("/owner/transactions");
    expect(activeHref("/owner/projects/new", OWNER)).toBe("/owner/transactions");
    expect(activeHref("/owner/projects", OWNER)).toBe("/owner/transactions");
    expect(groupOf(OWNER_NAV_GROUPS, activeHref("/owner/projects/x", OWNER))).toBe("ledger");
  });

  it("does not match a sibling whose href is a string prefix", () => {
    expect(activeHref("/owner/partiesx", OWNER)).toBeNull();
    expect(activeHref("/owner/projectsx", OWNER)).toBeNull();
    expect(activeHref("/adminx", ADMIN_NAV)).toBeNull();
    expect(activeHref("/staffing", STAFF)).toBeNull();
  });

  it("returns null for a path in no nav at all", () => {
    expect(activeHref("/login", OWNER)).toBeNull();
    expect(activeHref("/owner", ADMIN_NAV)).toBeNull();
    expect(activeHref("/", OWNER)).toBeNull();
  });
});

describe("the «+» is never a link (B2, A3, A9)", () => {
  it("the add entry carries no href and navItems() never lists it", () => {
    const entry = addEntryOf(OWNER_NAV_GROUPS);
    expect(entry).not.toBeNull();
    expect(entry).not.toHaveProperty("href");
    expect(OWNER.some((i) => "kind" in i)).toBe(false);
    expect(OWNER.every(isLink)).toBe(true);
    expect(navItems(singleGroup(staffNav(true))).some((i) => "kind" in i)).toBe(false);
  });

  it("activeHref resolves every add-row page to a real link, never to the row's own href", () => {
    expect(activeHref("/owner/transactions/new", OWNER)).toBe("/owner/transactions");
    expect(activeHref("/owner/plans", OWNER)).toBe("/owner/plans");
    expect(activeHref("/staff/transactions/new", STAFF)).toBe("/staff/transactions");
    const paths = [...OWNER_HREFS, ...OWNER_HREFS.map((h) => `${h}/x/edit`), ...OWNER_ADD_HREFS.map((h) => h.split("?")[0])];
    for (const path of paths) {
      const result = activeHref(path, OWNER);
      expect(result === null || OWNER_HREFS.includes(result), path).toBe(true);
    }
  });
});

describe("owner navigation groups (v1.4 B2, D16)", () => {
  it("has the six groups in order; السجل and التقارير are top-level with no heading", () => {
    expect(OWNER_NAV_GROUPS.map((g) => [g.key, g.label === null, g.collapsible])).toEqual([
      ["home", true, false],
      ["add", true, false],
      ["ledger", true, false],
      ["partiesAndCommitments", false, true],
      ["staff", false, true],
      ["settings", false, false],
    ]);
    expect(OWNER_NAV_GROUPS[1].items.map(isAdd)).toEqual([true]);
    expect(OWNER_NAV_GROUPS.find((g) => g.key === "staff")!.label).toBe("الموظفون والحضور");
  });

  it("routes every link to its documented path, once — none of the removed items", () => {
    const hrefs = OWNER.map((i) => i.href);
    expect(hrefs).toEqual(OWNER_HREFS);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const gone of ["/owner/transactions/new", "/owner/projects", "/owner/projects/new", "/owner/settings/categories"]) {
      expect(hrefs, gone).not.toContain(gone);
    }
  });

  it("finds the group of the active item", () => {
    expect(groupOf(OWNER_NAV_GROUPS, "/owner/settings/reminders")).toBe("settings");
    expect(groupOf(OWNER_NAV_GROUPS, "/owner/reports")).toBe("ledger");
    expect(groupOf(OWNER_NAV_GROUPS, "/owner/staff/logins")).toBe("staff");
    expect(groupOf(OWNER_NAV_GROUPS, activeHref("/owner/parties/x/edit", OWNER))).toBe("partiesAndCommitments");
    expect(groupOf(OWNER_NAV_GROUPS, null)).toBeNull();
  });

  it("names the badge phrase of المستحقات and حسابات الدخول (c10)", () => {
    expect(OWNER.find((i) => i.href === "/owner/dues")!.badge).toBe(t.navItem.overdueBadge);
    expect(OWNER.find((i) => i.href === "/owner/staff/logins")!.badge).toBe(t.navItem.pendingBadge);
  });
});

describe("tab bar slots (B2, D13, A7)", () => {
  it("owner: الرئيسية | + | السجل | المستحقات, the «+» second", () => {
    expect(OWNER_TAB_HREFS).toEqual(["/owner", ADD_SLOT, "/owner/transactions", "/owner/dues"]);
    const slots = tabEntries(OWNER_NAV_GROUPS, OWNER_TAB_HREFS);
    expect(slots.map((e) => (isAdd(e) ? "+" : e.href))).toEqual(["/owner", "+", "/owner/transactions", "/owner/dues"]);
    expect(isAdd(slots[1])).toBe(true);
  });

  it("staff: الرئيسية | + | السجل | [حضوري] | حسابي; admin has no «+»", () => {
    const shape = (entries: ReturnType<typeof staffNav>) => entries.map((e) => (isAdd(e) ? "+" : e.href));
    expect(shape(tabEntries(singleGroup(staffNav(false))))).toEqual(["/staff", "+", "/staff/transactions", "/staff/account"]);
    expect(shape(tabEntries(singleGroup(staffNav(true))))).toEqual([
      "/staff",
      "+",
      "/staff/transactions",
      "/staff/me",
      "/staff/account",
    ]);
    expect(staffNav(false)).toEqual(STAFF_NAV);
    expect(addEntryOf(singleGroup(ADMIN_NAV))).toBeNull();
    expect(shape(tabEntries(singleGroup(ADMIN_NAV)))).toEqual(["/admin", "/admin/establishments", "/admin/account"]);
    expect(STAFF[2].label).toBe(OWNER.find((i) => i.href === "/owner/settings/account")!.label);
  });

  it("المزيد holds every owner link that is not a tab — never the «+», no empty group, التقارير unheaded", () => {
    const more = moreGroups(OWNER_NAV_GROUPS, OWNER_TAB_HREFS);
    expect(more.flatMap((g) => g.items.map((i) => i.href))).toEqual([
      "/owner/reports",
      "/owner/parties",
      "/owner/plans",
      "/owner/staff",
      "/owner/staff/attendance",
      "/owner/staff/logins",
      "/owner/settings/join-code",
      "/owner/settings/locks",
      "/owner/settings/reminders",
      "/owner/settings/account",
    ]);
    expect(more.every((g) => g.items.every((i) => typeof i.href === "string" && !("kind" in i)))).toBe(true);
    expect(more.map((g) => [g.key, g.label === null])).toEqual([
      ["ledger", true],
      ["partiesAndCommitments", false],
      ["staff", false],
      ["settings", false],
    ]);
  });

  it("M2: the المزيد badge is the sum over its tiles; a tab-bar href is not counted", () => {
    const badges = { "/owner/dues": 2, "/owner/staff/logins": 1 };
    expect(moreBadgeTotal(moreGroups(OWNER_NAV_GROUPS, OWNER_TAB_HREFS), badges)).toBe(1);
    expect(moreBadgeTotal(moreGroups(OWNER_NAV_GROUPS, ["/owner"]), badges)).toBe(3);
    expect(moreBadgeTotal(moreGroups(OWNER_NAV_GROUPS, OWNER_TAB_HREFS), {})).toBe(0);
  });
});

describe("addRows (B1, D16 b/c)", () => {
  it("owner: six rows in spec order", () => {
    expect(addRows("OWNER").map((r) => [r.href, r.label])).toEqual([
      ["/owner/transactions/new", "حركة جديدة"],
      ["/owner/plans?pick=payment", "تسجيل دفعة"],
      ["/owner/plans/new", t.plans.add],
      ["/owner/parties/new", "جهة جديدة"],
      ["/owner/projects/new", "نشاط جديد"],
      ["/owner/staff/new", "موظف جديد"],
    ]);
    expect(t.plans.add).toBe("اتفاقية جديدة");
  });

  it("staff: one row unlinked, «تسجيل حضوري» second when linked; admin none", () => {
    expect(addRows("STAFF", false).map((r) => r.href)).toEqual(["/staff/transactions/new"]);
    expect(addRows("STAFF", true).map((r) => [r.href, r.label])).toEqual([
      ["/staff/transactions/new", "حركة جديدة"],
      ["/staff/me", "تسجيل حضوري"],
    ]);
    expect(addRows("ADMIN")).toEqual([]);
    expect(addEntryOf(singleGroup(staffNav(true)))!.rows).toEqual(addRows("STAFF", true));
    expect(addEntryOf(singleGroup(staffNav(false)))!.rows).toEqual(addRows("STAFF", false));
  });
});

describe("AddSheet (B1, D16 c, A9)", () => {
  it("owner: a dialog trigger, never aria-current, with the six rows in order", () => {
    const html = render(createElement(AddSheet, { entry: addEntryOf(OWNER_NAV_GROUPS)!, variant: "tab" }), "/owner/transactions/new");
    expect(html).toContain('<button type="button" aria-haspopup="dialog" aria-expanded="false"');
    expect(html).not.toContain("aria-current");
    expect(html).toContain("<dialog");
    const hrefs = [...html.matchAll(/<a [^>]*href="([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs).toEqual(OWNER_ADD_HREFS);
    expect(html).toContain(t.addSheet.title);
  });

  it("linked staff: the sheet; unlinked staff: a plain link to «حركة جديدة» with no dialog and no aria-current", () => {
    expect(render(createElement(AddSheet, { entry: addEntryOf(singleGroup(staffNav(true)))!, variant: "tab" }))).toContain(
      'aria-haspopup="dialog"',
    );
    const link = render(
      createElement(AddSheet, { entry: addEntryOf(singleGroup(staffNav(false)))!, variant: "side" }),
      "/staff/transactions/new",
    );
    expect(link).toMatch(/<a [^>]*href="\/staff\/transactions\/new"/);
    expect(link).not.toContain("aria-haspopup");
    expect(link).not.toContain("<dialog");
    expect(link).not.toContain("aria-current");
    expect(link).toContain(t.addSheet.tab);
  });
});

describe("AddSheet links show the v1.1d pending step (reviewer R1-1)", () => {
  it("the primary row and both one-row «+» links carry nav-item and a has-data-pending look", () => {
    for (const cls of [PRIMARY_ROW, TAB_TRIGGER, SIDE_TRIGGER]) {
      expect(cls).toContain("nav-item");
      expect(cls).toContain("has-data-pending:");
    }
  });
});

describe("BottomTabs and SideNav render the slots and badges (A7, c10, M2)", () => {
  const owner = { groups: OWNER_NAV_GROUPS, tabHrefs: OWNER_TAB_HREFS, badges: { "/owner/dues": 2, "/owner/staff/logins": 1 }, label: "x" };

  it("owner tab bar: five slots, the «+» second, one aria-current, المزيد showing the summed badge", () => {
    const html = render(createElement(BottomTabs, owner), "/owner/transactions/new");
    const slots = html.split('<li class="flex-1">').slice(1);
    expect(slots).toHaveLength(5);
    expect(slots[0]).toContain('href="/owner"');
    expect(slots[1]).toContain('aria-haspopup="dialog"');
    expect(slots[1]).not.toContain("aria-current");
    expect(slots[2]).toMatch(/<a aria-current="page" [^>]*href="\/owner\/transactions"/);
    expect(slots[3]).toContain('href="/owner/dues"');
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    // The المزيد trigger: the number alone (aria-hidden); the tile carries the phrase, once.
    const trigger = slots[4].split("<dialog")[0];
    expect(trigger).toContain(">1</span>");
    expect(trigger).not.toContain("sr-only");
    expect(html.match(/طلب انضمام واحد/g)).toHaveLength(1);
  });

  it("the unlinked staff bar's «+» is a link slot", () => {
    const html = render(createElement(BottomTabs, { groups: singleGroup(staffNav(false)), label: "x" }), "/staff/transactions/new");
    const slots = html.split('<li class="flex-1">').slice(1);
    expect(slots).toHaveLength(4);
    expect(slots[1]).toMatch(/<a [^>]*href="\/staff\/transactions\/new"/);
    expect(slots[1]).not.toContain("aria-current");
    expect(slots[2]).toMatch(/<a aria-current="page" [^>]*href="\/staff\/transactions"/);
  });

  it("side nav: the «+» is a button, and each badge speaks its own phrase", () => {
    const html = render(createElement(SideNav, { groups: OWNER_NAV_GROUPS, badges: owner.badges, label: "x" }), "/owner/staff/logins");
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain("قسطان متأخران");
    expect(html).toContain("طلب انضمام واحد");
    expect(html).toMatch(/<a aria-current="page" [^>]*href="\/owner\/staff\/logins"/);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });

  it("المزيد tiles: التقارير as a plain tile with no heading before it", () => {
    const html = render(
      createElement(MoreSheet, { groups: moreGroups(OWNER_NAV_GROUPS, OWNER_TAB_HREFS), active: null, badges: {} }),
      "/owner",
    );
    const firstSection = html.split("<section")[1];
    expect(firstSection).toContain('href="/owner/reports"');
    expect(firstSection).not.toContain("<h3");
    expect(html).not.toContain('href="/owner/transactions/new"');
    expect(html).not.toContain('href="/owner/settings/categories"');
  });
});

describe("samePath", () => {
  it("compares the path part only", () => {
    expect(samePath("/owner/plans?pick=payment", "/owner/plans")).toBe(true);
    expect(samePath("/owner/plans#x", "/owner/plans")).toBe(true);
    expect(samePath("/owner/parties/new", "/owner/parties")).toBe(false);
    expect(samePath("/owner/transactions/new", "/owner/transactions/new")).toBe(true);
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

  it("opens only the remembered keys that are still collapsible groups (a stale v1.2a key is ignored)", () => {
    expect(openGroupKeys(OWNER_NAV_GROUPS, ["additions", "staff", "settings"])).toEqual(["staff"]);
    expect(openGroupKeys(OWNER_NAV_GROUPS, ["partiesAndCommitments", "nope"])).toEqual(["partiesAndCommitments"]);
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
    expect(rememberUsedGroup("partiesAndCommitments")).toEqual(["staff", "partiesAndCommitments"]);
    expect(JSON.parse(store.get(USED_GROUPS_KEY)!)).toEqual(["staff", "partiesAndCommitments"]);
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
