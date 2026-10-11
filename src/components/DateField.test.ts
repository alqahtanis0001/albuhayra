import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DateField } from "./DateField";

/**
 * v1.4 part 3 — D29 R13 / D31g: every native date field carries `lang="ar-SA"`
 * and shows the chosen date under it in words; nothing while the value is not
 * a full date. The caption text itself is pinned on `dateCaption` in
 * src/lib/dates.test.ts.
 */
describe("DateField (D29 R13)", () => {
  const render = (props: Record<string, unknown>) =>
    renderToStaticMarkup(createElement(DateField, { label: "التاريخ", name: "date", ...props }));

  it("renders a native date input with lang=ar-SA and the given name", () => {
    const input = /<input [^>]*>/.exec(render({ value: "2026-10-11", onChange: () => undefined }))?.[0] ?? "";
    expect(input).toMatch(/\btype="date"/);
    expect(input).toMatch(/\blang="ar-SA"/);
    expect(input).toMatch(/\bname="date"/);
    expect(input).toMatch(/\bvalue="2026-10-11"/);
  });

  it("shows the caption for a full date (controlled) and links it by aria-describedby", () => {
    const html = render({ value: "2026-10-11", onChange: () => undefined });
    expect(html).toContain("الأحد 11-10-2026");
    const captionId = /<p id="([^"]+)" aria-live="polite"/.exec(html)?.[1];
    expect(captionId).toBeTruthy();
    expect(html).toMatch(new RegExp(`<input [^>]*aria-describedby="[^"]*${captionId!.replace(/[:]/g, "\\$&")}`));
  });

  it("shows the caption for an uncontrolled defaultValue too", () => {
    expect(render({ defaultValue: "2026-10-12" })).toContain("الاثنين 12-10-2026");
  });

  it("shows nothing under an empty field, and no dangling aria-describedby", () => {
    const html = render({ defaultValue: "" });
    expect(html).not.toMatch(/aria-live/);
    expect(html).not.toMatch(/aria-describedby/);
  });

  it("passes max, min, required, disabled and error through unchanged", () => {
    const html = render({
      value: "2026-10-11",
      onChange: () => undefined,
      max: "2026-12-31",
      min: "2026-01-01",
      required: true,
      disabled: true,
      error: "err.required",
    });
    const input = /<input [^>]*>/.exec(html)?.[0] ?? "";
    expect(input).toMatch(/\bmax="2026-12-31"/);
    expect(input).toMatch(/\bmin="2026-01-01"/);
    expect(input).toMatch(/\brequired=""/);
    expect(input).toMatch(/\bdisabled=""/);
    expect(input).toMatch(/aria-invalid="true"/);
  });
});
