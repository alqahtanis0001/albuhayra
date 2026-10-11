import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { t } from "@/i18n/ar";

import { buildWheelModel, type WheelInput } from "./wheelModel";

/**
 * v1.5 (docs/V15-SPEC.md A1, D5, D6, D17, D27, D28, D30): the wheel card's
 * static render — accessible names, one Tab stop, the full-bleed SVG, the
 * animation classes (screen + motion only, absent when empty), print resets.
 */

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => undefined }) }));

const { WheelCard } = await import("@/components/WheelCard");
const { COUNT_MIN_R, WheelSvg, countInk } = await import("@/components/WheelSvg");
const { centreText } = await import("./wheelFocus");

const BASE: WheelInput = {
  today: "2026-10-11", hasEntry: true, balanceTotalHalalas: 1_245_000, monthNetHalalas: 310_000,
  prevMonthToDateNetHalalas: 276_786, monthInHalalas: 820_000, monthOutHalalas: 510_000,
  topOutCategories: [{ categoryId: "c1", nameAr: "إيجار", totalHalalas: 300_000 }],
  overview: {
    commitments: { toUsHalalas: 950_000, fromUsHalalas: 420_000, salariesHalalas: 1_200_000 },
    dial: [{ instalmentId: "a", planId: "p1", employeeId: null, partyName: "النور", kind: "IN", remainingHalalas: 250_000, dueDate: "2026-10-15", dayOffset: 4 }],
    overdue: { recent: [], count: 0, totalHalalas: 0 },
  },
};

const render = (input: WheelInput) => renderToStaticMarkup(createElement(WheelCard, { model: buildWheelModel(input, t.wheel) }));

describe("WheelCard", () => {
  const html = render(BASE);

  it("the svg is a named group; segments and dots are buttons with their labels; one Tab stop", () => {
    expect(html).toMatch(new RegExp(`<svg [^>]*role="group"[^>]*aria-label="${t.wheel.aria}"`));
    const buttons = [...html.matchAll(/<g [^>]*role="button"[^>]*>/g)].map((m) => m[0]);
    // ring 1: 2, ring 2: 2 (إيجار + أخرى), ring 3: 3, dial: 1
    expect(buttons).toHaveLength(8);
    expect(buttons.filter((b) => b.includes('tabindex="0"'))).toHaveLength(1);
    expect(buttons[0]).toContain('tabindex="0"');
    expect(html).toContain(`aria-label="${t.wheel.inMonth}: 8,200.00 ر.س"`);
    expect(html).toContain('aria-label="قسط لنا من النور — بعد 4 أيام"');
  });

  it("D3: each dot has the r = 14 hit circle on top of the visible dot", () => {
    expect(html).toMatch(/<circle [^>]*r="14" fill="transparent"/);
  });

  it("D27: the wheel's wrapper carries no inline padding; the svg is max 360 px, full width", () => {
    const wrapper = /<div class="([^"]*)"><svg /.exec(html)![1]!;
    expect(wrapper.split(" ")).not.toEqual(expect.arrayContaining([expect.stringMatching(/^(p|px|ps|pe)-/)]));
    expect(html).toMatch(/<svg [^>]*class="mx-auto block h-auto w-full max-w-\[360px\]"/);
  });

  it("D27: the focus halo is drawn in the SVG with the focus-ring token, shown on :focus-visible", () => {
    expect(html).toMatch(/class="invisible group-focus-visible:visible" style="stroke:var\(--focus-ring, var\(--color-accent\)\)"/);
  });

  it("D6/D30: draw, pop and lit run under motion-safe only, never in print, with the mock's delays", () => {
    expect(html).toContain("motion-safe:animate-[wheel-draw_0.7s_cubic-bezier(0.4,0,0.2,1)_backwards] print:animate-none");
    expect(html).toContain("motion-safe:animate-[wheel-pop_0.35s_ease-out_backwards] print:animate-none");
    expect(html).toContain("motion-safe:animate-[wheel-lit_0.3s_ease-out_backwards] print:animate-none");
    for (const d of ["0s", "0.12s", "0.8s", "1.6s", "1.72s", "1.84s", "2.4s", "2.7s", "3.1s"]) expect(html).toContain(`animation-delay:${d}"`);
    expect(html).not.toMatch(/animation-delay:\d+\.\d{3,}s/);
  });

  it("D28: «إعادة العرض» and «إظهار الكل» are no-print; print resets the dimming", () => {
    expect(html).toMatch(new RegExp(`<div class="no-print [^"]*">.*${t.wheel.replay}.*${t.wheel.showAll}`));
    expect(html.match(/print:!opacity-100/g)!.length).toBe(4);
  });

  it("four row buttons with the mock's wording and exact live values", () => {
    for (const title of [t.wheel.row1Title, t.wheel.row2Title, t.wheel.row3Title, t.wheel.row4Title]) expect(html).toContain(title);
    expect(html.match(/<button type="button" aria-pressed="false"/g)).toHaveLength(4);
    expect(html).toContain("12,000.00");
  });

  it("D28 empty: --track circles, «لا توجد بيانات بعد», no animation; the rows still explain", () => {
    const empty = render({
      ...BASE, hasEntry: false, monthInHalalas: 0, monthOutHalalas: 0, topOutCategories: [], balanceTotalHalalas: 0,
      overview: { commitments: { toUsHalalas: 0, fromUsHalalas: 0, salariesHalalas: 0 }, dial: [], overdue: { recent: [], count: 0, totalHalalas: 0 } },
    });
    expect(empty).toContain(t.wheel.empty);
    expect(empty).not.toContain("animate-[");
    expect(empty).not.toContain("animation-delay");
    expect(empty.match(/style="stroke:var\(--color-track\)/g)).toHaveLength(4);
    expect(empty).not.toMatch(/role="button"/);
    expect(empty).toContain(t.wheel.row1Title);
  });
});

