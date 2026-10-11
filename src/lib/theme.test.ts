/**
 * v1.5 theme choice (docs/V15-SPEC.md C2, C4; D11, D31, D32): parsing, the
 * cycle, the cookie, the <html> attributes the server renders (SSR = the
 * layout spreads htmlThemeAttrs(parseTheme(cookie))), and the toggle's click
 * and mount rules on stub storage/document.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  THEME_COOKIE,
  THEME_MAX_AGE,
  THEME_STORAGE_KEY,
  chooseTheme,
  htmlThemeAttrs,
  nextTheme,
  parseTheme,
  reconcileTheme,
  themeCookie,
  type ThemeEnv,
} from "./theme";

function stubEnv(stored: string | null = null, opts: { throwing?: boolean; secure?: boolean } = {}) {
  const log = { attr: "unset" as string | null, cookies: [] as string[], storage: stored };
  const env: ThemeEnv = {
    root: {
      setAttribute: (name, value) => {
        expect(name).toBe("data-theme");
        log.attr = value;
      },
      removeAttribute: (name) => {
        expect(name).toBe("data-theme");
        log.attr = null;
      },
    },
    setCookie: (c) => log.cookies.push(c),
    storage: {
      getItem: (k) => {
        if (opts.throwing) throw new Error("blocked");
        return k === "ui:theme" ? log.storage : null;
      },
      setItem: (k, v) => {
        if (opts.throwing) throw new Error("blocked");
        expect(k).toBe("ui:theme");
        log.storage = v;
      },
    },
    secure: opts.secure ?? false,
  };
  return { env, log };
}

describe("parseTheme", () => {
  it("accepts exactly light, dark and system", () => {
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme("dark")).toBe("dark");
    expect(parseTheme("system")).toBe("system");
  });

  it("returns null for an absent or unknown value", () => {
    for (const v of [undefined, null, "", "Dark", "auto", " dark", "dark;"]) expect(parseTheme(v)).toBeNull();
  });
});

describe("nextTheme", () => {
  it("cycles light → dark → system → light", () => {
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("system");
    expect(nextTheme("system")).toBe("light");
  });
});

describe("themeCookie", () => {
  it("keeps the choice under the literal keys theme (cookie) and ui:theme (localStorage, D31)", () => {
    expect(THEME_COOKIE).toBe("theme");
    expect(THEME_STORAGE_KEY).toBe("ui:theme");
  });

  it("is the theme cookie for a year, path /, Lax, never HttpOnly", () => {
    expect(THEME_MAX_AGE).toBe(31_536_000);
    expect(themeCookie("dark", false)).toBe("theme=dark; Path=/; Max-Age=31536000; SameSite=Lax");
    expect(themeCookie("light", false)).not.toMatch(/HttpOnly/i);
  });

  it("adds Secure on https", () => {
    expect(themeCookie("system", true)).toBe("theme=system; Path=/; Max-Age=31536000; SameSite=Lax; Secure");
  });
});

describe("SSR: <html> attributes from the cookie", () => {
  it.each([
    ["light", { "data-theme": "light" }],
    ["dark", { "data-theme": "dark" }],
    ["system", {}],
    [undefined, {}],
    ["bogus", {}],
  ])("cookie %s → %j", (cookie, attrs) => {
    expect(htmlThemeAttrs(parseTheme(cookie))).toEqual(attrs);
  });

  it("never sets color-scheme itself (the CSS selectors do, D32)", () => {
    for (const c of ["light", "dark", "system"] as const) expect(Object.keys(htmlThemeAttrs(c))).not.toContain("style");
  });

  it("the root layout spreads htmlThemeAttrs(parseTheme(theme cookie)) on <html>, with no inline script", () => {
    // Whitespace-free, so a reformat or a renamed local does not break it (D43).
    const src = readFileSync(join(process.cwd(), "src/app/layout.tsx"), "utf8")
      .replace(/\s+/g, "")
      .replace(/,\)/g, ")");
    const fromCookie = "parseTheme((awaitcookies()).get(THEME_COOKIE)?.value)";
    const html = src.match(/<htmllang[^>]*>/)?.[0] ?? "";
    const spread = html.match(/\{\.\.\.htmlThemeAttrs\(([^)]*(?:\)[^)]*)*)\)\}/)?.[1] ?? "";
    expect(spread, "the <html> tag spreads htmlThemeAttrs(…)").not.toBe("");
    // Either inline, or through one local assigned from the cookie.
    expect(spread === fromCookie || src.includes(`const${spread}=${fromCookie};`)).toBe(true);
    expect(src).not.toMatch(/<script|colorScheme/);
  });
});

describe("chooseTheme (a click)", () => {
  it("writes localStorage and the cookie and sets data-theme at once", () => {
    const { env, log } = stubEnv(null, { secure: true });
    expect(chooseTheme("dark", env)).toBe("dark");
    expect(log).toEqual({ attr: "dark", cookies: [themeCookie("dark", true)], storage: "dark" });
  });

  it("system removes the attribute", () => {
    const { env, log } = stubEnv("dark");
    chooseTheme("system", env);
    expect(log.attr).toBeNull();
    expect(log.storage).toBe("system");
    expect(log.cookies).toEqual(["theme=system; Path=/; Max-Age=31536000; SameSite=Lax"]);
  });

  it("still writes the cookie and the attribute when storage throws", () => {
    const { env, log } = stubEnv(null, { throwing: true });
    chooseTheme("light", env);
    expect(log.attr).toBe("light");
    expect(log.cookies).toHaveLength(1);
  });
});

describe("reconcileTheme (on mount)", () => {
  it("a present cookie wins: localStorage is brought in line, nothing else written", () => {
    const { env, log } = stubEnv("light");
    expect(reconcileTheme("dark", env)).toBe("dark");
    expect(log).toEqual({ attr: "unset", cookies: [], storage: "dark" });
  });

  it("an absent cookie with a valid stored choice rewrites the cookie and applies it", () => {
    const { env, log } = stubEnv("dark", { secure: true });
    expect(reconcileTheme(null, env)).toBe("dark");
    expect(log.cookies).toEqual([themeCookie("dark", true)]);
    expect(log.attr).toBe("dark");
  });

  it("neither → system, nothing written", () => {
    for (const stored of [null, "nonsense"]) {
      const { env, log } = stubEnv(stored);
      expect(reconcileTheme(null, env)).toBe("system");
      expect(log.cookies).toEqual([]);
      expect(log.attr).toBe("unset");
    }
  });

  it("blocked storage reads as no stored choice", () => {
    const { env, log } = stubEnv("dark", { throwing: true });
    expect(reconcileTheme(null, env)).toBe("system");
    expect(log.cookies).toEqual([]);
  });
});
