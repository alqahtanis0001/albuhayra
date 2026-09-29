# progress/ux.md

Your own running notes. Only you write here. The lead merges it into PROGRESS.md at checkpoints. Keep entries short; newest at the bottom.

## Files I own
(v1.1a-2, from progress/TASKS.md) `src/app/globals.css` (never the `@media print` block or the `.print-only` / `.no-print` rules), every `loading.tsx` / `not-found.tsx` / `error.tsx` under `src/app/**`, `src/components/chrome/RoleNav.tsx`, `src/components/chrome/AppShell.tsx` (imports + wrapper only), `src/app/(auth)/layout.tsx` (only `id="main"` on its `<main>`), new `src/components/skeletons/**`.

## Tasks completed
| Task | Files touched | Build/tests pass | Notes for others |
|---|---|---|---|
| globals early bits | `globals.css`: `--font-brand` token in `@theme`; focus ring → `var(--focus-ring, var(--color-accent))` | tsc 0 | brand told by message |
| U1 skeletons | `src/components/skeletons/{Skeleton,screens,AuthSkeleton}.tsx`; 17 `loading.tsx` (one beside every `page.tsx` except the root redirect); `(auth)/layout.tsx` `id="main"` | build 0, vitest 274/274, tsc 0 | see below |
| U2 404 + errors | `src/app/not-found.tsx`, `src/app/(owner)/not-found.tsx`, `src/app/(staff)/not-found.tsx`; `src/app/error.tsx`, `src/app/(owner\|staff\|admin\|auth)/error.tsx` | build 0, vitest 274/274, tsc 0; `next start -p 3062` checked | see below |
| U3 transitions | `globals.css` only (fade keyframes + one rule); `RoleNav.tsx` / `AppShell.tsx` untouched | build 0, vitest 274/274, tsc 0; headless Chrome on 3062 | see below |

### U1 details
- One `role="status"` per loading file (`SkeletonPage`; `aria-busy` dropped after R-U1 N1, since it can suppress the announcement), sr-only `t.common.loading`; all shapes inside one `aria-hidden` div.
- Pulse is `motion-safe:animate-pulse` on that inner div (opacity only, no gradient). It sits on the inner div, not the status root, so it never fights U3's fade on `#main > *`.
- Blocks: `gray-200` on white surfaces; blocks sitting straight on the `gray-50` body (page titles, labels of forms that are not in a card) use `gray-300` (`onBody`), because gray-200 on gray-50 is ~1.2:1 and nearly invisible. No text is rendered visibly, so the 4.5:1 rule has nothing to measure; the only text is sr-only.
- Widths are classes, never `style={{}}` (CSP: no inline styles).
- New / edit get their own loading files (nearest wins); new shows two buttons, edit one.
- No root `src/app/loading.tsx` on purpose: it would wrap the group layouts in Suspense and turn their `requireX()` redirects into streamed ones.

