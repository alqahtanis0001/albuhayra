# progress/p2-home.md

Your own running notes. Only you write here. The lead merges it into PROGRESS.md at checkpoints. Keep entries short; newest at the bottom.

## Files I own
- `src/features/dashboard/queries.ts` — the `firstRun` field of `OwnerDashboard` and the one `readFirstRunFlags` call; `src/features/dashboard/firstRunReads.ts` (new, server-only: the four reads)
- `src/features/dashboard/components/firstRun.ts` (new, pure), `FirstRunCard.tsx` (new, client), `firstRun.test.ts`, `FirstRunCard.test.ts`
- `src/app/(owner)/owner/page.tsx` — one JSX line + the import + the doc comment (D27 S4)
- `src/components/ConfirmDialog.tsx` — `m-auto` only (D26a) + `src/components/ConfirmDialog.test.ts` (new)
- `src/features/transactions/scoping.test.ts` — the `getOwnerDashboard` driver region only (one new case)
- `progress/v14/p2-home.md`, `progress/v14/bundles-p2-home.json`

## Tasks completed
| Task | Files touched | Build/tests pass | Notes for others |
|---|---|---|---|
| P2-3 D25 reads — `OwnerDashboard.firstRun: FirstRunFlags` (four booleans) from four `count` reads appended to the existing `Promise.all` (indices 0–6 unchanged): `transaction.count({ where: allTime })` (scoped + `deletedAt: null`, D27), `party/plan/employee.count({ where: { establishmentId } })`; mapped `> 0`. | `queries.ts` (+23 −2), `scoping.test.ts` (+27, dashboard region) | tsc 0 · gate 141/141 · full suite 90 files / 1454 | `FirstRunFlags` is defined in the pure `components/firstRun.ts` and type-imported by `queries.ts` (erased); `data.ts` is not mine so the type did not go through it. `lead`: `docs/BACKEND.md › v1.4` should list `firstRun` (D27 said the lead does this at CP-D). |
| P2-3 D25 card — `firstRun.ts` (`FIRST_RUN_STEPS` in spec order, `firstRunSteps`, `allDone`, `shouldShowFirstRun`, `readFirstRunHidden`/`rememberFirstRunHidden` on `home:firstRunHidden`, guarded), `FirstRunCard.tsx` (`FirstRunCard` = state: `hidden: boolean \| null`, null until mounted → `FirstRunCardView phase="mounting"` renders the `Card` with `no-print hidden`; after the effect, `shown` or `null`; `FirstRunCardView` is the pure render), the page line + doc comment. | `firstRun.ts` 76 l, `FirstRunCard.tsx` 106 l, `owner/page.tsx` | tsc 0 · 16 cases green | Card: `t.firstRun.title`, hint, `t.firstRun.progress` via `fillText` (Western digits), `<ol>` of four rows: done → `CheckIcon` (icons are `aria-hidden` by default) + label + sr «تم»; untried → `Link` row `min-h-11` with `ChevronEndIcon`; «إخفاء» = `Button type="button" variant="secondary" size="sm"` in the Card's `action` slot. No animation, logical utilities only. |
| P2-4 D26a — `m-auto` first in the `<dialog>` class string, with a comment saying why (Tailwind v4 preflight resets margin). | `ConfirmDialog.tsx`, `ConfirmDialog.test.ts` (new, 3 cases) | 3/3; `settingsPages` and `categoryQuick` suites still green in the full run | D26b (the i18n value) and D26c are the lead's / already done — not touched. |

