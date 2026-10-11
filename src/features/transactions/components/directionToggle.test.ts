import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { t } from "@/i18n/ar";

import { DirectionToggle } from "./DirectionToggle";

/**
 * v1.4 part 3 (docs/V14-SPEC.md D29 R2): «وارد / صادر» keep their names and one
 * helper line under the pair says them in the owner's words, tied to the
 * fieldset with `aria-describedby`.
 */
describe("DirectionToggle helper (R2)", () => {
  it("renders the sentence under the two segments, described by the fieldset", () => {
    const out = renderToStaticMarkup(
      createElement(DirectionToggle, { value: "OUT", onChange: () => undefined }),
    );
    expect(out).toContain(t.direction.help);
    expect(out).toContain(t.direction.IN);
    expect(out).toContain(t.direction.OUT);
    const fieldset = out.match(/<fieldset[^>]*>/)?.[0] ?? "";
    const id = fieldset.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(id).toBeTruthy();
    const help = out.match(new RegExp(`<p [^>]*id="${id}"[^>]*>([^<]*)</p>`));
    expect(help?.[1]).toBe(t.direction.help);
    expect(help?.[0]).toContain("text-xs");
    // Under the pair, not above it.
    expect(out.indexOf(t.direction.IN)).toBeLessThan(out.indexOf(t.direction.help));
  });
});
