import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { t } from "@/i18n/ar";

import { HomeDetails } from "./HomeDetails";
import {
  HOME_DETAILS_KEY,
  homeDetailsDataOpen,
  isHomeDetailsOpen,
  readHomeDetailsOpen,
  rememberHomeDetailsOpen,
} from "./homeDetailsState";

/** v1.5 (docs/V15-SPEC.md A3, D20, D25, D31): «التفاصيل والرسوم». */

function fakeStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    store,
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("the open rule", () => {
  it("a remembered choice wins over the width; nothing remembered → open at ≥ md, closed below", () => {
    expect(isHomeDetailsOpen(true, false)).toBe(true);
    expect(isHomeDetailsOpen(false, true)).toBe(false);
    expect(isHomeDetailsOpen(null, true)).toBe(true);
    expect(isHomeDetailsOpen(null, false)).toBe(false);
  });

  it("D20: data-open only once a choice is known", () => {
    expect(homeDetailsDataOpen(null)).toBeUndefined();
    expect(homeDetailsDataOpen(true)).toBe("true");
    expect(homeDetailsDataOpen(false)).toBe("false");
  });

  it("D31: stored under home:detailsOpen as 1/0; anything else or no storage reads as nothing remembered", () => {
    expect(HOME_DETAILS_KEY).toBe("home:detailsOpen");
    const storage = fakeStorage();
    vi.stubGlobal("localStorage", storage);
    expect(readHomeDetailsOpen()).toBeNull();
    rememberHomeDetailsOpen(false);
    expect(storage.store.get("home:detailsOpen")).toBe("0");
    expect(readHomeDetailsOpen()).toBe(false);
    rememberHomeDetailsOpen(true);
    expect(readHomeDetailsOpen()).toBe(true);
    storage.store.set("home:detailsOpen", "yes");
    expect(readHomeDetailsOpen()).toBeNull();
    vi.stubGlobal("localStorage", { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } });
    expect(readHomeDetailsOpen()).toBeNull();
    expect(() => rememberHomeDetailsOpen(true)).not.toThrow();
  });
});

describe("HomeDetails", () => {
  it("server render: a disclosure button controlling the body, no data-open, the children inside the body", () => {
    const html = renderToStaticMarkup(createElement(HomeDetails, null, createElement("p", null, "قسم")));
    expect(html).toMatch(/^<section class="home-details /);
    expect(html).not.toContain("data-open");
    const button = /<button [^>]*>/.exec(html)![0];
    expect(button).toContain('aria-expanded="false"');
    const controls = /aria-controls="([^"]+)"/.exec(button)![1];
    expect(html).toContain(`id="${controls}" class="home-details-body`);
    expect(button).toMatch(/\bno-print\b/);
    expect(button).toMatch(/\bmin-h-11\b/);
    expect(html).toContain(t.homeDetails.title);
    expect(html.indexOf("قسم")).toBeGreaterThan(html.indexOf("home-details-body"));
  });

  it("D25: the sections come as children — HomeDetails imports none of them", () => {
    const source = readFileSync("src/features/dashboard/components/HomeDetails.tsx", "utf8");
    for (const name of ["SixMonthCard", "TopOutCategories", "ExpenseDonut", "BalanceByMethod", "ActiveProjects", "SixMonthChart"]) {
      expect(source, name).not.toMatch(new RegExp(`import[^;]*\\b${name}\\b`));
    }
  });

  it("D20: the screen-only CSS hides the body by width until a choice exists; print matches neither rule", () => {
    const css = readFileSync("src/app/globals.css", "utf8").replace(/\s+/g, " ");
    expect(css).toContain(
      '@media screen and (width < 48rem) { .home-details:not([data-open="true"]) .home-details-body { display: none; } }',
    );
    expect(css).toContain('@media screen and (width >= 48rem) { .home-details[data-open="false"] .home-details-body { display: none; } }');
    expect(css).not.toMatch(/@media print[^}]*home-details/);
  });
});
