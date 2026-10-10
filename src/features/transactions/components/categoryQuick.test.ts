import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { CategoryRow } from "@/features/settings/queries";
import { t } from "@/i18n/ar";

/**
 * v1.4 §A — categories managed from the entry form (docs/V14-SPEC.md A1–A6,
 * D12, D17 c5, K4–K7). The rules live in `categoryList.ts` (pure) and are pinned
 * there; the renders pin what reaches staff and that nothing of the quick
 * actions can submit the entry form. First render test in the repo: node
 * environment, `createElement` + `renderToStaticMarkup`, no DOM library (C1).
 */

const calls = vi.hoisted(() => ({ created: [] as FormData[], toggled: [] as Array<[string, boolean]> }));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => undefined, refresh: () => undefined }),
}));
vi.mock("@/features/settings/actions", () => ({
  createCategory: async (_prev: unknown, form: FormData) => {
    calls.created.push(form);
    return { ok: true, data: { id: "cat_new", nameAr: "جديد", type: "OUT" } };
  },
  setCategoryActive: async (id: string, active: boolean) => {
    calls.toggled.push([id, active]);
    return { ok: true, data: null };
  },
}));
vi.mock("@/features/payroll/privacy", () => ({
  withSalaryHidden: async (_est: string, where: unknown) => where,
}));
vi.mock("@/lib/db", () => {
  const dbCalls: Array<{ method: string; args: Record<string, unknown> }> = [];
  const canned = {
    id: "tx_1",
    date: new Date(Date.UTC(2026, 8, 1)),
    direction: "OUT",
    amountHalalas: 5000,
    categoryId: "cat_hidden",
    paymentMethod: "CASH",
    counterparty: null,
    note: null,
    partyId: null,
    projectId: null,
    instalmentId: null,
    planId: null,
    // Inactive on the Category row — the select omits it, the ledger must not.
    category: { nameAr: "قديم" },
    createdBy: { firstName: "سارة", middleName: null, lastName: "" },
    party: null,
    project: null,
  };
  const transaction = new Proxy(
    {},
    {
      get: (_t, method: string) => async (args: Record<string, unknown> = {}) => {
        dbCalls.push({ method, args });
        if (method === "findMany") return [canned];
        if (method === "count") return 1;
        if (method === "groupBy") return [];
        return { _sum: { amountHalalas: null } };
      },
    },
  );
  return { db: { transaction }, dbCalls };
});

const { TransactionForm } = await import("./TransactionForm");
const { CategoryQuickActions, CategoryAddBox } = await import("./CategoryQuickActions");
const { CategoryChips } = await import("./CategoryChips");
const { categoryOptions } = await import("./categoryOptions");
const { activeOf, applyAdded, applyHidden, applyShown, fillName, hiddenOf, quickCreateForm, swallowEnter } =
  await import("./categoryList");

const cat = (id: string, type: "IN" | "OUT", active = true, sortOrder = 1): CategoryRow => ({
  id,
  nameAr: `تصنيف ${id}`,
  type,
  active,
  sortOrder,
});

const LIST: CategoryRow[] = [
  cat("in_a", "IN", true, 1),
  cat("in_hidden", "IN", false, 2),
  cat("out_a", "OUT", true, 1),
  cat("out_b", "OUT", true, 2),
  cat("out_hidden", "OUT", false, 3),
];

const noop = () => undefined;

const formProps = {
  mode: "new" as const,
  action: async () => ({ ok: true as const, data: null }),
  categories: LIST,
  parties: [],
  projects: [],
  lockedMonths: ["2026-01"],
  today: "2026-10-10",
  doneHref: "/owner/transactions",
};

const html = (element: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(element);

const ROW = {
  id: "tx_1",
  date: "2026-01-15",
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

describe("A2 — the quick actions reach the owner's form only", () => {
  it("a staff render (no manageCategories) has neither link", () => {
    const out = html(createElement(TransactionForm, formProps));
    expect(out).not.toContain(t.categoryQuick.add);
    expect(out).not.toContain(t.categoryQuick.edit);
  });

  it("the owner render has both links, and still exactly one <form>", () => {
    const out = html(createElement(TransactionForm, { ...formProps, manageCategories: true }));
    expect(out).toContain(t.categoryQuick.add);
    expect(out).toContain(t.categoryQuick.edit);
    expect(out.match(/<form/g)).toHaveLength(1);
    // A1: the select itself is the same element with the same placeholder.
    expect(out).toContain('name="categoryId"');
    expect(out).toContain(t.transaction.chooseCategory);
  });

  it("payment mode hides the links (the category is the plan's, D12)", () => {
    const out = html(
      createElement(TransactionForm, { ...formProps, manageCategories: true, payment: { direction: "IN" } }),
    );
    expect(out).not.toContain(t.categoryQuick.add);
  });

  it("a locked original hides the links and, for the owner only, links the notice to the locks page (c4)", () => {
    const locked = { ...formProps, mode: "edit" as const, initial: ROW };
    const owner = html(createElement(TransactionForm, { ...locked, manageCategories: true }));
    expect(owner).not.toContain(t.categoryQuick.add);
    expect(owner).toContain('href="/owner/settings/locks"');
    expect(owner).toContain(t.navItem.locks);
    const staff = html(createElement(TransactionForm, locked));
    expect(staff).toContain(t.lock.blockedTitle);
    expect(staff).not.toContain('href="/owner/settings/locks"');
  });

  it("statically: no staff page passes manageCategories; both owner form pages do", () => {
    const files = (dir: string): string[] =>
      readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        return statSync(path).isDirectory() ? files(path) : path.endsWith(".tsx") ? [path] : [];
      });
    const staff = files("src/app/(staff)").filter((f) => readFileSync(f, "utf8").includes("manageCategories"));
    expect(staff).toEqual([]);
    for (const page of ["src/app/(owner)/owner/transactions/new/page.tsx", "src/app/(owner)/owner/transactions/[id]/edit/page.tsx"]) {
      expect(readFileSync(page, "utf8")).toMatch(/\bmanageCategories\b/);
    }
  });
});

