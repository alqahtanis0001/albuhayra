import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

/**
 * The service worker's cache allowlist. Subject under test: `public/sw.js`,
 * which cannot hold its own test because everything in `public/` is served.
 *
 * Why this is pinned at all. Every other tenancy protection in this codebase has
 * `requireX()` behind it as a backstop. This one has **nothing** behind it: a
 * cached response never reaches the network, so no server-side gate runs. Cache
 * one HTML page and the next person to open the app on that device sees it — on
 * a shared phone, one establishment's figures shown to another's employee.
 *
 * It is also a fail-open surface. `sw.js` is written as an allowlist precisely
 * because a denylist caches every future route by default, and these cases are
 * what stop a "simplification" turning it back into one.
 */

const ORIGIN = "https://ledger.test";

type FakeRequest = {
  method: string;
  url: string;
  mode?: string;
  destination?: string;
};

/**
 * Plain objects rather than real `Request`s on purpose: `mode: "navigate"` is not
 * constructible through the `Request` constructor, and a navigation is the single
 * most important case here. `isCacheable` reads only these four fields.
 */
function req(path: string, overrides: Partial<FakeRequest> = {}): FakeRequest {
  return {
    method: "GET",
    url: path.startsWith("http") ? path : `${ORIGIN}${path}`,
    mode: "cors",
    destination: "script",
    ...overrides,
  };
}

type Listeners = Record<string, (event: unknown) => void>;

/** Loads `public/sw.js` in a worker-shaped sandbox and hands back its internals. */
function loadWorker(source = readFileSync("public/sw.js", "utf8")): {
  isCacheable: (request: FakeRequest) => boolean;
  listeners: Listeners;
} {
  const listeners: Listeners = {};
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (name: string, handler: (event: unknown) => void) => {
      listeners[name] = handler;
    },
    skipWaiting: async () => undefined,
    clients: { claim: async () => undefined },
  };
  const caches = {
    keys: async () => [],
    delete: async () => true,
    open: async () => ({
      match: async () => undefined,
      put: async () => undefined,
    }),
  };

  const factory = new Function(
    "self",
    "caches",
    "fetch",
    `${source}\nreturn { isCacheable };`,
  );
  const fetchStub = async () => ({
    ok: true,
    type: "basic",
    clone: () => ({}),
  });

  return { ...factory(self, caches, fetchStub), listeners };
}

let worker: ReturnType<typeof loadWorker>;

beforeEach(() => {
  worker = loadWorker();
});

describe("what may be cached", () => {
  it.each([
    "/_next/static/chunks/main-abc123.js",
    "/_next/static/media/plex-arabic.woff2",
    "/_next/static/css/app.css",
    "/icons/icon-192.png",
    "/icons/icon-512.png",
    "/manifest.json",
  ])("caches %s", (path) => {
    expect(worker.isCacheable(req(path))).toBe(true);
  });
});

