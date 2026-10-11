import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { startAutoDismiss, SUCCESS_DISMISS_MS, Toast } from "./Toast";

/**
 * v1.4 part 3 — D29 R3 / D31e: the toast never covers an action button (under
 * the top bar on phones, pointer-transparent except the ✕) and a success toast
 * dismisses itself after 3 s while an error toast stays.
 */
describe("Toast (D29 R3)", () => {
  const render = (tone: "error" | "success", onDismiss?: () => void) =>
    renderToStaticMarkup(createElement(Toast, { message: "تم", tone, onDismiss }));

  it("the strip sits under the top bar at every width (D34: no bottom anchor anywhere)", () => {
    const box = /<div [^>]*>/.exec(render("success"))?.[0] ?? "";
    expect(box).toMatch(/class="[^"]*\btop-20\b/);
    expect(box).toMatch(/class="[^"]*\binset-x-4\b/);
    expect(box).not.toMatch(/\bmd:top-auto\b|\bmd:bottom-6\b|\bbottom-24\b/);
  });

  it("the strip ignores the pointer; only an error's ✕ takes taps, a success toast has none (D34)", () => {
    const error = render("error", () => undefined);
    expect(/<div [^>]*>/.exec(error)?.[0]).toMatch(/class="[^"]*\bpointer-events-none\b/);
    expect(/<button [^>]*>/.exec(error)?.[0]).toMatch(/class="[^"]*\bpointer-events-auto\b/);
    expect(render("success", () => undefined)).not.toContain("<button");
  });

  it("inline renders the same strip in the page flow: no fixed, no overlay classes (D34)", () => {
    const html = renderToStaticMarkup(createElement(Toast, { message: "تم", tone: "success", inline: true, onDismiss: () => undefined }));
    const box = /<div [^>]*>/.exec(html)?.[0] ?? "";
    expect(box).not.toMatch(/\bfixed\b|\bz-50\b|\btop-20\b|\bpointer-events-none\b/);
    expect(box).toMatch(/class="[^"]*\bw-full\b/);
    expect(html).toMatch(/role="status"/);
  });

  it("the delay is exactly 3 000 ms and the strip is fixed (qa-tests p3 F1/F2)", () => {
    expect(SUCCESS_DISMISS_MS).toBe(3000);
    expect(/<div [^>]*>/.exec(render("success"))?.[0]).toMatch(/class="[^"]*\bfixed\b/);
  });

  it("an error toast is an alert, a success toast a status", () => {
    expect(render("error")).toMatch(/<div [^>]*role="alert"/);
    expect(render("success")).toMatch(/<div [^>]*role="status"/);
  });

  it("the component wires the effect to startAutoDismiss with its tone (static anchor)", () => {
    const source = readFileSync("src/components/Toast.tsx", "utf8");
    expect(source).toMatch(/useEffect\(\s*\(\) => startAutoDismiss\(tone,/);
  });

  describe("auto-dismiss (fake timers)", () => {
    afterEach(() => vi.useRealTimers());

    it("a success toast calls onDismiss after 3 000 ms, not before", () => {
      vi.useFakeTimers();
      const onDismiss = vi.fn();
      startAutoDismiss("success", onDismiss);
      vi.advanceTimersByTime(SUCCESS_DISMISS_MS - 1);
      expect(onDismiss).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it("an error toast never auto-dismisses", () => {
      vi.useFakeTimers();
      const onDismiss = vi.fn();
      startAutoDismiss("error", onDismiss);
      vi.advanceTimersByTime(SUCCESS_DISMISS_MS * 10);
      expect(onDismiss).not.toHaveBeenCalled();
    });

    it("the cleanup clears the timer (unmount before 3 s)", () => {
      vi.useFakeTimers();
      const onDismiss = vi.fn();
      const stop = startAutoDismiss("success", onDismiss);
      stop();
      vi.advanceTimersByTime(SUCCESS_DISMISS_MS * 2);
      expect(onDismiss).not.toHaveBeenCalled();
    });
  });
});
