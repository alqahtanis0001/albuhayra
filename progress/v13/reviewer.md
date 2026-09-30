# progress/v13/reviewer.md — v1.3 recording for `reviewer`

## My five items (docs/V13-SPEC.md)
1. Read every brief against `docs/V13-SPEC.md` and the motion/RTL/print rules in `docs/FRONTEND.md` before code starts; report conflicts to the lead
2. Review each completed block: no change to actions, allocation, scoping, auth or rule-pinning tests; queries gain read-only fields only
3. Check motion: ≤ 800 ms, ease-out, off under reduced motion, nothing loops except the live clock, no fill modes on content
4. Check RTL (logical utilities), Western digits, `ar.ts` for copy, contrast ≥ 4.5:1, colour never the only signal, print unchanged unless stated
5. Check every computed value has a mutation-proven unit test, and bundles: hand-written SVG, recharts only on the dashboard

Your own running notes. Only you write here. The lead merges it into PROGRESS.md at checkpoints. Keep entries short; newest at the bottom.

## Files I own
`progress/v13/reviewer.md`

## Tasks completed
| Task | Files touched | Build/tests pass | Notes for others |
|---|---|---|---|
| Pre-code brief review (2026-09-30) | this file | n/a (read-only) | Findings below, sent to lead |

## In progress
- Task: none — v1.3 Checkpoint A review complete (FINAL)
- Where I am: all three blocks reviewed, all SHOULDs closed
- Next action: none

## Pre-code brief review — findings

### BLOCKER
- **B1 item 8 param clean-up.** `router.replace` re-renders the server page without `paid` → the server-derived `.v13-paid` class vanishes at once, contradicting "static highlight stays until next navigation" under reduced motion; the page segment key includes search params, so `(detail)/loading.tsx` can flash. Also `useReducedMotion()` returns `true` on the hydration commit, so an effect branching on it takes the "immediate" path for everyone on a hard load. Fix: `window.history.replaceState(null, "", pathname)` (Next-integrated, no refetch) after 800 ms; read `matchMedia` inside the effect (or skip the first commit) rather than trusting the hook's first value.
- **B2 `.print-plain` loses to inline styles** (globals.css ~413). Brief 10 says `PALETTE.*Soft` backgrounds → agents write `style={{background}}`, which beats an unlayered rule; with `print-color-adjust: exact` the tints print. Tailwind v4 `amber-100` etc. are oklch, not the PALETTE hexes. Fix: `!important` on `.print-plain` background/color, or @theme tint tokens and require classes.
- **B3 scoping sweep ownership.** The static sweep only scans the `FILES` list in `scoping.test.ts:2209` (backend-owned; no v1.3 agent may edit it). A new query file is unswept; a new (model, method) pair in a listed file (e.g. a 12-month `attendanceRecord.groupBy`) fails `:2305` until a driver exists. Fix: DB calls only in already-listed files; lead grants dash/people driver `it` blocks in scoping.test.ts (or adds them); pure helpers in separate non-DB files (dashboard/queries.ts is 237 lines).
- **B4 PlanBits must stay server-safe.** `periodLabel`, `InstalmentStatusBadge`, `Countdown` are imported by ~12 server pages and people's files. A `"use client"` added to PlanBits.tsx for the hover/focus bar makes `periodLabel()` calls from RSC throw at render (typecheck/vitest won't catch; dynamic pages aren't prerendered). Fix: bar in its own file; CSS-only focus popover preferred.