describe("what must never be cached", () => {
  it("a per-user payload that looks static: /_next/data/owner.json", () => {
    // The case that matters most — it sits under /_next/ and looks like build
    // output, so it is the one a reasonable person adds to an allowlist by
    // accident. It carries one establishment's data.
    expect(worker.isCacheable(req("/_next/data/owner.json"))).toBe(false);
  });

  it("prefix confusion: /iconsomething is not under /icons/", () => {
    // The trailing slash in the prefix is load-bearing. Dropping it — a tidy
    // looking simplification — caches any path merely beginning with "/icons".
    expect(worker.isCacheable(req("/iconsomething"))).toBe(false);
    expect(worker.isCacheable(req("/icons-private/x.png"))).toBe(false);
  });

  it("exact-match files are not prefixes either", () => {
    expect(worker.isCacheable(req("/manifest.jsonx"))).toBe(false);
    expect(worker.isCacheable(req("/manifest.json.map"))).toBe(false);
  });

  it("a navigation, by mode rather than by URL pattern", () => {
    expect(
      worker.isCacheable(req("/owner", { mode: "navigate", destination: "document" })),
    ).toBe(false);
    // Excluded even when the path itself is on the allowlist, because the check
    // runs before any path matching.
    expect(
      worker.isCacheable(req("/manifest.json", { mode: "navigate" })),
    ).toBe(false);
  });

  it("a document destination even when mode is not navigate", () => {
    expect(
      worker.isCacheable(req("/manifest.json", { destination: "document" })),
    ).toBe(false);
  });

  it("every API route, including the one that streams figures", () => {
    expect(worker.isCacheable(req("/api/health"))).toBe(false);
    expect(
      worker.isCacheable(req("/api/export?from=2026-01-01&to=2026-12-31")),
    ).toBe(false);
  });

  it("an ordinary page fetched without navigate mode", () => {
    // An RSC payload request is not a navigation and is still per-user.
    expect(worker.isCacheable(req("/owner"))).toBe(false);
    expect(worker.isCacheable(req("/owner/transactions?page=2"))).toBe(false);
  });

  it("anything that is not a GET", () => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE", "HEAD"]) {
      expect(worker.isCacheable(req("/manifest.json", { method })), method).toBe(
        false,
      );
    }
  });

  it("another origin's assets", () => {
    expect(
      worker.isCacheable(req("https://cdn.example.com/_next/static/x.js")),
    ).toBe(false);
  });

  it("the worker script itself", () => {
    expect(worker.isCacheable(req("/sw.js"))).toBe(false);
  });

  it("the favicon, which is not one of the doc's three cacheable things", () => {
    // docs/FRONTEND.md enumerates exactly /_next/static/*, /icons/* and
    // /manifest.json. The favicon is harmless to cache and still excluded,
    // because on an allowlist being looser than the spec is the wrong direction
    // to differ in — every exception is a precedent for the next one.
    expect(worker.isCacheable(req("/favicon.ico"))).toBe(false);
  });

  it("a staff page as well as an owner one", () => {
    // Both role areas, so a future prefix rule cannot be written for one and
    // silently miss the other.
    expect(worker.isCacheable(req("/staff/transactions"))).toBe(false);
    expect(worker.isCacheable(req("/admin/establishments"))).toBe(false);
  });

  it("a non-GET aimed at a genuinely cacheable path", () => {
    expect(
      worker.isCacheable(req("/_next/static/chunks/x.js", { method: "POST" })),
    ).toBe(false);
  });
});

/**
 * The protection is not `isCacheable` alone — it is that `respondWith` is never
 * called for anything else. A catch-all `respondWith` with any strategy is how a
 * data page gets cached by accident, and excluding /api/* would not prevent it.
 */
describe("the fetch handler declines to handle anything off the allowlist", () => {
  function dispatch(request: FakeRequest): boolean {
    const respondWith = vi.fn();
    worker.listeners.fetch!({ request, respondWith });
    return respondWith.mock.calls.length > 0;
  }

  it("registers a fetch handler at all", () => {
    expect(typeof worker.listeners.fetch).toBe("function");
  });

  it("does not respond to a navigation", () => {
    expect(dispatch(req("/owner", { mode: "navigate", destination: "document" }))).toBe(
      false,
    );
  });

  it("does not respond to a per-user payload under /_next/", () => {
    expect(dispatch(req("/_next/data/owner.json"))).toBe(false);
  });

  it("does respond to a genuinely static asset", () => {
    expect(dispatch(req("/_next/static/chunks/main.js"))).toBe(true);
  });
});

describe("the allowlist shape itself", () => {
  const source = readFileSync("public/sw.js", "utf8");

  /**
   * Comments stripped before any source-level check: `sw.js` explains its own
   * rules in prose, and a file that documents why it never calls respondWith
   * off the allowlist must not fail a test looking for that word. Prose is
   * documentation; a call is the defect.
   */
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

  it("keeps the trailing slash on every prefix", () => {
    // Stated as source-level too, because this is the clause whose absence is
    // invisible on inspection and whose effect only shows on a crafted path.
    const prefixes = code.match(/const STATIC_PREFIXES = \[(.*?)\]/s)?.[1] ?? "";
    expect(prefixes).not.toBe("");
    for (const quoted of prefixes.match(/"[^"]+"/g) ?? []) {
      expect(quoted, quoted).toMatch(/\/"$/);
    }
  });

  it("has no catch-all respondWith outside the allowlist guard", () => {
    const guardIndex = code.indexOf("if (!isCacheable(event.request)) return;");
    expect(guardIndex, "the allowlist guard is gone").toBeGreaterThan(-1);
    // Every respondWith in *code* must come after the guard that can decline.
    for (const match of code.matchAll(/respondWith/g)) {
      expect(match.index!).toBeGreaterThan(guardIndex);
    }
  });

  it("the comment stripper does not simply blank the file", () => {
    // Without this, a bug in `code` would make the two checks above vacuous.
    expect(code).toContain("isCacheable");
    expect(code).toContain("STATIC_PREFIXES");
  });
});