describe("A3 — adding appends to the current direction and selects it", () => {
  it("applyAdded puts the row in its own direction only and returns it as the selection", () => {
    const row = { id: "out_new", nameAr: "صيانة", type: "OUT" as const };
    const { categories, selected } = applyAdded(LIST, row);
    expect(selected).toBe("out_new");
    expect(categoryOptions(categories, "OUT").map((o) => o.value)).toContain("out_new");
    expect(categoryOptions(categories, "IN").map((o) => o.value)).not.toContain("out_new");
    expect(activeOf(categories, "IN")).toEqual(activeOf(LIST, "IN"));
    // After the last of its direction, as the server orders it.
    expect(categories.find((c) => c.id === "out_new")?.sortOrder).toBe(4);
  });

  it("a revived row is replaced in place (K4 upsert), never duplicated", () => {
    const { categories, selected } = applyAdded(LIST, { id: "out_hidden", nameAr: "تصنيف out_hidden", type: "OUT" });
    expect(selected).toBe("out_hidden");
    expect(categories).toHaveLength(LIST.length);
    expect(categories.filter((c) => c.id === "out_hidden")).toHaveLength(1);
    expect(categories.find((c) => c.id === "out_hidden")?.active).toBe(true);
    expect(categoryOptions(categories, "OUT").filter((o) => o.value === "out_hidden")).toHaveLength(1);
  });

  it("quickCreateForm posts the typed name with the form's current direction", () => {
    const form = quickCreateForm("صيانة", "IN");
    expect(form.get("nameAr")).toBe("صيانة");
    expect(form.get("type")).toBe("IN");
  });
});

describe("A4 — hiding removes the option and resets a selection that pointed at it", () => {
  it("the option leaves; a selected one resets to the placeholder, an unselected one leaves the selection alone", () => {
    const hidden = applyHidden(LIST, "out_a", "out_a", "OUT");
    expect(categoryOptions(hidden.categories, "OUT").map((o) => o.value)).not.toContain("out_a");
    expect(hidden.selected).toBe("");
    expect(hidden.categories).toHaveLength(LIST.length); // never deleted — «إظهار» needs it

    const other = applyHidden(LIST, "out_a", "out_b", "OUT");
    expect(other.selected).toBe("out_b");
  });

  it("K4: the entry's own category stays listed as «(موقوف)» and selected when hidden on the edit form", () => {
    const { categories, selected } = applyHidden(LIST, "out_a", "out_a", "OUT", "out_a");
    expect(selected).toBe("out_a");
    const option = categoryOptions(categories, "OUT", "out_a").find((o) => o.value === "out_a");
    expect(option?.label).toBe(`تصنيف out_a (${t.status.DISABLED})`);
  });

  it("c5: applyShown brings the option back without touching the selection", () => {
    const shown = applyShown(LIST, "out_hidden");
    expect(categoryOptions(shown, "OUT").map((o) => o.value)).toContain("out_hidden");
  });

  it("c5 (F8): applyShown flips only the asked row — a second hidden row of the same direction stays hidden", () => {
    // Two hidden IN rows: a mutant that activates every row would pass the case above.
    const two = [...LIST, cat("in_hidden_2", "IN", false, 3)];
    const shown = applyShown(two, "in_hidden_2");
    expect(shown).toHaveLength(two.length);
    expect(shown.find((c) => c.id === "in_hidden_2")?.active).toBe(true);
    expect(shown.filter((c) => !c.active).map((c) => c.id)).toEqual(["in_hidden", "out_hidden"]);
    // The other direction is untouched, row for row.
    expect(shown.filter((c) => c.type === "OUT")).toEqual(two.filter((c) => c.type === "OUT"));
    expect(activeOf(shown, "OUT")).toEqual(activeOf(two, "OUT"));
    // applyShown returns only the list — it has no selection to touch, so the form keeps its own.
    expect(categoryOptions(shown, "IN").map((o) => o.value)).toEqual(["in_a", "in_hidden_2"]);
  });

  it("the ledger still names a hidden category: listTransactions reads the Category row with no active filter", async () => {
    const { listTransactions } = await import("@/features/transactions/queries");
    const { dbCalls } = (await import("@/lib/db")) as unknown as {
      dbCalls: Array<{ method: string; args: { where?: Record<string, unknown> } }>;
    };
    const page = await listTransactions("est_1", { page: 1 });
    expect(page.rows[0]?.categoryNameAr).toBe("قديم");
    const where = dbCalls.find((c) => c.method === "findMany")?.args.where;
    expect(where).toBeDefined();
    expect(where?.category).toBeUndefined();
    expect(JSON.stringify(where)).not.toContain('"active"');
  });
});

