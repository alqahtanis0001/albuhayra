import { readFileSync } from "node:fs";
import { createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { t } from "@/i18n/ar";

import { markKeyAction, wheelController, wheelView } from "./wheelController";
import { INITIAL_FOCUS, centreText, type FocusState } from "./wheelFocus";
import { buildWheelModel, type WheelInput } from "./wheelModel";

/**
 * v1.5 (D43: qa-tests H10–H19): the wheel's interactions without a DOM — the
 * pure controller WheelCard wires to its tap/key/button handlers, the hook-free
 * leaves called as functions, and the rendered SVG's colours, marker and dimming.
 */

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => undefined }) }));

const { WheelRows } = await import("@/components/WheelRows");
const { WheelSvg } = await import("@/components/WheelSvg");
const { WheelCard } = await import("@/components/WheelCard");

const ev = (id: string, d: number, kind: "IN" | "OUT" | "SALARY", amt: number, name: string) => ({
  instalmentId: id, planId: `p_${id}`, employeeId: kind === "SALARY" ? "e1" : null, partyName: name, kind,
  remainingHalalas: amt, dueDate: "2026-10-20", dayOffset: d,
});

const INPUT: WheelInput = {
  today: "2026-10-11", hasEntry: true, balanceTotalHalalas: 1_245_000, monthNetHalalas: 310_000,
  prevMonthToDateNetHalalas: 276_786, monthInHalalas: 820_000, monthOutHalalas: 510_000,
  topOutCategories: [{ categoryId: "c1", nameAr: "إيجار", totalHalalas: 300_000 }],
  overview: {
    commitments: { toUsHalalas: 950_000, fromUsHalalas: 420_000, salariesHalalas: 1_200_000 },
    dial: [ev("a", 4, "IN", 250_000, "النور"), ev("b", 6, "OUT", 200_000, "الخرسانة"), ev("c", 15, "SALARY", 600_000, "سعد")],
    overdue: { recent: [ev("o", -3, "OUT", 100_000, "العلي")], count: 1, totalHalalas: 100_000 },
  },
};
const model = buildWheelModel(INPUT, t.wheel);

function harness() {
  let state: FocusState = INITIAL_FOCUS;
  const fx = { getState: () => state, setState: (n: FocusState) => void (state = n), push: vi.fn(), bumpReplay: vi.fn() };
  return { ctl: wheelController(fx), fx, state: () => state };
}

describe("the controller WheelCard wires (H10–H13)", () => {
  it("H10: the first activation focuses without navigating; the same id again calls router.push with its href", () => {
    const { ctl, fx, state } = harness();
    ctl.activate("r1:IN", 1, "/owner/transactions?direction=IN");
    expect(fx.push).not.toHaveBeenCalled();
    expect(state().focused).toEqual({ kind: "mark", id: "r1:IN", ring: 1 });
    ctl.activate("r1:IN", 1, "/owner/transactions?direction=IN");
    expect(fx.push).toHaveBeenCalledExactlyOnceWith("/owner/transactions?direction=IN");
  });

  it("H11: «إعادة العرض» clears the focus and bumps the replay key, which is the SVG's React key", () => {
    const { ctl, fx, state } = harness();
    ctl.activate("r2:c1", 2, "/x");
    ctl.replay();
    expect(fx.bumpReplay).toHaveBeenCalledTimes(1);
    expect(state().focused).toBeNull();
    const source = readFileSync("src/components/WheelCard.tsx", "utf8");
    expect(source).toMatch(/<WheelSvg\s+key=\{replay\}/);
    expect(source).toMatch(/useReducer\(\(n: number\) => n \+ 1, 0\)/);
  });

  it("H12: after a mark activation the live line ends with the open hint, and the hint shows", () => {
    const { ctl, state } = harness();
    ctl.activate("r3:toUs", 3, "/owner/parties?type=CUSTOMER");
    const view = wheelView(state(), model, t.wheel);
    expect(view.live.endsWith(`. ${t.wheel.openHint}`)).toBe(true);
    expect(view.hintVisible).toBe(true);
    expect(wheelView(INITIAL_FOCUS, model, t.wheel)).toMatchObject({ live: "", hintVisible: false });
  });

  it("H13: Escape clears a focus from a mark or a row; other keys are not handled; «إظهار الكل» clears", () => {
    const { ctl, state } = harness();
    ctl.activate("i:a", 4, "/owner/plans/p_a");
    expect(ctl.cardKey("Enter")).toBe(false);
    expect(state().focused).not.toBeNull();
    expect(ctl.cardKey("Escape")).toBe(true);
    expect(state().focused).toBeNull();
    ctl.row(2);
    ctl.cardKey("Escape");
    expect(state().focused).toBeNull();
    ctl.row(3);
    ctl.showAll();
    expect(state().focused).toBeNull();
  });

  it("a key on a mark: Enter/Space activate, arrows/Home/End move, anything else is ignored", () => {
    expect(markKeyAction("Enter", 0, 5)).toEqual({ kind: "activate" });
    expect(markKeyAction(" ", 0, 5)).toEqual({ kind: "activate" });
    expect(markKeyAction("ArrowLeft", 0, 5)).toEqual({ kind: "move", to: 1 });
    expect(markKeyAction("End", 0, 5)).toEqual({ kind: "move", to: 4 });
    expect(markKeyAction("Escape", 0, 5)).toBeNull();
  });
});

