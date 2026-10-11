# progress/v15/reviewer.md

Your own running notes. Only you write here. The lead merges it into PROGRESS.md at checkpoints. Keep entries short; newest at the bottom.

## Files I own
`progress/v15/reviewer.md` only (read-only on everything else).

## Tasks completed
| Task | Files touched | Build/tests pass | Notes for others |
|---|---|---|---|
| Pre-code pass on brief-common/theme/home/nav vs spec + code | this file | n/a (no code) | findings below |

## Pre-code pass (2026-10-11, branch `claude/v15-wheel-nav-theme` @ `22259e7`)

### BLOCKER

**1. D3 dial geometry collides with itself.** Day 29 sits at 360·29/30 = 348° = −12°, inside the overdue arc [−14°, −2°]. Day 0 sits at 0°, on the «اليوم» marker, but D3 says "dots never overlap the today marker". Two dues on the same day (40 or fewer dots in total) get identical coordinates, so only the top one can be tapped. The overdue arc is 12° ≈ 37.7 units at r = 180, which holds one r = 14 hit circle (28 units) without overlap. Evidence: V15-SPEC D3; brief-home:24.
*Fix (amend D3):*
- `dayAngle(d) = 6 + 11·d`: 6° … 325°. Hit circles are then 34.6 units apart.
- Overdue dots spread evenly in [−26°, −6°], at most 2. Three or more become one hollow cluster.
- Dues on the same day always merge into one day-dot: count label, sum, dominant kind.
- Pin each rule in `wheel.test.ts`.

**2. brief-home contradicts D16 on dimming.** brief-home:26 says "every mark not in the focus gets opacity 0.18". D16 says the focused segment's whole ring stays lit, the other rings and the dial dim, and a focused dot keeps the dial lit. D16 also says "second tap" means the same segment id. brief-common:18 cites only "D1–D15", and brief-home never mentions D16 or D17. The focus/dim test would pin the wrong behaviour.
*Fix:*
- Rewrite H2/H3 to follow D16.
- Cite D16 and D17.
- Tests: the focused segment's ring stays at 1; other rings and the dial go to 0.18; a dot focus keeps the dial lit; navigation happens only on a re-tap of the same id.

**3. D9 cannot be built as written.** A closed native `<details>` hides its content in a way only `::details-content` can override. That selector needs Chrome 131+, Safari 18.4+ or Firefox 143+. On older iOS the home would print with the section closed, and desktop would flash closed. Copying EntryDetails' `hidden` (EntryDetails.tsx:154) does not work either. Tailwind v4 preflight sets `[hidden]{display:none !important}` inside `@layer base` (node_modules/tailwindcss/preflight.css:396). A layered `!important` beats every unlayered `!important`, so no print override can win.
*Fix (amend D9):*
- Use a `<button aria-expanded aria-controls>` and a body element with a `data-open` attribute.
- Screen-only CSS:
  - `@media screen and (width < 48rem) { .home-details:not([data-open="true"]) .home-details-body { display:none } }`
  - `@media screen and (width >= 48rem) { .home-details[data-open="false"] .home-details-body { display:none } }`
- The server renders no `data-open`, so CSS width decides. That gives no flash and needs no hydration marker. The client sets the attribute from the stored choice or the user's toggle.
- Print matches no rule, so the body always prints.
- Test a pure state helper, plus a test that the CSS is present.

