import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { t } from "@/i18n/ar";

/**
 * v1.4 part 2 (D24, D27): the owner's «حركة جديدة» page reads `?partyId=` the
 * way it reads `?projectId=` — only an active party of this establishment is
 * preselected, anything else is ignored, not an error — and a payment
 * (`?instalmentId=`) keeps the plan's party, so the preset is dropped there.
 * Modelled on `staff/transactions/[id]/edit/page.test.ts`: the form is a stub
 * that echoes what the page handed it.
 */
const h = vi.hoisted(() => ({
  reads: [] as string[],
  pay: null as Record<string, unknown> | null,
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({
  requireOwner: async () => (h.reads.push("requireOwner"), { user: { id: "owner_1", role: "OWNER" }, establishmentId: "est_1" }),
}));
vi.mock("@/features/payroll/generate", () => ({ ensureSalaryInstalments: async () => undefined }));
vi.mock("@/features/transactions/components/actions", () => ({ createTransaction: async () => ({ ok: true, data: null }) }));
vi.mock("@/features/settings/queries", () => ({ listCategories: async () => [] }));
vi.mock("@/features/locks/queries", () => ({ listLocks: async () => [] }));
vi.mock("@/features/projects/queries", () => ({
  listProjectOptions: async () => [{ id: "proj_1", name: "معرض", status: "ACTIVE" }],
}));
vi.mock("@/features/parties/queries", () => ({
  listPartyOptions: async () => (
    h.reads.push("listPartyOptions"),
    [
      { id: "party_1", name: "شركة مراد", type: "SUPPLIER", active: true },
      { id: "party_old", name: "قديم", type: "CUSTOMER", active: false },
    ]
  ),
}));
vi.mock("@/features/plans/dues", () => ({
  getInstalmentForPayment: async () => (h.reads.push("getInstalmentForPayment"), h.pay),
}));
vi.mock("@/features/transactions/components/PaymentBanner", () => ({ PaymentBanner: () => createElement("p", null, "banner") }));
vi.mock("@/features/transactions/components/TransactionForm", () => ({
  TransactionForm: (props: { presetPartyId?: string; presetProjectId?: string; payment?: unknown; manageParties?: boolean; doneHref: string }) =>
    createElement("form", {
      "data-party": props.presetPartyId ?? "",
      "data-project": props.presetProjectId ?? "",
      "data-payment": props.payment ? "1" : "0",
      "data-done": props.doneHref,
    }),
}));

const { default: OwnerNewTransactionPage } = await import("./page");

const PAY = {
  planId: "plan_1", instalmentId: "i_1", direction: "OUT", partyId: "party_1", partyName: "شركة مراد",
  instalmentRemainingHalalas: 1000, planRemainingHalalas: 1000, categoryId: "cat_1", planTitle: "عقد", seq: 1, periodYm: null,
};

async function render(params: Record<string, string | string[] | undefined>): Promise<string> {
  return renderToStaticMarkup(await OwnerNewTransactionPage({ searchParams: Promise.resolve(params) }));
}

beforeEach(() => {
  h.reads = [];
  h.pay = null;
});

describe("/owner/transactions/new and ?partyId= (D24)", () => {
  it("an active party of the establishment is preselected, after requireOwner()", async () => {
    const out = await render({ partyId: "party_1" });
    expect(out).toContain('data-party="party_1"');
    expect(h.reads[0]).toBe("requireOwner");
  });

  it("an unknown id, an inactive party, a list or an empty value are ignored", async () => {
    expect(await render({ partyId: "party_nope" })).toContain('data-party=""');
    expect(await render({ partyId: "party_old" })).toContain('data-party=""');
    expect(await render({ partyId: ["party_1", "party_old"] })).toContain('data-party=""');
    expect(await render({ partyId: "" })).toContain('data-party=""');
    expect(await render({})).toContain('data-party=""');
  });

  it("?projectId= still works beside it", async () => {
    const out = await render({ partyId: "party_1", projectId: "proj_1" });
    expect(out).toContain('data-party="party_1"');
    expect(out).toContain('data-project="proj_1"');
  });

  it("a payment keeps the plan's party: the preset is dropped even when the id is valid", async () => {
    h.pay = PAY;
    const out = await render({ partyId: "party_1", instalmentId: "i_1" });
    expect(out).toContain('data-payment="1"');
    expect(out).toContain('data-party=""');
    // An unusable instalment falls back to the ordinary form, where the preset applies again.
    h.pay = null;
    const plain = await render({ partyId: "party_1", instalmentId: "gone" });
    expect(plain).toContain('data-payment="0"');
    expect(plain).toContain('data-party="party_1"');
  });
});

/** v1.4 part 3 — D29 R4/R16: every `doneHref` carries `?saved=1`; the subtitle «قبض أو صرف» outside payment mode. */
describe("/owner/transactions/new — doneHref and subtitle (R4, R16)", () => {
  it("a plain entry returns to the ledger with ?saved=1", async () => {
    const out = await render({});
    expect(out).toContain('data-done="/owner/transactions?saved=1"');
    expect(out).toContain(t.transaction.newSubtitle);
  });

  it("«تسجيل تكلفة» returns to the activity with ?saved=1", async () => {
    expect(await render({ projectId: "proj_1" })).toContain('data-done="/owner/projects/proj_1?saved=1"');
  });

  it("a STANDARD instalment payment returns to the plan with ?paid= and ?saved=1, and no subtitle", async () => {
    h.pay = PAY;
    const out = await render({ instalmentId: "i_1" });
    expect(out).toContain('data-done="/owner/plans/plan_1?paid=i_1&amp;saved=1"');
    expect(out).not.toContain(t.transaction.newSubtitle);
  });
});
