import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * v1.4 D15 P4: an open-plan payment is OWNER-only to edit, so the staff edit
 * page sends a `planId` row back to the staff ledger before any form renders
 * (the action refuses too — `openPlanPayments.test.ts`). A plain row still
 * reaches the form. Modelled on `owner/projects/(list)/page.test.ts`:
 * `redirect()` navigates by throwing, and the thrown error carries the
 * destination.
 */
const h = vi.hoisted(() => ({
  row: null as Record<string, unknown> | null,
  reads: [] as string[],
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw Object.assign(new Error(`NEXT_REDIRECT ${to}`), { destination: to });
  },
  notFound: () => {
    throw Object.assign(new Error("NEXT_NOT_FOUND"), { notFound: true });
  },
}));
vi.mock("@/lib/auth", () => ({
  requireCanEdit: async () => (h.reads.push("requireCanEdit"), { user: { id: "staff_1", role: "STAFF", canEdit: true }, establishmentId: "est_1" }),
}));
vi.mock("@/features/transactions/components/actions", () => ({ updateTransaction: async () => ({ ok: true, data: null }) }));
vi.mock("@/features/transactions/components/data", () => ({
  getTransaction: async (_est: string, id: string) => (h.reads.push(`getTransaction:${id}`), h.row),
}));
vi.mock("@/features/payroll/privacy", () => ({ salaryCategoryIds: async () => [] }));
vi.mock("@/features/locks/queries", () => ({ listLocks: async () => [] }));
vi.mock("@/features/parties/queries", () => ({ listPartyOptions: async () => [] }));
vi.mock("@/features/projects/queries", () => ({ listProjectOptions: async () => [] }));
vi.mock("@/features/settings/queries", () => ({ listCategories: async () => [] }));
vi.mock("@/features/plans/dues", () => ({
  getPaymentLink: async () => (h.reads.push("getPaymentLink"), null),
}));
// The frozen form is a client component with hooks; a stub shows the page reached it and what it was handed.
vi.mock("@/features/transactions/components/TransactionForm", () => ({
  TransactionForm: (props: { mode: string; doneHref: string; initial: { id: string } }) =>
    createElement("form", { "data-mode": props.mode, "data-done": props.doneHref, "data-id": props.initial.id }),
}));
vi.mock("@/features/transactions/components/StaffSalaryNote", () => ({ StaffSalaryNote: () => createElement("p", null, "note") }));
vi.mock("@/features/transactions/components/PaymentBanner", () => ({ PaymentBanner: () => createElement("p", null, "banner") }));

const { default: StaffEditTransactionPage } = await import("./page");

const ROW = {
  id: "tx_1", date: "2026-09-15", direction: "OUT", amountHalalas: 5000, categoryId: "cat_1", paymentMethod: "CASH",
  counterparty: null, note: null, partyId: "party_1", projectId: null, instalmentId: null, planId: null,
};

const render = (id = "tx_1") => StaffEditTransactionPage({ params: Promise.resolve({ id }) });

beforeEach(() => {
  h.row = { ...ROW };
  h.reads = [];
});

describe("/staff/transactions/[id]/edit and open-plan payments (P4)", () => {
  it("a planId row redirects to the staff ledger, after requireCanEdit and the row read, before any form", async () => {
    h.row = { ...ROW, planId: "plan_1" };
    await expect(render()).rejects.toMatchObject({ destination: "/staff/transactions" });
    expect(h.reads).toEqual(["requireCanEdit", "getTransaction:tx_1"]);
  });

  it("a plain row reaches the form with the staff's way back", async () => {
    const out = renderToStaticMarkup(await render());
    expect(out).toContain('data-mode="edit"');
    expect(out).toContain('data-done="/staff/transactions?saved=1"'); // R4
    expect(out).toContain('data-id="tx_1"');
    expect(h.reads).toEqual(["requireCanEdit", "getTransaction:tx_1"]);
  });

  it("an instalment payment (instalmentId, no planId) is still editable here, with its banner", async () => {
    h.row = { ...ROW, instalmentId: "i_1" };
    const out = renderToStaticMarkup(await render());
    expect(out).toContain('data-mode="edit"');
    expect(h.reads).toContain("getPaymentLink");
  });

  it("a missing row is notFound, never a redirect", async () => {
    h.row = null;
    await expect(render("nope")).rejects.toMatchObject({ notFound: true });
  });
});