**4. `RECENT_COUNT` is shared.** It is defined at `src/features/dashboard/queries.ts:109` and used by the owner (:191) and by `getStaffDashboard` (:238, the staff home's «حركاتي الأخيرة»). D10 "RECENT_COUNT → 5" would halve the staff list, which is outside the v1.5 scope. `RecentTransactions` is also shared with the staff page.
*Fix:*
- Add `OWNER_RECENT_COUNT = 5`; staff stays at 10.
- Give `RecentTransactions` an optional `viewAllHref` prop.
- Test that the staff read still takes 10.

**5. nav has nowhere to put its D15 reads.** It needs two reads:
- a scoped `employee.count` for `hasActiveEmployees`;
- for pick mode, each active employee's current-month salary instalment, read in one batch.

No file under `src/app` imports `@/lib/db`. The gate sweeps only the listed `FILES` (scoping.test.ts:2409–2486). `getEmployee().thisMonth` (employees/queries.ts:145–183) works one employee at a time, so a list would be N+1, and its file has no v1.5 owner.
*Fix:*
- Give nav a new `src/features/employees/salaryPick.ts` (`import "server-only"`) with:
  - `hasSalaryEmployees(est)`;
  - `listSalaryPick(est, today)`, with the same payable rule as `monthSummaries`: plan OPEN && remaining > 0 for `periodYm = ymOf(today)`.
- Add the file to `FILES` and to the S8 `serverOnly` list, and append scoping cases.

### SHOULD

**6. Two agents edit `scoping.test.ts` (2640 lines) at once.** A new file needs a `FILES` entry (:2409) and a `serverOnly` entry (:2609), not only "a case" (brief-home:18 and brief-nav do not say this). The existing first-run case also pins the exact count list `["transaction","party","plan","employee"]` (:840), so any new count inside `getOwnerDashboard` breaks it.
*Fix:*
- The lead pre-inserts the `FILES`/`serverOnly` entries for `dashboard/overviewReads.ts` and `employees/salaryPick.ts`.
- The lead adds two closing `describe` blocks marked `// v1.5 home` and `// v1.5 nav`; each agent edits only its own block.
- Make the sibling `getOwnerOverview` in `overviewReads.ts` mandatory (brief-home:14 currently says "your choice").

**7. `staffViews.test.ts:41` `OWNER_READS` does not list the new owner reads.** That pattern stops staff files from calling owner-shaped reads. `getOwnerOverview` returns salary names and amounts, and `listSalaryPick` is owner-only. The file has no v1.5 owner.
*Fix:* the lead adds both names, or assigns the file.

**8. Wrong fact at brief-home:33: "a `<style>` with the nonce is not available".** The CSP is `style-src 'self' 'unsafe-inline'` with no nonce (proxy.ts:84; BACKEND Security 7). Inline `<style>` and `style=` are both allowed; there are 8 `style={{}}` uses today.
*Fix:*
- Keep the keyframes in `globals.css`, but correct the reason.
- Put the wheel animations under `@media screen and (prefers-reduced-motion: no-preference)` like `.v13-*` (globals.css ~:357). Print and reduced motion then show the end state with no extra rule.
- Record the D6 `backwards`/`both` fill modes and the ~3.5 s run as an explicit exception to FRONTEND.md v1.3 "≤ 800 ms, no fill modes".

**9. Ring 3 loses overdue salaries.** D2 leaves EMPLOYEE rows out of علينا because they are "already رواتب الشهر". But رواتب الشهر covers only the current month, so a past month's unpaid salary appears in neither figure. D2 also drops an employee party's non-salary OUT plans.
*Fix (lead rules, amend D2), either:*
- رواتب = Σ remaining of unpaid OPEN SALARY instalments with `dueDate ≤` the end of this month (arrears included), and علينا = Σ `owedByUs` (all rows) − Σ remaining of all OPEN SALARY instalments;
- or keep D2 and record the gap.

Pin the sum identity.

**10. D4's cluster link goes to a page that does not list it.** A cluster links to `/owner/dues`, which shows only overdue dues and the next 7 days (dues/page.tsx:26–34, `getDues` `weekEnd`). A cluster on days 7–29 leads to nothing.
*Fix:*
- Overdue cluster, or a day ≤ 6 → `/owner/dues`.
- Later days → `/owner/plans`, or the plan itself when every event is on one plan.
- Pin.

**11. D4's ring 3 links show a different total from the wheel.** لنا links to `?type=CUSTOMER` and علينا to `?type=SUPPLIER`, but D2 sums every party type (OTHER, a supplier's IN plan, …).
*Fix:* link to `/owner/parties` (all), or record the difference.

**12. The «صرف راتب» row can lead to an empty list.** `hasActiveEmployees` counts any ACTIVE employee, but pick mode lists only employees with a SALARY plan. There is no `salaryPick.empty` key. Pick mode is also undefined when `thisMonth` is null (salary starts next month).
*Fix:*
- The flag = ACTIVE employees with `basicSalaryHalalas != null` (or with an OPEN SALARY plan).
- Leave out employees with no instalment this month.
- Add the key `salaryPick.empty`.

