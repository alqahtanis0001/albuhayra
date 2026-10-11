import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { PartyOption } from "@/features/parties/queries";
import { t } from "@/i18n/ar";

/**
 * v1.4 part 2 — the inline «+ جهة جديدة» box (docs/V14-SPEC.md D23, D27
 * S1–S6). The rules live in `partyList.ts` and `applyPartyChoice` (pure) and
 * are pinned there (`quickPartyList.ts` — not `partyList.ts`: Next tries `.tsx` before `.ts`, and on a
 * case-insensitive filesystem that name would resolve to the existing `PartyList.tsx`); the renders pin what reaches staff, that the sentinel never
 * posts, that a locked party offers no sentinel, and that nothing of the box
 * can submit the form around it. Render tests as `categoryQuick.test.ts` (C1).
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

const { TransactionForm } = await import("@/features/transactions/components/TransactionForm");
const { LinkFields } = await import("@/features/transactions/components/LinkFields");
const { PlanForm } = await import("@/features/plans/components/PlanForm");
const { OpenPlanForm } = await import("@/features/plans/components/OpenPlanForm");
const { applyPartyChoice } = await import("@/features/plans/components/PlanPartySelect");
const { EntryDetails } = await import("@/features/transactions/components/EntryDetails");
const { PartyAddBox, PartyQuickAdd } = await import("./PartyQuickAdd");
const { NEW_PARTY, QUICK_PARTY_TYPES, addedParty, applyAddedParty, postedPartyId, quickPartyForm, shownPartyChoice } =
  await import("./quickPartyList");

const html = (element: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(element);
const noop = () => undefined;
const esc = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const PARTIES: PartyOption[] = [
  { id: "party_1", name: "شركة مراد", type: "SUPPLIER", active: true },
  { id: "party_2", name: "عميل أول", type: "CUSTOMER", active: true },
  { id: "party_old", name: "قديم", type: "CUSTOMER", active: false },
];
const NEW_ROW: PartyOption = { id: "party_new", name: "مورد جديد", type: "SUPPLIER", active: true };

const CATEGORIES = [
  { id: "in_a", nameAr: "مبيعات", type: "IN" as const, active: true, sortOrder: 1 },
  { id: "out_a", nameAr: "صيانة", type: "OUT" as const, active: true, sortOrder: 1 },
];

const formProps = {
  mode: "new" as const,
  action: async () => ({ ok: true as const, data: null }),
  categories: CATEGORIES,
  parties: PARTIES,
  projects: [],
  lockedMonths: [],
  today: "2026-10-11",
  doneHref: "/owner/transactions",
};

const planInitial = {
  partyId: "",
  direction: "" as const,
  title: "",
  total: "",
  categoryId: "",
  startDate: "2026-10-11",
  reminderDays: "3",
  notes: "",
  rows: [],
};
const FIXED_ROW = { key: "r1", id: "i_1", dueDate: "2026-11-01", amount: "100.00", fixed: true };
const planProps = { action: async () => ({ ok: true as const, data: null }), parties: PARTIES, categories: CATEGORIES, initial: planInitial };
const openInitial = { partyId: "", direction: "" as const, title: "", total: "", categoryId: "", startDate: "2026-10-11", expectedEndDate: "", notes: "" };
const openProps = { ...planProps, initial: openInitial, today: "2026-10-11" };

/** The party select's markup (`id="partyChoice"` on the entry form, `id="partyId"` on the plan forms). */
const partySelect = (out: string, id: string) => out.match(new RegExp(`<select[^>]*id="${id}"[^>]*>`))?.[0] ?? "";

