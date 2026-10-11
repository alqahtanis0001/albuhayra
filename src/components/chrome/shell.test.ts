import { readFileSync } from "node:fs";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { t } from "@/i18n/ar";

/**
 * v1.5 (docs/V15-SPEC.md B1, D35): the top bar's wordmark links each role's
 * home with one accessible name, «الرئيسية». (D15, D21): the owner layout reads
 * `hasSalaryEmployees` once, scoped, and the «+» sheet offers «صرف راتب» only
 * when it is true.
 */
const h = vi.hoisted(() => ({ salaried: false, reads: [] as string[] }));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ usePathname: () => "/owner" }));
vi.mock("@/features/auth/components/actions", () => ({ logout: async () => undefined }));
// ThemeToggle is `theme`'s async server component (cookies()); a static stand-in marks where it mounts.
vi.mock("./ThemeToggle", () => ({ ThemeToggle: () => createElement("button", { "data-theme-toggle": "" }) }));
vi.mock("@/lib/auth", () => ({
  requireOwner: async () => ({
    user: { id: "owner_1", role: "OWNER", displayName: "سارة", establishmentName: "منشأة النور" },
    establishmentId: "est_1",
  }),
}));
vi.mock("@/features/payroll/generate", () => ({ ensureSalaryInstalments: async (id: string) => void h.reads.push(`ensure:${id}`) }));
vi.mock("@/features/plans/dues", () => ({ getOverdueCount: async (id: string) => (h.reads.push(`overdue:${id}`), 0) }));
vi.mock("@/features/establishments/queries", () => ({ countPendingStaff: async (id: string) => (h.reads.push(`pending:${id}`), 0) }));
vi.mock("@/features/employees/salaryPick", () => ({
  hasSalaryEmployees: async (id: string) => (h.reads.push(`salaried:${id}`), h.salaried),
}));

const { AppShell } = await import("./AppShell");
const { ESTABLISHMENT_NAME, ESTABLISHMENT_NAME_TEXT, TopBar } = await import("./TopBar");
const { singleGroup } = await import("./nav");
const { default: OwnerLayout } = await import("@/app/(owner)/layout");

/** The anchor that holds the wordmark image. */
function logoLink(html: string): string {
  return /<a [^>]*>\s*<img [^>]*zakham-wordmark-white\.png[^>]*\/?>\s*<\/a>/.exec(html)?.[0] ?? "";
}

describe("B1: the wordmark goes home", () => {
  it.each([
    ["OWNER", "/owner", "/owner/settings/account"],
    ["STAFF", "/staff", "/staff/account"],
    ["ADMIN", "/admin", "/admin/account"],
  ] as const)("%s: the wordmark links %s, named «الرئيسية» once", (role, home, accountHref) => {
    const html = renderToStaticMarkup(
      createElement(AppShell, { groups: singleGroup([]), userName: "س", establishmentName: "م", accountHref, role, children: "x" }),
    );
    const link = logoLink(html);
    expect(link).toContain(`href="${home}"`);
    expect(link).toContain(`aria-label="${t.nav.home}"`);
    // One accessible name: the image is decorative inside the named link.
    expect(link).toMatch(/<img [^>]*alt=""/);
    expect(link).not.toContain(t.brand.logoAlt);
    expect(link).toContain("min-h-11");
  });

  it("N5 (D11): the theme toggle mounts once, between the establishment name and the user link", () => {
    const html = renderToStaticMarkup(createElement(TopBar, { userName: "س", establishmentName: "منشأة", accountHref: "/a", homeHref: "/h" }));
    expect(html.match(/data-theme-toggle/g)).toHaveLength(1);
    expect(html.indexOf("منشأة")).toBeLessThan(html.indexOf("data-theme-toggle"));
    expect(html.indexOf("data-theme-toggle")).toBeLessThan(html.indexOf('href="/a"'));
    const source = readFileSync("src/components/chrome/TopBar.tsx", "utf8");
    expect(source.match(/<ThemeToggle \/>/g)).toHaveLength(1);
    expect(source).toMatch(/^import \{ ThemeToggle \} from "\.\/ThemeToggle";$/m);
  });

  it("TopBar renders the link it is given, before the establishment name", () => {
    const html = renderToStaticMarkup(createElement(TopBar, { userName: "س", establishmentName: "منشأة", accountHref: "/a", homeHref: "/h" }));
    expect(logoLink(html)).toContain('href="/h"');
    expect(html.indexOf('href="/h"')).toBeLessThan(html.indexOf("منشأة"));
  });

  it("the staff and admin layouts name their role for the shell", () => {
    expect(readFileSync("src/app/(staff)/layout.tsx", "utf8")).toMatch(/<AppShell[\s\S]*?\brole="STAFF"/);
    expect(readFileSync("src/app/(admin)/layout.tsx", "utf8")).toMatch(/<AppShell[\s\S]*?\brole="ADMIN"/);
    expect(readFileSync("src/app/(owner)/layout.tsx", "utf8")).toMatch(/<AppShell[\s\S]*?\brole="OWNER"/);
  });
});