**13. The report filters lose the tab.** `ReportFilters` is a GET form with `action={basePath}` (ReportFilters.tsx:47). A GET submit drops the action's own query, so `?tab=reports` is lost and the filters land on the entries tab.
*Fix:*
- Add a prop that renders hidden `tab=reports` (and `report=aging`) inputs.
- Repoint the existing `ReportTabs.tsx:14–15` hrefs instead of building a new strip.
- nav's brief must allow this change in `reports/components` (it currently says "no behaviour change").
- Test that the form contains the hidden input.

**14. The report printout would change.** The ledger `Header` h1 «السجل» has no `no-print`, so it prints; the reports h1 was `no-print` (reports/(summary)/page.tsx h1).
*Fix:*
- On `tab=reports`, mark the h1 `no-print` and render only the report's `PrintHeader`.
- Test: exactly one `PrintHeader`, and the h1 is no-print.
- Also decide the add button on that tab (proposal: «حركة جديدة»).

**15. D14 redirects: build the URL with `URLSearchParams.set("tab","reports")` (and `set("report","aging")`), not string concatenation.** A stray `tab=` in the old query would duplicate the key, `raw.tab` would become an array, and `ledgerTab()` would return `entries`.
*Test:* `/owner/reports?tab=activities&from=…` lands on the reports tab.

**16. Existing tests that pin current behaviour; list them in the briefs.**
- `reportFilters.test.ts:28` imports and renders `@/app/(owner)/owner/reports/(summary)/page`; it breaks once that page is a redirect.
- `nav.test.ts` :42, :169, :208, :343 pin `/owner/reports`.
- `nav.test.ts:410–417` pins "exactly one row has a hint".
- `FirstRunCard.test.ts:117` reads `page.tsx` for the exact JSX strings `<QuickActions />` / `<FirstRunCard firstRun={data.firstRun} />` / `<OwnerStatCards`.
- `pendingJoinNotice.test.ts:33` reads `page.tsx`.
- `v14Part3Wording.test.ts:119` pins `t.addSheet.newProjectHint`.

**17. The token lint will hit comments, and must catch Tailwind arbitrary values.** Hex appears in comments: TopBar.tsx:10, PasswordStrength.tsx:16, Button.tsx:41. A bare `#[0-9a-f]{3}` also matches prose such as "#123".
*Fix:*
- Follow the source-assertion Gotcha: either strip comments plus a case proving the file was not blanked, or anchor on colour contexts (`"`, `'`, `:`, `[`, `(`).
- It must catch `[--focus-ring:#fff]` (TopBar.tsx:33, nav) and `stroke="#fff"` (ExpenseDonut.tsx:51, home). Both go on theme's D12 lists.

**18. recharts defaults bypass the lint.** SixMonthChart.tsx:52–64 uses recharts' own colours:
- `CartesianGrid` stroke #ccc;
- axis ticks/lines #666, about 3:1 on a dark card;
- `Tooltip`: white box, #ccc border, #ccc cursor;
- `Legend`.

*Fix:*
- theme's list for home sets grid `stroke`, `tick={{fill}}`, axis `stroke`, and Tooltip `contentStyle`/`labelStyle`/`itemStyle`/`cursor` to tokens.
- Add a static test that these props are passed.

**19. Tailwind's default palette has no dark values.** These classes are in use but are not in `@theme` (they are Tailwind's oklch defaults):
- `bg-amber-50` ×14, `border-amber-300` ×14, `text-amber-900` ×13, `text-amber-800`;
- `bg-red-700/800/900`, `border-red-200/300/800`;
- `border-green-200/300`;
- `bg-orange-100/600`, `bg-amber-500/700`;
- `bg-black/50`, `bg-white/60`, `border-white/40`.

brief-theme T1 covers only the `@theme` tokens.
*Fix:*
- Add a dark override for each of these vars.
- Never restate their light values: oklch → hex would shift light mode.
- The "light unchanged" test asserts that no default-palette var is redefined outside the dark and print blocks.

**20. Make the dark blocks screen-only.**
- Use `@media screen { :root[data-theme="dark"]{…} }` and `@media screen and (prefers-color-scheme: dark) { :root:not([data-theme="light"]){…} }`.
- Print then never sees dark, and there is no specificity race with a print block re-listing every light value (brief-theme:28). Both dark selectors are (0,2,0).
- The C4 test becomes "every dark block is inside `@media screen`" plus `color-scheme: light` in print.

