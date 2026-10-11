import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ConfirmDialog } from "./ConfirmDialog";

/**
 * v1.4 part 2 (docs/V14-SPEC.md D26a): a native <dialog> opened with
 * showModal() centres itself through the UA stylesheet's `margin: auto`, which
 * Tailwind v4's preflight resets to 0 — so every confirm opened at the
 * top-start corner. `m-auto` puts the margin back; this pins it on the rendered
 * class string, where a refactor of the className would be seen.
 */
describe("ConfirmDialog (D26a)", () => {
  const html = renderToStaticMarkup(
    createElement(ConfirmDialog, {
      open: false,
      title: "حذف الحركة؟",
      message: "لا يمكن التراجع.",
      onCancel: () => undefined,
      onConfirm: () => undefined,
    }),
  );

  it("the <dialog> carries m-auto, so it is centred under Tailwind v4 preflight", () => {
    const dialog = /<dialog [^>]*>/.exec(html)?.[0] ?? "";
    expect(dialog).not.toBe("");
    expect(dialog).toMatch(/class="[^"]*\bm-auto\b/);
  });

  it("the class lives in the source once, on the dialog element (not a wrapper)", () => {
    const source = readFileSync("src/components/ConfirmDialog.tsx", "utf8");
    expect(source).toMatch(/<dialog[\s\S]*?className="m-auto /);
  });

  it("still labels itself by its title and describes itself by the message", () => {
    expect(html).toMatch(/<dialog [^>]*aria-labelledby=/);
    expect(html).toMatch(/<dialog [^>]*aria-describedby=/);
    expect(html).toContain("حذف الحركة؟");
  });
});
