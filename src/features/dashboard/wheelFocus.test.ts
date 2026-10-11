import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { t } from "@/i18n/ar";
import { formatSAR } from "@/lib/money";

import type { DialEvent, OwnerOverview } from "./wheel";
import {
  DIM,
  INITIAL_FOCUS,
  LABEL_MAX,
  LRI,
  PDI,
  centreSub,
  centreText,
  clipLabel,
  focusReducer,
  layerOpacity,
  liveText,
  rovingIds,
  rovingMove,
  wholeRiyals,
  type FocusState,
} from "./wheelFocus";
import { buildWheelModel, dotLabel, type WheelInput } from "./wheelModel";

/** v1.5 (docs/V15-SPEC.md A1, D5, D16, D19, D25, D27–D29): focus, dimming, centre text, empty state. */

const TODAY = "2026-10-11";

function dial(over: Partial<DialEvent> & { dayOffset: number }): DialEvent {
  return {
    instalmentId: `i${over.dayOffset}`, planId: "p1", employeeId: null, partyName: "النور",
    kind: "IN", remainingHalalas: 250_000, dueDate: "2026-10-15", ...over,
  };
}

const OVERVIEW: OwnerOverview = {
  commitments: { toUsHalalas: 950_000, fromUsHalalas: 420_000, salariesHalalas: 1_200_000 },
  dial: [dial({ dayOffset: 4 }), dial({ dayOffset: 15, kind: "SALARY", employeeId: "e1", remainingHalalas: 1_200_000 })],
  overdue: { recent: [dial({ dayOffset: -3, instalmentId: "o1", kind: "OUT" })], count: 1, totalHalalas: 200_000 },
};

function input(over: Partial<WheelInput> = {}): WheelInput {
  return {
    today: TODAY, hasEntry: true, balanceTotalHalalas: 1_245_000, monthNetHalalas: 310_000,
    prevMonthToDateNetHalalas: 276_786, monthInHalalas: 820_000, monthOutHalalas: 510_000,
    topOutCategories: [
      { categoryId: "c1", nameAr: "إيجار", totalHalalas: 300_000 },
      { categoryId: "c2", nameAr: "رواتب", totalHalalas: 150_000 },
    ],
    overview: OVERVIEW, ...over,
  };
}

const model = buildWheelModel(input(), t.wheel);

describe("focusReducer (D5, D19)", () => {
  const act = (id: string, ring: 1 | 2 | 3 | 4 = 1) => ({ type: "activate" as const, id, ring, href: `/to/${id}` });

  it("first activation focuses; the same id again navigates; another id moves the focus", () => {
    const a = focusReducer(INITIAL_FOCUS, act("r1:IN"));
    expect(a).toEqual({ focused: { kind: "mark", id: "r1:IN", ring: 1 }, navigateTo: null, activated: true });
    expect(focusReducer(a, act("r1:IN")).navigateTo).toBe("/to/r1:IN");
    const b = focusReducer(a, act("r1:OUT"));
    expect(b.focused).toEqual({ kind: "mark", id: "r1:OUT", ring: 1 });
    expect(b.navigateTo).toBeNull();
  });

  it("a row focuses its whole ring and never navigates, even twice; clear and Escape reset", () => {
    const r = focusReducer(focusReducer(INITIAL_FOCUS, { type: "row", ring: 2 }), { type: "row", ring: 2 });
    expect(r).toMatchObject({ focused: { kind: "ring", ring: 2 }, navigateTo: null });
    // A row focus is not a mark focus: activating a segment after it focuses, it does not navigate.
    expect(focusReducer(r, act("r2:c1", 2)).navigateTo).toBeNull();
    const focused: FocusState = focusReducer(INITIAL_FOCUS, act("r3:toUs", 3));
    expect(focusReducer(focused, { type: "clear" }).focused).toBeNull();
    expect(focusReducer(focused, { type: "escape" }).focused).toBeNull();
  });

  it("D16/D19 dimming: the focused layer stays at 1, every other layer goes to 0.18; a dot keeps the dial lit", () => {
    expect(DIM).toBe(0.18);
    expect([1, 2, 3, 4].map((l) => layerOpacity(null, l as 1))).toEqual([1, 1, 1, 1]);
    const seg = { kind: "mark" as const, id: "r2:c1", ring: 2 as const };
    expect([1, 2, 3, 4].map((l) => layerOpacity(seg, l as 1))).toEqual([DIM, 1, DIM, DIM]);
    const dot = { kind: "mark" as const, id: "i:i4", ring: 4 as const };
    expect([1, 2, 3, 4].map((l) => layerOpacity(dot, l as 1))).toEqual([DIM, DIM, DIM, 1]);
  });
});