/** Host elements of a hook-free component's own tree (child components stay unexpanded). */
function hostElements(node: ReactNode, out: ReactElement[] = []): ReactElement[] {
  if (Array.isArray(node)) node.forEach((n) => hostElements(n, out));
  else if (isValidElement(node)) {
    if (typeof node.type === "string") out.push(node);
    hostElements((node.props as { children?: ReactNode }).children, out);
  }
  return out;
}

describe("the rows (H18, H19)", () => {
  it("H19: each row's button focuses its own ring", () => {
    const onRow = vi.fn();
    const tree = WheelRows({ model, focused: null, animate: false, onRow });
    const buttons = hostElements(tree).filter((e) => e.type === "button");
    expect(buttons).toHaveLength(4);
    for (const b of buttons) (b.props as { onClick: () => void }).onClick();
    expect(onRow.mock.calls).toEqual([[1], [2], [3], [4]]);
  });

  it("H18: each row lists its own ring's values with their exact amounts", () => {
    const html = renderToStaticMarkup(createElement(WheelRows, { model, focused: null, animate: false, onRow: () => undefined }));
    const rows = html.split('<button type="button"').slice(1);
    const pairs = (row: string) =>
      [...row.matchAll(/<\/span>([^<]+)<bdi[^>]*>([^<]+)<\/bdi>/g)].map((m) => [m[1], m[2]]);
    expect(pairs(rows[0]!)).toEqual([
      [t.wheel.inMonth, "8,200.00 ر.س"],
      [t.wheel.outMonth, "5,100.00 ر.س"],
    ]);
    expect(pairs(rows[1]!)).toEqual([
      ["إيجار", "3,000.00 ر.س"],
      [t.wheel.other, "2,100.00 ر.س"],
    ]);
    expect(pairs(rows[2]!)).toEqual([
      [t.wheel.toUs, "9,500.00 ر.س"],
      [t.wheel.fromUs, "4,200.00 ر.س"],
      [t.wheel.salaries, "12,000.00 ر.س"],
    ]);
    expect(rows[3]).toContain(">4 مواعيد<");
    expect(pairs(rows[3]!)).toEqual([]);
  });
});

describe("the drawn SVG (H14–H17)", () => {
  const handlers = { tabIndexOf: () => -1 as const, onActivate: () => undefined, onKeyDown: () => undefined, refOf: () => () => undefined };
  const svg = (focused: Parameters<typeof centreText>[0]) =>
    renderToStaticMarkup(
      createElement(WheelSvg, { model, focused, centre: centreText(focused, model, t.wheel), centreTone: "", animate: false, handlers }),
    );
  const dotChunk = (html: string, label: string) => {
    const at = html.indexOf(`aria-label="${label}"`);
    expect(at).toBeGreaterThan(-1);
    return html.slice(at, html.indexOf('fill="transparent"></circle></g>', at));
  };

  it("H14: a dot's colour follows its kind — لنا green, علينا red, salary gold", () => {
    const html = svg(null);
    expect(dotChunk(html, "قسط لنا من النور — بعد 4 أيام")).toMatch(/r="[\d.]+" style="fill:var\(--color-accent\)"/);
    expect(dotChunk(html, "قسط علينا لـالخرسانة — بعد 6 أيام")).toMatch(/r="[\d.]+" style="fill:var\(--color-money-out\)"/);
    expect(dotChunk(html, "راتب سعد — بعد 15 يومًا")).toMatch(/r="[\d.]+" style="fill:var\(--color-gold\)"/);
  });

  it("H15: an overdue dot is hollow — card fill, red ring", () => {
    const chunk = dotChunk(svg(null), "قسط علينا لـالعلي — متأخر 3 أيام");
    expect(chunk).toMatch(/class="fill-white" style="stroke:var\(--color-money-out\);stroke-width:2"/);
    expect(chunk).not.toContain("fill:var(");
  });

  it("H16: the «اليوم» marker sits at the top of the dial", () => {
    expect(svg(null)).toMatch(new RegExp(`<circle cx="200" cy="20" r="5" class="fill-gray-900"></circle><text x="200" y="8"[^>]*>${t.wheel.today}<`));
  });

  it("H17: focusing a ring-2 segment draws ring 2 at full opacity and every other layer at 0.18", () => {
    const layers = (html: string) =>
      [...html.matchAll(/class="transition-opacity duration-200 print:!opacity-100" style="opacity:([\d.]+)"/g)].map((m) => Number(m[1]));
    expect(layers(svg({ kind: "mark", id: "r2:c1", ring: 2 }))).toEqual([0.18, 1, 0.18, 0.18]);
    expect(layers(svg({ kind: "mark", id: "i:a", ring: 4 }))).toEqual([0.18, 0.18, 0.18, 1]);
    expect(layers(svg(null))).toEqual([1, 1, 1, 1]);
  });

  it("the card renders the same model end to end", () => {
    expect(renderToStaticMarkup(createElement(WheelCard, { model }))).toContain(t.wheel.row4Title);
  });
});
