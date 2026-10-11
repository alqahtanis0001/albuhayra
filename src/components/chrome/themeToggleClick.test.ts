/**
 * v1.5 ThemeToggleButton's click (docs/V15-SPEC.md C2, D32; qa-tests T01/T02,
 * D43). No DOM here: React's useState/useEffect are stubbed so the component
 * can be called as a function, and window/document are small stubs. The click
 * must advance the cycle (light → dark → system → light) and write the cookie
 * with `Secure` on https only.
 */
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const setState = vi.fn();
vi.mock("react", async (orig) => ({
  ...(await orig<typeof import("react")>()),
  useState: (initial: unknown) => [initial, setState],
  useEffect: () => undefined,
}));

import { ThemeToggleButton } from "./ThemeToggleButton";

let cookies: string[];
let attr: string | null;
let stored: string | null;

function stubBrowser(protocol: string) {
  cookies = [];
  attr = "unset";
  stored = null;
  vi.stubGlobal("window", {
    location: { protocol },
    localStorage: { getItem: () => stored, setItem: (_k: string, v: string) => void (stored = v) },
  });
  vi.stubGlobal("document", {
    documentElement: {
      setAttribute: (_n: string, v: string) => void (attr = v),
      removeAttribute: () => void (attr = null),
    },
    set cookie(c: string) {
      cookies.push(c);
    },
  });
}

function click(choice: "light" | "dark" | "system" | null) {
  const el = ThemeToggleButton({ choice }) as ReactElement<{ onClick: () => void }>;
  el.props.onClick();
}

describe("ThemeToggleButton click", () => {
  beforeEach(() => {
    setState.mockClear();
    stubBrowser("https:");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    ["light", "dark", "dark"],
    ["dark", "system", null],
    ["system", "light", "light"],
    [null, "light", "light"],
  ] as const)("from %s a click chooses %s", (from, to, attribute) => {
    click(from);
    expect(setState).toHaveBeenCalledWith(to);
    expect(stored).toBe(to);
    expect(attr).toBe(attribute);
    expect(cookies).toHaveLength(1);
    expect(cookies[0]!.startsWith(`theme=${to}; `)).toBe(true);
  });

  it("writes a Secure cookie on https and a plain one on http (D32)", () => {
    click("light");
    expect(cookies[0]).toMatch(/; Secure$/);
    stubBrowser("http:");
    click("light");
    expect(cookies[0]).not.toMatch(/Secure/);
  });
});
