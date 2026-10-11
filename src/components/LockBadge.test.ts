import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { t } from "@/i18n/ar";

import { LockBadge } from "./LockBadge";

/**
 * v1.4 part 3 (docs/V14-SPEC.md D29 R15): the «شهر مقفل» badge looked tappable.
 * Owner (with `href`): `title` and a written line saying where to unlock, beside
 * the link. Staff (no `href`): `title` only, saying the month is locked — no
 * line, no link. The two values differ, so a swap fails both arms.
 */
describe("LockBadge hints (R15)", () => {
  it("owner: title + the line as text + the link", () => {
    const out = renderToStaticMarkup(createElement(LockBadge, { href: "/owner/settings/locks" }));
    expect(out).toContain(`title="${t.lock.badgeHintOwner}"`);
    expect(out).not.toContain(t.lock.badgeHintStaff);
    const line = out.match(new RegExp(`<span [^>]*>${t.lock.badgeHintOwner}</span>`))?.[0] ?? "";
    expect(line).toMatch(/class="[^"]*\bno-print\b/);
    expect(out).toMatch(/<a [^>]*href="\/owner\/settings\/locks"/);
    expect(out).toContain(t.lock.badge);
  });

  it("staff: title only, no line, no link", () => {
    const out = renderToStaticMarkup(createElement(LockBadge, {}));
    expect(out).toContain(`title="${t.lock.badgeHintStaff}"`);
    expect(out).not.toContain(t.lock.badgeHintOwner);
    expect(out).not.toContain(`>${t.lock.badgeHintStaff}<`);
    expect(out).not.toContain("<a");
    expect(out).toContain(t.lock.badge);
  });

  it("the two hints differ (a swap must be visible)", () => {
    expect(t.lock.badgeHintOwner).not.toBe(t.lock.badgeHintStaff);
  });
});
