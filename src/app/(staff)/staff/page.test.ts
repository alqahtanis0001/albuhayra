import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { t } from "@/i18n/ar";

/** v1.4 part 3 — D29 R4: a staff instalment payment lands on the staff home with `?saved=1`. */
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({
  requireStaff: async () => ({ user: { id: "staff_1", role: "STAFF", canEdit: false }, establishmentId: "est_1" }),
}));
vi.mock("@/features/dashboard/queries", () => ({
  getStaffDashboard: async () => ({ canEdit: false, monthInHalalas: 0, monthOutHalalas: 0, myRecent: [] }),
}));
vi.mock("@/features/plans/dues", () => ({ getStaffDues: async () => [] }));
vi.mock("@/features/dashboard/components/RecentTransactions", () => ({ RecentTransactions: () => createElement("p", null, "recent") }));
vi.mock("@/features/dues/components/StaffDuesCard", () => ({ StaffDuesCard: () => createElement("p", null, "dues") }));

const { default: StaffHomePage } = await import("./page");
const render = async (p: Record<string, string | undefined>) =>
  renderToStaticMarkup(await StaffHomePage({ searchParams: Promise.resolve(p) }));

describe("/staff and ?saved=1 (R4)", () => {
  it("shows «تم حفظ الحركة» with the flag and not without", async () => {
    expect(await render({ saved: "1" })).toContain(t.transaction.saved);
    expect(await render({})).not.toContain(t.transaction.saved);
  });
});