**21. The `ThemeToggle` has no state at SSR.** "One import, one element" with no prop means the server render cannot know the choice, so the icon and `aria-label` are wrong until mount, or React reports a hydration mismatch if the initial state reads `document`.
*Fix:*
- `ThemeToggle` becomes a tiny async server wrapper (`cookies()` → `parseTheme`) that renders a client `ThemeToggleButton choice={…}`.
- nav's mount is unchanged.
- Pin it.

**22. The reconcile rule loses choices (brief-theme:21).** An absent cookie parses to "system" and "wins", so a cleared or expired cookie erases the localStorage choice.
*Fix:*
- `parseTheme` returns `null` for "absent".
- Absent cookie + a valid stored choice → rewrite the cookie and apply the choice.
- A present cookie wins.
- Add `Secure` on https.
- Test both arms.

**23. The SSR test as briefed (brief-theme:33) will fail.** `layout.tsx:9–24` calls the `next/font/google` build macros and imports `globals.css`, and after this change it is async.
*Fix:* test `htmlThemeAttrs(parseTheme(x))` plus a source check that the layout spreads it, or mock `next/font/google` and `await RootLayout()` before rendering.

**24. The hit circles are too small on a 360 px phone.** Card body `p-4` (Card.tsx:16) plus main `p-4` leaves the SVG at ≤ 294 px on a 360 px screen. A hit circle is then 28·294/400 = 20.6 px, under D3's 22 px. A `min-width: 315px` would instead overflow the card and scroll the page sideways.
*Fix:*
- Make the chart full-bleed inside the card (the SVG wrapper has no inline padding; the rows keep `px-4`). That gives 326 px at 360 and 358 px at 390.
- Pin the class.

**25. Keyboard and screen-reader load.** There are up to 2 + 6 + 3 + 40 = 51 tab stops before the rest of the home. Safari does not draw `outline` on SVG `<g>`.
*Fix:*
- Roving tabindex: one Tab stop for the wheel; arrows cycle segments, then dots; Home/End jump.
- Draw the focus halo in the SVG and show it on `:focus-visible`, coloured with `--focus-ring`. brief-home's "focus token" does not exist; `--focus-ring` is the one in use.
- Add an sr-only `aria-live="polite"` line mirroring the centre text, with `t.wheel.openHint` after a first activation.
- Put the arrow handling in the pure reducer and test it.

**26. `HomeDetails` must take its sections as `children`, rendered on the server.** Importing `TopOutCategories`, `BalanceByMethod` or `ActiveProjects` into a `"use client"` file pulls them into the client bundle of `/owner`, already the largest route at 323.7 KB.
*Fix:* add a source test that `HomeDetails.tsx` does not import them.

**27. D7 conflicts with H3.** The client needs `focusReducer`/`centreText` at runtime, not only "types and small constants".
*Clarify:*
- `wheel.ts` is client-safe:
  - no `server-only`;
  - only `import type` from `@/lib/validation`;
  - value imports limited to `@/lib/dates`, `@/lib/money`, `@/lib/plural` and `visuals.ts`.
- `Wheel*.tsx` may import `wheel.ts`.
- The reads live in `overviewReads.ts`, which is server-only.
- The client props carry only names, amounts, ids and dates (no email, `remindersOptIn`, …).

**28. theme does not own the files with the green wordmark.** They are `src/features/auth/components/AuthCard.tsx:30` and `src/app/not-found.tsx:28`. Swapping the wordmark in dark is a structural edit, not a hex replacement, and neither file is on theme's list.
*Fix:* grant theme both files. Note that auth pages have no TopBar and so no toggle: they follow the cookie or the OS (accept).

**29. The primary row's caption fails contrast.** `PRIMARY_ROW` is white on accent (AddSheet.tsx:41). A "muted" `text-gray-500` caption there is about 1.5:1.
*Fix:* use a white-alpha caption measured at ≥ 4.5:1 in both themes, and record the ratio.

### NOTE

