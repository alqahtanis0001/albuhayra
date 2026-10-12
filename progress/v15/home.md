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

## QA fixes (D42, from progress/v15/qa-visual.md)
| Item | Fix | Test → mutation |
|---|---|---|
| QV-S2 | one `onKeyDown` on the card's inner wrapper (holds the SVG and the rows) → `cardKeyAction(key)` (Escape → `escape`); the mark-level Escape branch is gone (it bubbles) | `wheelFocus.test.ts` (row focus + Escape → null) ← `cardKeyAction` returns null failed; `wheelUi.test.ts` source pin (wrapper encloses `<WheelSvg` and `<WheelRows`) ← handler removed failed |
| QV-S3 | `showOpenHint(state)` = activated && a mark is focused; visible muted `no-print` line under the wheel | pure case (row / clear / Escape hide it) ← "any focus" failed 2; JSX pin ← line removed failed |
| N5 | empty state: no «إعادة العرض» / «إظهار الكل», row 4 without the count | `wheelUi.test.ts` N5 ← each guard removed failed |
| N6 | `liveLine(state, centre, hint)` joins with «. » | ← plain space failed |
| N7 | overdue dot label by kind: `dotOverdueIn` / `dotOverdueOut` / `dotOverdueSalary` | 3 labels pinned ← always Out failed |
| N12 | `RecentTransactions`: «عرض الكل» only when there are rows | `ownerHome.test.ts` N12 ← guard removed failed |

Gates: typecheck 0; vitest 133 files / 1920 tests; build exit 0 under the lock; `/owner` 328.9 KB gz (+5.2).

## qa-tests (D43)
Re-checked against the current tree (after D42). New pure seams so the node env drives every interaction: `dashboard/wheelController.ts` (`wheelController(effects)` — activate / row / cardKey / replay / showAll over injected `getState`, `setState`, `push`, `bumpReplay`; `markKeyAction`; `wheelView` → centre, tone, live line, hint, animate), WheelCard now only wires it; `HomeDetailsView` (hook-free markup) + `toggleHomeDetails(remembered, wide, store)`. New test file `dashboard/wheelInteractions.test.ts` (12). Every mutation below was applied in-tree with a cp backup, restored byte-exact.

| # | Test | Mutation → failed |
|---|---|---|
| H07 BLOCKER | wheelFocus "ids ↔ amounts ↔ hrefs" (ring 1 and ring 3 rows of `[id, amount, href]`) | swap علينا/رواتب amounts → that case + row-focus total |
| H18 BLOCKER | wheelInteractions "each row lists its own ring's values" (name → exact amount pairs per row; row 4 count, no amounts) | row 2 lists ring 1 → failed |
| H20 BLOCKER | overviewReads "unpaid-only" (all 5 instalment reads carry `paidHalalas: { lt: fieldRef }`); scoping zone loop checks it too | drop `...unpaid` from the dial read → unit case and the gate's populated case |
| H22 BLOCKER | same case | drop `...unpaid` from `overdueWhere` → failed |
| H01 | wheel "largest kind by amount, not count" | count instead of amount → failed |
| H02 (note) | wheel "a tie keeps the earlier kind" | `>` → `>=` → failed |
| H03 | wheel "overdue cluster at −16°" | −26° → failed |
| H04 | wheel "large-arc flag" | flag always 0 → failed |
| H05 | wheel "clockwise from the top" (`polar` at 0/90/180/270) | `-angle` → failed |
| H06 | wheelFocus ids/amounts/hrefs | وارد href → OUT → failed |
| H08 | wheelFocus D28 (no entry, no dots, one commitment → not empty) | drop the ring clause → failed |
| H09 (note) | wheelFocus `wholeRiyals(150) = "2"` | round → trunc → failed |
| H10 | wheelInteractions: second activation calls `push(href)` | push removed → failed |
| H11 | `replay` bumps + clears; `<WheelSvg key={replay}` pin | `key={0}` → failed; bump removed → failed |
| H12 | `wheelView` live line ends with «. » + hint | hint dropped → failed |
| H13 | `cardKey("Escape")` clears from a mark and a row | dispatch removed → failed |
| H14 | dot fill per kind in the rendered SVG | IN/OUT colours swapped → failed |
| H15 | overdue dot: `fill-white` + red stroke, no fill var | filled → failed |
| H16 | «اليوم» circle at cx 200 cy 20 | marker at 180° → failed |
| H17 | layer opacities `[0.18, 1, 0.18, 0.18]` on a ring-2 focus, dial-only on a dot | opacity fixed 1 → failed |
| H19 | `WheelRows(...)` called as a function, each button's onClick → `onRow(1..4)` | every row → 1 → failed |
| H23 | overviewReads mock now projects rows through `select` | drop `employeeId` from the select → dial case failed |
| H24 | `toggleHomeDetails` stores/returns the opposite | store `!next` → failed |
| H25 | `WIDE_QUERY === "(min-width: 48rem)"` | 40rem → failed |
| H26 | `HomeDetailsView` aria-expanded / data-open follow the state | `aria-expanded={false}` → failed |
| H27 | ownerHome: HomeDetails mocked as `<div id="DETAILS">`, the four sections (project fixture added) inside it, wheel/attention/recent not | الأنشطة moved out → failed |
| T12 | homeDetails: parsed `@media print` blocks (themeCss.testkit `blocks`) name no `home-details`; no unscoped rule either | a print rule hiding the body → failed |
| H29 | — | equivalent (the read takes 2), recorded |