describe("D23 — the sentinel reaches the owner's forms only", () => {
  it("staff renders (no manageParties) of the three forms have no «+ جهة جديدة»", () => {
    for (const out of [
      html(createElement(TransactionForm, formProps)),
      html(createElement(PlanForm, planProps)),
      html(createElement(OpenPlanForm, openProps)),
    ]) {
      expect(out).not.toContain(t.partyQuick.add);
      expect(out).not.toContain(NEW_PARTY);
    }
  });

  it("owner renders (manageParties) offer it as the very last option, and still exactly one <form>", () => {
    for (const out of [
      html(createElement(TransactionForm, { ...formProps, manageParties: true })),
      html(createElement(PlanForm, { ...planProps, manageParties: true })),
      html(createElement(OpenPlanForm, { ...openProps, manageParties: true })),
    ]) {
      expect(out).toContain(t.partyQuick.add);
      expect(out.match(/<form/g)).toHaveLength(1);
      // Last: nothing but the select's closing tag follows the sentinel option.
      expect(out).toMatch(new RegExp(`<option value="${NEW_PARTY}">${esc(t.partyQuick.add)}</option></select>`));
    }
  });

  it("a locked party offers no sentinel: a fixed instalment on PlanForm, `locked` on OpenPlanForm", () => {
    const fixed = html(createElement(PlanForm, { ...planProps, manageParties: true, planId: "plan_1", initial: { ...planInitial, partyId: "party_1", rows: [FIXED_ROW] } }));
    expect(fixed).not.toContain(t.partyQuick.add);
    expect(partySelect(fixed, "partyId")).toContain("disabled");
    expect(fixed).toMatch(/<input type="hidden" name="partyId" value="party_1"/);

    const locked = html(createElement(OpenPlanForm, { ...openProps, manageParties: true, planId: "plan_1", locked: true, initial: { ...openInitial, partyId: "party_1" } }));
    expect(locked).not.toContain(t.partyQuick.add);
    expect(locked).toMatch(/<input type="hidden" name="partyId" value="party_1"/);

    // Unlocked edit of the same plan: offered.
    const open = html(createElement(OpenPlanForm, { ...openProps, manageParties: true, planId: "plan_1", initial: { ...openInitial, partyId: "party_1" } }));
    expect(open).toContain(t.partyQuick.add);
  });

  it("payment mode on the entry form renders no party select at all, so nothing to offer", () => {
    const out = html(createElement(TransactionForm, { ...formProps, manageParties: true, payment: { direction: "OUT" } }));
    expect(out).not.toContain('id="partyChoice"');
    expect(out).not.toContain(t.partyQuick.add);
  });

  it("statically: no staff page mentions manageParties; the four owner form pages pass it", () => {
    const files = (dir: string): string[] =>
      readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        return statSync(path).isDirectory() ? files(path) : path.endsWith(".tsx") ? [path] : [];
      });
    expect(files("src/app/(staff)").filter((f) => readFileSync(f, "utf8").includes("manageParties"))).toEqual([]);
    for (const page of [
      "src/app/(owner)/owner/transactions/new/page.tsx",
      "src/app/(owner)/owner/transactions/[id]/edit/page.tsx",
      "src/app/(owner)/owner/plans/new/page.tsx",
      "src/app/(owner)/owner/plans/[id]/edit/page.tsx",
    ]) {
      expect(readFileSync(page, "utf8")).toMatch(/\bmanageParties\b/);
    }
    // Both plan variants on each plans page.
    expect(readFileSync("src/app/(owner)/owner/plans/new/page.tsx", "utf8").match(/\bmanageParties\b/g)).toHaveLength(2);
    expect(readFileSync("src/app/(owner)/owner/plans/[id]/edit/page.tsx", "utf8").match(/\bmanageParties\b/g)).toHaveLength(2);
  });
});

