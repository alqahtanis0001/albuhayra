import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { t } from "@/i18n/ar";

import { PendingJoinNotice } from "./PendingJoinNotice";

/** v1.4 part 3 — D29 R9 / D32 S5: one line per pending name, in a status card linking to دخول الموظفين; nothing for none. */
describe("PendingJoinNotice (R9)", () => {
  it("renders nothing for an empty list", () => {
    expect(renderToStaticMarkup(createElement(PendingJoinNotice, { names: [] }))).toBe("");
  });

  it("two names → two lines, role=status on the wrapper (not the link), the link to /owner/staff/logins, no-print", () => {
    const html = renderToStaticMarkup(createElement(PendingJoinNotice, { names: ["سعد العتيبي", "نورة"] }));
    expect(html.match(/<li /g)).toHaveLength(2);
    expect(html).toContain(t.pendingJoin.one.replace("{name}", "سعد العتيبي"));
    expect(html).toContain(t.pendingJoin.one.replace("{name}", "نورة"));
    expect(html.indexOf("سعد العتيبي")).toBeLessThan(html.indexOf("نورة"));
    expect(html).toMatch(/^<div role="status" class="no-print /);
    const link = /<a [^>]*>/.exec(html)?.[0] ?? "";
    expect(link).toMatch(/href="\/owner\/staff\/logins"/);
    expect(link).not.toContain("role=");
    expect(link).toMatch(/\bmin-h-11\b/);
    expect(html).toContain(`>${t.pendingJoin.open}</a>`);
  });

  it("the owner home reads the names in its Promise.all and renders the notice above the quick actions (static)", () => {
    const page = readFileSync("src/app/(owner)/owner/page.tsx", "utf8");
    expect(page).toMatch(/listPendingStaffNames\(establishmentId\)/);
    const at = ["<PendingJoinNotice names={pendingNames} />", "<QuickActions />"].map((s) => page.indexOf(s));
    expect(at[0]).toBeGreaterThan(-1);
    expect(at[0]).toBeLessThan(at[1]!);
  });
});
