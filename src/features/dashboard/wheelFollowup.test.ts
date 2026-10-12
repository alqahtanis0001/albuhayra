import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { REPORTS_HREF } from "@/app/(owner)/owner/transactions/(list)/ledgerTab";
import { PALETTE } from "@/components/visualPalette";
import { t } from "@/i18n/ar";

import { categoryColour } from "./categoryColours";
import { donutSlices } from "./visuals";
import { buildWheelModel, type WheelInput } from "./wheelModel";
import { ROW_HREF, monthLedgerHref } from "./wheelHrefs";

/**
 * v1.5 follow-up (docs/V15-SPEC.md D47, D48): ring 2 and the expense donut
 * share one colour per category; each explanation row carries a «عرض» link
 * to its ring's page, beside (never inside) the focus button.
 */

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => undefined }) }));

const { ExpenseDonut } = await import("./components/ExpenseDonut");
const { WheelRows } = await import("@/components/WheelRows");

/** Six categories: the top five plus «أخرى» (the sixth and the uncategorised rest). */
const TOP = [
  { categoryId: "c1", nameAr: "إيجار", totalHalalas: 300_000 },
  { categoryId: "c2", nameAr: "رواتب", totalHalalas: 200_000 },
  { categoryId: "c3", nameAr: "كهرباء", totalHalalas: 100_000 },
  { categoryId: "c4", nameAr: "نقل", totalHalalas: 80_000 },
  { categoryId: "c5", nameAr: "صيانة", totalHalalas: 50_000 },
  { categoryId: "c6", nameAr: "ضيافة", totalHalalas: 20_000 },
];
const MONTH_OUT = 800_000;

const INPUT: WheelInput = {
  today: "2026-10-11", hasEntry: true, balanceTotalHalalas: 1_245_000, monthNetHalalas: 20_000,
  prevMonthToDateNetHalalas: 10_000, monthInHalalas: 820_000, monthOutHalalas: MONTH_OUT,
  topOutCategories: TOP,
  overview: {
    commitments: { toUsHalalas: 950_000, fromUsHalalas: 420_000, salariesHalalas: 1_200_000 },
    dial: [{ instalmentId: "a", planId: "p1", employeeId: null, partyName: "النور", kind: "IN", remainingHalalas: 250_000, dueDate: "2026-10-15", dayOffset: 4 }],
    overdue: { recent: [], count: 0, totalHalalas: 0 },
  },
};

const EMPTY: WheelInput = {
  ...INPUT, hasEntry: false, monthInHalalas: 0, monthOutHalalas: 0, topOutCategories: [], balanceTotalHalalas: 0,
  monthNetHalalas: 0, prevMonthToDateNetHalalas: 0,
  overview: { commitments: { toUsHalalas: 0, fromUsHalalas: 0, salariesHalalas: 0 }, dial: [], overdue: { recent: [], count: 0, totalHalalas: 0 } },
};

