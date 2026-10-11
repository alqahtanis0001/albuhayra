import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

/**
 * v1.4 part 3 — D29 R4: the owner's edit page sends the form back to the
 * ledger with `?saved=1`, where `SavedNotice` shows «تم حفظ الحركة». Modelled
 * on `staff/transactions/[id]/edit/page.test.ts`: the form is a stub echoing
 * what the page handed it.
 */
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw Object.assign(new Error("NEXT_NOT_FOUND"), { notFound: true });
  },
}));
vi.mock("@/lib/auth", () => ({
  requireCanEdit: async () => ({ user: { id: "owner_1", role: "OWNER", canEdit: true }, establishmentId: "est_1" }),
}));
vi.mock("@/features/transactions/components/actions", () => ({ updateTransaction: async () => ({ ok: true, data: null }) }));
vi.mock("@/features/transactions/components/data", () => ({
  getTransaction: async () => ({
    id: "tx_1", date: "2026-09-15", direction: "OUT", amountHalalas: 5000, categoryId: "cat_1", paymentMethod: "CASH",
    counterparty: null, note: null, partyId: null, projectId: null, instalmentId: null, planId: null,
  }),
}));
vi.mock("@/features/locks/queries", () => ({ listLocks: async () => [] }));
vi.mock("@/features/parties/queries", () => ({ listPartyOptions: async () => [] }));
vi.mock("@/features/projects/queries", () => ({ listProjectOptions: async () => [] }));
vi.mock("@/features/settings/queries", () => ({ listCategories: async () => [] }));
vi.mock("@/features/plans/dues", () => ({ getPaymentLink: async () => null }));
vi.mock("@/features/plans/openQueries", () => ({ getOpenPlanPaymentLink: async () => null }));
vi.mock("@/features/transactions/components/TransactionForm", () => ({
  TransactionForm: (props: { mode: string; doneHref: string }) =>
    createElement("form", { "data-mode": props.mode, "data-done": props.doneHref }),
}));
vi.mock("@/features/transactions/components/PaymentBanner", () => ({ PaymentBanner: () => createElement("p", null, "banner") }));

const { default: OwnerEditTransactionPage } = await import("./page");

describe("/owner/transactions/[id]/edit — doneHref (R4)", () => {
  it("returns to the owner ledger with ?saved=1", async () => {
    const out = renderToStaticMarkup(await OwnerEditTransactionPage({ params: Promise.resolve({ id: "tx_1" }) }));
    expect(out).toContain('data-mode="edit"');
    expect(out).toContain('data-done="/owner/transactions?saved=1"');
  });
});
