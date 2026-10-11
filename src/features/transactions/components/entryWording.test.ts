import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { NEW_PARTY } from "@/features/parties/components/quickPartyList";
import { t } from "@/i18n/ar";

/**
 * v1.4 part 3 — D29 R7 (the helper under the category select, «وارد» only,
 * never in payment mode) and R10 (the party select's trailing order: the
 * «+ جهة جديدة» sentinel before «أخرى»). Render mocks as partyQuick.test.ts.
 */
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => undefined, refresh: () => undefined }) }));
vi.mock("@/lib/db", () => ({ db: {} }));

const { TransactionForm } = await import("./TransactionForm");
const { trailingOptions } = await import("./LinkFields");
type Row = NonNullable<Parameters<typeof TransactionForm>[0]["initial"]>;

const CATEGORIES = [
  { id: "in_a", nameAr: "مبيعات", type: "IN" as const, active: true, sortOrder: 1 },
  { id: "out_a", nameAr: "صيانة", type: "OUT" as const, active: true, sortOrder: 1 },
];
const ROW = {
  id: "tx_1", date: "2026-10-01", direction: "IN", amountHalalas: 5000, categoryId: "in_a", paymentMethod: "CASH",
  counterparty: null, note: null, partyId: null, projectId: null, instalmentId: null, planId: null,
} as unknown as Row;
const props = {
  mode: "edit" as const,
  action: async () => ({ ok: true as const, data: null }),
  categories: CATEGORIES,
  parties: [],
  projects: [],
  lockedMonths: [],
  today: "2026-10-11",
  doneHref: "/owner/transactions",
};
const render = (extra: Partial<Parameters<typeof TransactionForm>[0]>) =>
  renderToStaticMarkup(createElement(TransactionForm, { ...props, ...extra }));

describe("R7 — the category helper for «وارد»", () => {
  it("renders under the category select for an IN entry, linked by aria-describedby", () => {
    const html = render({ initial: ROW });
    expect(html).toContain(t.transaction.categoryHelpIn);
    expect(html).toMatch(/<select [^>]*name="categoryId"[^>]*aria-describedby="[^"]*categoryId-hint/);
    expect(html).toContain(`<p id="categoryId-hint" class="text-xs text-gray-500">${t.transaction.categoryHelpIn}</p>`);
  });

  it("is absent for an OUT entry and in payment mode (even an IN payment)", () => {
    expect(render({ initial: { ...ROW, direction: "OUT", categoryId: "out_a" } })).not.toContain(t.transaction.categoryHelpIn);
    expect(render({ mode: "new", payment: { direction: "IN" } })).not.toContain(t.transaction.categoryHelpIn);
  });
});

describe("R10 — the party select's trailing order", () => {
  it("owner: the sentinel first, then «أخرى»; staff: «أخرى» alone", () => {
    expect(trailingOptions(true).map((o) => o.value)).toEqual([NEW_PARTY, "__other"]);
    expect(trailingOptions(true).map((o) => o.label)).toEqual([t.partyQuick.add, t.parties.other]);
    expect(trailingOptions(false).map((o) => o.value)).toEqual(["__other"]);
  });
});