## Tests (every rule mutation-proven; "mutation → failing case")
Scratch-copy runner `scratchpad/p2-home/mut.mjs` (copies the four `components/firstRun*` files to `scratchpad/p2-home/tree/`, mutates the copy, `startVitest` with `root` = repo, `dir` = the copy, alias `@/` → `src/`; the tests' relative imports resolve to the copies — the shared tree is never touched). In-tree runner `mut-tree.sh` for `queries.ts` and `ConfirmDialog.tsx` (cp backup → mutate → one vitest run → restore, `cmp` byte-exact; each run ≈ 2 s).
- M1 swap party/plan in `FIRST_RUN_STEPS` → "gives the four steps in the spec's order…" + "keeps the spec's order: حركة, جهة, اتفاقية, موظف" fail.
- M2 plan href `/owner/plans` → "gives the four steps…" + "with nothing done, every step is a link…" fail.
- M3 party step reads `hasPlan` → "each step is done by exactly its own flag" fails (also allDone and three render cases).
- M4 `allDone` uses `some` → "allDone only when all four flags are true" (+ "shows unless…", + the hidden-before-mount render, because twoDone then counted as done) fail.
- M5 `shouldShowFirstRun` ignores `hidden` → "the card shows unless everything is done or the owner hid it" fails.
- M6 `readFirstRunHidden` without try/catch → "works when storage throws…" + "without a window at all…" fail.
- M7 key `home:firstRun` → "uses the agreed key…" fails.
- M8 drop `hidden` before mount → "renders the card hidden and no-print until storage has been read" fails.
- M9 drop `no-print` → that case + "is visible, printable-excluded…" fail.
- M10 remove the `return null` guard in `FirstRunCard` → "renders nothing when all four steps are done" fails.
- M11 drop the sr «تم» span → "ticks the two done steps…" fails.
- M12 progress digits via `toLocaleString("ar-EG")` → "counts the done steps in Western digits: «2 من 4»" + "«0 من 4»" fail.
- M13 «إخفاء» `type="submit"` → "is visible… and carries the title, hint and «إخفاء» button" fails.
- M14 drop `min-h-11` from the row → "every link row and the hide button meet the 44 px tap target" fails.
- M15 `party.count({ where: {} })` → gate: "getOwnerDashboard", "…first-run reads are scoped…", "…with categories to name", the static sweep fail (4).
- M16 `transaction.count({ where: { establishmentId } })` (bare, no `deletedAt`) → the same 4 fail (`deletedAt is undefined, not null`; S-K5a refuses it as a probe).
- M17 a fifth numeric field `entries` on `firstRun` → "…reduce to four booleans" fails (`Object.keys` length 4 + all-boolean check).
- M18 `hasParty: parties === 0` → "…reduce to four booleans" fails (the `toEqual` on the flags).
- M19 `employee.count` scoped to `"other"` → the same 4 gate cases as M15 fail (the gate compares by value).
- M20 drop `m-auto` → "the <dialog> carries m-auto…" + "the class lives in the source once, on the dialog element" fail.
Not provable without a DOM (accepted, recorded): the component's after-mount branch (`setHidden(readFirstRunHidden())` → null) — effects do not run in `renderToStaticMarkup`; the decision is the pure `shouldShowFirstRun` (M5) and the view is driven directly with `phase: "shown"`.

## Gates (final tree, 2026-10-11 ~01:02 UTC)
- `npx tsc --noEmit` → 0 errors (with `p2-forms`' in-progress `TransactionForm.tsx` in the tree).
- `npx vitest run` → **90 files / 1454 tests**, 0 failed (CP-C was 85 / 1414; mine: +3 files / +19 cases, +1 gate case).
- `DATABASE_URL=postgresql://placeholder:…@localhost:5432/placeholder npm run build` under `.claude/build.lock` (acquired 01:02:09, released after) → exit 0; `prerender-manifest.json` routes = `['/_global-error']` only (the known accepted one); log: `scratchpad/p2-home/build1.log`.
- Bundles `progress/v14/bundles-p2-home.json` vs `bundle-baseline.json`: 55 routes, 0 over +40 KB; max delta +5.3 KB (`/staff/transactions/[id]/edit`, `p2-forms`' form work). **`/owner` 322.0 KB = +3.0 KB vs baseline, +1.1 KB vs CP-C (`bundles-cpc.json` 320.9)** — the card leaf: `FirstRunCard` + `firstRun` + `Button` (already on the route) + `fillText` (already on the route via `ExpenseDonut`).

## Lead's change after the report (2026-10-11): `queries.ts` over ~250 lines
- New server-only `src/features/dashboard/firstRunReads.ts` (35 l): `readFirstRunFlags(establishmentId, allTime) → Promise<FirstRunFlags>` runs the four counts in its own `Promise.all` and reduces them to booleans; re-exports `type FirstRunFlags`. `getOwnerDashboard` calls it as the eighth entry of its existing `Promise.all` and returns `firstRun` as is. `queries.ts` 269 → **253** (pre-existing 248 + import, one-line-commented type field, one `Promise.all` entry, one return line — the minimum). Behaviour identical.
- Gate: `firstRunReads.ts` added to the static `FILES` sweep and to the S8 server-only / never-`"use server"` list (as `plans/open*.ts` were). The existing D25 gate case still sees the four pairs in order, `establishmentId` by value and `deletedAt: null` on the entry count.
- Mutations re-run on the new module (in-tree, `cmp` byte-exact): M15b unscoped `party.count` → 4 gate cases fail; M16b bare `{ establishmentId }` entry count → the same 4; **M21 drop `import "server-only"` → "S8: … server-only and never use-server" fails**.
- Gates: `tsc --noEmit` 0; `vitest run` 90 files / 1454: **1453 pass, 1 fail = `entryDetails.test.ts › TransactionForm.tsx ends below 250 lines`** — `p2-forms`' in-progress file (excepted by the lead); every file of mine green. No client bundle change (server module only) — no rebuild.

## qa-tests part 2 (S3, S4, N1, N2) — applied 2026-10-11
- Code verified right first (`hide()` → `rememberFirstRunHidden(); setHidden(true)`; effect `setHidden(readFirstRunHidden())`; guard `shouldShowFirstRun(firstRun, hidden === true)`); no behaviour change.
- `FirstRunCard.test.ts` gains "FirstRunCard wiring (static pins)" (3 cases on the source, anchored on the statements): S3 `hide()` remembers then hides; S4 the effect reads storage **and** the render passes `hidden === true` (and never a literal `true`/`false`); N2 `owner/page.tsx` has `<QuickActions />` < `<FirstRunCard firstRun={data.firstRun} />` < `<OwnerStatCards` by index.
- N1: `ConfirmDialog.test.ts` source regex relaxed to `className="[^"]*\bm-auto\b` (no longer requires first position).
- Mutations (in-tree, `cmp` byte-exact): M22 `hide()` without `rememberFirstRunHidden()` → S3 fails; M23 `shouldShowFirstRun(firstRun, false)` → S4 fails; M24 effect `setHidden(false)` → S4 fails; M25 card line moved below `OwnerStatCards` → N2 fails; M20b `m-auto` dropped → both dialog cases still fail under the relaxed regex.
- Gates: `tsc --noEmit` 0; `vitest run` **91 files / 1481 tests, all green** (p2-forms' line-budget case now passes too). No bundle change (tests only) — no rebuild.

## In progress
- Task: none — all P2-3 / P2-4 items done, lead's line-budget change and qa-tests S3/S4/N1/N2 applied; awaiting the reviewer.

## Gotchas I found
- A `.test.ts` outside the repo root runs fine with `startVitest(…, { root: repo, dir: <scratch dir>, include: ["**/*.test.ts"], alias: [@/ → src/] })`; relative imports inside the copied files resolve to the copies, which is what makes a scratch-copy mutation of a component with relative imports possible (copy the whole small cluster, not one file).
- `vitest`'s `getCountOfFailedTests()` counts the failing suites/files as well as cases; report by case names.
- The `Svg` icon helper already sets `aria-hidden="true"` — do not pass it again (React would warn on a duplicate prop in strict typing only, but the pin should be on the sr text, not on the attribute).
- `grep -P '[٠-٩]'` without a UTF-8 locale matches bytes and reports Arabic comment lines as "Eastern digits"; check with Python `re` and the `٠-٩` range instead.

## Questions / requests sent to lead
- `docs/BACKEND.md › v1.4`: add `firstRun: { hasEntry, hasParty, hasPlan, hasEmployee }` on `OwnerDashboard` (four scoped `count` reads, booleans only) — D27 says the lead does this at CP-D.
- `docs/FRONTEND.md › v1.4` (or the home section): the owner home order now reads quick actions → first-run card → money cards (D27 S4); the page's doc comment says so, the doc may want the same line.
- No `ar.*` key needed; `t.firstRun.*` covered everything.
