/*
 * Service worker — app shell and static assets only.
 *
 * THE RULE, AND WHY IT IS AN ALLOWLIST
 *
 * This app is multi-tenant and every page is per-user. A cached HTML page would
 * be served to whoever opens the app next on that device, which on a shared
 * phone means one establishment's figures shown to another's employee. That is a
 * tenancy leak arriving through a route none of the server-side gates watch:
 * requireX() never runs, because the response never reaches the network.
 *
 * So this file does NOT list what to avoid. A denylist fails open — anything a
 * future route adds is cached by default, and the pattern that "looks right"
 * today silently stops matching tomorrow. It lists what may be cached, and
 * everything else goes to the network untouched.
 *
 * Cacheable, and nothing else:
 *   /_next/static/*   immutable build output, content-hashed
 *   /icons/*          app icons
 *   /manifest.json    the manifest
 *
 * "Cache the app shell" has no referent in this app: there is no static shell
 * document, because every HTML response is server-rendered and session-scoped.
 * An implementer reaching for "the shell" reaches for a data-bearing page, which
 * is the bug. Hence an enumerated allowlist and no shell at all.
 *
 * Never cached, by construction rather than by rule:
 *   every HTML document — no navigation request is handled here at all
 *   /api/*            including /api/export, which streams a workbook of figures
 *
 * There is no offline fallback page. An offline shell would have to be an HTML
 * document, and the only honest one would show no data — which is what the
 * browser's own offline page already does, without us storing anything.
 */

const CACHE = "ledger-static-v1";

/** Exact paths that may be cached. docs/FRONTEND.md enumerates these three. */
const STATIC_FILES = ["/manifest.json"];

/** Path prefixes that may be cached. */
const STATIC_PREFIXES = ["/_next/static/", "/icons/"];

function isCacheable(request) {
  // Only ever GET: a cached response to anything else is meaningless.
  if (request.method !== "GET") return false;

  // A navigation is an HTML document and therefore per-user. Never.
  if (request.mode === "navigate") return false;
  if (request.destination === "document") return false;

  const url = new URL(request.url);

  // Cross-origin is somebody else's to cache.
  if (url.origin !== self.location.origin) return false;

  // Belt and braces: /api/* is excluded explicitly as well as by not being
  // listed below, because it is the one prefix whose leak would be worst.
  if (url.pathname.startsWith("/api/")) return false;

  return (
    STATIC_FILES.includes(url.pathname) ||
    STATIC_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))
  );
}

self.addEventListener("install", (event) => {
  // Take over as soon as the new worker is ready rather than waiting for every
  // tab to close — a stale worker caching by an older rule is the thing to avoid.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop every cache but the current one, so a rename of CACHE is all it
      // takes to invalidate everything a previous version stored.
      const names = await caches.keys();
      await Promise.all(
        names.filter((name) => name !== CACHE).map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  // The load-bearing line: respondWith is not called at all unless the URL is on
  // the allowlist. A catch-all respondWith with *any* strategy is how a data page
  // gets cached by accident, and excluding /api/* does not prevent it — the
  // dangerous responses here are HTML pages, not API routes.
  if (!isCacheable(event.request)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(event.request);
      if (hit) return hit;

      const response = await fetch(event.request);
      // Only store a clean same-origin 200; an opaque or error response cached
      // here would be served as though it were the real asset.
      if (response.ok && response.type === "basic") {
        cache.put(event.request, response.clone());
      }
      return response;
    })(),
  );
});