describe("D40 fixes (R1-H2, R1-H3, R1-H8)", () => {
  const ev = (id: string, d: number, kind: "IN" | "OUT" | "SALARY", amt: number) => ({
    instalmentId: id, planId: `p_${id}`, employeeId: kind === "SALARY" ? "e1" : null, partyName: "س", kind,
    remainingHalalas: amt, dueDate: "2026-10-20", dayOffset: d,
  });
  const model = buildWheelModel(
    {
      ...BASE,
      overview: {
        ...BASE.overview,
        // a big salary day (2 dues) and a small IN day (2 dues): only the big one can hold its count.
        dial: [ev("s1", 9, "SALARY", 600_000), ev("s2", 9, "SALARY", 600_000), ev("a1", 12, "IN", 5_000), ev("a2", 12, "IN", 5_000)],
      },
    },
    t.wheel,
  );
  const handlers = { tabIndexOf: () => -1 as const, onActivate: () => undefined, onKeyDown: () => undefined, refOf: () => () => undefined };
  const svg = (focused: Parameters<typeof centreText>[0]) =>
    renderToStaticMarkup(
      createElement(WheelSvg, { model, focused, centre: centreText(focused, model, t.wheel), centreTone: "fill-gray-500", animate: false, handlers }),
    );

  it("R1-H3: dark ink on gold (on-gold), on-accent on green/red, red on hollow; a count only on a dot with r ≥ 7", () => {
    expect(COUNT_MIN_R).toBe(7);
    expect(countInk({ overdue: false }, "gold")).toBe("fill-on-gold");
    expect(countInk({ overdue: false }, "green")).toBe("fill-on-accent");
    expect(countInk({ overdue: true }, "red")).toBe("fill-money-out");
    const html = svg(null);
    const big = model.dots.find((d) => d.id === "d:9")!;
    const small = model.dots.find((d) => d.id === "d:12")!;
    expect(big.r).toBeGreaterThanOrEqual(7);
    expect(small.r).toBeLessThan(7);
    const counts = [...html.matchAll(/<text [^>]*class="(fill-on-[a-z]+)"[^>]*>(\d+)<\/text>/g)].map((m) => [m[1], m[2]]);
    expect(counts).toEqual([["fill-on-gold", "2"]]);
  });

  it("R1-H2: the dial's count in the centre is not forced left-to-right; a money amount is", () => {
    const row4 = svg({ kind: "ring", ring: 4 });
    expect(row4).toMatch(/<text [^>]*font-size="18"[^>]*>4 مواعيد<\/text>/);
    expect(row4).not.toMatch(/direction="ltr"[^>]*>4 مواعيد/);
    expect(svg(null)).toMatch(/direction="ltr" class="fill-gray-900">12,450<\/text>/);
  });

  it("R1-H4: the disc draws the clipped label, never the full long name", () => {
    const long = "شركة النور للتجارة والمقاولات العامة";
    const m = buildWheelModel({ ...BASE, overview: { ...BASE.overview, dial: [{ ...ev("x", 4, "IN", 9_000), partyName: long }] } }, t.wheel);
    const focused = { kind: "mark" as const, id: "i:x", ring: 4 as const };
    const html = renderToStaticMarkup(
      createElement(WheelSvg, { model: m, focused, centre: centreText(focused, m, t.wheel), centreTone: "", animate: false, handlers }),
    );
    const centre = html.slice(html.lastIndexOf('r="70"'));
    expect(centre).toContain(`>${Array.from(long).slice(0, 20).join("")}…</text>`);
    expect(centre).not.toContain(long);
  });

  it("R1-H8: row 4 states how many dues the dial holds", () => {
    const html = renderToStaticMarkup(createElement(WheelCard, { model }));
    const row4 = html.slice(html.indexOf(t.wheel.row4Title));
    expect(row4).toContain(">4 مواعيد<");
  });
});

