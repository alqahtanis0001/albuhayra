// v1.3: per-route client JS, gzipped, from a finished `next build` (.next).
// Usage: node progress/v13/measure-bundles.mjs [out.json]
// A route's JS = the build's root main files + every chunk its RSC manifest
// lists in entryJSFiles (layouts, page, error, loading, not-found). Deduped.
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const root = ".next";
const bm = JSON.parse(readFileSync(join(root, "build-manifest.json"), "utf8"));
const base = new Set([...(bm.rootMainFiles ?? []), ...(bm.polyfillFiles ?? [])]);
const gz = new Map();
const size = (f) => {
  if (!gz.has(f)) gz.set(f, gzipSync(readFileSync(join(root, f.replace(/^\/_next\//, "")))).length);
  return gz.get(f);
};
const out = {};
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name === "page_client-reference-manifest.js") {
      globalThis.__RSC_MANIFEST = {};
      new Function(readFileSync(p, "utf8"))();
      for (const [route, m] of Object.entries(globalThis.__RSC_MANIFEST)) {
        const files = new Set(base);
        for (const list of Object.values(m.entryJSFiles ?? {})) for (const f of list) files.add(f);
        out[route.replace(/\/page$/, "") || "/"] = Math.round([...files].reduce((s, f) => s + size(f), 0) / 102.4) / 10;
      }
    }
  }
}
walk(join(root, "server", "app"));
const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(sorted, null, 2) + "\n");
for (const [r, kb] of Object.entries(sorted)) console.log(`${kb.toFixed(1).padStart(7)} KB  ${r}`);
