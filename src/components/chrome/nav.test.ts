import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { t } from "@/i18n/ar";

/** The only Next hook the chrome reads; each render case sets the path it is on. */
const route = vi.hoisted(() => ({ pathname: "/owner" }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));

import { AddSheet, HINT, PRIMARY_HINT, PRIMARY_ROW, ROW, SIDE_TRIGGER, TAB_TRIGGER } from "./AddSheet";
import { MoreSheet } from "./MoreSheet";
import { badgeText } from "./NavBadge";
import { BottomTabs, SideNav } from "./RoleNav";
import {
  ADD_SLOT,
  ownerNavGroups,
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
/**
 * docs/V15-SPEC.md §B3 verbatim (D43: literals, not keys, so a changed string
 * fails here): [href, label, caption] in the spec's order.
 */
const SPEC_OWNER_ROWS: Array<[string, string, string]> = [
  ["/owner/transactions/new", "حركة جديدة", "مبلغ دخل أو خرج اليوم"],
  ["/owner/plans?pick=payment", "دفعة على اتفاقية", "عميل أو مورد دفع قسطًا من اتفاقية قائمة"],
  ["/owner/staff?pick=salary", "صرف راتب", "دفع راتب موظف عن هذا الشهر"],
  ["/owner/plans/new", "اتفاقية جديدة", "إنشاء اتفاق/عقد جديد لعميل أو مورد يُدفع على أقساط أو حسب التيسير."],
  ["/owner/parties/new", "جهة جديدة", "عميل أو مورد تتعامل معه"],
  ["/owner/staff/new", "موظف جديد", "بياناته وراتبه ودوامه"],
  ["/owner/projects/new", "نشاط جديد", "مشروع أو مناسبة لها تكاليفها"],
];
const SPEC_STAFF_ROWS: Array<[string, string, string]> = [
  ["/staff/transactions/new", "حركة جديدة", "مبلغ دخل أو خرج اليوم"],
  ["/staff/me", "تسجيل حضوري", "تسجيل حضورك أو انصرافك"],
];

/** v1.5 B3: the owner's «+» rows without «صرف راتب» (no salaried employee). */
const OWNER_ADD_HREFS = [
  "/owner/transactions/new",
  "/owner/plans?pick=payment",
  "/owner/plans/new",
  "/owner/parties/new",
  "/owner/staff/new",
  "/owner/projects/new",
];
/** …and with it, third (D15, D21). */
const OWNER_ADD_HREFS_SALARY = [
  "/owner/transactions/new",
  "/owner/plans?pick=payment",
  "/owner/staff?pick=salary",
  "/owner/plans/new",
  "/owner/parties/new",
  "/owner/staff/new",
  "/owner/projects/new",
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

  it("v1.5 B2/D14: the old report paths highlight السجل through `also`", () => {
    expect(activeHref("/owner/reports", OWNER)).toBe("/owner/transactions");
    expect(activeHref("/owner/reports/aging", OWNER)).toBe("/owner/transactions");
    expect(activeHref("/owner/reportsx", OWNER)).toBeNull();
    expect(groupOf(OWNER_NAV_GROUPS, activeHref("/owner/reports/aging", OWNER))).toBe("ledger");
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
  it("has the six groups in order; السجل is top-level with no heading", () => {
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
    expect(OWNER_NAV_GROUPS.find((g) => g.key === "ledger")!.items).toEqual([
      { href: "/owner/transactions", label: t.nav.ledger, icon: "ledger", also: ["/owner/projects", "/owner/reports"] },
    ]);
  });

  it("v1.5 B2: no التقارير item anywhere — side nav, tab bar or المزيد, with or without salaried employees", () => {
    for (const groups of [OWNER_NAV_GROUPS, ownerNavGroups({ hasSalaryEmployees: true })]) {
      const hrefs = navItems(groups).map((i) => i.href);
      expect(hrefs.some((h) => h.startsWith("/owner/reports"))).toBe(false);
      expect(navItems(groups).some((i) => i.label === t.nav.reports)).toBe(false);
      expect(moreGroups(groups, OWNER_TAB_HREFS).flatMap((g) => g.items.map((i) => i.href))).not.toContain("/owner/reports");
    }
  });

  it("D15: the salary flag changes only the «+» rows, never the links", () => {
    expect(navItems(ownerNavGroups({ hasSalaryEmployees: true }))).toEqual(OWNER);
    expect(addEntryOf(ownerNavGroups({ hasSalaryEmployees: true }))!.rows).toEqual(addRows("OWNER", { hasSalaryEmployees: true }));
    expect(addEntryOf(OWNER_NAV_GROUPS)!.rows).toEqual(addRows("OWNER"));
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
    expect(groupOf(OWNER_NAV_GROUPS, "/owner/transactions")).toBe("ledger");
    expect(groupOf(OWNER_NAV_GROUPS, "/owner/reports")).toBeNull();
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

  it("المزيد holds every owner link that is not a tab — never the «+», no empty group (v1.5: السجل's group is gone)", () => {
    const more = moreGroups(OWNER_NAV_GROUPS, OWNER_TAB_HREFS);
    expect(more.flatMap((g) => g.items.map((i) => i.href))).toEqual([
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

describe("addRows (B1, D16 b/c; v1.5 B3, D15)", () => {
  it("owner: seven rows in spec order when an employee is salaried, each with its caption", () => {
    expect(addRows("OWNER", { hasSalaryEmployees: true }).map((r) => [r.href, r.label, r.hint])).toEqual([
      ...SPEC_OWNER_ROWS,
    ]);
    expect(addRows("OWNER", { hasSalaryEmployees: true }).map((r) => r.href)).toEqual(OWNER_ADD_HREFS_SALARY);
    expect(t.plans.add).toBe("اتفاقية جديدة");
    expect(t.employees.paySalary).toBe("صرف راتب");
    // D37: its own icon, not one another row or nav item uses.
    const salary = addRows("OWNER", { hasSalaryEmployees: true })[2]!;
    expect(salary.icon).toBe("salary");
    expect(addRows("OWNER", { hasSalaryEmployees: true }).filter((r) => r.icon === "salary")).toHaveLength(1);
    expect(navItems(ownerNavGroups({ hasSalaryEmployees: true })).some((i) => i.icon === "salary")).toBe(false);
    // v1.4 part 3 (R1): the row goes to the agreement pick list, so it says so.
    expect(t.addSheet.recordPayment).toBe("دفعة على اتفاقية");
  });

  it("D15: «صرف راتب» is there iff hasSalaryEmployees — the other six keep their order", () => {
    expect(addRows("OWNER").map((r) => r.href)).toEqual(OWNER_ADD_HREFS);
    expect(addRows("OWNER", { hasSalaryEmployees: false }).map((r) => r.href)).toEqual(OWNER_ADD_HREFS);
    expect(addRows("OWNER", { linked: true }).map((r) => r.href)).toEqual(OWNER_ADD_HREFS);
    expect(addRows("OWNER", { hasSalaryEmployees: true }).filter((r) => r.href === "/owner/staff?pick=salary")).toHaveLength(1);
  });

  it("every row of every role carries a non-empty caption (B3)", () => {
    for (const rows of [addRows("OWNER"), addRows("OWNER", { hasSalaryEmployees: true }), addRows("STAFF"), addRows("STAFF", { linked: true })]) {
      for (const row of rows) expect(typeof row.hint === "string" && row.hint.length > 0, row.href).toBe(true);
    }
  });

  it("staff: one row unlinked, «تسجيل حضوري» second when linked, with their captions; admin none", () => {
    expect(addRows("STAFF").map((r) => r.href)).toEqual(["/staff/transactions/new"]);
    expect(addRows("STAFF", { linked: false }).map((r) => r.href)).toEqual(["/staff/transactions/new"]);
    expect(addRows("STAFF", { hasSalaryEmployees: true }).map((r) => r.href)).toEqual(["/staff/transactions/new"]);
    expect(addRows("STAFF", { linked: true }).map((r) => [r.href, r.label, r.hint])).toEqual([
      ...SPEC_STAFF_ROWS,
    ]);
    expect(addRows("ADMIN")).toEqual([]);
    expect(addRows("ADMIN", { linked: true, hasSalaryEmployees: true })).toEqual([]);
    expect(addEntryOf(singleGroup(staffNav(true)))!.rows).toEqual(addRows("STAFF", { linked: true }));
    expect(addEntryOf(singleGroup(staffNav(false)))!.rows).toEqual(addRows("STAFF", { linked: false }));
  });
});

describe("AddSheet (B1, D16 c, A9)", () => {
  it("owner: a dialog trigger, never aria-current, with the rows in order", () => {
    const html = render(createElement(AddSheet, { entry: addEntryOf(OWNER_NAV_GROUPS)!, variant: "tab" }), "/owner/transactions/new");
    expect(html).toContain('<button type="button" aria-haspopup="dialog" aria-expanded="false"');
    expect(html).not.toContain("aria-current");
    expect(html).toContain("<dialog");
    const hrefs = [...html.matchAll(/<a [^>]*href="([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs).toEqual(OWNER_ADD_HREFS);
    expect(html).toContain(t.addSheet.title);
    const salaried = render(
      createElement(AddSheet, { entry: addEntryOf(ownerNavGroups({ hasSalaryEmployees: true }))!, variant: "tab" }),
      "/owner",
    );
    expect([...salaried.matchAll(/<a [^>]*href="([^"]+)"/g)].map((m) => m[1])).toEqual(OWNER_ADD_HREFS_SALARY);
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

describe("D42 (QV-S1): the desktop «+» dialog fits short screens", () => {
  it("the side dialog is capped below the viewport height and scrolls; the phone sheet keeps its own cap", () => {
    const side = render(createElement(AddSheet, { entry: addEntryOf(ownerNavGroups({ hasSalaryEmployees: true }))!, variant: "side" }), "/owner");
    const dialog = /<dialog [^>]*class="([^"]+)"/.exec(side)?.[1]?.split(" ") ?? [];
    expect(dialog).toContain("mt-24");
    expect(dialog).toContain("max-h-[calc(100dvh-7rem)]");
    expect(dialog).toContain("overflow-y-auto");
    const tab = render(createElement(AddSheet, { entry: addEntryOf(OWNER_NAV_GROUPS)!, variant: "tab" }), "/owner");
    const sheet = /<dialog [^>]*class="([^"]+)"/.exec(tab)?.[1]?.split(" ") ?? [];
    expect(sheet).toContain("max-h-[85dvh]");
    expect(sheet).toContain("overflow-y-auto");
  });
});

describe("AddSheet links show the v1.1d pending step (reviewer R1-1)", () => {
  it("the primary row and both one-row «+» links carry nav-item and a has-data-pending look", () => {
    for (const cls of [PRIMARY_ROW, ROW, TAB_TRIGGER, SIDE_TRIGGER]) {
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

  it("المزيد tiles (v1.5 B2): no التقارير tile; the first section is a headed group", () => {
    const html = render(
      createElement(MoreSheet, { groups: moreGroups(OWNER_NAV_GROUPS, OWNER_TAB_HREFS), active: null, badges: {} }),
      "/owner",
    );
    expect(html).not.toContain('href="/owner/reports"');
    expect(html).not.toContain(`>${t.nav.reports}<`);
    const firstSection = html.split("<section")[1];
    expect(firstSection).toContain("<h3");
    expect(firstSection).toContain('href="/owner/parties"');
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

/**
 * v1.4 part 3 R16 → v1.5 B3: every row has its caption; «نشاط جديد» (now row 7)
 * keeps `addSheet.newProjectHint`. The rows are one column, each ≥ 56 px.
 */
describe("B3 — the «+» rows: captions, layout and the 56 px minimum", () => {
  it("«نشاط جديد» is the last owner row, captioned by addSheet.newProjectHint", () => {
    const rows = addRows("OWNER", { hasSalaryEmployees: true });
    expect(rows[6]!.href).toBe("/owner/projects/new");
    expect(rows[6]!.hint).toBe("مشروع أو مناسبة لها تكاليفها");
  });

  it("every row class carries min-h-14 (56 px); captions are a muted second line, on-accent-muted on the primary row (D33)", () => {
    expect(PRIMARY_ROW.split(" ")).toContain("min-h-14");
    expect(ROW.split(" ")).toContain("min-h-14");
    expect(HINT).toContain("text-gray-600");
    expect(PRIMARY_HINT.split(" ")).toContain("text-on-accent-muted");
    // D36: text on the accent fill is the on-accent token (dark ink in dark mode), never white.
    for (const cls of [PRIMARY_ROW, SIDE_TRIGGER]) {
      expect(cls.split(" "), cls).toContain("text-on-accent");
      expect(cls).not.toMatch(/\btext-white\b/);
    }
  });

  it("renders a single-column list: the primary row first, then one <li> per row, each caption readable (no aria-hidden)", () => {
    const html = render(
      createElement(AddSheet, { entry: addEntryOf(ownerNavGroups({ hasSalaryEmployees: true }))!, variant: "tab" }),
      "/owner",
    );
    expect(html).toContain('<ul class="flex flex-col gap-2">');
    expect(html).not.toContain("grid-cols-2");
    expect(html.match(/<li>/g)).toHaveLength(6);
    const primary = new RegExp(`<a class="${PRIMARY_ROW.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}" href="/owner/transactions/new"`);
    expect(html).toMatch(primary);
    const [first, ...rest] = SPEC_OWNER_ROWS.map((row) => row[2]);
    expect(html).toContain(`<span class="${PRIMARY_HINT}">${first}</span>`);
    for (const hint of rest) {
      expect(html).toContain(`<span class="${HINT}">${hint}</span>`);
    }
    expect(html.match(new RegExp(`class="${ROW.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}"`, "g"))).toHaveLength(6);
    expect(html).not.toMatch(/aria-hidden="true"[^>]*>[^<]*(?:مبلغ دخل|عميل أو مورد)/);
  });

  it("a linked staff login's sheet: two rows, both captioned", () => {
    const html = render(createElement(AddSheet, { entry: addEntryOf(singleGroup(staffNav(true)))!, variant: "tab" }), "/staff");
    expect(html).toContain(`<span class="${PRIMARY_HINT}">${SPEC_STAFF_ROWS[0][2]}</span>`);
    expect(html).toContain(`<span class="${HINT}">${SPEC_STAFF_ROWS[1][2]}</span>`);
  });
});