**30. Spec and brief typos.**
- The spec table says the owner layout is a "(D17 flag)"; it should be D15.
- nav's value sections `addSheetV15` / `ledgerTabsV15` do not exist; ar.v15.ts has `addHints` / `reportsTabs`.
- §B names `staff/page.tsx`; the real path is `staff/(home)/page.tsx`.
- brief-common:18 says "D1–D15"; it should be D1–D17.

**31. Wording gaps in the wheel's centre and clusters.**
- `t.wheel.centreSub` has no «أو أكثر» variant for a capped momentum.
- `{arrow}` is undefined for a flat momentum.
- `formatSignedPercent` (visuals.ts:36) already returns a sign and "%", so `{arrow}{pct}٪` would print the sign twice and two percent signs.
- `wheel.cluster` is not plural-formed.

Missing keys:
- `salaryPick.empty`
- `wheel.centreSubCapped`
- `wheel.clusterOverdue` (plural)
- `wheel.cluster` as `PluralForms`

**32. Empty state.** Proposal: the centre shows «لا توجد بيانات بعد» only when `!firstRun.hasEntry`, every ring is zero and there are no dial events. Otherwise a zero ring is a full `--track` circle and the centre shows the balance.

**33. Amount format in the wheel.** Choose `formatSAR` (2 decimals, as the cards) or integers (as the mock). `t.wheel.segment` hard-codes "ر.س" instead of using `t.common.currency`.

**34. A2 double count.** A salary instalment due this week counts in «أقساط هذا الأسبوع» and again in «الرواتب بعد N يومًا». Either accept it or leave SALARY out of row 2.

**35. localStorage keys.**
- Existing keys are `ledger:detailsOpen`, `home:firstRunHidden` and `zk_nav_groups`. Suggest `ui:theme` and `home:detailsOpen` for the new ones.
- FRONTEND.md :88 and :178 still say "no dark mode" and allow only four localStorage uses. The lead amends them.

**36. B1 (logo goes home).**
- Reuse `homePathFor(role)` (src/lib/permissions.ts:45).
- The TopBar test needs `vi.mock("@/features/auth/components/actions")`.
- At 360 px the 132 px wordmark plus three 44 px controls leave about 40 px for the establishment name.

**37. The mock's soft ring colours are under 3:1 against the card (WCAG 1.4.11).** Light: #8FB5A0, #E3CF7E, #C9D1CC. Dark: #4A5750, #9C8A3F. The gaps and the text rows carry the meaning. Record acceptance, or use PALETTE-backed tokens.

**38. Print a reset wheel.** Add `@media print` opacity 1 on the wheel marks so a focused (dimmed) wheel prints whole. «إعادة العرض» and «إظهار الكل» are `no-print`.

**39. QA item: recharts inside the closed disclosure.** Its `ResponsiveContainer` is hidden while closed; check that the chart renders after it is opened on a phone.

**40. Read size.** The dial read has no lower bound on overdue, so it returns every historical overdue row. Only a count and a cluster are needed beyond 2: count separately, or `take`.

**41. Pick-mode details to decide.**
- Hide the نشطون/سابقون tabs and «موظف جديد» in pick mode.
- `pick=salary` forces ACTIVE.
- An employee whose current month is paid but an earlier month is not shows «مدفوع»; accept or flag.

**42. `color-scheme` in one place.** Set it in the CSS selectors (as the mock does) rather than also in `htmlThemeAttrs` `style`. A `themeColor` media pair follows the OS, not the toggle (accept).

**43. Duplicate keys.** `t.reportsTabs.byCategory` / `aging` repeat `t.reportFilter.byCategoryTab` / `t.aging.tab` (same values). `t.addHints.newProject` repeats `t.addSheet.newProjectHint`. Reuse the existing keys or retire them on purpose.

## In progress
- Task: pre-code pass — done; next: a review round per completed task.

## Gotchas I found
- Tailwind v4 preflight's `[hidden]{display:none !important}` is layered: no unlayered `!important` (print, breakpoints) can override it. Toggle visibility with a class or data-attribute instead.
- `/owner/dues` shows only overdue + 7 days; any "see all upcoming" link must not point there for days 7–29.

## Questions / requests sent to lead
- Rulings needed: #1 (D3), #3 (D9), #9 (D2), #10/#11 (D4), #12 (D15 flag), #31 (keys), #33.
