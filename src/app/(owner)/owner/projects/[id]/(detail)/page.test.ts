import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { t } from "@/i18n/ar";

/** v1.4 part 3 — D29 R4 / D32 S3b: «تسجيل تكلفة» lands on the activity page with `?saved=1`. */
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw Object.assign(new Error("NEXT_NOT_FOUND"), { notFound: true });
  },
}));
vi.mock("@/lib/auth", () => ({
  requireOwner: async () => ({ user: { id: "owner_1", role: "OWNER", establishmentName: "منشأة" }, establishmentId: "est_1" }),
}));
vi.mock("@/features/locks/queries", () => ({ listLocks: async () => [] }));
vi.mock("@/features/projects/queries", () => ({
  getProject: async () => ({
    id: "proj_1", name: "معرض", status: "ACTIVE", startDate: "2026-10-01", endDate: null, description: null, hasHistory: false,
    budgetHalalas: null, inHalalas: 0, outHalalas: 0, netHalalas: 0, byCategory: [],
  }),
}));
vi.mock("@/features/transactions/queries", () => ({
  listTransactions: async () => ({ rows: [], total: 0, filterTotals: { inHalalas: 0, outHalalas: 0, netHalalas: 0 }, page: 1, pageSize: 50 }),
}));
vi.mock("@/features/projects/components/CategoryRing", () => ({ CategoryRing: () => createElement("p", null, "ring") }));
vi.mock("@/features/projects/components/ProjectActions", () => ({ ProjectActions: () => createElement("p", null, "actions") }));
vi.mock("@/features/projects/components/ProjectSummary", () => ({
  ProjectByCategory: () => createElement("p", null, "by"),
  ProjectPrintEntries: () => createElement("p", null, "print"),
  ProjectTotals: () => createElement("p", null, "totals"),
}));

const { default: ProjectPage } = await import("./page");
const render = async (p: Record<string, string | undefined>) =>
  renderToStaticMarkup(await ProjectPage({ params: Promise.resolve({ id: "proj_1" }), searchParams: Promise.resolve(p) }));

describe("/owner/projects/[id] and ?saved=1 (R4)", () => {
  it("shows «تم حفظ الحركة» with the flag and not without", async () => {
    const out = await render({ saved: "1" });
    expect(out).toContain("معرض");
    expect(out).toContain(t.transaction.saved);
    expect(await render({})).not.toContain(t.transaction.saved);
  });
});
