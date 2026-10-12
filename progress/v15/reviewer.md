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

## Round 1 — nav (N1–N5, D37 follow-ups; tree as of this round, nav files only)

Verified: `tsc --noEmit` 0 errors (whole tree). The nav test files plus scoping, staffViews and admin: 13 files, 309 tests, all green. Bundles (`bundles-nav.json` vs baseline): max +4.9 KB gz on `/owner` (includes `home`'s work), +3.5 KB on the ledger route, +2.3 KB elsewhere. All well under the +40 KB cap.

Security is clean:
- Both redirect pages `await requireOwner()` before `redirect()`.
- `salaryPick.ts` is `server-only`. Both reads put `establishmentId` at the top level of `where`. They are in `FILES`, `serverOnly` and `OWNER_READS`, and the "v1.5 nav" zone has a non-vacuous foreign-establishment case.
- The pick page sits behind `requireOwner()`.
- Staff and admin get only a `role` prop and the toggle. No amount reaches either.

Chrome has no hex and no `text-white` left: `[--focus-ring:var(--color-on-topbar)]`, `text-on-accent`, `text-on-accent-muted`, `bg-topbar`.

Print is unchanged: on the reports tab the h1 is `no-print`, there is exactly one `PrintHeader`, and the `Tabs`/`ReportTabs` strips are `no-print` (pinned in reportsTab.test.ts).

Sizes meet the spec: «+» rows are `min-h-14`, the logo link is `min-h-11`, pick rows are `min-h-14`, and the cancel link is `min-h-11`. Layout is RTL-logical throughout.

D37 has landed correctly:
- Only the inner span is `max-[375px]:sr-only`, and the `<p>` keeps `flex-1`, so the controls stay at the far end.
- The separator goes below 375 px.
- It is pinned in shell.test.ts:99–115.

The new `WalletIcon` (`navIcons.tsx`) is drawn like its neighbours and is `aria-hidden` through `Svg`.

No BLOCKER.

### SHOULD

**R1-N1. D37 and the wallet icon are not yet mutation-proven.** nav.md lists M1–M43, all of which predate the follow-ups.
*Fix:* add mutations and record each failing case:
- drop `max-[375px]:sr-only` → shell.test.ts:100;
- make it unconditional `sr-only` → :108;
- drop `max-[375px]:border-s-0` → :107;
- `icon: "account"` on the salary row → nav.test.ts:287.

**R1-N2. A server-only module leaks into a component folder.** `SalaryPickList.tsx` (a component, today server-rendered) imports the value `salaryPickHref` from `salaryPick.ts`, which is `import "server-only"`. The moment someone adds `"use client"` to the list, or imports it from a client leaf, the build breaks. This is the validation-barrel class of gotcha.
*Fix:* move the pure helpers `salaryPickHref`, `isSalaryPick` and the `SalaryPickRow` type into `src/features/employees/salaryPickRules.ts` (no `server-only`). Both the page and the list import from there.

### NOTE

**R1-N3. Leftovers outside nav's files (for the lead).**
- `docs/FRONTEND.md` :53, :133 and :214 still describe `/owner/reports` and the التقارير nav item.
- `ReportsSkeleton` (`skeletons/screens.tsx:120`) and `AgingReportSkeleton` (`skeletons/v12c.tsx:39`) are now unused exports, since both loading files are gone.

**R1-N4. Mismatched skeleton.** A first navigation to `?tab=reports` from another route shows the ledger `loading.tsx` skeleton, not a report skeleton. Accept, or have `ReportsTab` choose its own fallback later.

**R1-N5. QA items for a real browser.**
- The side «+» dialog (`mt-24`, no `max-h`) holds seven rows of 56–72 px, about 600 px. Check it at 1280×720 and 1366×768. The UA modal `max-height` should scroll it.
- Compare the printed `/owner/transactions?tab=reports` against `main`'s `/owner/reports` print, side by side.

**R1-N6. The pick flag and the pick list use different rules (accepted in D21).** The flag counts ACTIVE employees on an OPEN salary plan. The list needs this month's salary period. A hire starting next month makes the row appear over an empty list, which shows `t.salaryPick.empty`.

## Round 1 — home (H1–H5, D18–D30, D34–D36, D38)

Verified:
- `tsc` 0.
- Dashboard + scoping + staff + payroll + components: 29 files, 416 tests, all green.
- `/owner` +4.9 KB gz (cap 40).
- `getOwnerOverview` is `server-only`; every one of its four own reads leads with `establishmentId` and repeats `getDues`' unpaid / OPEN / not-`OPEN_ENDED` clauses.
- The "v1.5 home" zone is non-vacuous.
- The client receives only the computed model: names, amounts, ids, hrefs, angles.
- Staff keep `RECENT_COUNT = 10` and the owner uses `OWNER_RECENT_COUNT = 5` (queries.ts:110–112).
- `HomeDetails` takes server `children` and imports no section.
- The D20 CSS is screen-only.
- Animation is `motion-safe:` plus `print:animate-none`, with `print:!opacity-100` on the layers.
- One Tab stop, with a halo drawn in the SVG and an `aria-live` line.
- D16/D19 dimming is correct (`layerOpacity`).
- D18 angles are correct: `6 + 11d`; overdue at −6°/−26°, or one mark at −16°. The nearest visible dot is 18.8 units from the today marker, more than 10 + 5.

### BLOCKER

**R1-H1. «علينا للموردين» includes next month's salaries.** D22 assumes "salary rows never exist beyond this month", but `salaryMonthsToGenerate` generates through the **end of next month** (src/lib/payroll.ts:55–71: `last = addMonthsYm(ymOf(today), 1)`), and the page awaits `ensureSalaryInstalments` first.

How the wrong number arises:
- `listParties()` `owedByUs` sums every unpaid instalment of OPEN plans, so it includes next month's salary row.
- `getOwnerOverview` subtracts only the salaries due ≤ month end (overviewReads.ts:84–92, `commitmentsOf` :37–44).
- So every employee's next-month salary is reported as owed to suppliers.

With five employees on 6,000 each, علينا shows 30,000 too much on the centrepiece. This conflicts with CLAUDE.md "correct numbers". The fixture in overviewReads.test.ts has no next-month salary row, so the identity test cannot see it.

*Fix:*
- Add an aggregate over **all** unpaid OPEN SALARY instalments with no date bound (or one `groupBy` splitting at month end).
- علينا = Σ owedByUs − that all-months figure; رواتب الشهر stays ≤ month end.
- Pin the identity علينا + رواتب + (salaries due after month end) = Σ owedByUs, on a fixture with a next-month salary row.
- Mutation: subtract the ≤-month-end figure again → the case fails.
- The lead amends D22's premise.

### SHOULD

**R1-H2. The centre sub-line's bidi is broken** (the coordinator's question). The screenshots `home-light-390.png` / `home-dark-390.png` (zoomed) render «الصافي +3,100 · ↑12%» as `%12↑ · 3,100+ الصافي`:
- the percent sign lands left of the digits;
- the arrow sits between the number and «·»;
- the plus lands right of 3,100, whereas the money cards print `+8,200.00` (sign at the left, via `<bdi dir="ltr">`).