describe("D42 (QV-S2, QV-S3, N5)", () => {
  const source = readFileSync("src/components/WheelCard.tsx", "utf8");

  it("QV-S2: the card's keydown handler (ctl.cardKey) sits on the wrapper holding both the wheel and the rows", () => {
    const open = /<div [^>]*onKeyDown=\{\(e\) => ctl\.cardKey\(e\.key\)\}>/.exec(source);
    expect(open).not.toBeNull();
    expect(source.indexOf("<WheelSvg")).toBeGreaterThan(open!.index);
    expect(source.indexOf("<WheelRows")).toBeGreaterThan(open!.index);
  });

  it("QV-S3: the visible hint is muted and no-print, gated by the view; absent before any tap", () => {
    expect(source).toMatch(/\{view\.hintVisible \? <p className="no-print [^"]*text-gray-500[^"]*">\{t\.wheel\.openHint\}<\/p> : null\}/);
    expect(render(BASE)).not.toContain(`>${t.wheel.openHint}</p>`);
  });

  it("N5: the empty state hides «إعادة العرض» / «إظهار الكل» and row 4's count; a live wheel keeps both", () => {
    const zero: WheelInput = {
      ...BASE, hasEntry: false, monthInHalalas: 0, monthOutHalalas: 0, topOutCategories: [], balanceTotalHalalas: 0,
      overview: { commitments: { toUsHalalas: 0, fromUsHalalas: 0, salariesHalalas: 0 }, dial: [], overdue: { recent: [], count: 0, totalHalalas: 0 } },
    };
    const empty = render(zero);
    expect(empty).not.toContain(t.wheel.replay);
    expect(empty).not.toContain(t.wheel.showAll);
    expect(empty).not.toContain("0 موعد");
    const live = render(BASE);
    expect(live).toContain(t.wheel.replay);
    expect(live).toContain(">موعد واحد<");
  });
});

describe("Wheel*.tsx stay small client leaves (D25)", () => {
  it("they import no server-only module and no validation barrel; colours are tokens only", () => {
    for (const file of ["WheelCard.tsx", "WheelSvg.tsx", "WheelRows.tsx"]) {
      const source = readFileSync(`src/components/${file}`, "utf8");
      expect(source, file).toMatch(/^"use client";$/m);
      expect(source, file).not.toMatch(/from "@\/lib\/validation"|overviewReads|dashboard\/queries|@\/lib\/db/);
      expect(source, file).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });
});