### U2 details
- Root `not-found.tsx`: async server component, reads `getSession()` only to pick the link (`homePathFor(role)` when `userId` and `role`, else `/login`); never `requireX()`. Standalone frame (green wordmark as-is, 3897×707 attributes, `alt={t.brand.logoAlt}`) + card with the accent top rule. `metadata.title = t.notFound.title` — not-found supports a metadata export (resolve-metadata's `errorConvention`), and the served title was `الصفحة غير موجودة — زخم`.
- `(owner)` / `(staff)` `not-found.tsx`: same content without the frame, rendered inside the group layout so the chrome stays around the `[id]/edit` `notFound()`. No `(admin)` one: nothing there calls `notFound()`.
- `error.tsx` ×5 (root + four groups), client components. Only `retry` is taken — Next 16.3 `error.md` → Reference → `retry`: "re-fetch and re-render the error boundary's children"; `reset` only clears state. No `error.message` / stack / digest, and no `console.error` either. Title + body in a `role="alert"` div, retry via the shared `<Button>`. No React `<title>` (N2 said optional): the root metadata `<title>` is already in the head and a second one would compete.
- Verified on `next start -p 3062` (signed out, lock held for the duration, server killed after): `/login/nope` → **HTTP 404** (not streamed: no loading boundary above the root not-found), styled page, link to `/login`, 12/12 `<script>` carry the nonce, 0 `style=""` attributes, `noindex`. `/pending/x` → 404. `.next/prerender-manifest.json` no longer lists `/_not-found` (route table shows ƒ); `/_global-error` still listed and `.next/server/app/_global-error.html` exists. `/login` still 16/16 nonces.
- Not verifiable signed-out (live DB): the group not-found inside the chrome, and the error pages. Neither calls anything new.

### U3 details
- `@keyframes fade-in { from { opacity: 0 } }` + `@media (prefers-reduced-motion: no-preference) { #main > * { animation: fade-in 180ms ease-out } }`, outside the print block. **No `both` fill mode** (deviation from the R3 text, on purpose): with no delay it is visually identical, and a filling opacity animation keeps the page root a stacking context forever, which would trap the page's fixed `z-50` `<Toast>` under the `z-40` tab bar / `z-30` top bar.
- Nav pending style: **not needed, not added.** Checked in headless Chrome (CDP) against `next start -p 3062`, signed out: on `/login`, clicking the prefetched `/signup` link changed `location.pathname` within ~20 ms (1–2 frames) with the skeleton showing — the navigation commits at once because the loading boundary is prefetched, so `usePathname()` (and with it `activeHref`, the active style and `aria-current`) moves immediately. The tab bar and side nav are the same `<Link>` + `loading.tsx` mechanism. `nav.ts` untouched.
- Fade verified: computed `animation-name: fade-in`, `0.18s` on `#main > *` with `prefers-reduced-motion: no-preference`; `none` under `reduce`. Note headless Chrome reports `reduce` by default — emulate `no-preference` explicitly when re-checking.

## In progress
- nothing — U1, U2, U3 done.

## Gotchas I found
- **Loading boundaries make page-level redirects streamed.** `requireCanEdit()` in the two `[id]/edit` pages now runs inside the loading Suspense, so a staff member without `canEdit` opening an edit URL directly gets a 200 with a streamed redirect (Next's meta refresh + client redirect) instead of a 307. Same class as R6's accepted `notFound()` → 200; nothing leaks (the page throws before rendering data), and the layout-level gates (role, status) still run before the boundary and keep their 307s.
- `(auth)` fade: with `id="main"` on the `<main>`, `#main > *` was the layout's persistent `div.max-w-md`, so no fade between /login and /signup. Per the lead's ruling `id="main"` now sits on that inner div (the `<main>` landmark stays); headless Chrome confirms the /signup page root fades after a click from /login.
- R-U1 S1: `transactions/loading.tsx` also wrapped `new/` and `[id]/edit` (loading wraps the whole segment subtree, and prefetch stops at the nearest loading), so the ledger skeleton flashed on the way to إضافة. Fixed by moving `page.tsx` + `loading.tsx` into `transactions/(list)/` in both areas — byte-identical (sha256 before/after), `@/` imports only; route table still shows `/owner/transactions` and `/staff/transactions`. The move is staged in the index by `git mv` (page.tsx) / plain `mv` (loading.tsx, untracked). Not browser-checked: dashboard → إضافة needs a session.
- **Stale `.next/dev/types/validator.ts` breaks tsc/build after moving a page.** A `next dev` run from earlier left `.next/dev/types/validator.ts`, which tsconfig includes and which still imported the old `transactions/page.js`. I moved that folder aside (generated output; the next `next dev` recreates it). Anyone who moves or deletes a page and then sees TS2307 from `.next/dev/types`: same cause.
- A `next start` is listening on port 3000 (started 20:01, presumably the user's review server). Every `npm run build` replaces `.next` underneath it; restart it before reviewing. I did not touch it.

- **Pre-existing, not mine — service worker on plain-http localhost.** With the SW installed, every `/_next/static/*` request and `/manifest.json` failed `net::ERR_FAILED` on `http://localhost:3062` (so the CSS and JS chunks did not load); bypassing the SW fixed it. Likely cause: `sw.js` is served with the app CSP, which includes `upgrade-insecure-requests`, so the worker's own `fetch()` of `http://localhost/...` is upgraded to https and fails. On Render (https) it cannot occur. Relevant to anyone reviewing on `http://localhost` with `npm start`: unregister the SW or use DevTools "Bypass for network".

## Questions / requests sent to lead
- Asked whether I may add `src/components/status/` (shared panels) for U2; no answer by the time U2 was done, so the markup is inlined per file (~30 lines each).