Also:
- Vacuous 40-mark test rewritten: exactly `max` marks pass untouched (ids pinned), `max − 1` folds the rest; `MAX_MARKS === 40`.
- Brittle pins loosened: D20 CSS now parsed (accepts `width < 48rem` / `max-width: 47.9…rem` and `min-width: 48rem`); ownerHome's variable-name regexes replaced by a behavioural "overview and dues get the same today" (mutation: dues gets another date → failed); the D21 source regexes removed (`recentCounts.test.ts` pins the calls: owner 5 / staff 10, re-mutated); client-safety `server-only` regex accepts either quote; WheelCard pins match the controller wiring.
- Midnight flake, `scoping.test.ts` "v1.2b CP2 … checkIn": `vi.useFakeTimers({ toFake: ["Date"] })` + `setSystemTime(today 12:00 Riyadh)`, restored in `finally`. Proof: the clock set to 00:00:30 Riyadh reproduces the reported failure (that case + the static sweep).
- Every earlier mutation re-run after the refactor; moved ones re-targeted (salary scope, empty-no-animation, row-4 count, QV-S2/S3 pins, owner 5) — all fail.

Gates: typecheck 0; vitest 136 files / 1974 tests; build exit 0 under the lock; `/owner` 329.2 KB gz (+5.5).

