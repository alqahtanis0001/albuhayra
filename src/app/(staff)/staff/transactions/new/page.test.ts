import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { t } from "@/i18n/ar";

/**
 * v1.4 part 3 — D29 R4/R16: the staff «حركة جديدة» page sends the form back
 * with `?saved=1` (the staff ledger, or the staff home after an instalment
 * payment) and shows the subtitle «قبض أو صرف» outside payment mode.
 */
const h = vi.hoisted(() => ({ pay: null as Record<string, unknown> | null }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({
  requireStaff: async () => ({ user: { id: "staff_1", role: "STAFF", canEdit: true }, establishmentId: "est_1" }),
}));
vi.mock("@/features/transactions/components/actions", () => ({ createTransaction: async () => ({ ok: true, data: null }) }));
vi.mock("@/features/payroll/privacy", () => ({ salaryCategoryIds: async () => [] }));
vi.mock("@/features/locks/queries", () => ({ listLocks: async () => [] }));
vi.mock("@/features/parties/queries", () => ({ listPartyOptions: async () => [] }));
vi.mock("@/features/projects/queries", () => ({ listProjectOptions: async () => [] }));
vi.mock("@/features/settings/queries", () => ({ listCategories: async () => [] }));
vi.mock("@/features/plans/dues", () => ({ getStaffPaymentPrefill: async () => h.pay }));
vi.mock("@/features/transactions/components/TransactionForm", () => ({
  TransactionForm: (props: { mode: string; doneHref: string; payment?: unknown }) =>
    createElement("form", { "data-mode": props.mode, "data-done": props.doneHref, "data-payment": props.payment ? "1" : "0" }),
}));
vi.mock("@/features/transactions/components/StaffSalaryNote", () => ({ StaffSalaryNote: () => createElement("p", null, "note") }));
vi.mock("@/features/transactions/components/PaymentBanner", () => ({ PaymentBanner: () => createElement("p", null, "banner") }));

const { default: StaffNewTransactionPage } = await import("./page");

const render = async (params: Record<string, string | undefined>) =>
  renderToStaticMarkup(await StaffNewTransactionPage({ searchParams: Promise.resolve(params) }));

beforeEach(() => {
  h.pay = null;
});

describe("/staff/transactions/new — doneHref and subtitle (R4, R16)", () => {
  it("a plain entry returns to the staff ledger with ?saved=1 and shows the subtitle", async () => {
    const out = await render({});
    expect(out).toContain('data-done="/staff/transactions?saved=1"');
    expect(out).toContain(t.transaction.newSubtitle);
  });

  it("an instalment payment returns to the staff home with ?saved=1, without the subtitle", async () => {
    h.pay = { direction: "IN", partyId: "party_1", partyName: "محمد", instalmentId: "i_1", instalmentRemainingHalalas: 1000, categoryId: "cat_1" };
    const out = await render({ instalmentId: "i_1" });
    expect(out).toContain('data-payment="1"');
    expect(out).toContain('data-done="/staff?saved=1"');
    expect(out).not.toContain(t.transaction.newSubtitle);
  });
});