describe("D36: the top bar is the deep-green band in both themes", () => {
  it("uses the topbar tokens and on-topbar text, with no white or hex literal left", () => {
    const html = renderToStaticMarkup(createElement(TopBar, { userName: "س", establishmentName: "منشأة", accountHref: "/a", homeHref: "/h" }));
    const header = /<header class="([^"]+)"/.exec(html)?.[1]?.split(" ") ?? [];
    for (const cls of ["bg-topbar", "border-t-topbar-dark", "border-b-topbar-dark", "[--focus-ring:var(--color-on-topbar)]"]) {
      expect(header).toContain(cls);
    }
    expect(html).toMatch(/<p class="[^"]*\btext-on-topbar\b[^"]*"><span[^>]*>منشأة<\/span><\/p>/);
    expect(html).toMatch(/<a class="[^"]*\btext-on-topbar hover:bg-topbar-dark\b[^"]*" href="\/a"/);
    const source = readFileSync("src/components/chrome/TopBar.tsx", "utf8");
    expect(source).not.toMatch(/\b(?:text|bg|border)-white\b|#[0-9a-fA-F]{3,8}\b/);
  });
});

describe("D37: the establishment name below 375 px", () => {
  it("is visually hidden only below 375 px (sr-only, still in the markup) and loses its separator; nothing changes from 375 px up", () => {
    const html = renderToStaticMarkup(createElement(TopBar, { userName: "س", establishmentName: "منشأة", accountHref: "/a", homeHref: "/h" }));
    expect(html).toContain(`<p class="${ESTABLISHMENT_NAME}"><span class="${ESTABLISHMENT_NAME_TEXT}">منشأة</span></p>`);
    expect(ESTABLISHMENT_NAME_TEXT.split(" ")).toEqual(["max-[375px]:sr-only"]);
    const box = ESTABLISHMENT_NAME.split(" ");
    for (const cls of ["flex-1", "min-w-0", "truncate", "border-s", "text-on-topbar"]) expect(box).toContain(cls);
    // Only max-[375px] variants, and no unconditional hiding.
    expect(box.filter((c) => c.includes(":"))).toEqual(["max-[375px]:border-s-0"]);
    expect([...box, ...ESTABLISHMENT_NAME_TEXT.split(" ")]).not.toContain("sr-only");
    expect([...box, ...ESTABLISHMENT_NAME_TEXT.split(" ")].some((c) => c === "hidden" || c.endsWith(":hidden"))).toBe(false);
  });

  it("the admin area label follows the same rule", () => {
    const html = renderToStaticMarkup(createElement(TopBar, { userName: "س", establishmentName: null, accountHref: "/a", homeHref: "/h" }));
    expect(html).toContain(`<span class="${ESTABLISHMENT_NAME_TEXT}">${t.app.adminArea}</span>`);
  });
});

describe("D15: the owner layout gates «صرف راتب» on its one scoped read", () => {
  beforeEach(() => {
    h.reads = [];
  });

  async function sheetHrefs(): Promise<string[]> {
    const element = (await OwnerLayout({ children: "x" })) as ReactElement;
    const html = renderToStaticMarkup(element);
    return [...html.matchAll(/<a [^>]*href="([^"]+)"/g)].map((m) => m[1]!);
  }

  it("salaried employees → the row is in the sheet; the read is scoped to the session's establishment", async () => {
    h.salaried = true;
    expect(await sheetHrefs()).toContain("/owner/staff?pick=salary");
    expect(h.reads).toContain("salaried:est_1");
    expect(h.reads.indexOf("ensure:est_1")).toBe(0);
  });

  it("none → no row", async () => {
    h.salaried = false;
    const hrefs = await sheetHrefs();
    expect(hrefs).not.toContain("/owner/staff?pick=salary");
    expect(hrefs).toContain("/owner/transactions/new");
  });

  it("the wordmark of the owner area links /owner", async () => {
    const html = renderToStaticMarkup((await OwnerLayout({ children: "x" })) as ReactElement);
    expect(logoLink(html)).toContain('href="/owner"');
  });
});
