V13-SPEC.md — زخم v1.3 visual update
Purpose: make the existing screens visibly richer without changing any rule, number or data path. No schema changes, no migrations, no new routes except read-only data added to existing queries. Every visual honours RTL utilities, `prefers-reduced-motion`, the زخم palette (green `#006C35`, gold `#C9A227`, money-in green, money-out red), Western digits, `ar.ts` for copy, and leaves print output unchanged unless stated. All charts render a server-side text equivalent (existing rule). Any computed value (percentages, buckets, waterfall steps, countdowns) gets a mutation-proven unit test.
Agent `dash` — owns `src/features/dashboard/**`, `src/components/StatCard.tsx`, `src/components/CountUp.tsx` (new), `src/components/Sparkline.tsx` (new)

1. Count-up: `StatCard` values animate from 0 to value over 600 ms with an ease-out; static under reduced-motion; server-rendered final value stays in the DOM for no-JS and print.
2. Sparklines: `getOwnerDashboard` gains a `daily30` series (date, inHalalas, outHalalas, balanceHalalas). Balance and net cards get a 30-day line; month-in/out cards get 30-day bars. Pure SVG, ≤ 1 KB per card, no library.
3. Momentum indicator: on the «الصافي» card, arrow + «+12% عن الشهر الماضي» from `last6Months` (guard divide-by-zero and first month: show «—»). Green up, red down, grey flat.
4. Expense donut: replace `TopOutCategories` table with a donut (recharts, already bundled) — month total in the centre, top 5 slices + «أخرى», legend with amounts; slice click navigates to السجل with `direction=OUT&categoryId=…&from=&to=` for this month. Keep the table as the sr-only/print equivalent.
5. Cash-flow waterfall: second tab on the six-month card — opening balance, income up (green), expenses down (red), closing balance (grey), for the selected month; tabs via existing `Tabs`. Text equivalent listed beneath.

Agent `flow` — owns `src/features/dues/**`, `src/features/plans/components/**`, `src/features/projects/components/**`, `src/components/EmptyState.tsx`, `src/components/illustrations/**` (new), `src/app/(owner)/owner/dues/page.tsx`

6. Week ribbon on المستحقات: seven day tiles from today to `weekEnd` plus a leading red «متأخرة» tile; each tile shows count and لنا/علينا totals for that day; tapping a tile scrolls to and highlights that day's rows in the existing list. Data from `getDues` (group by dueDate client-side; no new query).
7. Segmented instalment bar: replaces `progressText` in `PlanBits` — one segment per instalment: paid green, partial half-filled green, overdue red, due-today amber, upcoming grey; hover/focus shows the instalment name and amount. Used on `PlanList` cards and the plan detail header. Text line kept as sr-only.
8. Payment micro-animation: after a successful «تسجيل دفعة» the returning `InstalmentList` row highlights green for 800 ms, the bar segment fills, and the status badge cross-fades; driven by a `?paid=<instalmentId>` search param set on redirect, cleared after animation. Reduced-motion: static highlight only.
9. Budget meter upgrade in `ProjectBits`: animated fill on mount, colour green → gold ≥ 80% → red > 100%, amounts under the bar; project detail gets a small category donut reusing `dash`'s donut component only if exported by then, else its own minimal SVG ring.
10. Empty-state illustrations: `EmptyState` gains `kind?: "ledger" | "parties" | "dues" | "projects" | "employees" | "reminders"`; six original inline SVG line-art illustrations (green stroke, one gold accent, ≤ 2 KB each, `aria-hidden`), wired to the six existing empty states. No stock art, no emoji.

Agent `people` — owns `src/features/attendance/components/**`, `src/features/employees/components/**`, `src/features/parties/components/PartyStatementView.tsx`, `src/features/reports/components/AgingTable.tsx`, related `loading.tsx` skeletons

10. Coloured attendance grid: `MonthGrid` cells tinted by status (حاضر green, متأخر amber, غائب red, إجازة blue, عن بُعد teal, عطلة grey) keeping the letter code; legend shows the swatches; print stays letters on white. Employee detail page gets a 12-month heat-strip (one cell per month: attendance rate as tint, tooltip with counts) from existing monthly totals.
11. Live clock card (`ClockCard`): large ticking clock synced once to the server time then advanced client-side; one primary «تسجيل الحضور» button; a ring around it showing time left before the grace period ends («متبقي 12 دقيقة قبل التأخير»), green → amber (< 5 min) → red (late); after check-in the ring becomes a check and shows the recorded time. Server remains the source of truth for the recorded time.
12. Payslip hero: a top card in `PayslipView` with net salary large, and a three-step mini waterfall (gross → deductions → net) in SVG; tables unchanged below; print keeps the hero as plain numbers.
13. Statement header: `PartyStatementView` opens with large balance words («له عندنا» / «علينا له» / «متسوٍ») and a balance-over-time sparkline built from the existing running-balance rows; hidden in print.
14. Aging visual: four bucket tiles (count + total each, tinted by age) above `AgingTable`, and a stacked horizontal bar per party row with segments coloured by bucket; table remains the text equivalent.

Rules for all agents

* No changes to actions, allocation, scoping, auth, or any test that pins a rule; queries may only gain read-only fields.
* Client bundles: sparklines, rings and waterfalls are hand-written SVG; recharts only where already used (dashboard). Any route's gzipped JS must not grow more than 60 KB.
* Every animation ≤ 800 ms, ease-out, disabled under reduced-motion; nothing loops except the live clock.
* Contrast ≥ 4.5:1 for text; colour never the only signal (keep signs, letters, labels).
* Record every decision, deviation and open question in your own `progress/v13/<name>.md`; the lead merges to `PROGRESS.md`.
