import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { t } from "@/i18n/ar";

import { LedgerFilters, panelClass } from "./LedgerFilters";

/**
 * v1.4 part 3 — D29 R4: the ledger filter panel is collapsed on phones behind
 * «تصفية» (open when a filter is active, always open from md) and its submit
 * reads «عرض» (D31a).
 */
const base = { categories: [], basePath: "/owner/transactions" };
const empty = { page: 1 } as unknown as Parameters<typeof LedgerFilters>[0]["filters"];
const render = (showing: boolean, filters = empty) =>
  renderToStaticMarkup(createElement(LedgerFilters, { ...base, filters, showing }));

describe("LedgerFilters collapse (R4)", () => {
  it("closed by default: the form is hidden md:flex", () => {
    expect(panelClass(false)).toMatch(/^hidden md:flex\b/);
    const form = /<form [^>]*>/.exec(render(false))?.[0] ?? "";
    expect(form).toMatch(/class="hidden md:flex\b/);
  });

  it("open when a filter is active: nothing hidden", () => {
    expect(panelClass(true)).toMatch(/^flex\b/);
    const form = /<form [^>]*>/.exec(render(true, { ...empty, from: "2026-10-01" }))?.[0] ?? "";
    expect(form).not.toMatch(/\bhidden\b/);
  });

  it("the «تصفية» button is phone-only, 44 px, and names the panel it controls", () => {
    const html = render(false);
    const button = /<button [^>]*>/.exec(html)?.[0] ?? "";
    expect(button).toMatch(/\btype="button"/);
    expect(button).toMatch(/aria-expanded="false"/);
    expect(button).toMatch(/class="[^"]*\bmd:hidden\b/);
    expect(button).toMatch(/class="[^"]*\bmin-h-11\b/);
    const controls = /aria-controls="([^"]+)"/.exec(button)?.[1];
    expect(controls).toBeTruthy();
    expect(html).toContain(`<form id="${controls}"`);
    expect(html).toContain(`>${t.common.filter}</button>`);
    expect(/<button [^>]*>/.exec(render(true))?.[0]).toMatch(/aria-expanded="true"/);
  });

  it("the active look when showing: accent border and semibold, no count", () => {
    expect(/<button [^>]*>/.exec(render(true))?.[0]).toMatch(/class="[^"]*\bborder-accent\b[^"]*\bfont-semibold\b/);
    expect(/<button [^>]*>/.exec(render(false))?.[0]).not.toMatch(/\bborder-accent\b/);
  });

  it("one submit, labelled «عرض» (common.apply)", () => {
    const html = render(false);
    expect(html.match(/type="submit"/g)).toHaveLength(1);
    expect(html).toContain(`>${t.common.apply}</button>`);
    expect(t.common.apply).toBe("عرض");
  });

  it("the date inputs are DateFields (lang=ar-SA) and the GET form keeps its field names", () => {
    const html = render(false);
    expect(html.match(/type="date" lang="ar-SA"/g)).toHaveLength(2);
    for (const name of ["from", "to", "direction", "categoryId", "paymentMethod", "q"]) expect(html).toContain(`name="${name}"`);
  });
});