The SVG `<text>` inherits RTL, and no isolate protects the number tokens.
*Fix:*
- In `centreSub` (wheelFocus.ts:102–107), wrap `{net}` and `{arrow}{pct}` in LRI…PDI (`⁦…⁩`), or render them as `<tspan direction="ltr" unicode-bidi="isolate">`.
- Unit test: the string carries the isolates.
- Re-shoot the 390 screenshots; expected visual is `↑12% · +3,100 الصافي`.

The same risk applies to the focused-row amount «5 مواعيد»: it is drawn in the `direction="ltr"` amount `<text>` (WheelSvg.tsx centre), so the digit lands left of an Arabic word. Drop `direction="ltr"` when `text.currency` is false.

**R1-H3. The count label on a gold dot fails contrast in light mode.** A day-dot's count is `fill-on-accent` on the dot's own colour (WheelSvg.tsx:122). In light mode that is white on gold #c9a227 ≈ 2.3:1, below 4.5:1 for text; it is visible as the «2» on the salary dot in home-light-390.png. In dark mode it is dark ink on light gold (fine). It is also tiny: `fontSize` 7–9 viewBox units ≈ 5.5–7 CSS px at 326 px.
*Fix:* choose ink per tone (gold → `fill-gray-900` in light, or a `--color-on-gold` token from `theme`), and record the ratio. Optionally drop the count text when `r < 7` (the aria-label and the live line carry it).

**R1-H4. Long names overflow the centre disc.** On a focused mark, the centre `label` is `partyName` (up to 80 characters); a cluster's label is its whole aria text, e.g. «3 مواعيد في 2026-10-20». Both are drawn at 11 units in a 140-unit disc (WheelSvg.tsx `Centre`), so long names run over ring 1.
*Fix:* truncate the visible label (about 20 characters + «…») in `centreText`/`buildWheelModel`. The live line and aria keep the full text. Unit test.