### SHOULD
- S1 item 7 mapping: `InstalmentStatus` has no "due today" — `DUE` = within `reminderDays`; `OVERDUE` wins over `PARTIAL`. Map 1:1 (DUE→amber with `t.instalmentStatus.DUE`, so bar and badge agree), record the deviation; archived/cancelled plans grey. Many segments (salary plans grow monthly): list-card bar `aria-hidden`, not focusable; focusable segments on detail only; define width (equal vs amount).
- S2 item 5: `Tabs` is link-based (URL, `aria-current`, `no-print`) → tab/month switch = server nav, /owner skeleton, CountUps replay. Use a client tablist inside `SixMonthChart` (role tablist/tab/tabpanel, arrows). `hasData` early return also hides the waterfall.
- S3 RTL time axis unspecified (sparklines, statement spark, heat strip, waterfall): SixMonthChart uses `reversed` (oldest right). Specify oldest at right; `.v13-draw` paths start at the oldest point.
- S4 bidi: "+12%"/"−12%" in RTL renders "12%+". Put the value, % included, in `<bdi dir="ltr">`; keys `momentum`, `budgetMeter.pct` → `{pct}` without a trailing `%`.
- S5 clock: late iff HH:MM > start+grace (`lib/attendance.ts:46`) → red from start+grace+1:00; no ring also for null grace, non-work day, `!canClock` (server records PRESENT); define ring full scale; `MySelf.now` is HH:MM → add epoch ms; format `timeZone: Asia/Riyadh`, `numberingSystem: latn`; init state from prop; tick by Date delta + server skew; not aria-live.
- S6 `.v13-grow-inline` (globals.css:320) lacks `transform-box: fill-box` → on SVG rects it scales from the viewport edge.
- S7 `.v13-draw` CSS `stroke-dasharray: 1` overrides dasharray attributes → any value-encoding arc (clock ring, category ring) becomes a full circle. Only on full paths; prefer `<path>` for `pathLength`.
- S8 aging tiles are per side (toUs / fromUs), never summed; counts as sibling `AgingSide.counts` so `aging.test.ts:84` needn't change.
- S9 momentum compares month-to-date net with a full previous month (misleading early in a month). Lead/user decision: same-days comparison (read-only add) or a «حتى اليوم» label; define "flat".
- S10 no hook for "sr-only on screen, visible in print" (items 4, 7, 12); `print:` banned → add e.g. `.sr-only-screen` to globals.
- S11 30 `<rect>` ≈ 1.4 KB > 1 KB: bars as one `<path>`.
- S12 heat strip: soft tints vs white 1.10–1.26:1 — show % in each cell (also removes 12 tab stops).

### NOTE
- Contrast: gold 2.42 on white (never text); `PALETTE.grey` on greySoft 3.76 (fail); in/inSoft 4.57, amber/amberSoft 4.51 marginal → gray-900 on tints (≥14:1); momentum grey = `text-gray-600`.
- `.v13-paid` reduced-motion bg `money-in-soft` is 1.04:1 vs white — invisible; use accent-soft + inline-start border.
- CountUp hard-load: final value → snaps to 0 → counts (hook flips after hydration). Record as accepted.
- BudgetMeter (dash's ActiveProjects) and DueRows (dash's WeekDues) are flow's: changes show on /owner. budgetTone: test budget = 0. BudgetMeter has no % text today ("% stays" is new).
- Ribbon: a day's rows are split across لنا/علينا groups; scroll-margin for the top bar; re-tap restarts the highlight; empty days not buttons.
- Wording: `statementHeader.settled` «متسوٍّ» vs `parties.settled` «لا رصيد»; `planBar.partial` «جزئيًا» vs «جزئياً».
- Illustrations on unfiltered empties only (not `emptyFiltered`).
- Payslip hero uses `slip.netHalalas`; test gross − deductions = net.
- Statement spark: one point per date (last balance); hide under 2 points.
- Record baseline gz JS per route before code (60 KB rule).
- Attendance legend swatches `no-print`; `.print-plain` cells break print zebra on grid rows.
- OK: `useReducedMotion` SSR/hydration safe; `scale` keyframes + `transform-origin` correct for HTML; no fill modes; motion hooks screen-only.

## Gotchas I found
- The scoping static sweep is list-based (`FILES`), not directory-based.
- `useSyncExternalStore` server snapshot is used on the hydration commit only; client-navigated mounts see the real value immediately.

## Questions / requests sent to lead
- 