const swatchColours = (html: string) =>
  [...html.matchAll(/<span aria-hidden="true" class="[^"]*" style="background-color:([^"]+)"/g)].map((m) => m[1]);

const rowsHtml = (input: WheelInput) =>
  renderToStaticMarkup(createElement(WheelRows, { model: buildWheelModel(input, t.wheel), focused: null, animate: false, onRow: () => undefined }));

describe("D47: one colour per category — ring 2 = the donut", () => {
  const slices = donutSlices(TOP, MONTH_OUT, t.dashVisual.donutOther).map((s) => ({ ...s, href: null }));
  const donut = renderToStaticMarkup(createElement(ExpenseDonut, { slices, totalHalalas: MONTH_OUT }));
  const ring2 = buildWheelModel(INPUT, t.wheel).rings[1].segments;

  it("the same top-5 + «أخرى» order, and for each rank ring 2's colour is the donut's", () => {
    expect(ring2.map((s) => s.id)).toEqual(["r2:c1", "r2:c2", "r2:c3", "r2:c4", "r2:c5", "r2:other"]);
    const donutColours = swatchColours(donut);
    expect(donutColours).toHaveLength(6);
    ring2.forEach((s, rank) => expect(s.colour, s.name).toBe(donutColours[rank]));
  });

  it("the category palette's order (D52): cat-1 … cat-5, «أخرى» cat-6", () => {
    expect(ring2.map((s) => s.colour)).toEqual([PALETTE.cat1, PALETTE.cat2, PALETTE.cat3, PALETTE.cat4, PALETTE.cat5, PALETTE.cat6]);
    expect(ring2.map((s) => s.colour)).toEqual([1, 2, 3, 4, 5, 6].map((n) => `var(--color-cat-${n})`));
  });

  it("«أخرى» is cat-6 at any rank; past the fifth rank is cat-6 too", () => {
    expect(categoryColour("other", 1)).toBe(PALETTE.cat6);
    expect(categoryColour("c9", 5)).toBe(PALETTE.cat6);
    const two = buildWheelModel({ ...INPUT, topOutCategories: TOP.slice(0, 1) }, t.wheel).rings[1].segments;
    expect(two.map((s) => [s.id, s.colour])).toEqual([["r2:c1", PALETTE.cat1], ["r2:other", PALETTE.cat6]]);
  });

  it("no category colour is a semantic one (D52): never money in/out, accent or gold", () => {
    const semantic = [PALETTE.in, PALETTE.out, PALETTE.green, PALETTE.gold, PALETTE.greenDark];
    for (const c of [...ring2.map((s) => s.colour), ...swatchColours(donut)]) expect(semantic).not.toContain(c);
  });

  it("row 2's swatches follow ring 2", () => {
    const row2 = rowsHtml(INPUT).split('<button type="button"')[2]!;
    expect(swatchColours(row2)).toEqual(ring2.map((s) => s.colour));
  });

  it("the arcs are stroked with the segment's colour", async () => {
    const { WheelSvg } = await import("@/components/WheelSvg");
    const { centreText } = await import("./wheelFocus");
    const model = buildWheelModel(INPUT, t.wheel);
    const handlers = { tabIndexOf: () => -1 as const, onActivate: () => undefined, onKeyDown: () => undefined, refOf: () => () => undefined };
    const svg = renderToStaticMarkup(
      createElement(WheelSvg, { model, focused: null, centre: centreText(null, model, t.wheel), centreTone: "", animate: false, handlers }),
    );
    for (const c of [PALETTE.cat1, PALETTE.cat2, PALETTE.cat3, PALETTE.cat4, PALETTE.cat5, PALETTE.cat6]) expect(svg).toContain(`stroke:${c};stroke-dasharray:1`);
  });
});

/** Each «عرض» link (React renders aria-label, class, href), in row order. */
const links = (html: string) =>
  [...html.matchAll(/<a aria-label="([^"]+)" class="([^"]+)" href="([^"]+)">([^<]+)<\/a>/g)].map((m) => ({
    href: m[3]!.replaceAll("&amp;", "&"), label: m[1], cls: m[2]!.split(" "), text: m[4],
  }));

describe("D48: each explanation row's «عرض» link", () => {
  const html = rowsHtml(INPUT);

  it("ring 1 → the ledger this month; ring 2 → the reports tab; ring 3 → الجهات; dial → المستحقات", () => {
    expect(links(html).map((l) => l.href)).toEqual([
      "/owner/transactions?from=2026-10-01&to=2026-10-31",
      "/owner/transactions?tab=reports",
      "/owner/parties",
      "/owner/dues",
    ]);
    expect(ROW_HREF.ring2).toBe(REPORTS_HREF);
    expect(monthLedgerHref("2028-02-09")).toBe("/owner/transactions?from=2028-02-01&to=2028-02-29");
  });

  it("text «عرض», accessible name «عرض: {row title}», ≥ 44 px, no-print", () => {
    const titles = [t.wheel.row1Title, t.wheel.row2Title, t.wheel.row3Title, t.wheel.row4Title];
    const found = links(html);
    expect(found).toHaveLength(4);
    found.forEach((l, i) => {
      expect(l.text).toBe(t.wheel.rowLink);
      expect(l.label).toBe(`عرض: ${titles[i]}`);
      expect(l.cls).toEqual(expect.arrayContaining(["no-print", "min-h-11", "min-w-11"]));
    });
  });

  it("QF-N3: the link sits at its own size, centred in the row — never stretched to the row's height", () => {
    for (const l of links(html)) {
      expect(l.cls.some((c) => c === "self-center" || c === "self-start"), l.cls.join(" ")).toBe(true);
      expect(l.cls).not.toEqual(expect.arrayContaining([expect.stringMatching(/^(self-stretch|h-full|self-auto)$/)]));
    }
  });

  it("the link is never inside a <button>: each row is a container with the button, then the link", () => {
    let depth = 0;
    for (const m of html.matchAll(/<(\/?)(button|a)\b/g)) {
      if (m[2] === "button") depth += m[1] ? -1 : 1;
      else if (!m[1]) expect(depth).toBe(0);
    }
    const rows = [...html.matchAll(/<div class="flex items-stretch[^"]*"[^>]*><button [^]*?<\/button><a [^>]*>[^<]*<\/a><\/div>/g)];
    expect(rows).toHaveLength(4);
    expect(html.match(/<button type="button" aria-pressed="false"/g)).toHaveLength(4);
  });

  it("D48: the links stay in the D28 empty state", () => {
    expect(links(rowsHtml(EMPTY)).map((l) => l.href)).toEqual([
      "/owner/transactions?from=2026-10-01&to=2026-10-31",
      "/owner/transactions?tab=reports",
      "/owner/parties",
      "/owner/dues",
    ]);
  });
});