**R1-H5. A zero side in the attention rows is noise** (the coordinator's question). «لنا: 0.00 ر.س» shows on an overdue row when only علينا is owed (home-light-390.png; AttentionCard.tsx `Totals`). The v1.4 strip did the same, but the row exists only because one side is non-zero, and a red row with «لنا 0.00» reads like information.
*Fix:* render only the non-zero side(s) in `Totals`. Test: a row with only OUT shows no «لنا».

### NOTE

**R1-H6. `listParties()` in the home read is not N+1, but it is heavier than needed** (the coordinator's question).
- It costs about 6 constant queries: `party.findMany`, `plan.findMany`, `instalment.groupBy`, the `transaction.groupBy` history probe, and `openPlansRemainingByParty`'s plan read plus its received-sums read.
- It pulls every party row (phone, email) and passes IN-lists of every party id, only to be summed.
- The page now issues about 30 queries per `/owner` load: layout 3 + `ensureSalaryInstalments` + dashboard ~12 + overview 4 + listParties ~6 + `getDues` 2 + projects + pending names.

That is fine at today's scale. Revisit if an establishment reaches thousands of parties: Postgres binds at most 32,767 parameters, so a very long IN-list fails. A dedicated `instalment.groupBy` by plan direction (2 queries) would keep D22's identity if pinned against `listParties` in a test.

**R1-H7. «اليوم» in dark mode reads fine** (the coordinator's question). The marker is `fill-gray-900` (dark: #e9efea, a light dot on the dark card). The label `fill-gray-500` (dark #9aaba1 on #172019) is about 6.9:1. No change needed.

**R1-H8. Row 4 shows only the legend; no live count.** `t.wheel.dialCount` appears only in the centre on row focus. Optional: add «N مواعيد» to row 4's values so the screen-reader / print equivalent states how many dues the dial holds.

**R1-H9. Missing pin and file size.** `queries.ts` is 256 lines (just over ~250). Staff's `RECENT_COUNT = 10` has no pin of its own: add an assertion that `getStaffDashboard`'s `recentTransactions` takes 10.

**R1-H10. Pending names in a printed card.** The «يحتاج انتباهك» card prints, so pending join names now reach paper. The old notice was `no-print`. Accepted by D8 ("the card prints"); recorded.

## Round 2 — nav (R1-N1, R1-N2)

Gates in this tree: `tsc --noEmit` 0 errors. `src/features/employees` + `src/components/chrome` + `scoping.test.ts`: 7 files, 242 tests, all green.

- **R1-N1 — CLOSED.** nav.md:26 records the mutations M45–M49, matching the list I gave. Each names its failing case:
  - M45: drop `max-[375px]:sr-only` → shell.test.ts:103.
  - M46: unconditional `sr-only` → :103/:108.
  - M47: `max-sm:` breakpoint → :103.
  - M49: drop `border-s-0` → :107.
  - M48: `icon: "account"` → nav.test.ts:287.
- **R1-N2 — CLOSED.**
  - New `src/features/employees/salaryPickRules.ts` holds `SalaryPickRow`, `salaryPickHref` and `isSalaryPick`. It has no `server-only` import and no value import at all.
  - `salaryPick.ts` (still `server-only`) takes only `import type { SalaryPickRow }` from it.
  - `SalaryPickList.tsx:13` and the staff page (:11) import their values from the rules file. No other importer of the helpers is left (grep).
  - Pinned by SalaryPickList.test.ts:105–113: no `server-only`, no db, no non-type import, and the list never imports `salaryPick`.
  - Mutations M50 (`server-only` added) and M51 (list re-imports `salaryPick.ts`) are recorded as failing that case.

Verdict: **nav Round 1 closed.** No new findings. NOTEs R1-N3–N6 stay with the lead and QA as recorded.

## Round 1 — theme (T1 @ 92e1f72, T2–T4 in the tree; D11, D12, D30–D33, D36, D41)

Verified: the 5 theme test files pass (162 tests), and `tsc` reports 0 errors.

- **Light mode is unchanged.**
  - The `@theme` block is byte-identical to `3369686` (diffed).
  - New tokens live in `@theme static`, and their light values are pinned to the literals they replace (themeCss.test.ts:87–123).
  - Tailwind default-palette vars are never restated outside the dark blocks.
  - The PALETTE light values are pinned against main's hexes (themeContrast.test.ts:52–79).
  - The auth/404 wordmark pair sits in flex parents, so `display: var(--wordmark-light)` (inline) is blockified and no layout shifts.
  - D41 records 12/12 pixel-identical captures.
  - Light `themeColor` is still `#006c35`.
- **Print is always light.** Both dark blocks sit inside `@media screen` (pinned at :165). The print block keeps its light literals. `color-scheme: light` is on `:root`.
- **No flash, no inline script, cookie handling is safe.**
  - The async `RootLayout` reads the cookie and spreads `htmlThemeAttrs(parseTheme(…))`; "system" is pure CSS.
  - `ThemeToggle` is an async server wrapper, so the first paint's icon and label match (`useState(choice ?? "system")`).
  - Cookie: `theme=<light|dark|system>; Path=/; Max-Age=1y; SameSite=Lax`, plus `Secure` on https. It is not HttpOnly, which is fine because it carries no secret. Only the three exact values parse; anything else → `null`, so a forged cookie can't inject an attribute.
  - No `<script>` anywhere, so the CSP is untouched.
- **Static pages are unaffected.** `.next/prerender-manifest.json` (build 20:42, with the async layout) still lists only `/_global-error`, as before. Every page was already dynamic.
- **Reconcile logic follows D32** (theme.test.ts:133–160): a present cookie wins, and localStorage is synced; an absent cookie with a stored choice rewrites the cookie and applies it; neither → system with nothing written; blocked storage is tolerated.
- **PALETTE as `var(--…)` strings is safe everywhere it is consumed.** Consumers: Sparkline, Frame/illustrations, LiveClock, OpenProgress, InstalmentBar, CategoryRing, ProjectBits, PayslipHero, CashFlowWaterfall, ExpenseDonut. Every use is an SVG `fill`/`stroke` attribute or `style.backgroundColor`, and both resolve `var()` in all current engines. There is:
  - no colour math (`${PALETTE.x}33`), no canvas, no SVG data URI;
  - no PALETTE in `src/lib/mail` or `src/app/api/export` (grep).
- **recharts colours are set from tokens.** `CHART_TOKENS` in SixMonthChart.tsx:42–48 covers grid, tick, axis, tooltip box and cursor. The light values equal recharts' defaults (#ccc / #666 / white). The tooltip label inherits the page ink, and the legend and items use the series fills, which are tokens.
- **No `text-white` remains in src** (grep).

### SHOULD

**R1-T1. The token lint is easy to get past without writing a hex.** The colour-context lookbehind regex and comment stripping (with a non-blank guard) are good. Two gaps remain:
- **Named colours are not flagged:** `fill="white"`, `stroke="black"`, `style={{ color: "red" }}`. None exist today (grep), but one would stay light in dark mode.
- **A new Tailwind default-palette class with no dark override passes:** e.g. `bg-sky-100` or `text-emerald-700`. D36 accepts `text-white` as a safe fallback, but every other palette step flips only if the dark block defines it.

*Fix:*
- Flag CSS named-colour keywords in `fill|stroke|stopColor|color|backgroundColor|borderColor` values in `.tsx`. `currentColor`, `transparent` and `none` stay allowed.
- Add a case: every `(bg|text|border|fill|stroke|ring|outline|divide|from|via|to|decoration|accent|caret|placeholder)-<palette>-<step>` class used in src has `--color-<palette>-<step>` in the dark block. `<palette>` covers Tailwind's default names.
- Mutate each: add `fill="white"` to a component; add `bg-sky-100`.

### NOTE

**R1-T2. A rare first-load flash.** An absent cookie plus a stored choice (cookie cleared, localStorage kept) applies the choice only after hydration, so there is one flash that load. This is inherent to "no inline script" and is accepted.

**R1-T3. Contrast pairs cover the classes in use today.** Text on gray, tints and soft fills, and on-accent on accent/money/red-800 all reach ≥ 4.5:1. A new fill/text pairing has to add its pair; there is no generic check. Consider deriving the pairs from the classes the lint finds.

**R1-T4. An eager hidden image in dark mode.** The light wordmark is eager, so it still downloads in dark mode while hidden; the white one is lazy. One extra image on the auth pages and the 404. Negligible.

## Round 2 — home (R1-H1–H5, H8, H9; D39, D40)

Verified:
- dashboard + scoping: 15 files, 283 tests, all green;
- `tsc` 0 errors;
- `queries.ts` 249 lines;
- zoom shots `progress/v15/qa/home-wheel-zoom-{light,dark}-390.png` inspected at 4×.

- **R1-H1 — CLOSED.**
  - `overviewReads.ts:102–106`: a sixth read, `instalment.aggregate`, scoped by establishment first, unpaid, `plan: { state: "OPEN", kind: "SALARY" }`, with **no** `dueDate`.
  - `commitmentsOf(parties, thisMonth, all)` gives علينا = Σ owedByUs − all; رواتب stays the month-end-bounded read (:98–101).
  - Unit fixture (overviewReads.test.ts:33–38, 64–74): the employee row holds a 600 next-month salary. Arithmetic checked by hand: Σ owedByUs 2,220,000 − all salaries 1,800,000 = علينا 420,000 = 50,000 + 300,000 + the 70,000 non-salary OUT; 420 + 1,200 + 600 = 2,220 ✓.
  - The "no due-date bound" case (:76–82) pins the new read.
  - The "v1.5 home" gate zone carries next month's 2,500 and pins the same identity.
  - Mutations recorded: subtract the month-end figure again; bound the new read; `fromUs = byUs`.
- **R1-H2 — CLOSED.**
  - The isolates are in place: `LRI…PDI` around `{net}`, and `{arrow}{pct}` as one isolate (wheelFocus.ts:108–129).
  - The zoom shot now reads `↑12% · +3,100 الصافي` in both themes.
  - A count with no currency is no longer drawn `direction="ltr"` (WheelSvg.tsx:156).
  - Pinned with mutations.
  - *NOTE:* the isolate opens in `{arrow}` and closes in `{pct}`, so it relies on the templates keeping them adjacent. `centreSub` and `centreSubCapped` in ar.v15.ts:29/31 do today. If a template ever puts words between them, those words fall inside the LTR isolate. A one-line pin that both templates contain `{arrow}{pct}` would lock it.
- **R1-H3 — CLOSED.** Ink is chosen per tone: gold → `fill-on-gold` (D41: 7.41:1 light, 9.50:1 dark), green/red → on-accent, hollow → money-out. A count is drawn only when `r ≥ 7`. The zoom shot shows a dark «2» on the gold day-dot in both themes. Mutation-proven.
- **R1-H4 — CLOSED.** `clipLabel` (20 code points + «…») feeds `shortLabel` in the disc; the live line keeps the full label. Two mutations recorded.
- **R1-H5 — CLOSED.** `Totals` renders only the non-zero side(s) (AttentionCard.tsx:19–35). Tests cover OUT-only, IN-only and both, with a mutation.
- **R1-H8 — CLOSED.** Row 4 values start with «N مواعيد» (plural). Mutation recorded.
- **R1-H9 — CLOSED.** `queries.ts` is 249 lines. The new `recentCounts.test.ts` pins staff `(est, 10, { createdById }, { hideSalary: true })` and owner `(est, 5)`. Mutation: `RECENT_COUNT = 9` → the staff case fails.

R1-H6/H7/H10 were NOTEs, ruled in D40 (accepted).

Verdict: **home Round 1 closed.** No new findings beyond the isolate-adjacency NOTE above.

## Round 2 — theme (R1-T1) and the home isolate pin

Verified: `tokenLint.test.ts` + `wheelFocus.test.ts` 2 files, 47 tests, all green.

- **R1-T1 — CLOSED.**
  - **(a) Named colours.** `COLOUR_PROP` + `NAMED` (tokenLint.test.ts:36–67) cover the full CSS named and system colour list in colour props and style keys: `fill`, `stroke`, `stopColor`, `color`, `background(Color)`, `borderColor`, … The forms `="x"`, `={"x"}` and `: "x"` are all caught; `none`, `currentColor`, `transparent` and `var()` pass.
  - **(b) Palette coverage.** Every default-palette class step used in src must have its `--color-<name>-<step>` in the dark block (:186–218). This covers variants, side borders and `/opacity`, with a guard case that the pattern actually matches. `gray` (app scale), `white` (surface) and `black` (backdrop) are excluded on purpose.
  - Mutations recorded in theme.md, each failing the named case: `fill="white"` in LedgerArt, and `bg-sky-100` in AuthCard.
  - NOTE (residual, accepted): a named colour inside a shorthand value (`border: "1px solid red"`) is not parsed. None exists today, and review holds that line.
- **Home isolate pin — CLOSED.** wheelFocus.test.ts:102 asserts that both `centreSub` and `centreSubCapped` contain `{arrow}{pct}`.

Verdict: **all reviews closed** (pre-code, nav R1–R2, home R1–R2, theme R1–R2).

## Round 3 — QA fixes (D42; qa-visual 0 B / 3 S / 12 N)

Verified: `tsc` 0 errors. dashboard + chrome + ledger route + theme tests: 22 files, 258 tests, all green.

**Fixes — all CLOSED:**
- **QV-S1 (nav).** The side «+» dialog now carries `max-h-[calc(100dvh-7rem)] overflow-y-auto` (AddSheet.tsx:143). M52 (uncapped) and M53 (no overflow) both fail the nav.test.ts case.
- **QV-S2 (home).**
  - One `onKeyDown` on the card's inner wrapper (WheelCard.tsx:91) holds both the SVG and the rows, and calls `cardKeyAction`. The mark-level Escape branch is gone, so a mark's Escape bubbles up to it.
  - Pure case: row focus + Escape → null. Source pin: the wrapper encloses `<WheelSvg` and `<WheelRows`. Both are mutation-proven.
- **QV-S3 (home).** `showOpenHint` (activated && a mark is focused) adds a visible `no-print` `text-gray-500` line (WheelCard.tsx:105); `gray-500` is ≥ 4.5:1 on the card in both themes. The pure cases (a row, clear and Escape each hide it) and the JSX pin are both mutation-proven.
- **N1 (nav).** On the reports tab the whole header row is `no-print` (page.tsx:71). M54 fails reportsTab.test.ts.
- **N11 (nav).** The reports add button uses `t.transaction.addButton` (page.tsx:58). M55.
- **N5 (home).** In the empty state the two buttons are hidden (`model.empty ? null`, WheelCard.tsx:117) and row 4 drops its count. Each guard is mutation-proven.
- **N6 (home).** `liveLine` joins with «. ». Mutation-proven.
- **N7 (home).** Overdue dots get labels by kind: `dotOverdueIn/Out/Salary`. The old `dotOverdue` key is gone from code (grep). All three labels are pinned.
- **N12 (home).** «عرض الكل» shows only when there are rows (RecentTransactions.tsx:30). Mutation-proven.
- **N4 (theme).** The toggle's `title` equals its accessible name; pinned for all 3 modes. Mutation: removing `title` → 3 cases fail.

**Judging D42's accepted items:**
- **N2 (redirects stream as HTTP 200 + a client redirect; stuck without JS): agree to accept.** The owner area already needs JS (N3, as on `main`), and with JS all four cases land correctly with the query kept.
  - *NOTE, wording only:* the redirect pages' comments and redirects.test.ts:65 say "no loading.tsx: a redirect-only page must answer 307, not stream". That is no longer true, because the parent `owner/loading.tsx` streams first.
  - *Fix:* reword the comment and the test title to "no loading.tsx of its own". If a real 307 is ever wanted, the place is the proxy (with `URLSearchParams.set`, as D24 requires), not `next.config` `redirects()`: that appends the old query, so a stray `tab` would duplicate the key.
- **N3: agree** (pre-existing; the wheel's server HTML is complete).
- **N4 (cycle light → dark → system; first tap from «حسب الجهاز» on a light phone shows no change): agree.** §C2 states this order verbatim, and it is flagged to the user.
- **N8 (ring 2 and the donut colour one category differently on one page): agree, with a NOTE.** The approved mock wins, and each chart has its own legend and labels. If the user asks for one palette later, the cheap fix is ring 2 reading the donut's colour order. The donut is the v1.3 visual the user already knows.
- **N9: agree.** It lasts only until hydration, and D20 accepted it.
- **N10 (at 375–390 px the establishment name keeps ≈ 62 px, «مؤس…»): agree that it goes to the user.** 390 px is the most common iPhone width, and on `main` the name read «مؤسسة الحر…».
  - If the user rejects it, the least-restyling option keeps the bar intact: below `sm`, move the theme button from the top bar into «حسابي» / المزيد and keep it in the bar from `sm` up.
  - Shrinking the wordmark would restyle the bar (D37), so it is not an option.
- **«لـ{name}» with tatweel: agree.**

Verdict: **Round 3 closed.** Two NOTEs: the N2 comment/test wording, and the N10 option for the user. Waiting for qa-tests; there may be a Round 4.

## Round 4 — qa-tests survivors (D43)

**Method.** I worked on my own scratch copy: `scratchpad/rev-mut` holds `src` and the configs, with `node_modules` symlinked. A small script applied each mutation, ran vitest, and restored the file byte-exact (asserted). Nothing was mutated in the main tree.

**Baseline.** In the copy the full suite is green: 136 files, 1974 tests. `tsc` on the main tree reports 0 errors.

**The five BLOCKERs, re-applied with qa-tests' exact mutations — all now killed:**

| Mutation | Failing case(s) |
|---|---|
| H07: swap the علينا and رواتب amounts in `wheelModel.ts` (full swap, so the ring total is unchanged) | wheelFocus.test.ts "H06/H07: every segment carries its own amount and its own target"; wheelInteractions.test.ts "H18: each row lists its own ring's values" |
| H18: row 2 lists ring 1's values (`WheelRows.tsx` `valuesOf`) | wheelInteractions.test.ts "H18" |
| H20: the dial read loses `...unpaid` (`overviewReads.ts`) | overviewReads.test.ts "H20/H22: the dial and both overdue reads are unpaid-only"; the scoping "v1.5 home" populated case |
| H22: `overdueWhere` loses `...unpaid` | the same two cases |
| N05: the payable pick row shows 0 (`SalaryPickList.tsx`) | SalaryPickList.test.ts "rows link by the rule…" (asserts «5,000.00 ر.س») |

**SHOULDs spot-checked the same way — all killed:**

| Mutation | Failing case(s) |
|---|---|
| N03: an invalid `partyId` reads the unfiltered report | reportsTab.test.ts "D43 N03" |
| N04: the Excel link drops `&partyId=` | reportsTab.test.ts "D43 N04" |
| T01: a click re-applies the current mode | themeToggleClick.test.ts × 3 |
| T02: `secure: false` always | "writes a Secure cookie on https…" |
| T13: the storage key `ui:theme` → `theme` | theme.test.ts × 3 |
| T06–T10 lint holes, each added to `Badge.tsx`: `shadow-[0_0_0_1px_#ffffff]`, `fill-[white]`, `text-black`, `drop-shadow-sky-100`, plus my own `bg-[#fff]/50` and `stroke-[rgb(0,0,0)]` | tokenLint.test.ts fails each time |
| v15Wording: shorten the «اتفاقية جديدة» caption in `ar.v15.ts` | "B3: the seven owner rows… verbatim" |

**Refactors — behaviour unchanged.**
- **WheelCard → `wheelController.ts`.**
  - `dispatch`, `activate`, `row`, `replay` and `showAll` are the old inline handlers, unchanged.
  - `markKeyAction` keeps Enter/Space → activate (with `preventDefault`) and the arrows/Home/End → roving move.
  - Escape still bubbles to the card's `cardKey`, which maps Escape only, so Space on a row button keeps its native click.
  - `wheelView` returns the same centre, tone, live line, hint and animate values that the component used to compute inline.
- **HomeDetails → `HomeDetailsView` + `toggleHomeDetails`.**
  - The same D20 markup.
  - `toggle` = !`isHomeDetailsOpen(remembered, wide)`, stored and then set, which is identical to before.
  - The mount effect is unchanged.

**The midnight flake.** The "v1.2b CP2 checkIn" case in scoping.test.ts (:2220–2241) now uses `vi.useFakeTimers({ toFake: ["Date"] })` with the clock pinned to that day's 12:00 Riyadh, and calls `useRealTimers` in `finally`. Only `Date` is faked, so the rest of the file's timers are untouched. Closed.

**Redirect wording.** No "307" is left in `src/app/(owner)/owner/reports/**` (grep). Closed.

**`src/i18n/v15Wording.test.ts` (lead).** 43 literal assertions covering §A–C and the mock's row texts. Mutation-proven above.

**The backdrop: black ruling.** Agree. `bg-black/50` dims the page in both themes, so it is meant to be black, and the palette check excludes `black` by name.

### SHOULD (new)

**R4-T1. The testkit exclusion is matched by filename suffix anywhere in src.**
- The token lint skips every `*.testkit.ts` (tokenLint.test.ts:40), wherever it lives.
- Today there are two: `src/lib/themeCss.testkit.ts` and `src/lib/tokenLint.testkit.ts`. Only tests and the other testkit import them (grep).
- But a production module named `x.testkit.ts` could hold hex colours and be imported by a component, and the lint would never see it. This is the same "can't be fooled trivially" bar as R1-T1.

*Fix:* add a case asserting that:
- every `*.testkit.ts` under src sits in an allow-listed set (today the two in `src/lib/`);
- no non-test file imports a `.testkit` module (the regex is `/from ["'][^"']*\.testkit["']/` over non-`*.test.ts` sources, excluding the testkits themselves).

Mutation: import a testkit from a component → the case fails.

### Verdict

Round 4 is closed except **R4-T1** (one SHOULD, theme, small).

## Round 4b — R4-T1

**R4-T1 — CLOSED.** `tokenLint.test.ts` (47 cases, green) adds two cases:
- an explicit list of the only allowed testkits: `src/lib/themeCss.testkit.ts` and `src/lib/tokenLint.testkit.ts`;
- no app file imports a `.testkit` module. Static `from`, dynamic `import()` and `require()` all count, and fixture lines check the matcher itself.

I re-applied both mutations on my scratch copy, then restored and checked each file:
- `Badge.tsx` importing `@/lib/tokenLint.testkit` → "no non-test file imports a .testkit module" failed.
- A stray `src/components/sneaky.testkit.ts` holding `"#fff"` → "the only *.testkit files under src are the two theme helpers" failed.

Verdict: **all reviews closed** (pre-code; nav R1–R2; home R1–R2; theme R1–R2; QA rounds 3–4).

## In progress
- Task: all reviews closed; nothing in progress.

## Gotchas I found
- Tailwind v4 preflight's `[hidden]{display:none !important}` is layered: no unlayered `!important` (print, breakpoints) can override it. Toggle visibility with a class or data-attribute instead.
- `/owner/dues` shows only overdue + 7 days; any "see all upcoming" link must not point there for days 7–29.
- Salary instalments exist through the END OF NEXT MONTH (src/lib/payroll.ts:55), so any "all unpaid salaries" figure differs from "due ≤ this month".
- SVG `<text>` in an RTL page needs LRI/PDI (or an isolated `<tspan>`) around signed numbers and percents; without one, `12%` renders as `%12`.

## Questions / requests sent to lead
- Rulings needed: #1 (D3), #3 (D9), #9 (D2), #10/#11 (D4), #12 (D15 flag), #31 (keys), #33.
- Round 1: D22's premise («salary rows never exist beyond this month») is false; amend it with R1-H1.

## Follow-up review (D45–D50; tree on `claude/v15-wheel-nav-theme` restarted from `main` `9cacd1f`, uncommitted, 2026-10-12)

Scope: `git diff origin/main` plus untracked files.
- theme: `theme.ts`, `ThemeToggle*.tsx`, `ThemeToggleState.ts`, `ThemeSegmented.tsx`, `TopBar.tsx`, `MoreSheet.tsx`, the staff and admin «حسابي» pages, `globals.css`.
- home: `categoryColours.ts`, `ExpenseDonut.tsx`, `wheelModel.ts`, `wheelHrefs.ts`, `WheelRows.tsx`, `WheelSvg.tsx`.
- Tests for both.

Work was done on a scratch copy (`scratchpad/rv2`, with `node_modules` symlinked). On that copy: `tsc` 0, vitest **138 files / 2019 tests** green, and the token lint is green (no hex in the touched files; grep agrees).

### Rulings vs code
1. **Two-state toggle (D45): implemented exactly.**
   - Toggle logic:
     - `toggleTheme(shown)` stores the opposite of what is shown.
     - With no choice, the click reads `matchMedia` at tap time (`shownTheme(choice, deviceIsDark())`).
     - Only light or dark is ever written.
   - Unchanged, as the spec requires: `parseTheme`, `htmlThemeAttrs`, the cookie and `ui:theme` format, `layout.tsx` and the dark blocks.
   - A stored `system` is no choice everywhere it is read:
     - the server layout: `htmlThemeAttrs("system")` → `{}`;
     - the wrapper: `explicitTheme` → null;
     - `reconcileTheme`, for the cookie and for storage;
     - `themeFromCookies`.
   - `aria-label` = `title` = the action (`toDark` / `toLight`).
   - D50: the icon shows the target (moon under `.theme-light-only`, sun under `.theme-dark-only`), pinned by shape.
2. **Placement (D46): implemented exactly.**
   - The button has `max-[480px]:hidden` and the row has `min-[480px]:hidden`. I compiled the CSS on scratch: they become `@media (width < 480px)` and `@media (width >= 480px)`. These are complementary, so exactly one control shows at any width.
   - D37 is gone: the name is plain text in its `flex-1` box.
   - «المظهر» is the sheet's first row, before every tile section.
   - Staff and admin «حسابي» get the row after the h1 and before the password form. The owner's «حسابي» does not.
   - Each segment has `aria-pressed` and is 44 × 64 px.
3. **D47: implemented exactly.** One function, `categoryColour(key, rank)`, colours both the donut's `colourOf` and ring 2. Both draw `donutSlices` of the same `data.topOutCategories` and `monthOutHalalas` (`owner/page.tsx`), so the ranks are the same. The row-2 swatches use `s.colour`.
4. **D48: implemented exactly.**
   - Each row is a `div`: the unchanged focus `<button>`, then a sibling `next/link` «عرض».
   - Each link has `aria-label` «عرض: {title}» (the visible text is part of the name, WCAG 2.5.3), `no-print`, `min-h-11 min-w-11`, and stretches to the row's height.
   - Hrefs:
     - ring 1 → `?from&to` of the month (the same parsing as `directionHref`);
     - ring 2 → `?tab=reports` (pinned `=== REPORTS_HREF`);
     - ring 3 → `/owner/parties`;
     - dial → `/owner/dues`.
   - The links stay in the D28 empty state.

### Mutations re-applied on scratch (each file restored from `.bak`)
I ran 20 mutations, 8 of them not in the recordings: T2, T8, T9, T11, T12, H2, H6 and H8. All are killed except T8.

| # | Mutation | Result |
|---|---|---|
| T1 | `toggleTheme` returns `shown` | 13 failed |
| T2 | `explicitTheme("system")` → light | 5 failed |
| T3 | `max-[480px]:hidden` dropped | 1 failed |
| T4 | a segment toggles instead of storing | 1 failed |
| T5 | D50 reverted (sun under `.theme-light-only`) | 3 failed |
| T6 | the row moved after the tiles | 2 failed |
| T7 | the row removed from staff «حسابي» | 1 failed |
| **T8** | **the OS `change` listener removed from `useThemeChoice`** | **survived (310/310 green)** |
| T9 | the cookie lookup uses `includes` | 1 failed |
| T10 | `min-[480px]:hidden` dropped | 1 failed |
| T11 | `shown` ignores the device | 2 failed |
| T12 | the pre-mount sr-only labels swapped | 2 failed |
| H1 | ring 2 gets the mock palette | 4 failed |
| H2 | the donut's rank shifted by one | 1 failed |
| H3 | `no-print` dropped | 1 failed |
| H4 | ring 1 → `directionHref("OUT")` | 2 failed |
| H5 | dial → `/owner/plans` | 2 failed |
| H6 | the link's aria-label dropped | 3 failed |
| H7 | `min-w-11` dropped | 1 failed |
| H8 | the row button loses `aria-pressed` | 2 failed |

### Checks
- **Hydration and flash.**
  - The button's first client render equals the server's. With a stored choice the label comes from the same prop on both sides. With no choice there is no label on either side and `deviceDark` is null on both.
  - `ThemeSegmented` renders "neither pressed" on both sides, and `useId` is stable.
  - Before hydration the icons and the two sr-only names are chosen by CSS (`--wordmark-*`, unlayered and declared in both dark blocks). So there is no mismatch and no wrong-icon flash.
- **Contrast in dark (light in brackets).**
  - Row label gray-900 on the sheet surface: 14.3 (17.9).
  - Segment text gray-700: 10.4 (10.4); on hover 9.3.
  - Pressed segment, on-accent on accent: 6.35 (6.57).
  - «عرض», accent-dark on surface: 7.39 (10.05); on accent-soft when the row is on: 6.04 (8.84).
  - Focus uses the global `:focus-visible`.
- **RTL.** «المظهر» sits at the start; the segments read فاتح then داكن from the right; «عرض» trails the row. No new `dir` or physical-side classes.
- **Security: unchanged.**
  - The cookie is still whitelisted by `parseTheme`.
  - The staff and admin pages still call `requireStaff()` / `requireAdmin()` first.
  - The links are static internal paths.
  - No new actions, reads or routes; `.env` untouched.
- **Bundles.** On `bundles-followup-{theme,home}.json`, the worst route is `/owner` at +6.2 KB gz against `bundle-baseline.json`, well under the +40 KB cap. D50 is an icon swap and adds no bytes.

### Findings
**SHOULD**
- **F-S1 (theme): following the OS while no choice is stored is unpinned (T8 survives).**
  - `useThemeChoice` subscribes to `matchMedia("(prefers-color-scheme: dark)")` `change`. That subscription keeps the button's `aria-label`/`title` and the pressed segment right when the device flips while the page is open. `theme.md` claims it ("then follows OS changes").
  - Deleting `media?.addEventListener("change", onDevice)` leaves every test green, because the stub's `matchMedia().addEventListener` is a no-op.
  - Without it, after an OS switch the page turns dark (by CSS) but the button still says «التبديل إلى المظهر الداكن» and «فاتح» stays pressed. The tap itself is still right: it reads the device at click time.
  - *Fix (test only):* in `themeToggleClick.test.ts`, make the stub's `matchMedia` record the `change` handler. Then run the mount effect with `deviceDark = false`, set `deviceDark = true`, call the handler, and expect the last `setState` to be `true`. Optionally, check that the cleanup removes the handler.

**NOTE**
- **F-N1 (theme).** `ThemeSegmented` calls `useThemeChoice(null)`. Even with a stored light/dark cookie, neither segment is pressed until mount. D50 accepted this only for "no stored choice".
  - It is visible only on the staff/admin «حسابي» below 480 px, for a split second. «المزيد» opens after hydration.
  - Optional fix: a tiny server wrapper, as `ThemeToggle` does, passing `explicitTheme(parseTheme(cookie))`. Accept or fix as the lead prefers.
- **F-N2 (stale wording, no behaviour).**
  - `globals.css` comment above `.theme-light-only`: "so the icon for the scheme on screen shows". Since D50 it is the icon of the *target*, visible while that scheme is on screen.
  - `src/i18n/ar.v15.ts:222` (lead): "`{mode}` = one of the three names".
  - `docs/V15-SPEC.md` C2 ("cycling light → dark → system; default = system") and `docs/FRONTEND.md:88` ("light / dark / system theme") are not marked as superseded by D45 (lead).
- **F-N3.** `WheelRows` imports `fillText` from `@/features/dashboard/visuals`, which was already client-safe. `wheelFocus.test.ts`'s allow-list now admits `@/components/visualPalette` for every wheel file. That is fine: `visualPalette` is token-only and lint-covered.

### Verdict
No BLOCKER. One SHOULD (F-S1, theme, test only) and three NOTEs. The follow-up review closes when F-S1 lands with its mutation (T8) killed.

### Follow-up review — recheck (theme's fixes, lead's F-N2 items)
I took a fresh scratch copy (`scratchpad/rv3`): `tsc` 0, vitest **138 files / 2024 tests** green.
- **F-S1 — CLOSED.** The new case "a device flip while the page is open updates the shown scheme; unmount stops listening" kills both mutations I re-applied:
  - T8 (the `addEventListener("change")` line removed): 1 failed.
  - R1 (the `removeEventListener` line removed): 1 failed.
- **F-N1 — CLOSED.** The new `ThemeSegmentedServer.tsx` reads the cookie and passes `choice` down. The client starts from `explicitTheme(choice)`, so the server and the first client render agree and there is no mismatch.
  - R2 (`ThemeSegmented` ignores `choice`): 2 failed, the "stored light/dark pressed at SSR" cases.
  - R3 (the staff page mounts the client-only row): 5 failed.
- **F-N2 — CLOSED.**
  - The `globals.css` comment now describes the D50 icon.
  - `ar.v15.ts:222` is updated.
  - `docs/V15-SPEC.md` C2 carries the lead's supersession note.
  - `docs/FRONTEND.md:88` now reads light ↔ dark.
- F-N3 needed no change.

Verdict: **follow-up review closed.**

## D52 review — category palette (tree on `claude/v15-wheel-nav-theme` from `main` `dfdace4`, uncommitted, 2026-10-12)

What I read: the user's ruling verbatim and D52 in `docs/V15-SPEC.md`, `docs/FRONTEND.md › Category palette (v1.5 D52)`, `progress/v15/theme.md › D52`, `git diff origin/main` plus the untracked `src/lib/categoryPalette.test.ts`, the bundles JSON and both 390 px screenshots.

Gates, which I re-ran myself:
- `tsc --noEmit` gave 0.
- vitest: **139 files / 2072 tests** green.
- The five D52-related files (categoryPalette, themeCss, themeContrast, tokenLint, wheelFollowup) gave 216/216.

### Checks
- **Semantic exclusion: holds.** The set is `accent`, `money-in`, `money-out`, `gold`, which are exactly `TONE_VAR` (rings 1 and 3, the dial) and `PALETTE.in/out/green/gold`.
  - I measured every value with my own Python CIEDE2000, written independently of the testkit.
  - The nearest semantic ΔE is 18.7 in light (cat-3 vs money-in) and 19.0 in dark (cat-5 vs gold).
  - No category value equals a semantic one.
  - `wheelFollowup` also asserts that no ring-2 or donut colour is a semantic `PALETTE` entry.
- **Neighbours in donut order (1–2 … 5–6, 6–1): hold.** Every neighbour pair is ΔE ≥ 30.5. The cat-4→5 light pair is 1.26:1 but ΔE 45.6, so it passes through the ΔE clause.
- **Card ≥ 3:1: holds.**
  - Light card `#ffffff`: lowest is cat-1 at 3.31:1.
  - Dark card `#172019`: lowest is cat-6 at 3.34:1.
- **«أخرى» = cat-6: holds.**
  - `categoryColour` gives `key === "other"` → `OTHER_COLOUR` = `PALETTE.cat6`, and a rank past five also gets cat-6.
  - cat-6 has the lowest chroma: C* 5 in light, 7 in dark. The other five are 24–52.
- **One function: holds.**
  - `categoryColour` has only two callers: `ExpenseDonut.colourOf` and ring 2 in `wheelModel`. `CATEGORY_COLOURS`, `OTHER_COLOUR` and `cat*` are used nowhere else.
  - `CategoryRing.tsx` (projects) is untouched, which is right because it is outside D52.
  - The screenshots show the same six colours in the same order in ring 2, row 2's swatches and the donut, in both themes.
- **ΔE implementation: correct.**
  - The six Sharma pairs in the test pass.
  - I ran 14 further Sharma pairs against the testkit's `deltaE2000Lab` in both argument orders, all within 5e-5. They cover rows 2, 3, 4, 9, 11, 13, 15, 16, 18, 19, 20 and three of rows 22–33, including the hue-mean and Δh′ wrap cases in rows 9–15.
  - The testkit's sRGB→Lab (D65) and WCAG contrast reproduce every number in the doc table to the printed digit.
- **Light mode unchanged except the donut and ring 2: holds.**
  - The `globals.css` diff adds 18 lines: 6 light, 6 + 6 dark. No existing token value changed.
  - `LIGHT_AT_MAIN` still passes. The cat keys are excluded from `PALETTE_AT_MAIN` and pinned in the new test.
- **Token lint / hex: clean.**
  - New hex appears only in `globals.css` and in test files (D12).
  - `tokenLint.test.ts` is green.
  - The explicit and system dark blocks carry identical cat values, which is pinned twice.
- **Doc table = `globals.css`: holds.** I checked all 12 values by script. All measured columns in `FRONTEND.md` and `theme.md` match my independent numbers.
- **Mutations:** I re-applied 11 on a scratch copy (`scratchpad/d52/repo`). All were killed.

| # | Mutation | Failed |
|---|---|---|
| R1 | dark cat-3 → `#2f9f66` (ΔE 3.7 from dark accent), both dark blocks | 4 (exclusion vs accent and money-in, pins) |
| R2 | `categoryColour` ignores `"other"` | 1 («أخرى» is cat-6 at any rank) |
| R3 | donut `colourOf` uses `i + 1` | 1 (ring 2's colour is the donut's, per rank) |
| R4 | light cat-1 → `#4aaed6` (2.53:1) | 3 (card 3:1, pins, `LIGHT_NEW`) |
| R5 | explicit dark cat-6 only changed | 2 (pins, explicit = system) |
| R6 | ring 2 inlines its own equivalent palette | 1 (the one-function import check) |
| R7 | CIEDE2000 hue-mean wrap branch dropped | 1 (Sharma 27.1492) |
| R8 | CIEDE2000 Δh′ ±360 wrap dropped | 1 (Sharma 27.1492) |
| R9 | CIEDE2000 G term zeroed | 6 Sharma pairs |
| R10 | `PALETTE.cat6` → `--color-chart-grey` | 2 |
| R11 | light cat-5 = gold `#c9a227` | 4 (exclusion vs gold, card, pins, `LIGHT_NEW`) |

### Findings
- **D52-S1 (SHOULD, lead/theme: a decision or a test).** The neighbour rule covers only the fixed ring of six, but shorter rings close on other pairs.
  - `donutSlices` drops «أخرى» when `rest` is 0. So a month with three or four categories ends the ring on cat-3 or cat-4, which then touches cat-1. Both the wheel (3° gaps) and the donut (2 px card stroke) are closed rings.
  - Light cat-1/cat-3, the petrol `#2298c3` beside the teal `#20978a`: ΔE 20.6 at **1.08:1**.
  - Dark cat-1/cat-4, `#6cc5e5` beside `#b2b0dd`: ΔE 23.4 at **1.06:1**.
  - Both pairs pass "ΔE ≥ 20" but fail D52's own "contrast ≥ 1.3:1 or ΔE ≥ 30". The user asked for "contrast between neighbours", and in those months these colours are neighbours.
  - The only other pair below the bar is dark cat-3/cat-6 (23.6, 1.02:1). It needs «أخرى» with only three named categories, which `donutSlices` cannot produce today.
  - Mitigations: segment gaps, and every slice is named with its amount in the legend and row 2.
  - The lead should either record that D52's pairs are the fixed six and accept the short-ring wrap (gaps plus legend), or extend the test to every pair that can touch, (1, k) for k = 2…5. If the test is extended, cat-1/cat-3 in light and cat-1/cat-4 in dark need a lightness change.
- **D52-N1 (NOTE, lead).** `docs/V15-SPEC.md` D47 still names the old colour order ("`out`, `amber`, `gold`, `blue`, `teal`, «أخرى» `grey`") with no note that D52 supersedes it. That is the same kind of item as F-N2.
- **D52-N2 (NOTE, theme).** The "same function" test is a regex on the import line in `ExpenseDonut.tsx` and `wheelModel.ts`.
  - It killed R6, and `wheelFollowup` covers the behaviour (per-rank equality).
  - A reformatted import, e.g. `import { categoryColour, X }`, would false-fail it. That is acceptable but brittle.
- **D52-N3 (NOTE).** The testkit's wrap branches (R7, R8) are each caught by a single Sharma pair (17). Sharma rows 9–15 target exactly these branches; adding two of them would make the coverage deliberate. The maths is correct today.
- **D52-N4 (NOTE, design, by the ruling).** Light cat-3 teal and dark cat-5 clay sit near the retired or other chart tokens:
  - light cat-3 vs `chart-teal`: ΔE 12.1;
  - dark cat-3 vs `accent-3`: 11.5;
  - cat-5 vs `chart-amber`: 11.2 / 9.8.
  - Those tokens are not in the semantic set and are not on the home page (D50), so no action is needed.
- I saw a transient broken comment opener in `ExpenseDonut.tsx` while `home` was mid-edit. It was re-read clean: the comment edit is the only change and `tsc` is 0.

### Verdict
No BLOCKER. One SHOULD (D52-S1, which a logged Decision can close) and four NOTEs. The palette, the measurements, the docs and the tests are otherwise correct as written.

### D52 review — recheck (theme's S1/N2/N3 fixes, lead's N1 and table rewrite)
I took a fresh scratch copy (`scratchpad/d52/r2`). `tsc` gave 0. vitest: **139 files / 2087 tests** green; the five D52 files 231/231.
- **D52-S1 — CLOSED.**
  - New values: light cat-3 `#127c78`, dark cat-4 `#989ac7`. I re-measured them with my own CIEDE2000.
  - Every pair that can touch passes "ΔE ≥ 20 and (contrast ≥ 1.3 or ΔE ≥ 30)" in both themes. Those pairs are 1–2 … 5–6, 6–1 and 1–k.
  - Light: cat-1/cat-3 20.4, 1.52:1; cat-2/cat-3 47.4, 1.17:1; cat-3/cat-4 31.9, 1.00:1 (passes through ΔE ≥ 30); cat-3 on the card 5.02:1; cat-3's nearest semantic colour is accent at 18.6.
  - Dark: cat-1/cat-4 23.4, 1.38:1; cat-3/cat-4 32.8, 1.82:1; cat-4/cat-5 37.9, 1.19:1 (passes through ΔE ≥ 30); cat-4 on the card 6.19:1; cat-4's nearest semantic colour is money-out at 30.4.
  - All-pairs minimum: 20.4 light, 20.2 dark.
  - The pairs still under the bar cannot touch: 2/4 in both themes, and 3/6 in dark, which needs «أخرى» after rank 3 and `donutSlices` cannot produce that.
  - Re-applied mutations:
    - S1a (light cat-3 back to `#20978a`): 3 failed, including "cat-1 and cat-3 read apart".
    - S1b (dark cat-4 back to `#b2b0dd`): 3 failed, including "cat-1 and cat-4 read apart".
    - S1c (the 1–k pairs dropped from `NEIGHBOURS`): 2 failed, the coverage cases.
- **D52-N1 — CLOSED.** D47 carries "(Colour order superseded by D52 …)".
- **D52-N2 — CLOSED.**
  - The check now strips whitespace. A multi-line, merged import still passes, which I tested (exit 0).
  - The inline-palette mutation (N2b) still fails 1.
- **D52-N3 — CLOSED.**
  - R7 (the hue-mean wrap dropped) now fails 4 Sharma pairs instead of 1.
  - R8 (the Δh′ wrap dropped) is still caught only by pair 17: rows 9–15 do not reach that branch. It is killed, so this is informational only.
- **Doc table: matches.** All 12 hex values in `docs/FRONTEND.md › Category palette (v1.5 D52)` equal `globals.css`, checked by script. The dark values appear in both dark blocks.
  - The table's measured numbers and the new 1–k table match mine to the printed digit.
- **New NOTE D52-N5 (no action).** Light cat-3 `#127c78` is now ΔE 2.8 from `--color-chart-teal` (`#0f766e`). That token is not semantic, and its only user is the project `CategoryRing` (`PALETTE.teal`), which is not on the home page. The two never appear together.

Verdict: **D52 review closed.**
