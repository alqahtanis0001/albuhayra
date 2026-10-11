import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { t } from "@/i18n/ar";

/**
 * v1.4 part 2 — the compact entry form (docs/V14-SPEC.md D24, D27 B1/S6/S7).
 * The rule lives in `entryDetailsState.ts` (pure) and is pinned arm by arm; the
 * renders pin that collapsing never drops a field from the DOM, that the
 * disclosure's ARIA follows the state, that payment mode is untouched and that
 * staff get the same disclosure. Render tests as `categoryQuick.test.ts` (C1).
 */

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => undefined, refresh: () => undefined }),
}));
vi.mock("@/features/settings/actions", () => ({
  createCategory: async () => ({ ok: true, data: { id: "cat_new", nameAr: "جديد", type: "OUT" } }),
  setCategoryActive: async () => ({ ok: true, data: null }),
}));
vi.mock("@/features/parties/actions", () => ({
  createParty: async () => ({ ok: true, data: { id: "party_new" } }),
}));
vi.mock("@/lib/db", () => ({ db: {} }));

const { TransactionForm } = await import("./TransactionForm");
const { EntryDetails } = await import("./EntryDetails");
const { DETAILS_KEY, readDetailsOpen, rememberDetailsOpen, shouldOpenDetails } = await import("./entryDetailsState");

const html = (element: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(element);

const NONE = { partyId: null, counterparty: null, projectId: null, note: null };

const ROW = {
  id: "tx_1",
  date: "2026-09-15",
  direction: "OUT" as const,
  amountHalalas: 5000,
  categoryId: "out_a",
  paymentMethod: "CASH" as const,
  counterparty: null,
  note: null,
  partyId: null,
  projectId: null,
  instalmentId: null,
  planId: null,
};

const PARTIES = [
  { id: "party_1", name: "شركة مراد", type: "SUPPLIER" as const, active: true },
  { id: "party_old", name: "قديم", type: "CUSTOMER" as const, active: false },
];

const formProps = {
  mode: "new" as const,
  action: async () => ({ ok: true as const, data: null }),
  categories: [{ id: "out_a", nameAr: "صيانة", type: "OUT" as const, active: true, sortOrder: 1 }],
  parties: PARTIES,
  projects: [{ id: "proj_1", name: "معرض", status: "ACTIVE" as const }],
  lockedMonths: [],
  today: "2026-10-11",
  doneHref: "/owner/transactions",
};

/** The disclosure button and the container it controls, matched by the shared id. */
function disclosure(out: string) {
  const button = out.match(/<button[^>]*aria-controls="([^"]+)"[^>]*>/);
  if (!button) return null;
  const id = button[1];
  const panel = out.match(new RegExp(`<div[^>]*id="${id.replace(/[:_]/g, "\\$&")}"[^>]*>`))?.[0] ?? null;
  return { button: button[0], panel };
}

/** A fake `localStorage`; `throwing` makes every accessor throw as a private window does. */
function storage(initial: Record<string, string> = {}, throwing = false) {
  const data = new Map(Object.entries(initial));
  const sets: Array<[string, string]> = [];
  const fail = () => {
    throw new Error("SecurityError");
  };
  vi.stubGlobal("localStorage", {
    getItem: throwing ? fail : (key: string) => data.get(key) ?? null,
    setItem: throwing
      ? fail
      : (key: string, value: string) => {
          sets.push([key, value]);
          data.set(key, value);
        },
  });
  return { sets, data };
}

afterEach(() => vi.unstubAllGlobals());

describe("shouldOpenDetails — the auto-open rule (D24, B1)", () => {
  it("opens for an edited entry with a party, a counterparty, a project or a note", () => {
    expect(shouldOpenDetails({ initial: { ...NONE, partyId: "party_1" }, remembered: false })).toBe(true);
    expect(shouldOpenDetails({ initial: { ...NONE, counterparty: "محل" }, remembered: false })).toBe(true);
    expect(shouldOpenDetails({ initial: { ...NONE, projectId: "proj_1" }, remembered: false })).toBe(true);
    expect(shouldOpenDetails({ initial: { ...NONE, note: "ملاحظة" }, remembered: false })).toBe(true);
  });

  it("an edited entry with none of them follows the remembered value", () => {
    expect(shouldOpenDetails({ initial: NONE, remembered: false })).toBe(false);
    expect(shouldOpenDetails({ initial: NONE, remembered: true })).toBe(true);
  });

  it("opens for a ?partyId= or ?projectId= preset", () => {
    expect(shouldOpenDetails({ presetPartyId: "party_1", remembered: false })).toBe(true);
    expect(shouldOpenDetails({ presetProjectId: "proj_1", remembered: false })).toBe(true);
  });

  it("B1: opens when a server field error names one of the three fields (or the «أخرى» text)", () => {
    for (const field of ["partyId", "counterparty", "projectId", "note"]) {
      expect(shouldOpenDetails({ fieldErrors: { [field]: "err.invalidInput" }, remembered: false })).toBe(true);
    }
    // An error elsewhere on the form says nothing about the details.
    expect(shouldOpenDetails({ fieldErrors: { amountHalalas: "err.required" }, remembered: false })).toBe(false);
  });

  it("otherwise the remembered value decides, and nothing set means compact", () => {
    expect(shouldOpenDetails({ remembered: true })).toBe(true);
    expect(shouldOpenDetails({ remembered: false })).toBe(false);
  });
});

