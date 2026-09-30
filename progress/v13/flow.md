# progress/v13/flow.md — v1.3 recording for `flow`

## My five items (docs/V13-SPEC.md)
1. 6 — Week ribbon on المستحقات (متأخرة + 7 day tiles; count and لنا/علينا; tap scrolls to and highlights that day's rows)
2. 7 — Segmented instalment bar replacing `progressText` in `PlanBits` (PlanList cards + plan detail header; text kept sr-only)
3. 8 — Payment micro-animation via `?paid=<instalmentId>` (row wash 800 ms, segment fills, badge cross-fades; param cleared)
4. 9 — Budget meter upgrade in `ProjectBits` (fill on mount; green → gold ≥ 80% → red > 100%; amounts) + category ring on project detail
5. 15 (spec §10, `flow`) — `EmptyState` `kind` with six original inline SVG illustrations wired to the existing empty states

Your own running notes. Only you write here. The lead merges it into PROGRESS.md at checkpoints. Keep entries short; newest at the bottom.

## Files I own
`src/features/dues/**`, `src/features/plans/components/**`, `src/features/projects/components/**`, `src/components/EmptyState.tsx`, `src/components/illustrations/**` (new), `src/app/(owner)/owner/dues/page.tsx`. Granted: plans list + detail pages, projects list + detail pages; the `EmptyState` line only in parties list, staff home, owner + staff ledger lists; the `doneHref` expression only in `owner/transactions/new/page.tsx`; read-only additions to `plans/queries.ts` / `projects/queries.ts`.

## Tasks completed
| Task | Files touched | Build/tests pass | Notes for others |
|---|---|---|---|
| 15 illustrations | `components/illustrations/{Frame,LedgerArt,PartiesArt,DuesArt,ProjectsArt,EmployeesArt,RemindersArt,index}.tsx`, `EmptyState.tsx`; `kind` wired in parties / plans (reminders) / projects / owner + staff ledger lists (unfiltered only), staff home ACTIVE tab, dues «هذا الأسبوع» | typecheck ✓ vitest ✓ | `dash` told at once to wire RecentTransactions (ledger) + WeekDues (dues). Each drawing 0.4–0.6 KB, one gold accent, `aria-hidden`, `focusable=false`, `no-print`, 112×90 |
| 6 week ribbon | `dues/ribbon.ts` (+test), `dues/components/WeekRibbon.tsx` (server), `RibbonJump.tsx` (**client**, renders nothing), `DueList.tsx` (`data-due-date` on rows), `owner/dues/page.tsx` (ribbon + `id="dues-overdue"` / `id="dues-week"`) | ✓ | No new query. `DueRows` props unchanged (dash's `/owner` WeekDues unaffected) |
| 7 instalment bar | `plans/components/instalmentSegments.ts` (+test), `InstalmentBar.tsx` (server), `PlanList.tsx`, plan detail page; `plans/queries.ts` gains `PlanRow.instalmentStatuses` | ✓ | Read-only field, derived from the rows `toRow` already has — **no new DB call** |
| 8 payment highlight | `owner/transactions/new/page.tsx` (`doneHref` only: `?paid=<instalmentId>`), `InstalmentList.tsx` (`paidId`), `PaymentRecorded.tsx` (**client**), plan detail page | ✓ | No action change |
| 9 budget meter + ring | `projects/components/budgetVisual.ts` (+test), `ProjectBits.tsx` (`BudgetMeter`, props unchanged), `CategoryRing.tsx` (server SVG), project detail page | ✓ | `BudgetMeter` also renders on dash's `/owner` (ActiveProjects) — props untouched |

## In progress
- Task: none — items 6–9 and 15 done; report sent to the lead
- Where I am: —
- Next action: address reviewer findings. The lead accepted all six report points (the `.v13-paid` reuse, Intl weekday names, the BudgetMeter changes with gold at budget 0, the `instalmentSegments.ts` name, the collision handling, the line counts). No DB driver is needed.

## Decisions / deviations
- **7:** the bar is `InstalmentBar.tsx` (server). `PlanBits.tsx` untouched (ruling B4). Segments are equal width, 1 px gap up to 24, then no gap. Statuses map 1:1 (ruling S1), and the legend uses `t.instalmentStatus` words. Segment colours use `PALETTE` inline `style`, because they are shapes, not tints, and the bar is `no-print`. List cards: `aria-hidden`, no popover, no focus. Detail: each segment is `role="img"` + `tabIndex=0` + `aria-label` (name — amount — status as a string, via `formatSAR`). A CSS-only popover (`group-hover` / `group-focus-within`, `aria-hidden`) shows the same text with `<MoneyText>`. It opens inward: first half anchors `start-0`, the rest `end-0`. `progressText` stays as `.sr-only-screen`, so it is readable on screen and prints. The detail bar sits under the header `dl` with the legend.
- The pure helper file is `instalmentSegments.ts`, not `instalmentBar.ts`: on Windows, tsc treats `instalmentBar.ts` and `InstalmentBar.tsx` as the same file (TS1149).
- **8:** `?paid=` is matched against the plan's own instalments (a foreign or unknown id matches nothing). The row gets `.v13-paid`, its bar segment's fill gets `.v13-grow-inline`, and its badge is wrapped in `.v13-fade-in`. `PaymentRecorded` (client) fills a `role="status"` on the next frame (so it is announced once). It clears the param with `history.replaceState(null, "", pathname)` after 800 ms, or at once under reduced motion (`matchMedia` read inside the effect), per ruling B1.
- **6:** Tiles are server-rendered. A tile with rows is a `<button data-jump>` with `aria-label` = `t.duesRibbon.jump`, and its content is linked by `aria-describedby`. An empty tile is a plain `div` («لا شيء»), because there is nothing to jump to. `RibbonJump` is one delegated click listener. It scrolls the first matching row into view (`auto` under reduced motion) and moves focus to it (`tabindex=-1`, `preventScroll`) so keyboard users land there. It **reuses `.v13-paid`** as the 800 ms highlight wash (removed after 800 ms) instead of asking for a new class. Weekday names come from `Intl` `ar-SA-u-nu-latn`, `timeZone: "UTC"` (the ISO day itself). The tile date is `DateText compact`. The ribbon sits under the h1, above the overdue strip, and scrolls horizontally with native RTL order.
- **9:** `budgetTone` is integer math. Budget 0 with nothing spent reads as gold (budget used up), and anything spent over 0 is red. `budgetPct` floors within budget and ceils over it, so the % never contradicts the colour (79.99% → 79, 100.01% → 101). Amounts under the bar: المصروف · الميزانية, then المتبقي / تجاوز and the % in `<bdi dir="ltr">`. The old «X من Y» line was replaced by these (spec: "amounts under the bar"). The bar still prints as before; the animation is screen-only through the shared CSS. Ring: OUT categories only, top 5 + «أخرى» (grey), arcs on `pathLength=100` circles, no animation (`.v13-draw` is banned on arcs). The legend (name, `MoneyText`, rounded %) is the text equivalent. The card is `no-print` because the «حسب التصنيف» table already prints.
- **15:** «ended» employees tab, «لا توجد متأخرات», filtered states, the project's empty-transactions state and StaffDuesCard get no drawing.

## Mutations tried (all killed)
- `segmentState`: PARTIAL fill 0.5→1; DUE amber→grey; OVERDUE out→amber. `hasGap` `<=`→`<`. `popoverEdge` `<`→`<=`.
- `sumRows`: IN test negated; count increment removed. `daysBetween` `<=`→`<`. `buildRibbon` isToday negated; `===`→`<=` on dueDate. `weekdayAr` UTC→America/Los_Angeles.
- `budgetTone` `>`→`>=` (red); `>=`→`>` (gold); null guard removed. `budgetPct` ceil/floor→round; `<=0`→`<0`. `budgetFill` min→max; budget-0 branch 100→0. `categorySlices` OUT filter dropped; sort reversed; `rest > 0`→`>= 0`; slice(TOP)→slice(TOP+1). `ringArcs` accumulator removed.

## Gotchas I found
- **Shared `/tmp` between agents:** my mutation script and `people`'s both used `/tmp/mut.bak`. For a moment `budgetVisual.ts` held `people`'s `clockMath.ts`. I rewrote it and re-ran every mutation with a private backup in the scratchpad, and told `people` to verify `clockMath.ts`. Agents should use their own scratchpad paths.
- `plans/queries.ts` is now 270 lines (266 before). The ~250 guideline was already exceeded, and I only added the new field.
- `dues/page.tsx` was run through prettier (80 columns), so a few untouched lines were rewrapped.

- **Mutating in the shared tree (lead's process note):** any mutation must be mutate, test and restore in one command, or better, done on a copy. A copy means the helper and its test copied into my scratchpad, with the test's relative import pointing at the copy. Even an atomic in-place run leaves the file mutated for a few seconds, and another agent's vitest can catch it.

## Review fixes (reviewer via lead; no blockers)
- **SHOULD, CategoryRing:** `pathLength` dropped (older iOS Safari ignores it on `<circle>`). `ringArcs(shares, r)` now returns real stroke units: length = share% of 2πr, offset = the running sum of *unrounded* lengths, both rounded to 2 decimals. `ringCircumference(r)` gives the dasharray gap. The start angle (`rotate(-90)`) and direction are unchanged. Tests were extended (r = 16 → C = 100.53; thirds tile the full circle).
- **NOTE, WeekRibbon:** `<nav>` became `<section aria-label>`. The tiles are in-page buttons, not navigation.
- **NOTE, tile name:** the tile's `aria-label` date is now `tileDate(iso)` in `ribbon.ts`: «2026-10-01 (1448/04/20 هـ)», built through `isoToDate` → `toGregorian` / `toHijri` exactly as DateText does. It is my own helper, not people's `summaryDate`. While writing the test I found that building the Date as `+03:00` midnight gives a different Hijri day than `isoToDate`. The test pins the DateText path.
- **NOTE, RibbonJump:** the wash now starts when the scroll ends: on `scrollend` where supported, with a 1000 ms safety timer for a tap that needs no scroll (no `scrollend` fires). Otherwise it starts on a 600 ms fallback timer. It starts at once under reduced motion (instant scroll). All listeners and timers are cleaned up on unmount.
- **NOTE, popover clipping:** checked, no change needed. The plan header `Card` has no `overflow-hidden`, and neither does any ancestor on the content path (only the sidebar nav and the More sheet scroll). The popover opens upward over the header's `dl`, `z-10`.
- **Recorded, not changed (lead):** written-off instalments on archived plans stay red, matching their badges. The ring's gold and amber hues are close, but the legend names every slice.
- **Mutations on copies** (scratchpad `mut/`, import-free vitest config with the `@` alias; unmutated copies pass, and a no-op control survives). All killed: ring length `/100` dropped; offset includes own length; accumulator rounded plus drift; C = πr; `ringCircumference` rounded to an integer; `round2` to 1 decimal; `tileDate` order swapped; Hijri dropped; Date built as `+03:00` instead of `isoToDate`. My first attempt used a config importing `vitest/config`, which cannot resolve from the scratchpad, so every run errored and read as "killed". I discarded those results and re-ran after the control check.

## Questions / requests sent to lead
- None needed. No new keys: weekday names come from `Intl`, and every string is from `t.duesRibbon`, `t.planBar`, `t.budgetMeter` and `t.instalmentStatus`. 
