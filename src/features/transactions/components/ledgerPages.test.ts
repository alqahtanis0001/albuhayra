import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { t } from "@/i18n/ar";

/**
 * v1.4 part 3 — D29 R4 (the two ledgers show «تم حفظ الحركة» from `?saved=1`)
 * and R11 / D31d (print button and header on the owner ledger only). Pages are
 * rendered by calling their async default export with mocked auth and reads.
 */
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {} })); // the row actions reach assertUnlocked, which opens the client at import
vi.mock("@/lib/auth", () => ({
  requireOwner: async () => ({ user: { id: "owner_1", role: "OWNER", canEdit: true }, establishmentId: "est_1" }),
  requireStaff: async () => ({ user: { id: "staff_1", role: "STAFF", canEdit: false }, establishmentId: "est_1" }),
}));
vi.mock("@/features/settings/queries", () => ({ listCategories: async () => [] }));
vi.mock("@/features/locks/queries", () => ({ listLocks: async () => [] }));
vi.mock("@/features/projects/queries", () => ({ listProjects: async () => [] }));
vi.mock("@/features/establishments/queries", () => ({ getEstablishment: async () => ({ id: "est_1", nameAr: "منشأة الاختبار" }) }));
vi.mock("@/features/transactions/queries", () => ({
  listTransactions: async () => ({ rows: [], total: 0, filterTotals: { inHalalas: 0, outHalalas: 0, netHalalas: 0 }, page: 1, pageSize: 50 }),
}));

const { hasAnyFilter, parseLedgerFilters } = await import("./ledgerParams");
const { default: OwnerLedgerPage } = await import("@/app/(owner)/owner/transactions/(list)/page");
const { default: StaffLedgerPage } = await import("@/app/(staff)/staff/transactions/(list)/page");

type Params = Record<string, string | string[] | undefined>;
const owner = async (p: Params) => renderToStaticMarkup(await OwnerLedgerPage({ searchParams: Promise.resolve(p) }));
const staff = async (p: Params) => renderToStaticMarkup(await StaffLedgerPage({ searchParams: Promise.resolve(p) }));

describe("the two ledgers and ?saved=1 (R4)", () => {
  it("the owner ledger shows «تم حفظ الحركة» with the flag and not without", async () => {
    expect(await owner({ saved: "1" })).toContain(t.transaction.saved);
    expect(await owner({})).not.toContain(t.transaction.saved);
  });

  it("the staff ledger shows it with the flag and not without", async () => {
    expect(await staff({ saved: "1" })).toContain(t.transaction.saved);
    expect(await staff({})).not.toContain(t.transaction.saved);
  });

  it("the activities tab never shows it (no entry lands there)", async () => {
    expect(await owner({ tab: "activities", saved: "1" })).not.toContain(t.transaction.saved);
  });
});

describe("the ledgers tolerate ?saved=1 (D32 S3c)", () => {
  it("the filter schema strips it and hasAnyFilter stays false", () => {
    const filters = parseLedgerFilters({ saved: "1" });
    expect("saved" in filters).toBe(false);
    expect(hasAnyFilter(filters)).toBe(false);
    expect(hasAnyFilter(parseLedgerFilters({ saved: "1", from: "2026-10-01" }))).toBe(true);
  });

  it("neither ledger offers «مسح التصفية» for the flag alone", async () => {
    expect(await owner({ saved: "1" })).not.toContain(t.common.clearFilters);
    expect(await staff({ saved: "1" })).not.toContain(t.common.clearFilters);
  });
});
