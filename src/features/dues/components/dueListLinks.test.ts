import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * v1.4 (D17 c15, reviewer R2-1): the two links in a due row — the party's name
 * and the agreement's title — are tap targets and must be ≥ 44 px tall
 * (docs/FRONTEND.md). Pinned on the source: each `<Link href={\`/owner/…\`}>`
 * block's class string names `min-h-11`.
 */
describe("DueList's row links are 44 px tap targets", () => {
  const source = readFileSync("src/features/dues/components/DueList.tsx", "utf8");
  const linkBlock = (hrefPrefix: string) => {
    const start = source.indexOf(`href={\`${hrefPrefix}`);
    expect(start, hrefPrefix).toBeGreaterThan(-1);
    const block = source.slice(start, source.indexOf(">", start));
    return /className="([^"]*)"/.exec(block)?.[1] ?? "";
  };

  it("the party-name link", () => {
    expect(linkBlock("/owner/parties/")).toMatch(/\bmin-h-11\b/);
  });

  it("the plan-title link", () => {
    expect(linkBlock("/owner/plans/")).toMatch(/\bmin-h-11\b/);
  });
});
