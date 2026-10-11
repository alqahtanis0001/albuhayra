import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { StaffRow } from "@/features/establishments/queries";
import { t } from "@/i18n/ar";

/**
 * v1.4 part 3 — D29 R5: the edit permission is a Switch whose label states
 * its state, with the helper line; the reset-password field is not `required`
 * on the client.
 */
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => undefined }) }));
vi.mock("@/features/establishments/actions", () => ({
  approveStaff: async () => ({ ok: true }),
  rejectStaff: async () => ({ ok: true }),
  setCanEdit: async () => ({ ok: true }),
  setStaffActive: async () => ({ ok: true }),
}));

const { StaffRowActions, editLabel } = await import("./StaffRowActions");
const { ResetStaffPasswordForm } = await import("./ResetStaffPasswordForm");

const row = (canEdit: boolean): StaffRow => ({
  id: "u_1", fullName: "سعد", email: "s@example.com", emailVerified: true, status: "ACTIVE", canEdit, createdAt: "2026-10-01",
});
const render = (canEdit: boolean) => renderToStaticMarkup(createElement(StaffRowActions, { staff: row(canEdit) }));

describe("StaffRowActions — the edit switch (R5)", () => {
  it("the label follows canEdit: «التعديل: مسموح» / «التعديل: غير مسموح»", () => {
    expect(editLabel(true)).toBe(t.settings.editAllowed);
    expect(editLabel(false)).toBe(t.settings.editNotAllowed);
    expect(render(true)).toContain(t.settings.editAllowed);
    expect(render(true)).not.toContain(t.settings.editNotAllowed);
    expect(render(false)).toContain(t.settings.editNotAllowed);
    expect(render(false)).not.toContain(t.settings.editAllowed);
  });

  it("is a role=switch checkbox inside a label, checked by canEdit, with the helper line", () => {
    const on = /<input [^>]*role="switch"[^>]*>/.exec(render(true))?.[0] ?? "";
    expect(on).toMatch(/\bchecked=""/);
    const off = /<input [^>]*role="switch"[^>]*>/.exec(render(false))?.[0] ?? "";
    expect(off).not.toMatch(/\bchecked=""/);
    expect(render(false)).toContain(t.settings.editHelp);
    expect(render(false)).not.toContain("aria-pressed");
  });
});

describe("ResetStaffPasswordForm (R5)", () => {
  it("the password input is not required on the client and keeps minLength", () => {
    const html = renderToStaticMarkup(createElement(ResetStaffPasswordForm, { action: async () => ({ ok: true as const, data: null }), inputId: "pw_1" }));
    const input = /<input [^>]*>/.exec(html)?.[0] ?? "";
    expect(input).not.toMatch(/\brequired/);
    expect(input).toMatch(/\bminlength="\d+"/i);
    expect(html).not.toContain("> *</span>");
    expect(html).toContain(t.settings.resetPasswordFor);
  });
});