## Follow-up (D47, D48 — user's rulings 3 and 4, 2026-10-12)
| Task | Files | Notes |
|---|---|---|
| D47 one colour per category | new `dashboard/categoryColours.ts` (`CATEGORY_COLOURS`, `categoryColour(key, rank)` — the donut's v1.3 order out, amber, gold, blue, teal; «أخرى» and rank ≥ 5 grey); `ExpenseDonut.tsx` `colourOf` → `categoryColour`; `wheelModel.ts` segments carry `colour` (a `var(--color-…)`) instead of `tone`, ring 2 = `categoryColour(s.key, i)` over the same `donutSlices`; `TONE_VAR` (green/red/gold only) moved from `WheelSvg.tsx` to `wheelModel.ts` (re-exported by WheelSvg); arcs and row swatches use `s.colour` | The mock's ring-2 tones are retired: `--color-accent-2`, `--color-accent-3`, `--color-gold-2`, `--color-chart-muted` are now unused in `src/` (theme's globals.css — left in place, see Questions) |
| D48 «عرض» links | `wheelHrefs.ts` `monthLedgerHref(today)` (`/owner/transactions?from=…&to=…`, both directions) + `ROW_HREF` (`?tab=reports`, `/owner/parties`, `/owner/dues`); `WheelModel.rowHrefs` built on the server; `WheelRows.tsx` each row = a `div` (border/tint/lit animation) holding the unchanged focus `<button>` and a trailing `next/link` «عرض» (`aria-label` «عرض: {title}», `no-print min-h-11 min-w-11`, `text-accent-dark`) | Links stay in the D28 empty state. `ROW_HREF.ring2` is a literal (ledgerTab.ts imports the validation barrel) pinned equal to `REPORTS_HREF` by a test |

Tests: new `dashboard/wheelFollowup.test.ts` (9); `wheelFocus.test.ts` client-safety pin extended to `categoryColours.ts` (allowed `./categoryColours`, `@/components/visualPalette`). Existing H18/H19 (rows list their ring's values; each button focuses its ring) unchanged and green. Mutations (scratchpad script, cp backup, restored, sha1 verified):
- M1 ring 2 given its old mock palette → "for each rank ring 2 = donut", "v1.3 order", "«أخرى» grey", "arcs stroked" failed (4)
- M2 `categoryColour` ignores «أخرى» → "«أخرى» is grey at any rank" failed
- M3 donut uses rank i+1 → "for each rank ring 2 = donut" failed
- M4 row swatch fixed colour → "row 2's swatches follow ring 2" failed
- M5 arc stroke fixed colour → "arcs stroked with the segment's colour" failed
- M6 ring 1 → `directionHref("OUT")`; M7 ring 2 → `/owner/reports`; M8 ring 3 → `?type=CUSTOMER`; M9 dial → `/owner/plans`; M10 ring 1 without `to` → each failed "row hrefs" + "links stay in the empty state"
- M11 link moved inside the button → "never inside a `<button>`" failed (H19 stays green: focus unchanged)
- M12 `no-print` dropped; M13 `min-h-11` dropped; M14 aria-label without the title → each failed "text «عرض», accessible name, ≥ 44 px, no-print"
- M15 links hidden when `model.empty` → "links stay in the D28 empty state" failed

Gates: typecheck 0 (whole tree, theme had finished); vitest 138 files / 2015 tests green; build exit 0 under `.claude/build.lock`; bundles → `progress/v15/bundles-followup-home.json` (55 routes): `/owner` 323.7 → 329.9 KB gz (+6.2 vs baseline; +0.7 vs my last v1.5 measure 329.2), max delta of any route +6.2.

Screenshots (static harness, fixture data, reduced motion): `progress/v15/qa/followup-home-{light,dark}-{390,1280}.png`, `followup-home-empty-light-390.png`. At 1280 the donut legend (details open) shows red, amber, gold, blue, grey = ring 2 and row 2.

Questions:
- `theme`/lead: the four ring-2 tokens above are orphaned in globals.css (light + both dark blocks) — remove or keep?
- Ring 2's largest category is now `money-out` red, the same as ring 1's «صادر الشهر» — that is what D47 asks (one colour per category everywhere); flagging only so qa-visual expects it.

### QF-N3 (qa-visual follow-up)
`WheelRows.tsx`: the «عرض» link gets `self-center` (the row is `items-stretch`), so it keeps its own ≥ 44 × 44 px box instead of filling the row's height. Test `wheelFollowup.test.ts` "QF-N3" (link carries `self-center`/`self-start`, never `self-stretch`/`h-full`/`self-auto`); mutation: `self-center` removed → that case failed; restored from backup. Gates: typecheck 0; vitest 138 files / 2025 tests; build 0 under the lock; `/owner` 329.9 KB gz (unchanged).
