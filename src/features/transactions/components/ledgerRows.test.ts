import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { LedgerPage, LedgerRow } from "@/features/transactions/queries";
import { t } from "@/i18n/ar";

/**
 * v1.4 D17 c4 / D21 M1 at the ledger: owner-ness is derived in `LedgerList`
 * from `basePath` (as the project chips already are), so the owner's locked
 * rows link to إقفال الأشهر and the staff's do not — neither ledger page passes
 * anything. (c12, the «سداد اتفاقية» badge on staff planId rows, joins here.)
 */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => undefined, refresh: () => undefined }),
}));
vi.mock("@/features/transactions/components/actions", () => ({
  deleteTransaction: async () => ({ ok: true, data: null }),
}));

const { LedgerList } = await import("./LedgerList");

const row = (over: Partial<LedgerRow> = {}): LedgerRow => ({
  id: "tx_1",
  date: "2026-09-15",
  direction: "OUT",
  amountHalalas: 5000,
  categoryId: "cat_1",
  categoryNameAr: "إيجار",
  paymentMethod: "CASH",
  counterparty: null,
  note: null,
  createdByName: "سارة",
  partyId: null,
  partyName: null,
  projectId: null,
  projectName: null,
  instalmentId: null,
  planId: null,
  ...over,
});

const page = (rows: LedgerRow[]): LedgerPage => ({
  rows,
  total: rows.length,
  filterTotals: { inHalalas: 0, outHalalas: 5000, netHalalas: -5000 },
});

const render = (basePath: string, rows: LedgerRow[], permissions = { canEdit: true, canDelete: true }) =>
  renderToStaticMarkup(
    createElement(LedgerList, { page: page(rows), lockedMonths: ["2026-09"], permissions, basePath }),
  );

describe("c4 — the «شهر مقفل» badge links to the locks page on the owner ledger only", () => {
  it("owner: badge + link, in both layouts", () => {
    const out = render("/owner/transactions", [row()]);
    expect(out.match(new RegExp(t.lock.badge, "g"))).toHaveLength(2); // phone card + table row
    expect(out.match(/href="\/owner\/settings\/locks"/g)).toHaveLength(2);
    expect(out).toContain(t.navItem.locks);
    // Locked means no pencil and no delete, for everyone.
    expect(out).not.toContain(t.common.edit);
  });

  it("staff: the badge, and no link to an owner page", () => {
    const out = render("/staff/transactions", [row()], { canEdit: true, canDelete: false });
    expect(out.match(new RegExp(t.lock.badge, "g"))).toHaveLength(2);
    expect(out).not.toContain("/owner/settings/locks");
    expect(out).not.toContain(t.navItem.locks);
  });

  it("an open month keeps the pencil and never shows the badge", () => {
    const out = render("/owner/transactions", [row({ date: "2026-10-02" })]);
    expect(out).not.toContain(t.lock.badge);
    expect(out).toContain('href="/owner/transactions/tx_1/edit"');
  });
});

describe("c12 — an open-plan payment on the staff ledger: the badge and no pencil (P4)", () => {
  const payment = row({ id: "tx_plan", date: "2026-10-02", planId: "plan_open", direction: "IN" });

  it("staff with canEdit: «سداد اتفاقية», no edit link", () => {
    const out = render("/staff/transactions", [payment], { canEdit: true, canDelete: false });
    expect(out.match(new RegExp(t.ledger.openPlanPaymentBadge, "g"))).toHaveLength(2);
    expect(out).not.toContain("/staff/transactions/tx_plan/edit");
    expect(out).not.toContain(t.common.edit);
  });

  it("owner: keeps the pencil (and the badge)", () => {
    const out = render("/owner/transactions", [payment]);
    expect(out.match(/href="\/owner\/transactions\/tx_plan\/edit"/g)).toHaveLength(2);
    expect(out).toContain(t.ledger.openPlanPaymentBadge);
  });

  it("an ordinary staff row with canEdit keeps its pencil and shows no badge", () => {
    const out = render("/staff/transactions", [row({ date: "2026-10-02" })], { canEdit: true, canDelete: false });
    expect(out.match(/href="\/staff\/transactions\/tx_1\/edit"/g)).toHaveLength(2);
    expect(out).not.toContain(t.ledger.openPlanPaymentBadge);
  });
});
