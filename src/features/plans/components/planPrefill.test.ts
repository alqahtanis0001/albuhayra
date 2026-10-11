import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

// PlanPartySelect reaches the party action (server-only) through the quick-add box.
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {} }));

import type { CategoryRow } from "@/features/settings/queries";
import { t } from "@/i18n/ar";

import { applyPartyChoice } from "./PlanPartySelect";
import { applyPlanPrefill, NO_PREFILLS, prefillCategory, prefillTitle, titlePrefillFor } from "./planPrefill";

/**
 * v1.4 part 3 — D29 R8 / D32 S7: the agreement forms prefill the title
 * «اتفاقية مع {الجهة}» and the category from the direction, replacing only an
 * empty field or the previous prefill — never the owner's own text.
 */
const cat = (id: string, nameAr: string, type: "IN" | "OUT", active = true): CategoryRow => ({ id, nameAr, type, active, sortOrder: 1 });
const CATS = [cat("in_sales", "مبيعات", "IN"), cat("in_pay", "سداد من عميل", "IN"), cat("out_rent", "إيجار", "OUT"), cat("out_buy", "مشتريات", "OUT")];
const PARTIES = [
  { id: "c1", name: "محمد", type: "CUSTOMER" as const, active: true },
  { id: "s1", name: "شركة مراد", type: "SUPPLIER" as const, active: true },
];

describe("prefillTitle", () => {
  it("fills an empty title and replaces the previous prefill, keeps the owner's text", () => {
    expect(prefillTitle("", "", "محمد")).toBe(titlePrefillFor("محمد"));
    expect(titlePrefillFor("محمد")).toBe(t.plans.titlePrefill.replace("{name}", "محمد"));
    expect(prefillTitle(titlePrefillFor("محمد"), titlePrefillFor("محمد"), "سعد")).toBe(titlePrefillFor("سعد"));
    expect(prefillTitle("عقد التوريد", titlePrefillFor("محمد"), "سعد")).toBe("عقد التوريد");
    expect(prefillTitle("عقد التوريد", "", "سعد")).toBe("عقد التوريد");
  });
});

describe("prefillCategory", () => {
  it("IN: «سداد من عميل», else «دفعة من عميل», else the first active IN; OUT: the first active OUT; none → «»", () => {
    expect(prefillCategory(CATS, "IN")).toBe("in_pay");
    expect(prefillCategory([cat("in_a", "مبيعات", "IN"), cat("in_old", "دفعة من عميل", "IN")], "IN")).toBe("in_old");
    expect(prefillCategory([cat("in_a", "مبيعات", "IN"), cat("in_b", "أخرى", "IN")], "IN")).toBe("in_a");
    // Both names present, the old one first in the list: «سداد من عميل» still wins (qa-tests p3 F6).
    expect(prefillCategory([cat("in_old", "دفعة من عميل", "IN"), cat("in_new", "سداد من عميل", "IN")], "IN")).toBe("in_new");
    expect(prefillCategory(CATS, "OUT")).toBe("out_rent");
    expect(prefillCategory(CATS, "")).toBe("");
    expect(prefillCategory([cat("in_pay", "سداد من عميل", "IN", false)], "IN")).toBe("");
    expect(prefillCategory([], "OUT")).toBe("");
  });
});

describe("applyPlanPrefill after applyPartyChoice", () => {
  const initial = { partyId: "", direction: "" as const, title: "", categoryId: "" };

  it("a customer fills the title and the receivable category; a supplier then replaces both prefills", () => {
    const a = applyPlanPrefill(applyPartyChoice(initial, "c1", PARTIES), NO_PREFILLS, "محمد", CATS);
    expect(a.values).toMatchObject({ partyId: "c1", direction: "IN", title: titlePrefillFor("محمد"), categoryId: "in_pay" });
    expect(a.prefills).toEqual({ title: titlePrefillFor("محمد"), categoryId: "in_pay" });
    const b = applyPlanPrefill(applyPartyChoice(a.values, "s1", PARTIES), a.prefills, "شركة مراد", CATS);
    expect(b.values).toMatchObject({ direction: "OUT", title: titlePrefillFor("شركة مراد"), categoryId: "out_rent" });
  });

  it("a typed title and a chosen category survive a party change", () => {
    const a = applyPlanPrefill(applyPartyChoice(initial, "c1", PARTIES), NO_PREFILLS, "محمد", CATS);
    const own = { ...a.values, title: "عقد البيع", categoryId: "in_sales" };
    const b = applyPlanPrefill(applyPartyChoice(own, "c1", PARTIES), a.prefills, "محمد", CATS);
    expect(b.values).toMatchObject({ title: "عقد البيع", categoryId: "in_sales" });
    // A party of the other direction clears the category (applyPartyChoice) and the prefill fills it again; the title stays.
    const c = applyPlanPrefill(applyPartyChoice(own, "s1", PARTIES), a.prefills, "شركة مراد", CATS);
    expect(c.values).toMatchObject({ title: "عقد البيع", categoryId: "out_rent" });
  });

  it("a direction change (no party name) prefills the cleared category and leaves the title alone", () => {
    const a = applyPlanPrefill({ ...initial, direction: "OUT", categoryId: "" }, NO_PREFILLS, undefined, CATS);
    expect(a.values).toMatchObject({ title: "", categoryId: "out_rent" });
    expect(a.prefills).toEqual({ title: "", categoryId: "out_rent" });
    const b = applyPlanPrefill({ ...a.values, direction: "IN", categoryId: "" }, a.prefills, undefined, CATS);
    expect(b.values.categoryId).toBe("in_pay");
  });

  it("both forms run the prefill on applyPartyChoice's result and on the direction change (static)", () => {
    for (const file of ["PlanForm.tsx", "OpenPlanForm.tsx"]) {
      const source = readFileSync(`src/features/plans/components/${file}`, "utf8");
      expect(source).toMatch(/applyAll\(applyPartyChoice\(v, id, list\), list\.find\(\(p\) => p\.id === id\)\?\.name\)/);
      expect(source).toMatch(/onChange=\{\(d\) => applyAll\(\{ \.\.\.v, direction: d, categoryId: "" \}, undefined\)\}/);
      expect(source).toMatch(/const \[prefills, setPrefills\] = useState\(NO_PREFILLS\)/);
    }
  });
});
