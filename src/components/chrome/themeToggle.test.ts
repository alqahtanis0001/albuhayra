/**
 * v1.5 ThemeToggle (docs/V15-SPEC.md C2, D11, D32): the server wrapper hands
 * the cookie's choice (null when absent/unknown) to the client button; the
 * button is a 44 px icon button named by the current mode, white on the band.
 */
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

let cookieValue: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name === "theme" && cookieValue !== undefined ? { name, value: cookieValue } : undefined),
  }),
}));

import { t } from "@/i18n/ar";

import { ThemeToggle } from "./ThemeToggle";
import { ThemeToggleButton, themeLabel } from "./ThemeToggleButton";

describe("ThemeToggle (server wrapper)", () => {
  beforeEach(() => {
    cookieValue = undefined;
  });

  it.each([
    ["dark", "dark"],
    ["light", "light"],
    ["system", "system"],
    [undefined, null],
    ["purple", null],
  ])("cookie %s → button choice %s", async (cookie, choice) => {
    cookieValue = cookie;
    const el = (await ThemeToggle()) as ReactElement<{ choice: unknown }>;
    expect(el.type).toBe(ThemeToggleButton);
    expect(el.props.choice).toBe(choice);
  });
});

describe("ThemeToggleButton", () => {
  it("names the current mode", () => {
    expect(themeLabel("light")).toBe(`المظهر: ${t.theme.light}`);
    expect(themeLabel("dark")).toBe(`المظهر: ${t.theme.dark}`);
    expect(themeLabel("system")).toBe(`المظهر: ${t.theme.system}`);
  });

  it.each([
    ["dark", t.theme.dark],
    ["light", t.theme.light],
    [null, t.theme.system],
  ] as const)("first paint for %s is labelled %s", (choice, mode) => {
    const html = renderToStaticMarkup(createElement(ThemeToggleButton, { choice }));
    expect(html).toContain(`aria-label="المظهر: ${mode}"`);
    expect(html).toContain('type="button"');
  });

  it.each(["light", "dark", "system"] as const)("hover title equals the accessible name (%s, D42 N4)", (choice) => {
    const html = renderToStaticMarkup(createElement(ThemeToggleButton, { choice }));
    expect(html).toContain(`title="${themeLabel(choice)}"`);
    expect(html).toContain(`aria-label="${themeLabel(choice)}"`);
  });

  it("is a 44 px target in the band's white, with a decorative icon", () => {
    const html = renderToStaticMarkup(createElement(ThemeToggleButton, { choice: "light" }));
    expect(html).toMatch(/class="[^"]*\bmin-h-11\b[^"]*\bmin-w-11\b/);
    expect(html).toMatch(/\btext-on-topbar\b/);
    expect(html).not.toMatch(/\btext-white\b/);
    expect(html).toContain('aria-hidden="true"');
  });

  it("draws a different icon per mode", () => {
    const icons = (["light", "dark", "system"] as const).map((c) =>
      renderToStaticMarkup(createElement(ThemeToggleButton, { choice: c })).replace(/aria-label="[^"]*"|title="[^"]*"/g, ""),
    );
    expect(new Set(icons).size).toBe(3);
  });
});