describe("the centre (D28, D29)", () => {
  it("default: the total balance in whole riyals and the net with momentum's arrow and percent", () => {
    const c = centreText(null, model, t.wheel);
    expect(c.label).toBe(t.wheel.centreLabel);
    expect(c.amount).toBe("12,450");
    // D40 (R1-H2): the net and the arrow+percent are each one left-to-right isolate.
    expect(c.sub).toBe(`الصافي ${LRI}+3,100${PDI} · ${LRI}↑12%${PDI}`);
    expect([LRI, PDI]).toEqual(["\u2066", "\u2069"]);
    expect(liveText(c)).toContain(formatSAR(1_245_000));
  });

  it("the arrow+percent isolate opens in {arrow} and closes in {pct}: both templates keep them adjacent", () => {
    for (const template of [t.wheel.centreSub, t.wheel.centreSubCapped]) expect(template).toContain("{arrow}{pct}");
  });

  it("capped and no-percent forms; a negative net carries −", () => {
    const capped = buildWheelModel(input({ monthNetHalalas: -500_000, prevMonthToDateNetHalalas: 100 }), t.wheel);
    expect(centreSub(capped, t.wheel)).toBe(`الصافي ${LRI}−5,000${PDI} · ${LRI}↓999%${PDI} أو أكثر`);
    const none = buildWheelModel(input({ prevMonthToDateNetHalalas: 0 }), t.wheel);
    expect(centreSub(none, t.wheel)).toBe(`الصافي ${LRI}+3,100${PDI}`);
    expect(wholeRiyals(-49)).toBe("0");
  });

  it("a focused segment: its name, its amount and its ring's name; a dot: its party", () => {
    const seg = centreText({ kind: "mark", id: "r2:c1", ring: 2 }, model, t.wheel);
    expect(seg).toMatchObject({ label: "إيجار", amount: "3,000", sub: t.wheel.ring2Name });
    const dot = centreText({ kind: "mark", id: "i:i4", ring: 4 }, model, t.wheel);
    expect(dot).toMatchObject({ label: "النور", amount: "2,500", sub: t.wheel.ring4Name });
  });

  it("D40 (R1-H4): the disc draws at most 20 characters + «…»; the live line keeps the full name", () => {
    expect(LABEL_MAX).toBe(20);
    expect(clipLabel("مؤسسة الأفق")).toBe("مؤسسة الأفق");
    expect(clipLabel("أ".repeat(20))).toBe("أ".repeat(20));
    expect(clipLabel("أ".repeat(21))).toBe(`${"أ".repeat(20)}…`);
    const long = "شركة النور للتجارة والمقاولات العامة";
    const m = buildWheelModel(input({ overview: { ...OVERVIEW, dial: [dial({ dayOffset: 4, partyName: long })] } }), t.wheel);
    const c = centreText({ kind: "mark", id: "i:i4", ring: 4 }, m, t.wheel);
    expect(c.label).toBe(long);
    expect(c.shortLabel).toBe(`${Array.from(long).slice(0, 20).join("")}…`);
    expect(liveText(c)).toContain(long);
  });

  it("a focused row: the ring's title, total and sub; the dial counts its dues", () => {
    expect(centreText({ kind: "ring", ring: 1 }, model, t.wheel)).toMatchObject({
      label: t.wheel.ring1Focus, amount: "13,300", sub: t.wheel.ring1FocusSub,
    });
    expect(centreText({ kind: "ring", ring: 3 }, model, t.wheel).amount).toBe("25,700");
    expect(centreText({ kind: "ring", ring: 4 }, model, t.wheel).amount).toBe("3 مواعيد");
  });

  it("D28 empty: «لا توجد بيانات بعد» only with no entry, every ring zero and no dial mark", () => {
    const zero: WheelInput = input({
      hasEntry: false, monthInHalalas: 0, monthOutHalalas: 0, topOutCategories: [], balanceTotalHalalas: 0,
      overview: { commitments: { toUsHalalas: 0, fromUsHalalas: 0, salariesHalalas: 0 }, dial: [], overdue: { recent: [], count: 0, totalHalalas: 0 } },
    });
    const empty = buildWheelModel(zero, t.wheel);
    expect(empty.empty).toBe(true);
    expect(empty.rings.every((r) => r.segments.length === 0)).toBe(true);
    expect(centreText(null, empty, t.wheel)).toMatchObject({ label: t.wheel.empty, amount: "" });
    // An entry exists (e.g. a zero month): not empty — the zero rings are --track circles, the centre shows the balance.
    expect(buildWheelModel({ ...zero, hasEntry: true }, t.wheel).empty).toBe(false);
    // One dial mark is enough to leave the empty state.
    expect(buildWheelModel({ ...zero, overview: { ...zero.overview, dial: [dial({ dayOffset: 2 })] } }, t.wheel).empty).toBe(false);
  });
});