describe("K7 / c5 — the chips", () => {
  const chips = (list: CategoryRow[], direction: "IN" | "OUT") =>
    html(createElement(CategoryChips, { categories: list, direction, onHidden: noop, onShown: noop, onDone: noop }));

  it("a direction's last active category has its ✕ disabled with the reason; two active → none disabled", () => {
    const one = chips(LIST, "IN");
    expect(one.match(/<button[^>]*aria-label="[^"]*"[^>]*disabled=""/g)).toHaveLength(1);
    expect(one).toContain(t.err.lastActiveCategory);

    const two = chips(LIST, "OUT");
    expect(two.match(/<button[^>]*aria-label="[^"]*"[^>]*disabled=""/g)).toBeNull();
    expect(two).not.toContain(t.err.lastActiveCategory);
    expect(two).toContain(fillName(t.categoryQuick.hide, "تصنيف out_a"));
  });

  it("hidden chips are listed for the current direction only, each with «إظهار»", () => {
    const out = chips(LIST, "OUT");
    expect(out).toContain(t.categoryQuick.hiddenChipsLabel);
    expect(out).toContain("تصنيف out_hidden");
    expect(out).not.toContain("تصنيف in_hidden");
    // The button, not the word: «المزيد (…، إظهار)» names it too.
    expect(out.match(new RegExp(`<button[^>]*>${t.categoryQuick.show}</button>`, "g"))).toHaveLength(1);
    expect(hiddenOf(LIST, "IN").map((c) => c.id)).toEqual(["in_hidden"]);
  });

  it("wiggles via the shared class, and the «المزيد» link points at the settings page", () => {
    const out = chips(LIST, "OUT");
    expect(out).toContain("v14-wiggle");
    expect(out).toContain('href="/owner/settings/categories"');
    expect(out).toContain(t.categoryQuick.more);
    expect(out).toContain(t.categoryQuick.done);
  });

  it("a server refusal on hide or show is shown under the chip, not swallowed (static, anchored)", () => {
    const source = readFileSync("src/features/transactions/components/CategoryChips.tsx", "utf8");
    const shown = source.match(/if \(!result\.ok\) \{\s*(?:\/\/[^\n]*\n\s*)?setError\(\{ id: row\.id, key: result\.error \}\);\s*return;\s*\}/g);
    expect(shown).toHaveLength(2);
    expect(source).toContain('role="alert"');
  });
});

describe("K6 — nothing of the quick actions can submit the entry form", () => {
  const rendered = [
    html(createElement(CategoryQuickActions, { direction: "OUT", categories: LIST, selected: "", onCategories: noop, onSelect: noop })),
    html(createElement(CategoryAddBox, { name: "", error: null, pending: false, onName: noop, onSave: noop, onCancel: noop })),
    html(createElement(CategoryChips, { categories: LIST, direction: "OUT", onHidden: noop, onShown: noop, onDone: noop })),
    html(createElement(CategoryAddBox, { name: "x", error: "err.nameShort", pending: false, onName: noop, onSave: noop, onCancel: noop })),
  ];

  it("renders no <form>, no submit button, and every <button> is type=button", () => {
    for (const out of rendered) {
      expect(out).not.toContain("<form");
      expect(out).not.toContain('type="submit"');
      const buttons = out.match(/<button[^>]*>/g) ?? [];
      expect(buttons.length).toBeGreaterThan(0);
      for (const button of buttons) expect(button).toContain('type="button"');
      expect(out).toContain("no-print");
    }
  });

  it("the name input is labelled, has no name attribute, and shows the error under the box", () => {
    const box = rendered[1];
    expect(box).toContain('<label for="category-quick-name"');
    expect(box).toContain(t.categoryQuick.name);
    const input = box.match(/<input[^>]*>/)?.[0] ?? "";
    expect(input).toContain('id="category-quick-name"');
    expect(input).not.toMatch(/\sname=/);
    expect(rendered[3]).toContain(`role="alert"`);
    expect(rendered[3]).toContain(t.err.nameShort);
  });

  it("swallowEnter: Enter is prevented and saves; any other key passes through", () => {
    let prevented = 0;
    let saved = 0;
    const event = (key: string) => ({ key, preventDefault: () => void (prevented += 1) });
    swallowEnter(event("Enter"), () => void (saved += 1));
    expect([prevented, saved]).toEqual([1, 1]);
    swallowEnter(event("a"), () => void (saved += 1));
    expect([prevented, saved]).toEqual([1, 1]);
  });

  it("fillName is $&-safe", () => {
    expect(fillName("إخفاء {name}", "$&")).toBe("إخفاء $&");
  });
});
