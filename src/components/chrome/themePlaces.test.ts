/**
 * v1.5 follow-up (docs/V15-SPEC.md D46): where the «المظهر» row
 * (ThemeSegmented) lives below 480 px — the first row of the owner's «المزيد»
 * sheet, and the top of the staff and admin «حسابي» pages (they have no
 * «المزيد»). The owner's «حسابي» does not repeat it. The row's own rules
 * (two segments, aria-pressed, hidden from 480 px, a press stores the choice)
 * are pinned in themeToggle.test.ts and themeToggleClick.test.ts.
 */
import { readFileSync } from "node:fs";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { prerenderToNodeStream } from "react-dom/static";
import { beforeEach, describe, expect, it, vi } from "vitest";

const jar = vi.hoisted(() => ({ theme: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (n: string) => (n === "theme" && jar.theme ? { name: n, value: jar.theme } : undefined) }),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ usePathname: () => "/owner" }));
vi.mock("@/lib/auth", () => ({
  requireStaff: async () => ({ user: { id: "s1", role: "STAFF" }, establishmentId: "est_1" }),
  requireAdmin: async () => ({ user: { id: "a1", role: "ADMIN" } }),
}));
vi.mock("@/features/settings/components/ChangePasswordForm", () => ({
  ChangePasswordForm: () => createElement("form", { "data-password-form": "" }),
}));

import { t } from "@/i18n/ar";

import { MoreSheet } from "./MoreSheet";
import { moreGroups, OWNER_NAV_GROUPS, OWNER_TAB_HREFS } from "./nav";
import { THEME_SEGMENTED_CLASS } from "./ThemeSegmented";

const { default: StaffAccountPage } = await import("@/app/(staff)/staff/account/page");
const { default: AdminAccountPage } = await import("@/app/(admin)/admin/account/page");

/** The «المظهر» row's opening tag, as ThemeSegmented renders it. */
const ROW = new RegExp(`<div role="group" aria-labelledby="[^"]+" class="${THEME_SEGMENTED_CLASS.replace(/[[\]]/g, "\\$&")}">`);

/** Renders async server children too (the cookie-reading wrapper). */
async function render(el: ReactElement): Promise<string> {
  const { prelude } = await prerenderToNodeStream(el);
  let html = "";
  for await (const chunk of prelude) html += chunk;
  return html;
}

const pressed = (row: string) =>
  [...row.matchAll(/<button type="button" aria-pressed="(true|false)"[^>]*>([^<]+)<\/button>/g)].map((m) => `${m[2]}:${m[1]}`);

function themeRow(html: string): string {
  const start = html.search(ROW);
  return start < 0 ? "" : html.slice(start, html.indexOf("</div></div>", start) + 12);
}

describe("«المزيد»: the first row is «المظهر» (D46)", () => {
  const html = renderToStaticMarkup(
    createElement(MoreSheet, { groups: moreGroups(OWNER_NAV_GROUPS, OWNER_TAB_HREFS), active: null, badges: {} }),
  );

  it("comes right after the sheet's title bar, before every group of tiles", () => {
    const row = html.search(ROW);
    expect(row).toBeGreaterThan(html.indexOf(`aria-label="${t.common.close}"`));
    expect(row).toBeLessThan(html.indexOf("<section"));
    // Nothing but the title bar's end sits between the close button and the row.
    expect(html.slice(html.indexOf("</button></div>", html.indexOf(`aria-label="${t.common.close}"`)) + 15, row)).toBe("");
  });

  it("is labelled «المظهر» and holds two aria-pressed segments فاتح / داكن", () => {
    const row = themeRow(html);
    expect(row).toContain(">المظهر</span>");
    expect([...row.matchAll(/<button type="button" aria-pressed="(?:true|false)"[^>]*>([^<]+)<\/button>/g)].map((m) => m[1])).toEqual([
      "فاتح",
      "داكن",
    ]);
    expect(html.match(ROW)).toHaveLength(1);
  });
});

describe("«حسابي» for staff and admin carries the row at the top (D46)", () => {
  beforeEach(() => {
    jar.theme = undefined;
  });

  it.each([
    ["STAFF", StaffAccountPage],
    ["ADMIN", AdminAccountPage],
  ] as const)("%s: after the heading, before the password form", async (_role, Page) => {
    const html = await render(await Page());
    const row = html.search(ROW);
    expect(row).toBeGreaterThan(html.indexOf(`>${t.nav.account}</h1>`));
    expect(row).toBeLessThan(html.indexOf("data-password-form"));
    expect(themeRow(html)).toContain(">المظهر</span>");
  });

  it.each([
    ["dark", ["فاتح:false", "داكن:true"]],
    ["light", ["فاتح:true", "داكن:false"]],
    ["system", ["فاتح:false", "داكن:false"]],
    [undefined, ["فاتح:false", "داكن:false"]],
  ] as const)("a stored %s cookie is pressed already at SSR (F-N1; none until mount without one, D50)", async (cookie, expected) => {
    jar.theme = cookie;
    for (const Page of [StaffAccountPage, AdminAccountPage]) {
      expect(pressed(themeRow(await render(await Page())))).toEqual(expected);
    }
  });

  it("the owner's «حسابي» does not repeat it (the owner has «المزيد»)", () => {
    expect(readFileSync("src/app/(owner)/owner/settings/account/page.tsx", "utf8")).not.toMatch(/ThemeSegmented/);
  });
});