## Block review — `people` (items 10–14), 2026-09-30
Verified: typecheck clean; `vitest` attendance/employees/parties/reports 10 files, 124 tests pass. clockMath tests live in `attendanceVisual.test.ts:87-120` (graceLeft boundaries incl. start+grace minute, +1:00 red, grace 0, amber at <300 s; riyadhSecondOfDay host-TZ-independent). Late rule matches `lib/attendance.ts:46`. No-ring cases (!canClock, non-work day, null start/grace) correct. Tints are classes → `.print-plain` wins. Aging counts per side, never summed. Payslip net from slip. Statement sign convention correct. No new (model, method) pair (`attendanceRecord.findMany` exists); lead adds the driver for `getAttendanceYear`.
Deviations accepted: aging bar HTML flex (logical, flex-shrink absorbs gaps); payslip steps HTML rows + SVG bars; checkedIn line folded into the ring text; bg-orange-100/bg-red-200 (screen-only tiles, no-print, gray-900 ≥ 4.5:1); skeletons unchanged (cards only add height).
- SHOULD LiveClock.tsx:29-33 — stale start on back/forward (router cache reuses the RSC payload): `serverNowMs` can be minutes old, so the clock and the grace ring are wrong ("not late" when late). Lead decision: e.g. if `Date.now() − serverNowMs > 60 s` at mount, `router.refresh()` once, or accept and log.
- NOTE observed mid-review: `attendanceVisual.ts` was in a mutated state (REMOTE dropped / heatStep boundary) and the suite failed once; final state correct. Mutating in the shared tree makes other agents' vitest runs fail spuriously — do mutations and restore within one command, or on a copy.
- NOTE LiveClock.tsx:36 `<time>` without `dateTime` whose content includes Arabic label is invalid HTML — use a `<div>`, or `<time dateTime>` on the digits only.
- NOTE AttendanceHeatStrip / attendanceVisual.ts heatCells: months after an ENDED employee's endDate show «لا توجد بيانات» — could reuse a «بعد انتهاء الخدمة» state; fine to defer.
- NOTE MonthGrid.tsx legend title now `attendanceVisual.legend` «دلالة الرموز والألوان» — prints "and colours" while print is letters on white; keep `t.attendance.legend` in print or accept.
- NOTE PayslipHero.tsx:57 deductions `direction="OUT"` (red «−») while the payslip's tables keep amounts neutral — consistent with spec's "− deductions"; record.
- NOTE PartyStatementView.tsx sparkSummary puts raw ISO dates (`points[0].date`) in the sentence — format like DateText/compact for screen readers.
- NOTE attendance/queries.ts imports `lastMonths` from `./components/attendanceVisual` (a query importing a components file) — works; layering only.

