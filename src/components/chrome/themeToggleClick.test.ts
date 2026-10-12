/**
 * v1.5 theme taps (docs/V15-SPEC.md C2, D32; follow-up D45, D46; qa-tests
 * T01/T02, D43). No DOM here: React's hooks are stubbed so the components can
 * be called as functions, and window/document are small stubs. A tap on the
 * top-bar button stores the opposite of what is shown (the device's scheme
 * when nothing is stored); a tap on a «المظهر» segment stores that segment;
 * the cookie carries `Secure` on https only; on mount the cookie and storage
 * are reconciled and the device's scheme is read.
 */
import type { ReactElement, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  setState: vi.fn(),
  /** Values the next useState calls return instead of their initial value. */
  states: [] as unknown[],
  effects: [] as (() => void | (() => void))[],
}));
vi.mock("react", async (orig) => ({
  ...(await orig<typeof import("react")>()),
  useState: (initial: unknown) => [h.states.length ? h.states.shift() : initial, h.setState],
  useEffect: (fn: () => void | (() => void)) => void h.effects.push(fn),
  useId: () => "tid",
}));

import { ThemeSegmented } from "./ThemeSegmented";
import { ThemeToggleButton } from "./ThemeToggleButton";
import { THEME_EVENT } from "./ThemeToggleState";

let cookies: string[];
let attr: string | null;
let stored: string | null;
let deviceDark: boolean;
let events: CustomEvent[];
let listeners: Map<string, (e: Event) => void>;
let mediaListeners: Map<string, () => void>;

function stubBrowser(protocol: string, cookieHeader = "") {
  cookies = [];
  attr = "unset";
  stored = null;
  events = [];
  listeners = new Map();
  mediaListeners = new Map();
  vi.stubGlobal("window", {
    location: { protocol },
    localStorage: { getItem: () => stored, setItem: (_k: string, v: string) => void (stored = v) },
    matchMedia: (q: string) => ({
      // Live, like a real MediaQueryList: a flip shows on the same object.
      get matches() {
        return q === "(prefers-color-scheme: dark)" && deviceDark;
      },
      addEventListener: (type: string, fn: () => void) => void mediaListeners.set(type, fn),
      removeEventListener: (type: string, fn: () => void) => void (mediaListeners.get(type) === fn && mediaListeners.delete(type)),
    }),
    dispatchEvent: (e: CustomEvent) => (events.push(e), true),
    addEventListener: (type: string, fn: (e: Event) => void) => void listeners.set(type, fn),
    removeEventListener: () => undefined,
  });
  vi.stubGlobal("document", {
    documentElement: { setAttribute: (_n: string, v: string) => void (attr = v) },
    get cookie() {
      return cookieHeader;
    },
    set cookie(c: string) {
      cookies.push(c);
    },
  });
}

type Clickable = ReactElement<{ onClick: () => void; "aria-pressed"?: boolean; children?: ReactNode }>;

/** Every <button> element in a tree returned by calling a component. */
function buttons(node: ReactNode): Clickable[] {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(buttons);
  const el = node as ReactElement<{ children?: ReactNode }>;
  return [...(el.type === "button" ? [el as Clickable] : []), ...buttons(el.props.children)];
}

function tapToggle(choice: "light" | "dark" | "system" | null) {
  (ThemeToggleButton({ choice }) as Clickable).props.onClick();
}

function expectStored(to: "light" | "dark") {
  expect(h.setState).toHaveBeenCalledWith(to);
  expect(stored).toBe(to);
  expect(attr).toBe(to);
  expect(cookies).toHaveLength(1);
  expect(cookies[0]!.startsWith(`theme=${to}; `)).toBe(true);
  expect(events.map((e) => [e.type, e.detail])).toEqual([[THEME_EVENT, to]]);
}

