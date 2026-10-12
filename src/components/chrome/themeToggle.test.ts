/**
 * v1.5 ThemeToggle (docs/V15-SPEC.md C2, D11, D32; follow-up D45, D46): the
 * server wrapper hands the cookie's choice (null when absent/unknown) to the
 * client button; the button is a 44 px icon button on the band that names its
 * action, draws both icons for CSS to pick, and hides below 480 px, where the
 * «المظهر» row (ThemeSegmented) replaces it. Clicks: themeToggleClick.test.ts.
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
import { only, readThemeCss } from "@/lib/themeCss.testkit";

import { ThemeSegmented, THEME_SEGMENTED_CLASS } from "./ThemeSegmented";
import { ThemeToggle } from "./ThemeToggle";
import { THEME_TOGGLE_CLASS, ThemeToggleButton, themeActionLabel } from "./ThemeToggleButton";

const button = (choice: "light" | "dark" | "system" | null) =>
  renderToStaticMarkup(createElement(ThemeToggleButton, { choice }));

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

describe("ThemeToggleButton (D45)", () => {
  it("names the action on what is shown, from the spec's literals", () => {
    expect(themeActionLabel("light")).toBe("التبديل إلى المظهر الداكن");
    expect(themeActionLabel("dark")).toBe("التبديل إلى المظهر الفاتح");
  });

  it.each([
    ["light", t.theme.toDark],
    ["dark", t.theme.toLight],
  ] as const)("a stored %s paints with aria-label = title = «%s»", (choice, action) => {
    const html = button(choice);
    expect(html).toContain(`aria-label="${action}"`);
    expect(html).toContain(`title="${action}"`);
    expect(html).toContain('type="button"');
  });

  it.each([null, "system"] as const)("with no choice (%s) CSS names it until mount: no aria-label/title, one hidden text per scheme", (choice) => {
    const html = button(choice);
    expect(html).not.toMatch(/aria-label=|title=/);
    expect(html).toContain(`<span class="theme-light-only sr-only">${t.theme.toDark}</span>`);
    expect(html).toContain(`<span class="theme-dark-only sr-only">${t.theme.toLight}</span>`);
  });

  it.each(["light", "dark", null] as const)("draws both icons for CSS to choose (%s)", (choice) => {
    const html = button(choice);
    const icons = html.match(/<svg [^>]*>/g) ?? [];
    expect(icons).toHaveLength(2);
    for (const svg of icons) expect(svg).toContain('aria-hidden="true"');
  });

  it.each(["light", "dark", null] as const)("the icon shows the target, like the label (D50; %s)", (choice) => {
    const svgs = button(choice).match(/<svg [^>]*>[\s\S]*?<\/svg>/g) ?? [];
    const shownIn = (scheme: "light" | "dark") => svgs.find((s) => s.includes(`class="theme-${scheme}-only"`)) ?? "";
    // While light is shown: the moon (a path, no circle). While dark is shown: the sun.
    expect(shownIn("light")).toContain('d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"');
    expect(shownIn("light")).not.toContain("<circle");
    expect(shownIn("dark")).toContain('<circle cx="12" cy="12" r="4"');
  });

  it("the icon switch reads the same tokens as the wordmark", () => {
    const { top, darkExplicit, darkSystem } = readThemeCss();
    expect(only(top, ".theme-light-only").body).toMatch(/display: var\(--wordmark-light\);/);
    expect(only(top, ".theme-dark-only").body).toMatch(/display: var\(--wordmark-dark\);/);
    for (const dark of [darkExplicit, darkSystem]) {
      expect(dark.get("--wordmark-light")).toBe("none");
      expect(dark.get("--wordmark-dark")).toBe("inline");
    }
  });

  it("is a 44 px target in the band's white, hidden below 480 px only (D46)", () => {
    expect(button("light")).toContain(`class="${THEME_TOGGLE_CLASS}"`);
    const cls = THEME_TOGGLE_CLASS.split(" ");
    for (const c of ["min-h-11", "min-w-11", "text-on-topbar", "max-[480px]:hidden"]) expect(cls).toContain(c);
    expect(cls).not.toContain("text-white");
    expect(cls.filter((c) => c === "hidden" || c.endsWith(":hidden"))).toEqual(["max-[480px]:hidden"]);
  });
});

describe("ThemeSegmented — the «المظهر» row (D46)", () => {
  const html = () => renderToStaticMarkup(createElement(ThemeSegmented));

  it("is a group labelled «المظهر» with two buttons, فاتح then داكن, each aria-pressed", () => {
    const out = html();
    const id = /<div role="group" aria-labelledby="([^"]+)"/.exec(out)?.[1];
    expect(id).toBeTruthy();
    expect(out).toContain(`<span id="${id}" class="text-sm font-semibold text-gray-900">المظهر</span>`);
    const buttons = [...out.matchAll(/<button type="button" aria-pressed="(true|false)" class="([^"]+)">([^<]+)<\/button>/g)];
    expect(buttons.map((b) => b[3])).toEqual(["فاتح", "داكن"]);
    // Before mount the shown scheme is unknown: neither is pressed.
    expect(buttons.map((b) => b[1])).toEqual(["false", "false"]);
    for (const b of buttons) expect(b[2]!.split(" ")).toContain("min-h-11");
  });

  it("shows only below 480 px", () => {
    expect(html()).toContain(`class="${THEME_SEGMENTED_CLASS}"`);
    const cls = THEME_SEGMENTED_CLASS.split(" ");
    expect(cls).toContain("min-[480px]:hidden");
    expect(cls.filter((c) => c === "hidden" || c.endsWith(":hidden"))).toEqual(["min-[480px]:hidden"]);
  });
});