describe("the disclosure on the entry form (D24)", () => {
  it("collapsed: the three fields are still in the DOM, inside a hidden container the button controls", () => {
    const out = html(createElement(TransactionForm, formProps));
    expect(out).toContain('name="note"');
    expect(out).toContain('name="partyId"');
    expect(out).toContain('name="projectId"');
    expect(out).toContain(t.entryDetails.more);
    expect(out).toContain(t.entryDetails.holds);
    const d = disclosure(out);
    expect(d?.button).toContain('aria-expanded="false"');
    expect(d?.button).toContain('type="button"');
    expect(d?.panel).toMatch(/\shidden=""/);
  });

  it("open (an edited entry with a note): aria-expanded is true and the container is not hidden", () => {
    const out = html(createElement(TransactionForm, { ...formProps, mode: "edit", initial: { ...ROW, note: "ملاحظة" } }));
    expect(out).toContain(t.entryDetails.less);
    expect(out).not.toContain(t.entryDetails.more);
    const d = disclosure(out);
    expect(d?.button).toContain('aria-expanded="true"');
    expect(d?.panel).not.toMatch(/\shidden/);
  });

  it("a ?partyId= preset preselects the party and opens the details", () => {
    const out = html(createElement(TransactionForm, { ...formProps, presetPartyId: "party_1" }));
    expect(out).toMatch(/<input type="hidden" name="partyId" value="party_1"/);
    expect(disclosure(out)?.button).toContain('aria-expanded="true"');
  });

  it("payment mode renders no disclosure: no button, the project and note as plain fields, no party picker", () => {
    const out = html(createElement(TransactionForm, { ...formProps, payment: { direction: "OUT" } }));
    expect(out).not.toContain(t.entryDetails.more);
    expect(out).not.toContain(t.entryDetails.less);
    expect(out).not.toContain("aria-expanded");
    expect(out).toContain('name="note"');
    expect(out).toContain('name="projectId"');
    expect(out).not.toContain('id="partyChoice"');
    expect(out).not.toMatch(/\shidden=""/);
  });

  it("the staff render (no owner flags) has the same disclosure, and still exactly one <form>", () => {
    const out = html(createElement(TransactionForm, formProps));
    expect(out).toContain(t.entryDetails.more);
    expect(out.match(/<form/g)).toHaveLength(1);
    const owner = html(createElement(TransactionForm, { ...formProps, manageCategories: true }));
    expect(owner).toContain(t.entryDetails.more);
    expect(owner.match(/<form/g)).toHaveLength(1);
  });

  it("the button is no-print and the panel keeps the entry's own party and project when editing", () => {
    const out = html(
      createElement(TransactionForm, { ...formProps, mode: "edit", initial: { ...ROW, partyId: "party_old", projectId: "proj_1" } }),
    );
    expect(disclosure(out)?.button).toContain("no-print");
    expect(out).toMatch(/<input type="hidden" name="partyId" value="party_old"/);
    expect(out).toContain(`قديم (${t.status.DISABLED})`);
  });
});

describe("remembered per device (D24, S7)", () => {
  it("readDetailsOpen: «1» means open, anything else or a throwing storage means compact", () => {
    storage({ [DETAILS_KEY]: "1" });
    expect(readDetailsOpen()).toBe(true);
    storage({ [DETAILS_KEY]: "0" });
    expect(readDetailsOpen()).toBe(false);
    storage({});
    expect(readDetailsOpen()).toBe(false);
    storage({}, true);
    expect(readDetailsOpen()).toBe(false);
  });

  it("rememberDetailsOpen writes «1» / «0» under ledger:detailsOpen and never throws", () => {
    const { sets } = storage();
    rememberDetailsOpen(true);
    rememberDetailsOpen(false);
    expect(sets).toEqual([
      ["ledger:detailsOpen", "1"],
      ["ledger:detailsOpen", "0"],
    ]);
    storage({}, true);
    expect(() => rememberDetailsOpen(true)).not.toThrow();
  });

  it("S7: an auto-open render writes nothing to storage — only the user's toggle remembers", () => {
    const { sets } = storage();
    html(createElement(EntryDetails, { ...formProps, initial: { ...ROW, note: "ملاحظة" }, linkKey: 0 }));
    html(createElement(EntryDetails, { ...formProps, presetProjectId: "proj_1", linkKey: 0 }));
    html(createElement(EntryDetails, { ...formProps, fieldErrors: { note: "err.noteLong" }, linkKey: 0 }));
    expect(sets).toEqual([]);
    // Statically: the one call to rememberDetailsOpen sits in the toggle handler, not in an effect.
    const source = readFileSync("src/features/transactions/components/EntryDetails.tsx", "utf8");
    expect(source.match(/rememberDetailsOpen\(/g)).toHaveLength(1);
    expect(source).toMatch(/const toggle = \(\) => \{\s*const next = !open;\s*setOpen\(next\);\s*rememberDetailsOpen\(next\);\s*\};/);
    expect(source).toMatch(/readDetailsOpen\(\)/);
  });
});

describe("the restructure (D24, D27)", () => {
  it("TransactionForm.tsx ends below 250 lines", () => {
    const lines = readFileSync("src/features/transactions/components/TransactionForm.tsx", "utf8").trimEnd().split("\n").length; // as `wc -l`
    expect(lines).toBeLessThan(250);
  });

  it("presetPartyId does not join the `preset` that suppresses the remembered direction", () => {
    const source = readFileSync("src/features/transactions/components/TransactionForm.tsx", "utf8");
    expect(source).toContain("const preset = Boolean(presetProjectId || payment);");
    // The form no longer renders the link fields or the note itself: EntryDetails owns them.
    expect(source).not.toContain("<LinkFields");
    expect(source).not.toContain("<Textarea");
    expect(source).toMatch(/<EntryDetails[\s\S]*presetPartyId=\{presetPartyId\}[\s\S]*linkKey=\{linkKey\}/);
  });
});