describe("theme taps", () => {
  beforeEach(() => {
    h.setState.mockClear();
    h.states = [];
    h.effects = [];
    deviceDark = false;
    stubBrowser("https:");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    [false, "dark"],
    [true, "light"],
  ] as const)("first tap with no choice (device dark: %s) stores the opposite of the shown scheme: %s", (dark, to) => {
    deviceDark = dark;
    tapToggle(null);
    expectStored(to);
  });

  it.each([
    [false, "dark"],
    [true, "light"],
  ] as const)("a stored system is no choice: the tap follows the device (dark: %s) → %s", (dark, to) => {
    deviceDark = dark;
    tapToggle("system");
    expectStored(to);
  });

  it.each([
    ["light", true, "dark"],
    ["dark", false, "light"],
  ] as const)("with %s stored a tap flips it, whatever the device (dark: %s) → %s", (from, dark, to) => {
    deviceDark = dark;
    tapToggle(from);
    expectStored(to);
  });

  it("writes a Secure cookie on https and a plain one on http (D32)", () => {
    tapToggle("light");
    expect(cookies[0]).toMatch(/; Secure$/);
    stubBrowser("http:");
    tapToggle("light");
    expect(cookies[0]).not.toMatch(/Secure/);
  });

  it.each([
    ["داكن", "dark", 1],
    ["فاتح", "light", 0],
  ] as const)("pressing «%s» in the «المظهر» row stores %s, whatever the device shows", (_label, to, index) => {
    deviceDark = to === "light";
    buttons(ThemeSegmented({}))[index]!.props.onClick();
    expectStored(to);
  });

  it("the pressed segment is the shown scheme: the stored choice, else the device after mount", () => {
    const pressed = () => buttons(ThemeSegmented({})).map((b) => b.props["aria-pressed"]);
    h.states = ["dark", false];
    expect(pressed()).toEqual([false, true]);
    h.states = [null, true];
    expect(pressed()).toEqual([false, true]);
    h.states = [null, false];
    expect(pressed()).toEqual([true, false]);
    h.states = [null, null];
    expect(pressed()).toEqual([false, false]);
  });

  it("after mount the button names the action on the device's scheme", () => {
    h.states = [null, true];
    expect((ThemeToggleButton({ choice: null }) as ReactElement<{ title?: string }>).props.title).toBe("التبديل إلى المظهر الفاتح");
    h.states = [null, false];
    expect((ThemeToggleButton({ choice: null }) as ReactElement<{ title?: string }>).props.title).toBe("التبديل إلى المظهر الداكن");
  });

  it("on mount: reconciles from document.cookie, reads the device, and follows a choice made in the other control", () => {
    stubBrowser("https:", "a=1; theme=dark");
    deviceDark = true;
    ThemeSegmented({});
    expect(h.effects).toHaveLength(1);
    h.effects[0]!();
    expect(h.setState).toHaveBeenNthCalledWith(1, "dark");
    expect(h.setState).toHaveBeenNthCalledWith(2, true);
    expect(stored).toBe("dark");
    listeners.get(THEME_EVENT)!(new CustomEvent(THEME_EVENT, { detail: "light" }));
    expect(h.setState).toHaveBeenLastCalledWith("light");
  });

  it("with no choice, a device flip while the page is open updates the shown scheme; unmount stops listening", () => {
    deviceDark = false;
    ThemeToggleButton({ choice: null });
    const cleanup = h.effects[0]!();
    expect(h.setState).toHaveBeenLastCalledWith(false);
    deviceDark = true;
    mediaListeners.get("change")!();
    expect(h.setState).toHaveBeenLastCalledWith(true);
    if (typeof cleanup === "function") cleanup();
    expect(mediaListeners.has("change")).toBe(false);
  });

  it("on mount with a system cookie and nothing stored: no choice, nothing written", () => {
    stubBrowser("https:", "theme=system");
    ThemeToggleButton({ choice: "system" });
    h.effects[0]!();
    expect(h.setState).toHaveBeenNthCalledWith(1, null);
    expect(cookies).toEqual([]);
    expect(attr).toBe("unset");
  });
});