## Block review — `flow` (items 6–9, 15), 2026-09-30
Verified: typecheck clean; vitest dues/plans/projects + scoping.test.ts 8 files, 202 tests pass (run from repo root). `PlanBits.tsx` has no "use client"; the only new client modules (`RibbonJump`, `PaymentRecorded`) are used as JSX leaves, no server file calls a function from a client module. `budgetVisual.ts` holds budget/ring code and `clockMath.ts` holds clock code — the /tmp/mut.bak collision left no trace. Status mapping 1:1 with `t.instalmentStatus`; list bar aria-hidden, detail segments focusable with CSS popover; `?paid` matched against this plan's instalments only, cleared by `history.replaceState` from inside the effect's own matchMedia read; illustrations ≤ 750 B, aria-hidden, no-print, only on unfiltered empties; ring is OUT-only top 5 + أخرى, not recharts. Declared deviations accepted.
- SHOULD CategoryRing.tsx:33-41 (and people's LiveClock.tsx:65-76) — value arcs rely on `pathLength` on `<circle>`. Verify on iOS Safari (the main device here); if unsupported there, draw arcs as `<path>` (two `a` commands) or compute dasharray in real circumference units (2πr) without `pathLength`.
- NOTE WeekRibbon.tsx:86 `<nav>` wraps buttons that scroll within the page, not navigation — `<section aria-label>` / `role="group"` fits better.
- NOTE WeekRibbon.tsx:98 tile accessible name carries the raw ISO date ("الخميس 2026-10-01"); a formatted date reads better.
- NOTE RibbonJump.tsx:33 smooth scroll to a far row can take longer than the 800 ms wash; it may end before the row arrives. Start the wash on `scrollend` or lengthen for the jump.
- NOTE InstalmentBar.tsx:94-100 popover sits `bottom-full` with only `pt-1` above; check the plan header Card does not clip it (overflow).
- NOTE archived plans: written-off instalments stay OVERDUE (red) in the bar — same as their existing badges, so consistent; record.
- NOTE ProjectBits.tsx BudgetMeter change also reshapes dash's `/owner` «الإضافات الجارية» (FRONTEND says «{spent} من {budget}»); `t.projects.spentOfBudget` may now be unused. Update FRONTEND or record.
- NOTE CategoryRing COLOURS: gold (2nd) and amber (5th) are close hues; the legend carries the names so fine.

## Block review — `dash` (items 1–5), 2026-09-30
Verified: typecheck clean; vitest dashboard + components + scoping.test.ts 5 files, 190 tests pass. Donut links use the ledger's real params (`direction=OUT&categoryId&from&to`, `visuals.ts:categoryLedgerHref`, month bounds from `monthStart/monthEnd`); «أخرى» = monthOut − Σ top 5 (`donutSlices`), `href: null`, rendered as a div. CountUp: SSR final value, moving digits aria-hidden, final sr-only, reduced motion static, layout effect. Sparklines: one `<path>` for bars, tested < 700 / < 400 chars, oldest point at the right, `.v13-draw` from the oldest. Waterfall shown when any month has an opening ≠ 0 (`SixMonthCard.tsx` `hasFlow`), independent of `SixMonthChart`'s early return; down-steps grow from their top. Client tablist with RTL arrows, roving tabindex. One extra scoped `sumByDirection` (date < windowStart), consistent with `windowRows`' start; transaction dates cannot be future (`primitives.ts:26`), so the last `daily30` balance equals the balance card. Empty states wired (ledger, dues). Declared deviations accepted; the two surviving mutants are equivalent.
- The `|previous|` base (visuals.ts momentum) is the standard reading — the sign follows the direction of change — keep it. NOTE: a tiny previous net blows up the % (1 halala → 100,000 reads "+9,999,900%"); consider showing «أكثر من 999%» above a cap.
- NOTE ar.v13.ts:16 `momentumNoneHint` «لا يوجد شهر سابق للمقارنة» also shows when last month to date simply netted 0 — wording claims there is no previous month. Reword to «لا يمكن المقارنة بالشهر الماضي» or similar.
- NOTE TopOutCategories.tsx sr-only-screen table has no «أخرى» row, so its shares don't reach 100% (legend has it; print table as before).
- NOTE visuals.ts sparkSummaryText puts raw ISO dates in the sparkline's text equivalent (same as people's statement) — format compactly.
- NOTE Momentum hint/line prints (declared) — fine.

## Follow-up, 2026-09-30
- CLOSED people SHOULD (stale clock): `LiveClock.tsx:33-44` refreshes once at mount when `Date.now() − serverNowMs > 60 s`, ref-guarded (Strict Mode safe; the refreshed payload keeps the same instance, so no loop). A device clock running > 60 s fast costs one extra refresh — harmless.
- CLOSED flow/people SHOULD (pathLength on circle): `budgetVisual.ringArcs` / `CategoryRing.tsx:44-45` and `clockMath.ringDash` / `LiveClock.tsx:97` use real 2πr units, no `pathLength`. Only `Sparkline.tsx:36` keeps `pathLength` — on a `<path>`, which is fine.
- Pending: final pass over dash's four note fixes, then this recording is final.

## Final pass, 2026-09-30 — FINAL
dash's four note fixes verified: `momentum()` caps at ±999 with `capped` → `momentumOver`, formula round(Δ×100/|prev|); `momentumNoneHint` «لا يمكن المقارنة بالشهر الماضي»; «أخرى» row in TopOutCategories' sr-only-screen table; `summaryDate` (Gregorian + Hijri) in sparkline summaries. Lead changes checked: `SkeletonStatCards spark` reserves the sparkline height; `t.projects.spentOfBudget` has no remaining references. Typecheck clean; full suite 67 files, 1218 tests pass. No open findings. This recording is final.
