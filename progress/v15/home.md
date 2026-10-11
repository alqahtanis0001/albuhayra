# progress/v15/home.md

Your own running notes. Only you write here. The lead merges it into PROGRESS.md at checkpoints. Keep entries short; newest at the bottom.

## Files I own
`src/features/dashboard/**`; `src/app/(owner)/owner/page.tsx`; `src/components/Wheel*.tsx`; values of `t.wheel` / `t.attention` / `t.homeDetails`; the "v1.5 home" zone of `src/features/transactions/scoping.test.ts`.

## Tasks completed
| Task | Files touched | Build/tests pass | Notes for others |
|---|---|---|---|
| H1 reads | `dashboard/overviewReads.ts` (`getOwnerOverview(establishmentId, today)`, `commitmentsOf`), types in `dashboard/wheel.ts` | yes | 5 reads in one `Promise.all`: `listParties()` (reused, D22), salary `instalment.aggregate` (OPEN SALARY, unpaid, due ≤ month end), dial `instalment.findMany` (today…+29), overdue `findMany take 2` + `aggregate` (`_count`, `_sum`) — D35. All `establishmentId`-first, `kind: { not: "OPEN_ENDED" }` |
| H2 geometry | `dashboard/wheel.ts`, `wheelHrefs.ts`, `wheelFocus.ts`, `wheelModel.ts` (all client-safe, D25) | yes | `buildWheelModel` runs on the server; the client gets the computed model (names, amounts, ids, dates, hrefs, angles) |
| H3 wheel UI | `src/components/WheelCard.tsx`, `WheelSvg.tsx`, `WheelRows.tsx` | yes | roving tabindex, SVG halo `var(--focus-ring, var(--color-accent))`, sr-only live line, CSS-only animation via `motion-safe:animate-[wheel-*…_backwards] print:animate-none` + rounded inline delays |
| H4 «يحتاج انتباهك» | `dashboard/attention.ts`, `components/AttentionCard.tsx`; deleted `WeekDues.tsx`(+test), `PendingJoinNotice.tsx`(+test) | yes | nothing else imported them |
| H5 details + recent | `components/HomeDetails.tsx`, `homeDetailsState.ts`; `queries.ts` (`OWNER_RECENT_COUNT = 5`, `RECENT_COUNT = 10` exported); `RecentTransactions.tsx` (`viewAllHref`); `page.tsx` order | yes | D20 CSS and keyframes are theme's, in globals.css |
| D32 / theme list | `SixMonthChart.tsx` (`CHART_TOKENS`: grid/cursor/tooltip border `--color-chart-grid`, axes+ticks `--color-gray-500`, tooltip box `--color-white`), `ExpenseDonut.tsx` stroke `var(--color-white)`, `QuickActions.tsx` `text-on-accent`, AttentionCard badge `text-on-accent` | yes | light values = recharts defaults (theme's list) |

Decisions I took (record for the lead):
- **Minimum visible arc = 4°** (after gaps), borrowed from the others in proportion to their values; when n·4° ≥ the room, equal spans.
- **Overdue angles:** 1 dot (or the ≥ 3 cluster) at −16°; 2 dots at −6° (most recent) and −26°.
- **Cap of 40:** with D18 day-merging the dial holds ≤ 32 marks; `clusterDots(…, max)` still folds any overflow into the last mark (→ `/owner/dues`); the 40-vs-41 case is pinned with the real cap (41 dues → ≤ 40 marks) and the guard with `max = 3`.
- **Ring 2 tones** (mock order): accent-2, gold, accent-3, gold-2, accent (5th, the mock had only 4) ; «أخرى» chart-muted.
- **Keyboard (RTL):** ArrowLeft/ArrowDown = next, ArrowRight/ArrowUp = previous, wrap at the ends; Home/End.
- **Centre % is unsigned** (`12%`, Western digits, no `+`) — the arrow carries the direction (D29). SVG muted text `fill-gray-500` (theme's "muted"); rows keep the app's `text-gray-600`.
- `t.wheel.openHint` is appended to the live line only while a *mark* is focused after an activation.
- Week row totals are recomputed from the non-salary rows (D34), not taken from `dues.totals`.

## Tests added (each with its mutation — all mutated in-tree with a cp backup, restored byte-exact, script in scratchpad)
- `dashboard/wheel.test.ts` (18): arc sum `360−2gap·n` → `360−gap·n` failed 4 cases; min arc → no pinning failed "minimum visible arc"; zero-gets-arc (`> 0`→`>= 0`) failed 2; `dayAngle` → `360d/30` failed D18 angle; overdue order reversed failed 2; dot max clamp removed / min guard removed (`dotRadius(-5,100)`) each failed the D3 case; cluster `>= 3`→`>= 4` failed; same-day merge off failed 2; 40-cap removed failed; window `>= 30`→`> 30` failed; hrefs (`day <= 6`→`< 6`, salary dot → plan, ring 3 type dropped, ring 1 from/to dropped, «أخرى» → bare ledger) each failed its case.
- `dashboard/wheelFocus.test.ts` (12): same-id navigation → same-ring failed; row → mark focus failed; dimming "ring only" failed D16/D19; Escape ignored failed; D28 empty without `!hasEntry` / without `dots.length === 0` each failed; capped sub dropped failed; roving no-wrap failed; client-safety source pin (imports, no `server-only`).
- `dashboard/overviewReads.test.ts` (5): identity `علينا + رواتب = Σ owedByUs` (mutation `fromUs = byUs` failed 2); salary arrears (`gte month start` added failed); OPEN_ENDED exclusion dropped failed 2; `take: 2` dropped failed.
- `dashboard/attention.test.ts` (6): D34 salary filter dropped failed; window `<= 10`→`< 10` failed; `>= 0` dropped failed; «الرواتب اليوم» dropped failed; hidden-when-empty removed failed; badge `+1` failed; `min-h-11` dropped failed.
- `dashboard/components/homeDetails.test.ts` (6): stored-wins → width failed; default → false failed; `data-open` on server failed 2; HomeDetails importing a section failed the D25 source pin; D20 CSS pinned verbatim from globals.css.
- `dashboard/ownerHome.test.ts` (5, page rendered with mocked reads): order swap wheel/attention failed; `viewAllHref` dropped failed; `OWNER_RECENT_COUNT = 10` failed; grid token dropped failed.
- `dashboard/wheelUi.test.ts` (9): one Tab stop (`tabIndexOf: () => 0`) failed; `print:animate-none`/`motion-safe:` dropped failed; animate on empty failed; hit circle removed failed; `print:!opacity-100` dropped failed; `px-4` on the wheel wrapper failed.
- `transactions/scoping.test.ts` "v1.5 home" zone (3): getOwnerOverview empty+populated with ring 3 = `listParties()` on the harness fixture, own-pair sweep (the block runs after the global sweep), non-vacuous foreign establishment; mutation: salary read without `establishmentId` → the populated case failed.
- Pins updated: `pendingJoinNotice.test.ts` deleted with its component (its rule — names read in the page's `Promise.all`, shown on the home — now lives in `ownerHome.test.ts`: `listPendingStaffNames(establishmentId)` source pin + «طلب انضمام من نورة» in the rendered page); `WeekDues.test.ts` deleted with its component (D8/D34 rules in `attention.test.ts`). `FirstRunCard.test.ts:117` (N2 order) still holds unchanged.

## Gates (final)
- `npm run typecheck` 0; `npx vitest run` 132 files / 1882 tests, all green (whole shared tree at the time).
- `npm run build` exit 0 under `.claude/build.lock`; bundles → `progress/v15/bundles-home.json` (55 routes): `/owner` 323.7 → 328.6 KB gz (**+4.9 KB**), the largest delta of any route.
- Token layer `92e1f72` landed before my visuals were finished; the wheel uses theme's names directly (no fallbacks left).

## QA screenshots (static harness, fixture data, no DB)
`progress/v15/qa/home-{light,dark}-{390,1280}.png`, `home-empty-{light-390,light-1280,dark-390}.png`, `home-anim-1s-light-360.png`. SVG width 356 px at 390, 326 px at 360, 360 px at 1280 (≥ 315 — D3/D27). Harness = a scratchpad vitest config rendering the page with mocked reads + the built CSS; no hydration, so the six-month chart (recharts ResponsiveContainer) is blank in the 1280 shot and the first-run card hides — harness limits, not bugs.

## Gotchas I found
- The global static sweep in scoping.test.ts runs before the append zones, so the zone checks its own file's pairs itself (same pattern as `nav`).
- Prisma `instalment.aggregate` sums come back as bigint in Postgres → `Number()`.
- `formatSignedPercent(|pct|)` would print `+12%`; the centre uses its own unsigned formatter.

## Questions / requests sent to lead
- Sent to `theme` (done by theme): keyframes `wheel-draw`/`wheel-pop`/`wheel-lit` and the D20 `.home-details` rules — both in globals.css.
- Open for qa-visual: recharts inside the closed «التفاصيل والرسوم» body on a real phone (ResizeObserver should redraw on open) — needs a hydrated browser pass.

## Round 1 fixes (reviewer R1-H1…H9; lead D39, D40)
| Finding | Fix | Test + mutation |
|---|---|---|
| R1-H1 BLOCKER (D39) | `overviewReads.ts`: a sixth read — `instalment.aggregate` over **all** unpaid OPEN SALARY instalments (no due-date bound); `commitmentsOf(parties, thisMonth, all)` → علينا = Σ owedByUs − all; رواتب stays ≤ month end | `overviewReads.test.ts` fixture now holds a next-month salary row (600): identity علينا + رواتب + later = Σ owedByUs; new case "all-salaries read has no due-date bound". Scoping zone fixture holds next month's 2500 and pins the same identity. Mutations: subtract the ≤-month-end figure again → identity case failed (unit) and the populated gate case failed; bound the all-salaries read by month end → the D39 case failed; `fromUs = byUs` → 2 failed |
| R1-H2 | `centreSub`: `{net}` and `{arrow}{pct}` wrapped in LRI…PDI (`LRI`/`PDI` exported); the centre amount `<text>` is `direction="ltr"` only with a currency (counts at 18 units, page RTL) | `wheelFocus.test.ts` default/capped/no-pct strings carry the isolates (mutations: drop either isolate → both cases failed); `wheelUi.test.ts` "count not forced ltr" (mutation `direction="ltr"` always → failed). Visual order measured in Chromium (`getStartPositionOfChar`): `↑12% · +3,100 الصافي` |
| R1-H3 | count ink by tone: gold → `fill-on-gold` (theme's token: light 7.41:1, dark 9.50:1), green/red → `fill-on-accent`, hollow → `fill-money-out`; a count is drawn only when `r ≥ 7` (`COUNT_MIN_R`), 9 units | `wheelUi.test.ts` R1-H3 case (big salary day shows «2» in on-gold, small IN day shows none). Mutations: ink always on-accent → failed; count on every dot → failed |
| R1-H4 | `CentreText.shortLabel` = `clipLabel(label)` (20 code points + «…»); the disc draws `shortLabel`, the live line keeps `label` | `wheelFocus.test.ts` clip case; `wheelUi.test.ts` SVG case. Mutations: clip disabled → failed; disc draws `label` → failed |
| R1-H5 | `AttentionCard` `Totals` renders only the non-zero side(s) | `attention.test.ts` (OUT-only has no «لنا», IN-only no «علينا», both shows both). Mutation: always show لنا → failed |
| R1-H8 | row 4's values start with «N مواعيد» (`plural(t.wheel.dialCount, Σ dot counts)`, no swatch) | `wheelUi.test.ts` R1-H8. Mutation: drop the count value → failed |
| R1-H9 | `queries.ts` 256 → 249 lines (one-line `PAYMENT_METHODS`, merged count comment) | new `recentCounts.test.ts`: staff `recentTransactions(est, 10, { createdById }, { hideSalary: true })`, owner `(est, 5)`. Mutation `RECENT_COUNT = 9` → staff case failed |

Request to `theme` (done by theme): the `--color-on-gold` token.
Gates after the fixes: typecheck 0; vitest 133 files / 1896 tests green; build exit 0 under the lock; `/owner` 323.7 → 328.8 KB gz (+5.1), the largest delta. Re-shot `progress/v15/qa/home-*.png` plus `home-wheel-zoom-{light,dark}-390.png` (3× crops of the wheel).

## Round 2 note
- `wheelFocus.test.ts`: both `t.wheel.centreSub` and `centreSubCapped` must contain `{arrow}{pct}` (the second isolate opens in `{arrow}` and closes in `{pct}`). Mutation `{arrow} {pct}` in `centreSubCapped` → that case and the capped-string case failed; restored byte-exact (cmp).
- Gates: typecheck 0; vitest 133 files / 1909 tests; build exit 0 under the lock; `/owner` 328.8 KB gz (+5.1).