describe("the model (D4, D18, D29) and the roving order (D27)", () => {
  it("ring 2 is the donut's slices (top + «أخرى»); every segment carries its target and exact aria-label", () => {
    expect(model.rings[1].segments.map((s) => [s.name, s.amountHalalas])).toEqual([
      ["إيجار", 300_000], ["رواتب", 150_000], [t.wheel.other, 60_000],
    ]);
    const out = model.rings[0].segments[1]!;
    expect(out.href).toBe("/owner/transactions?direction=OUT&from=2026-10-01&to=2026-10-31");
    expect(out.aria).toBe(`${t.wheel.outMonth}: ${formatSAR(510_000)}`);
    expect(model.rings[2].segments.map((s) => s.href)).toEqual([
      "/owner/parties?type=CUSTOMER", "/owner/parties?type=SUPPLIER", "/owner/staff",
    ]);
  });

  it("dots: overdue hollow first, then by day; salary → the employee; plural labels", () => {
    expect(model.dots.map((d) => [d.id, d.overdue, d.href])).toEqual([
      ["i:o1", true, "/owner/plans/p1"],
      ["i:i4", false, "/owner/plans/p1"],
      ["i:i15", false, "/owner/staff/e1"],
    ]);
    expect(model.dots[0]!.aria).toBe("قسط النور — متأخر 3 أيام");
    expect(model.dots[2]!.aria).toBe("راتب النور — بعد 15 يومًا");
    expect(dotLabel({ ...model.dots[1]!, dayOffset: 0 }, t.wheel)).toBe("قسط النور — اليوم");
    expect(dotLabel({ ...model.dots[1]!, id: "d:4", count: 2, dueDate: "2026-10-15" }, t.wheel)).toBe("موعدان في 2026-10-15");
  });

  it("roving: ring 1 → 2 → 3 → dial; arrows wrap, Home/End jump, other keys are not moves", () => {
    expect(rovingIds(model).map((o) => o.id)).toEqual([
      "r1:IN", "r1:OUT", "r2:c1", "r2:c2", "r2:other", "r3:toUs", "r3:fromUs", "r3:salaries", "i:o1", "i:i4", "i:i15",
    ]);
    expect(rovingMove(0, "ArrowLeft", 5)).toBe(1);
    expect(rovingMove(4, "ArrowDown", 5)).toBe(0);
    expect(rovingMove(0, "ArrowRight", 5)).toBe(4);
    expect(rovingMove(2, "ArrowUp", 5)).toBe(1);
    expect(rovingMove(2, "Home", 5)).toBe(0);
    expect(rovingMove(2, "End", 5)).toBe(4);
    expect(rovingMove(2, "Tab", 5)).toBeNull();
  });
});

describe("client-safety (D25)", () => {
  it("wheel.ts, wheelHrefs.ts, wheelFocus.ts, wheelModel.ts: no server-only, values only from dates/money/plural/visuals", () => {
    for (const file of ["wheel.ts", "wheelHrefs.ts", "wheelFocus.ts", "wheelModel.ts"]) {
      const source = readFileSync(`src/features/dashboard/${file}`, "utf8");
      expect(source, file).not.toMatch(/^import "server-only";/m);
      const values = [...source.matchAll(/^import (?!type )[^;]*?from "([^"]+)";/gms)].map((m) => m[1]);
      for (const from of values) {
        expect(["@/lib/dates", "@/lib/money", "@/lib/plural", "./visuals", "./wheel", "./wheelHrefs"], `${file}: ${from}`).toContain(from);
      }
      expect(source, file).not.toMatch(/from "@\/lib\/validation"/);
    }
  });
});
