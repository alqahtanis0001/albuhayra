import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { t } from "@/i18n/ar";

import { FirstRunCard, FirstRunCardView } from "./FirstRunCard";
import type { FirstRunFlags } from "./firstRun";

/**
 * v1.4 part 2 (docs/V14-SPEC.md D25): the owner home's first-run card. Static
 * renders, no DOM: `FirstRunCard` is what the server renders (effects do not
 * run, so this is the pre-mount state); `FirstRunCardView` with `phase:
 * "shown"` is the card as the owner sees it after mount. The after-mount
 * decision itself is the pure `shouldShowFirstRun`, pinned in firstRun.test.ts.
 */

const twoDone: FirstRunFlags = { hasEntry: true, hasParty: false, hasPlan: true, hasEmployee: false };
const none: FirstRunFlags = { hasEntry: false, hasParty: false, hasPlan: false, hasEmployee: false };
const all: FirstRunFlags = { hasEntry: true, hasParty: true, hasPlan: true, hasEmployee: true };

const noop = () => undefined;
const rootTag = (html: string) => html.slice(0, html.indexOf(">") + 1);
const count = (html: string, needle: string) => html.split(needle).length - 1;

describe("FirstRunCard before mount (the server render)", () => {
  it("renders nothing when all four steps are done", () => {
    expect(renderToStaticMarkup(createElement(FirstRunCard, { firstRun: all }))).toBe("");
  });

  it("renders the card hidden and no-print until storage has been read", () => {
    const html = renderToStaticMarkup(createElement(FirstRunCard, { firstRun: twoDone }));
    const root = rootTag(html);
    expect(root.startsWith("<section")).toBe(true);
    expect(root).toMatch(/class="[^"]*\bno-print\b/);
    expect(root).toMatch(/class="[^"]*\bhidden\b/);
    expect(html).toContain(t.firstRun.title);
  });
});

describe("FirstRunCardView after mount", () => {
  const html = renderToStaticMarkup(
    createElement(FirstRunCardView, { firstRun: twoDone, phase: "shown", onHide: noop }),
  );

  it("is visible, printable-excluded, and carries the title, hint and «إخفاء» button", () => {
    const root = rootTag(html);
    expect(root).toMatch(/class="[^"]*\bno-print\b/);
    expect(root).not.toMatch(/class="[^"]*\bhidden\b/);
    expect(html).toContain(t.firstRun.title);
    expect(html).toContain(t.firstRun.hint);
    expect(html).toMatch(new RegExp(`<button[^>]*type="button"[^>]*>[^<]*${t.firstRun.hide}`));
  });

  it("counts the done steps in Western digits: «2 من 4»", () => {
    expect(html).toContain("2 من 4");
    expect(html).not.toMatch(/[٠-٩]/);
  });

  it("ticks the two done steps (icon hidden from AT, sr «تم») and links the two untried ones", () => {
    expect(count(html, `<span class="sr-only">${t.firstRun.done}</span>`)).toBe(2);
    expect(count(html, "<svg")).toBeGreaterThanOrEqual(2);
    expect(html).toContain('href="/owner/parties/new"');
    expect(html).toContain('href="/owner/staff/new"');
    expect(html).not.toContain('href="/owner/transactions/new"');
    expect(html).not.toContain('href="/owner/plans/new"');
  });

  it("keeps the spec's order: حركة, جهة, اتفاقية, موظف", () => {
    const at = [t.firstRun.stepEntry, t.firstRun.stepParty, t.firstRun.stepPlan, t.firstRun.stepEmployee].map(
      (label) => html.indexOf(label),
    );
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(html).toContain("<ol");
  });

  it("with nothing done, every step is a link and the count reads «0 من 4»", () => {
    const fresh = renderToStaticMarkup(
      createElement(FirstRunCardView, { firstRun: none, phase: "shown", onHide: noop }),
    );
    expect(fresh).toContain("0 من 4");
    for (const href of ["/owner/transactions/new", "/owner/parties/new", "/owner/plans/new", "/owner/staff/new"]) {
      expect(fresh).toContain(`href="${href}"`);
    }
    expect(fresh).not.toContain(t.firstRun.done);
  });

  it("every link row and the hide button meet the 44 px tap target", () => {
    const links = html.match(/<a [^>]*>/g) ?? [];
    expect(links.length).toBe(2);
    for (const a of links) expect(a).toMatch(/class="[^"]*\bmin-h-11\b/);
    expect(html).toMatch(/<button[^>]*class="[^"]*\bmin-h-11\b/);
  });
});

/**
 * qa-tests part 2 (S3, S4, N2): the wiring that a static render cannot reach —
 * effects do not run and the hide handler is never called — pinned on the
 * source, anchored on the statements themselves so prose cannot match.
 */
describe("FirstRunCard wiring (static pins)", () => {
  const source = readFileSync("src/features/dashboard/components/FirstRunCard.tsx", "utf8");

  it("S3: «إخفاء» remembers the choice, then hides", () => {
    expect(source).toMatch(/function hide\(\) \{\s*rememberFirstRunHidden\(\);\s*setHidden\(true\);/);
  });

  it("S4: the mount effect reads storage, and the render decision uses that mounted state", () => {
    expect(source).toMatch(/useEffect\(\(\) => \{\s*setHidden\(readFirstRunHidden\(\)\);/);
    expect(source).toMatch(/if \(!shouldShowFirstRun\(firstRun, hidden === true\)\) return null;/);
    expect(source).not.toMatch(/shouldShowFirstRun\(firstRun, (?:true|false)\)/);
  });

  it("N2: the owner home renders the card between the quick actions and the money cards", () => {
    const page = readFileSync("src/app/(owner)/owner/page.tsx", "utf8");
    const at = ["<QuickActions />", "<FirstRunCard firstRun={data.firstRun} />", "<OwnerStatCards"].map((s) =>
      page.indexOf(s),
    );
    expect(at.every((i) => i >= 0)).toBe(true);
    expect(at[0]).toBeLessThan(at[1]!);
    expect(at[1]).toBeLessThan(at[2]!);
  });
});
