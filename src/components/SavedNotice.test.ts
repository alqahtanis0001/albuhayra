import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { t } from "@/i18n/ar";

import { withoutSaved, withSaved } from "./savedParam";
import { SavedNotice } from "./SavedNotice";

/** v1.4 part 3 — D29 R4 / D31b: `?saved=1` carries the save toast and nothing else. */
describe("savedParam (R4)", () => {
  it("withSaved appends saved=1 and respects an existing query", () => {
    expect(withSaved("/a")).toBe("/a?saved=1");
    expect(withSaved("/a?x=1")).toBe("/a?x=1&saved=1");
    expect(withSaved("/owner/plans/p1?paid=i_1")).toBe("/owner/plans/p1?paid=i_1&saved=1");
  });

  it("withSaved is idempotent", () => {
    expect(withSaved("/a?saved=1")).toBe("/a?saved=1");
    expect(withSaved(withSaved("/a?x=1"))).toBe("/a?x=1&saved=1");
  });

  it("withoutSaved strips only saved and keeps the ledger's filters", () => {
    expect(withoutSaved("?saved=1")).toBe("");
    expect(withoutSaved("?from=2026-10-01&saved=1&q=x")).toBe("?from=2026-10-01&q=x");
    expect(withoutSaved("")).toBe("");
  });
});

describe("SavedNotice (R4)", () => {
  it("renders nothing without the flag", () => {
    expect(renderToStaticMarkup(createElement(SavedNotice, { saved: false }))).toBe("");
  });

  it("renders the success toast «تم حفظ الحركة» with it", () => {
    const html = renderToStaticMarkup(createElement(SavedNotice, { saved: true }));
    expect(html).toContain(t.transaction.saved);
    expect(html).toMatch(/<div [^>]*role="status"/);
    expect(html).toMatch(/class="[^"]*\bbg-money-in-soft\b/);
  });

  it("drops the parameter with history.replaceState through withoutSaved (source pin)", () => {
    const source = readFileSync("src/components/SavedNotice.tsx", "utf8");
    expect(source).toMatch(/window\.history\.replaceState\(null, "", `\$\{pathname\}\$\{withoutSaved\(search\)\}\$\{hash\}`\)/);
    expect(source).not.toMatch(/useSearchParams|useRouter/);
  });
});