describe("D23 — the sentinel never posts (S6)", () => {
  it("postedPartyId: \"\" for the sentinel, the id otherwise", () => {
    expect(postedPartyId(NEW_PARTY)).toBe("");
    expect(postedPartyId("party_1")).toBe("party_1");
    expect(postedPartyId("")).toBe("");
  });

  it("the plan forms' select has no name; a hidden partyId input posts the choice, \"\" while the sentinel is chosen", () => {
    for (const [out, chosen] of [
      [html(createElement(PlanForm, { ...planProps, manageParties: true, initial: { ...planInitial, partyId: NEW_PARTY } })), ""],
      [html(createElement(PlanForm, { ...planProps, manageParties: true, initial: { ...planInitial, partyId: "party_1" } })), "party_1"],
      [html(createElement(OpenPlanForm, { ...openProps, manageParties: true, initial: { ...openInitial, partyId: NEW_PARTY } })), ""],
      [html(createElement(OpenPlanForm, { ...openProps, initial: { ...openInitial, partyId: "party_2" } })), "party_2"],
    ] as const) {
      const select = partySelect(out, "partyId");
      expect(select).not.toBe("");
      expect(select).not.toMatch(/\sname=/);
      expect(out.match(/<input type="hidden" name="partyId" value="([^"]*)"/)?.[1]).toBe(chosen);
    }
  });

  it("the entry form's hidden partyId is \"\" while the sentinel is chosen, and the box is open", () => {
    const out = html(createElement(LinkFields, { parties: PARTIES, projects: [], initial: { partyId: NEW_PARTY, counterparty: null, projectId: null }, manageParties: true }));
    expect(out).toMatch(/<input type="hidden" name="partyId" value=""/);
    expect(out).toContain(t.partyQuick.name);
    // Without manageParties the same initial renders no box.
    const staff = html(createElement(LinkFields, { parties: PARTIES, projects: [], initial: { partyId: NEW_PARTY, counterparty: null, projectId: null } }));
    expect(staff).not.toContain(t.partyQuick.name);
  });
});

