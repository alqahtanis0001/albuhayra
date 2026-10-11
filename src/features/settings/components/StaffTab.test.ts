import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { StaffRow } from "@/features/establishments/queries";
import { t } from "@/i18n/ar";

/**
 * v1.4 part 3 (docs/V14-SPEC.md D29 R5): the approved-logins card is headed
 * «حسابات الموظفين», its empty text never says «لا يوجد موظفون», and with rows
 * it opens with the one hint line whose «الموظفون» links to /owner/staff. The
 * row controls are `flows`' and are stubbed here.
 */
vi.mock("server-only", () => ({}));
vi.mock("@/features/establishments/actions", () => ({ resetStaffPassword: async () => ({ ok: true, data: null }) }));
vi.mock("./StaffRowActions", () => ({ StaffRowActions: () => null }));
vi.mock("./ResetStaffPasswordForm", () => ({ ResetStaffPasswordForm: () => null }));

const { StaffTab } = await import("./StaffTab");

const row = (status: StaffRow["status"]): StaffRow => ({
  id: `u_${status}`,
  fullName: "سعد العتيبي",
  email: "saad@example.com",
  emailVerified: true,
  status,
  canEdit: false,
  createdAt: "2026-10-01",
});

const render = (staff: StaffRow[]) => renderToStaticMarkup(createElement(StaffTab, { staff }));
const STAFF_LINK = /<a [^>]*href="\/owner\/staff"/;

describe("StaffTab (R5)", () => {
  it("one ACTIVE row: the heading, the hint line once, «الموظفون» as a link, before the row", () => {
    const out = render([row("ACTIVE")]);
    expect(out).toContain(t.settings.staffActive);
    // The sentence is one value with «الموظفون» cut out as the link: prefix, <a>, suffix.
    const at = t.settings.linkLoginHint.indexOf(t.navItem.staffList);
    const prefix = t.settings.linkLoginHint.slice(0, at);
    const suffix = t.settings.linkLoginHint.slice(at + t.navItem.staffList.length);
    const esc = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    expect(out).toMatch(
      new RegExp(`${esc(prefix)}<a [^>]*href="/owner/staff"[^>]*>${esc(t.navItem.staffList)}</a>${esc(suffix)}`),
    );
    const link = out.match(STAFF_LINK)?.[0] ?? "";
    expect(link).toContain("min-h-11");
    expect(out.match(new RegExp(STAFF_LINK.source, "g"))?.length).toBe(1);
    expect(out.split(`>${t.navItem.staffList}</a>`).length - 1).toBe(1);
    expect(out.indexOf(t.navItem.staffList)).toBeLessThan(out.indexOf("سعد العتيبي"));
    expect(out).not.toContain(t.settings.noStaff);
  });

  it("no approved row: the empty text and no hint, no link", () => {
    const out = render([row("PENDING")]);
    expect(out).toContain(t.settings.noStaff);
    expect(out).not.toMatch(STAFF_LINK);
    expect(out).not.toContain("حساب الدخول المرتبط");
    expect(out).toContain(t.settings.staffPending);
  });

  it("the sentence keeps the word the link is cut from", () => {
    expect(t.settings.linkLoginHint).toContain(t.navItem.staffList);
  });
});
