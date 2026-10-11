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

## In progress
- Task: all reviews closed (nav, home, theme); nothing in progress.

## Gotchas I found
- Tailwind v4 preflight's `[hidden]{display:none !important}` is layered: no unlayered `!important` (print, breakpoints) can override it. Toggle visibility with a class or data-attribute instead.
- `/owner/dues` shows only overdue + 7 days; any "see all upcoming" link must not point there for days 7–29.
- Salary instalments exist through the END OF NEXT MONTH (src/lib/payroll.ts:55), so any "all unpaid salaries" figure differs from "due ≤ this month".
- SVG `<text>` in an RTL page needs LRI/PDI (or an isolated `<tspan>`) around signed numbers and percents; without one, `12%` renders as `%12`.

## Questions / requests sent to lead
- Rulings needed: #1 (D3), #3 (D9), #9 (D2), #10/#11 (D4), #12 (D15 flag), #31 (keys), #33.
- Round 1: D22's premise («salary rows never exist beyond this month») is false; amend it with R1-H1.