describe("D23 — the added party joins the list and is selected", () => {
  it("applyAddedParty appends an unknown row once and replaces a known id in place", () => {
    const once = applyAddedParty(PARTIES, NEW_ROW);
    expect(once).toHaveLength(PARTIES.length + 1);
    expect(once.at(-1)).toEqual(NEW_ROW);
    const twice = applyAddedParty(once, { ...NEW_ROW, name: "مورد جديد ٢" });
    expect(twice).toHaveLength(PARTIES.length + 1);
    expect(twice.filter((p) => p.id === "party_new")).toHaveLength(1);
    expect(twice.find((p) => p.id === "party_new")?.name).toBe("مورد جديد ٢");
    // A revived namesake listed as inactive comes back active, in place.
    const revived = applyAddedParty(PARTIES, { ...PARTIES[2], active: true });
    expect(revived).toHaveLength(PARTIES.length);
    expect(revived[2]).toEqual({ ...PARTIES[2], active: true });
    expect(PARTIES[2].active).toBe(false); // the input is untouched
  });

  it("S3: a party added before «حفظ وإضافة أخرى» is still offered after the link fields remount", () => {
    const list = applyAddedParty(PARTIES, NEW_ROW);
    for (const linkKey of [0, 1]) {
      const out = html(createElement(EntryDetails, { parties: list, projects: [], linkKey, manageParties: true }));
      expect(out).toContain(`<option value="party_new">${NEW_ROW.name}</option>`);
    }
    // The list is EntryDetails' state (not LinkFields', which linkKey remounts), fed through `applyAddedParty`.
    const source = readFileSync("src/features/transactions/components/EntryDetails.tsx", "utf8");
    expect(source).toContain("const [partyList, setPartyList] = useState(parties);");
    expect(source).toMatch(/<LinkFields\s+key=\{linkKey\}\s+parties=\{partyList\}/);
    expect(source).toMatch(/onPartyAdded=\{\(row\) => \{\s*setPartyList\(\(list\) => applyAddedParty\(list, row\)\);/);
  });

  it("applyPartyChoice: the new row sets the direction from its type, the category survives only when it fits", () => {
    const list = applyAddedParty(PARTIES, NEW_ROW);
    const v = { partyId: "", direction: "" as const, categoryId: "" };
    expect(applyPartyChoice(v, "party_new", list)).toEqual({ partyId: "party_new", direction: "OUT", categoryId: "" });
    expect(applyPartyChoice(v, "party_2", list)).toEqual({ partyId: "party_2", direction: "IN", categoryId: "" });
    expect(applyPartyChoice(v, "other_x", [...list, { id: "other_x", name: "أخرى", type: "OTHER", active: true }])).toEqual({ partyId: "other_x", direction: "", categoryId: "" });
    // Same direction keeps the category; a flipped one clears it.
    const out = { partyId: "party_1", direction: "OUT" as const, categoryId: "out_a" };
    expect(applyPartyChoice(out, "party_new", list).categoryId).toBe("out_a");
    expect(applyPartyChoice(out, "party_2", list).categoryId).toBe("");
    // The lookup is in the list it is given: a row missing from it is «no party».
    expect(applyPartyChoice(v, "party_new", PARTIES)).toEqual({ partyId: "party_new", direction: "", categoryId: "" });
    // The sentinel changes the choice only.
    expect(applyPartyChoice(out, NEW_PARTY, list)).toEqual({ ...out, partyId: NEW_PARTY });
  });

  it("the plan forms select and derive through the client-state list (static, anchored)", () => {
    for (const file of ["PlanForm", "OpenPlanForm"]) {
      const source = readFileSync(`src/features/plans/components/${file}.tsx`, "utf8");
      expect(source).toContain("const [partyList, setPartyList] = useState(parties);");
      expect(source).toContain("const chooseParty = (id: string, list = partyList) => setV((old) => applyPartyChoice(old, id, list));");
      expect(source).toMatch(/const list = applyAddedParty\(partyList, row\);\s*setPartyList\(list\);\s*chooseParty\(row\.id, list\);/);
      expect(source).toContain("const party = partyList.find((p) => p.id === v.partyId);");
    }
    const link = readFileSync("src/features/transactions/components/LinkFields.tsx", "utf8");
    expect(link).toMatch(/onAdded=\{\(row\) => \{\s*setAdding\(false\);\s*onPartyAdded\?\.\(row\);\s*setParty\(row\.id\);\s*\}\}/);
  });

  it("S5: addedParty carries the schema-normalised name; quickPartyForm posts name and type only", () => {
    expect(addedParty("p", "  شركة‏   مراد ", "SUPPLIER")).toEqual({ id: "p", name: "شركة مراد", type: "SUPPLIER", active: true });
    expect(addedParty("p", " x ", "OTHER").name).toBe("x"); // too short for the schema → trimmed as typed
    const form = quickPartyForm("شركة مراد", "CUSTOMER");
    expect([...form.keys()].sort()).toEqual(["name", "type"]);
    expect(form.get("type")).toBe("CUSTOMER");
  });
});

describe("R-p2-1 — opening the box by mistake and cancelling leaves the form as it was", () => {
  it("shownPartyChoice: the select shows the sentinel only while adding, and posts \"\" then", () => {
    expect(shownPartyChoice("party_1", true)).toBe(NEW_PARTY);
    expect(shownPartyChoice("party_1", false)).toBe("party_1");
    expect(postedPartyId(shownPartyChoice("party_1", true))).toBe("");
    expect(postedPartyId(shownPartyChoice("party_1", false))).toBe("party_1");
  });

  it("applyPartyChoice round-trips through the sentinel: choosing it then the old party gives the old form back", () => {
    const list = applyAddedParty(PARTIES, NEW_ROW);
    for (const v of [
      { partyId: "party_1", direction: "OUT" as const, categoryId: "out_a" },
      { partyId: "party_2", direction: "IN" as const, categoryId: "in_a" },
      { partyId: "", direction: "" as const, categoryId: "" },
    ]) {
      expect(applyPartyChoice(applyPartyChoice(v, NEW_PARTY, list), v.partyId, list)).toEqual(v);
    }
  });

  it("the components never write the sentinel into the form's choice: cancel only closes the box (static, anchored)", () => {
    const plan = readFileSync("src/features/plans/components/PlanPartySelect.tsx", "utf8");
    expect(plan).toContain("onChange={(e) => (e.target.value === NEW_PARTY ? setAdding(true) : (setAdding(false), onChoose(e.target.value)))}");
    expect(plan).toContain("onCancel={() => setAdding(false)}");
    expect(plan).not.toContain('onChoose("")');
    expect(plan).toContain("value={postedPartyId(shown)}");
    const link = readFileSync("src/features/transactions/components/LinkFields.tsx", "utf8");
    expect(link).toContain("onChange={(e) => (e.target.value === NEW_PARTY ? setAdding(true) : (setAdding(false), setParty(e.target.value)))}");
    expect(link).toContain("onCancel={() => setAdding(false)}");
    expect(link).not.toContain('setParty("")');
    expect(link).toContain('value={shown === OTHER ? "" : postedPartyId(shown)}');
  });

  it("N: a locked month (disabled select) offers no sentinel on the entry form either", () => {
    const base = { parties: PARTIES, projects: [], initial: { partyId: "party_1", counterparty: null, projectId: null }, manageParties: true };
    expect(html(createElement(LinkFields, { ...base, disabled: true }))).not.toContain(t.partyQuick.add);
    expect(html(createElement(LinkFields, base))).toContain(t.partyQuick.add);
  });

  it("N: the success toast is the caller's, rendered outside the collapsible panel", () => {
    expect(readFileSync("src/features/parties/components/PartyQuickAdd.tsx", "utf8")).not.toContain("Toast");
    const details = readFileSync("src/features/transactions/components/EntryDetails.tsx", "utf8");
    // The panel closes, then the toast — a sibling, never a child of the `hidden` div.
    expect(details).toMatch(/<div id=\{panelId\} hidden=\{!open\}[^>]*>\s*\{fields\}\s*<\/div>\s*\{toastNode\}/);
    expect(details).toContain("setToast(t.partyQuick.added)");
    expect(readFileSync("src/features/plans/components/PlanPartySelect.tsx", "utf8")).toContain("setToast(t.partyQuick.added)");
  });
});

describe("D23 — the box: three types, no موظف, nothing that can submit the form", () => {
  const box = (error: string | null = null) =>
    html(createElement(PartyAddBox, { name: "", type: "CUSTOMER", error, pending: false, onName: noop, onType: noop, onSave: noop, onCancel: noop }));

  it("QUICK_PARTY_TYPES is exactly عميل / مورد / أخرى and the type Select lists no موظف", () => {
    expect([...QUICK_PARTY_TYPES]).toEqual(["CUSTOMER", "SUPPLIER", "OTHER"]);
    const out = box();
    expect(out).toContain(t.partyQuick.type);
    for (const type of ["CUSTOMER", "SUPPLIER", "OTHER"] as const) expect(out).toMatch(new RegExp(`<option value="${type}"[^>]*>${t.partyType[type]}</option>`));
    expect(out).not.toContain('value="EMPLOYEE"');
    expect(out).not.toContain(t.partyType.EMPLOYEE);
    expect(out).not.toContain('type="radio"');
  });

  it("no <form>, no submit, every button type=button, no name= on anything inside, labelled inputs, no-print", () => {
    for (const out of [box(), box("err.partyDuplicate"), html(createElement(PartyQuickAdd, { open: true, onAdded: noop, onCancel: noop }))]) {
      expect(out).not.toContain("<form");
      expect(out).not.toContain('type="submit"');
      expect(out).not.toMatch(/\sname=/);
      const buttons = out.match(/<button[^>]*>/g) ?? [];
      expect(buttons).toHaveLength(2);
      for (const b of buttons) expect(b).toContain('type="button"');
      expect(out).toContain("no-print");
      const labels = [...out.matchAll(/<label for="([^"]+)"/g)].map((m) => m[1]);
      expect(labels).toHaveLength(2);
      for (const id of labels) expect(out).toContain(`id="${id}"`);
    }
    expect(html(createElement(PartyQuickAdd, { open: false, onAdded: noop, onCancel: noop }))).toBe("");
  });

  it("a server refusal (err.partyDuplicate) is shown under the box with role=alert, not swallowed", () => {
    const out = box("err.partyDuplicate");
    expect(out).toContain('role="alert"');
    expect(out).toContain(t.err.partyDuplicate);
    const source = readFileSync("src/features/parties/components/PartyQuickAdd.tsx", "utf8");
    expect(source).toMatch(/if \(!result\.ok\) \{\s*setError\(result\.fieldErrors\?\.name \?\? result\.error\);\s*return;\s*\}/);
    expect(source).toContain("swallowEnter(event, onSave)");
    expect(source).toContain("createParty(null, quickPartyForm(parsed.data, type))");
  });
});
