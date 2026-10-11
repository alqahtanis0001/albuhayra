# progress/v15/qa-tests.md

Your own running notes. Only you write here. The lead merges it into PROGRESS.md at checkpoints. Keep entries short; newest at the bottom.

## Files I own
`progress/v15/qa-tests.md` only (read-only on `src/`). Scratch: `…/scratchpad/qa-tests/` (repo copy at `e2131b9`, `node_modules` symlinked; harness `tools/mut.py`, `tools/group.py`, mutation lists `tools/muts*.py`).

## Method
- Copy of the tree at HEAD `e2131b9` (tar, no `.git`/`.env`/`node_modules`/`.next`). Each mutation: one exact string replacement → `vitest run` on the area's subset → restore. Every subset survivor was then re-run against the **full suite** (1909 tests, 133 files) in three combined groups (A: H01–H09; B: H10–H27, H29; C: H28, N01–N05, T01–T13): 0 failures in each, so every survivor below survives the whole suite.
- Sanity: S01 (`dayAngle` → `360·d/30`, the builder's own mutation) is killed by `wheel.test.ts` › D18, so the harness sees real kills.
- The copy was checked byte-equal to `git show HEAD:<file>` for every `src/` file at the end. Nothing in `/home/user/albuhayra` was written except this file.
- Results are against `e2131b9`. The main tree now has uncommitted edits by others (WheelCard, WheelRows, AddSheet, ledger page, nav/themeToggle/reportsTab tests). Re-check H10–H19 against those.

## Mutation table (53 + 1 sanity; 8 killed, 45 survived)

| ID | File (at e2131b9) | Mutation | Result | Killed by / class |
|---|---|---|---|---|
| H01 | dashboard/wheel.ts:168 `dominantKind` | day colour by **count** of dues, not amount | SURVIVED | SHOULD |
| H02 | wheel.ts:169 | tie `>` → `>=` (tie keeps the later kind) | SURVIVED | NOTE |
| H03 | wheel.ts:191 | overdue cluster at −26° instead of D38's −16° | SURVIVED | SHOULD |
| H04 | wheel.ts:69 `arcPath` | large-arc flag always 0 (an arc > 180° draws the short way) | SURVIVED | SHOULD |
| H05 | wheel.ts:61 `polar` | `angle` → `-angle` (dial runs counter-clockwise) | SURVIVED | SHOULD |
| H06 | wheelModel.ts:167 | ring 1 وارد href → `direction=OUT` | SURVIVED | SHOULD |
| H07 | wheelModel.ts:189–190 | swap the علينا and رواتب **amounts** | SURVIVED | **BLOCKER** |
| H08 | wheelModel.ts:208 | `empty` drops the "every ring zero" clause | SURVIVED | SHOULD |
| H09 | wheelFocus.ts:58 | whole riyals `Math.round` → `Math.trunc` | SURVIVED | NOTE |
| H10 | components/WheelCard.tsx:143 | `router.push` removed (the second tap never navigates) | SURVIVED | SHOULD |
| H11 | WheelCard.tsx:188 | `key={replay}` → `key={0}` («إعادة العرض» no longer remounts) | SURVIVED | SHOULD |
| H12 | WheelCard.tsx:199 | `openHint` never appended to the live line | SURVIVED | SHOULD |
| H13 | WheelCard.tsx:166 | Escape on a mark no longer dispatches | SURVIVED | SHOULD |
| H14 | components/WheelSvg.tsx:91 | IN dots red, OUT dots green | SURVIVED | SHOULD |
| H15 | WheelSvg.tsx:113 | overdue dots filled, not hollow | SURVIVED | SHOULD |
| H16 | WheelSvg.tsx:190 | «اليوم» marker at 180° | SURVIVED | SHOULD |
| H17 | WheelSvg.tsx:199 | ring layers ignore `layerOpacity` (no dimming drawn) | SURVIVED | SHOULD |
| H18 | components/WheelRows.tsx:93 | row 2 lists ring 1's values | SURVIVED | **BLOCKER** |
| H19 | WheelRows.tsx:100 | every row focuses ring 1 | SURVIVED | SHOULD |
| H20 | dashboard/overviewReads.ts:112 | dial read loses the `unpaid` clause | SURVIVED | **BLOCKER** |
| H21 | overviewReads.ts:110 | dial read loses `establishmentId` | KILLED | overviewReads.test › dial; scoping.test › v1.5 home populated + non-vacuous |
| H22 | overviewReads.ts:91 | `overdueWhere` loses the `unpaid` clause (feeds both overdue reads) | SURVIVED | **BLOCKER** |
| H23 | overviewReads.ts:57 | `DIAL_SELECT` drops `employeeId` | SURVIVED | SHOULD |
| H24 | components/HomeDetails.tsx:140 | toggle remembers the inverse | SURVIVED | SHOULD |
| H25 | components/homeDetailsState.ts:208 | `WIDE_QUERY` 48rem → 40rem (no longer the CSS's breakpoint) | SURVIVED | SHOULD |
| H26 | HomeDetails.tsx:147 | `aria-expanded={false}` always | SURVIVED | SHOULD |
| H27 | (owner)/owner/page.tsx:93 | الأنشطة الجارية moved out of «التفاصيل والرسوم» | SURVIVED | SHOULD |
| H28 | i18n/ar.v15.ts:19 | `wheel.title` → «نظرة عامة» | SURVIVED | SHOULD |
| H29 | wheel.ts:194 | `recent.slice(0, count)` → `recent` | SURVIVED | NOTE (equivalent: the read takes 2) |
| H30 | dashboard/attention.ts:185 | overdue totals leave salaries out | KILLED | attention.test › "all four, in D8 order" |
| N01 | ar.v15.ts:181 | `addHints.paySalary` → «صرف الرواتب» | SURVIVED | SHOULD |
| N02 | ar.v15.ts:197 | `salaryPick.banner` → «اختر موظفًا» | SURVIVED | SHOULD |
| N03 | transactions/(list)/ReportsTab.tsx:127 | invalid `partyId` → the **unfiltered** report (C16) | SURVIVED | SHOULD |
| N04 | ReportsTab.tsx:154 | Excel link drops `&partyId=` | SURVIVED | SHOULD (high) |
| N05 | employees/components/SalaryPickList.tsx:235 | payable row shows 0 instead of the remaining salary | SURVIVED | **BLOCKER** |
| N06 | components/chrome/nav.ts:45 | `also` `/owner/reports` → `/owner/report` | KILLED | nav.test › B2/D14 old report paths; six groups |
| N07 | ReportsTab.tsx:135 | sub-tab strip always marks «حسب التصنيف» | KILLED | reportsTab.test › report=aging |
| N08 | SalaryPickList.tsx:209 | banner's way back → `/owner` | KILLED | SalaryPickList.test › ?pick=salary banner |
| N09 | employees/salaryPick.ts:156 | payable = "nothing paid yet" | KILLED | SalaryPickList.test › payable rule |
| N10 | salaryPick.ts:146 | order by id, not name | KILLED | SalaryPickList.test › listSalaryPick one read |
| T01 | components/chrome/ThemeToggleButton.tsx:188 | click re-applies the current mode (no cycle) | SURVIVED | SHOULD |
| T02 | ThemeToggleButton.tsx:172 | `secure: false` always (no `Secure` on https) | SURVIVED | SHOULD |
| T03 | app/globals.css:215 | system dark block loses `screen` | KILLED | themeCss/themeContrast/tokenLint fail to load (parser `only()` guard) |
| T04 | globals.css:208,287 | dark `--color-red-900` = card surface (aging bar over-90 invisible) | SURVIVED | NOTE |
| T05 | globals.css:666 | `wheel-draw` from-offset 1 → 0 (no draw-in) | SURVIVED | NOTE |
| T06 | components/Badge.tsx:10 | `shadow-[0_0_0_1px_#ffffff]` | SURVIVED | SHOULD (lint hole) |
| T07 | Badge.tsx:10 | `fill-[white]` | SURVIVED | SHOULD (lint hole) |
| T08 | Badge.tsx:10 | `text-black` | SURVIVED | SHOULD (lint hole) |
| T09 | Badge.tsx:10 | `bg-[color-mix(in_srgb,white_20%,transparent)]` | SURVIVED | NOTE |
| T10 | Badge.tsx:10 | `drop-shadow-sky-100` (a palette colour with no dark value) | SURVIVED | SHOULD (lint hole) |
| T11 | app/layout.tsx:52 | dark `themeColor` → `#000000` | SURVIVED | NOTE |
| T12 | globals.css:767 (`@media print`) | `.home-details-body { display: none }` added after `.no-print` | SURVIVED | SHOULD |
| T13 | lib/theme.ts:16 | `THEME_STORAGE_KEY` `ui:theme` → `theme` | SURVIVED | SHOULD |
| S01 | wheel.ts:127 | (sanity) `dayAngle` → `360·d/30` | KILLED | wheel.test › D18 |

## Findings with proposed tests

### BLOCKER (a money figure is shown wrong and no test fails)
- **H07, ring 3 model mapping.** The D22/D39 identity is pinned on `getOwnerOverview`, but nothing pins which commitment amount reaches which segment. Swapping علينا ↔ رواتب keeps every total (25,700) and every href.
  - *Test:* in `wheelFocus.test.ts`, assert `model.rings[2].segments.map(s => [s.id, s.amountHalalas])` equals `[["r3:toUs",950000],["r3:fromUs",420000],["r3:salaries",1200000]]`. Do the same for ring 1 (`[["r1:IN",820000],["r1:OUT",510000]]`).
- **H18, explanation rows.** These rows are the screen-reader and print equivalent. Row 2 can list ring 1's values unnoticed: the only value check is `toContain("12,000.00")`.
  - *Test:* in `wheelUi.test.ts`, slice the rendered rows per `rowNTitle` and assert each row's amounts. Row 1: 8,200.00 and 5,100.00. Row 2: 3,000.00 and the «أخرى» 2,100.00. Row 3: 9,500.00, 4,200.00 and 12,000.00.
- **H20 / H22, overview reads lose "unpaid".** Two of the five overview reads can drop `paidHalalas < amountDueHalalas`: the dial read, and `overdueWhere` (both overdue reads). The tests use `toMatchObject` without `paidHalalas`, and the scoping zone checks only `plan.state`/`kind`. Fully paid dues would then be drawn on the dial, counted in the overdue cluster and its count, and could fire «الرواتب بعد N يومًا» for a salary already paid.
  - *Test:* in `overviewReads.test.ts`, assert `where.paidHalalas` equals `{ lt: { fieldRef: "instalment.amountDueHalalas" } }` on every instalment read. Better, add a loop in the scoping zone: every `instalment.*` call except `groupBy` carries it.
- **N05, the salary pick list amount.** The payable row's `MoneyText` is never asserted. The test only checks the link and the «صرف راتب» word.
  - *Test:* in `SalaryPickList.test.ts` › "rows link by the rule", assert `links[0][1]` contains `formatSAR(500000)`.

### SHOULD (a spec rule is unpinned)
**Wheel geometry**
- H01: D3/D18 "coloured by the day's largest kind". Add a case where two small OUT dues lose to one larger SALARY due: `[OUT 300, OUT 300, SALARY 700]` gives `kind: "SALARY"`.
- H03: D38 cluster angle. Assert `three[0].angle === -16`.
- H04: assert `arcPath(88, 3, 220)` contains `" 0 1 1 "` (large-arc 1), and that a < 180° arc has `" 0 0 1 "`.
- H05: clockwise. Assert `polar(180, 90)` ≈ `[380, 200]`, and that `model.dots` for day 4 has `cx > 200`.
- H16: assert the «اليوم» circle sits at `cx="200" cy="20"`.

**Wheel model and focus**
- H06 (D4): assert every ring-1 href, not only صادر: `rings[0].segments[0].href` contains `direction=IN`.
- H08 (D28): add `hasEntry: false` with a non-zero ring and no dots → `empty === false`.
- H10–H13 have no interaction test. With no DOM, export the handler factory from WheelCard or test it with `react-dom/test-utils` + `jsdom` per file. Cases:
  - a second `onActivate` of the same id calls the mocked `router.push` with the href;
  - the replay button changes the SVG `key`;
  - the live line ends with `t.wheel.openHint` after a mark activation;
  - Escape clears the focus.
- H14 / H15 (A1 colours): assert, per dot kind, the `fill:var(--color-accent)` / `--color-money-out` / `--color-gold` style. An overdue dot has `fill-white` and `stroke:` on the circle.
- H17 (D16/D19 render): render `WheelSvg` with a ring-2 focus and assert `opacity:0.18` on layers 1, 3 and 4 and `opacity:1` on layer 2.
- H19: the row `onClick` passes its own layer (same interaction harness as H10–H13).

**Reads**
- H23: the tests' db mocks ignore `select`, so a dropped field is invisible. Pin `DIAL_SELECT` with `expect(findMany.args.select).toEqual({...})`, or make the mock project rows through `select`.

**«التفاصيل والرسوم»**
- H24 / H26 (A3): unit-test the toggle with `rememberHomeDetailsOpen` stubbed. Extract `toggle(open) → {store, next}` or use jsdom. Assert `aria-expanded` follows `open` after mount.
- H25: assert `WIDE_QUERY === "(min-width: 48rem)"`. The D20 CSS test already pins 48rem.
- H27 (A3): the ownerHome fixture returns `topActiveProjects: []`, so الأنشطة الجارية renders nothing and its position is untested. Give it one project and add its heading to the order list, after `homeDetails.title`.
- T12 (A3 print open): `homeDetails.test.ts`'s `not.toMatch(/@media print[^}]*home-details/)` is vacuous for any rule after the first `}` in the print block. Parse the print block with `blocks()` (themeCssParse) and assert that no selector names `home-details`.

**Copy**
- H28, N01, N02: no v1.5 wording test. The tests compare `t.addHints.*` to themselves, so the B3 captions, the banner and the A1/A2/A3 titles can change freely.
  - *Test:* add `src/i18n/v15Wording.test.ts` like `v14Part3Wording.test.ts`, pinning the spec's literal strings. That covers B3's seven captions and two staff captions, «اختر الموظف لصرف راتبه», «نظرة شاملة على المنشأة», «يحتاج انتباهك», «التفاصيل والرسوم», «لا توجد بيانات بعد», «إظهار الكل», «إعادة العرض», «عرض الكل» and «الرواتب اليوم».

**Reports tab**
- N03 (C16, moved into ReportsTab in v1.5, never pinned anywhere): call `loadReportsTab("est_1", { partyId: "not-a-cuid" })`. Expect `report === null`, no `getReport` read, and `t.reportFilter.invalidParty` rendered.
- N04 (B2 "Excel unchanged"): render with a valid `partyId` and assert the export href contains `&partyId=`.

**Theme**
- T01 (C2 cycle) / T02 (D32 Secure): `browserEnv()` and the click handler are untested. Export `browserEnv(location)` (or inject it) and assert `secure` for `https:`. Assert a click on "light" writes `theme=dark`, using the jsdom harness or by exporting the onClick as `cycleTheme(current, env)`.
- T13 (D31): `theme.test.ts` compares the storage key with `THEME_STORAGE_KEY` itself (self-reference). Add `expect(THEME_STORAGE_KEY).toBe("ui:theme")`.

**Token lint holes (C4, D32)**
- T06: the HEX lookbehind ``["'`:[(=,{\s]`` misses `_`, the space separator inside Tailwind arbitrary values, so `shadow-[0_0_0_1px_#fff]` passes. Add `_` to the lookbehind plus a fixture case.
- T07: named colours are only caught as prop values. Flag `-\[(?:white|black|…)\]` in class strings and add a fixture case.
- T08: `text-black` (and `bg-black` outside the backdrop) passes. Allow-list the backdrop and flag the rest.
- T10: `PALETTE_CLASS` misses compound utilities: `drop-shadow-*`, `text-shadow-*`, `inset-ring-*`, `inset-shadow-*`. Add them to `UTIL`, with a guard case in `paletteVars`.

### NOTE
- H02 (tie order), H09 (`round` vs `trunc`): pin with one `.5` case each if the rule matters.
- H29: equivalent mutant.
- T04, T05, T11: decoration, animation and browser-bar colour are left to visual QA. Optional pins: dark `--color-red-900` ≠ `--color-white`; the `wheel-draw` `from` offset is 1; the layout's dark `themeColor` equals the dark `--color-topbar`.
- T09: `color-mix()` passes the lint. Add `color-mix` to the TS `FN` list.
- Vacuous or self-referential:
  - `wheel.test.ts:133`: `real.length ≤ 40` cannot fail with day merging. The builder acknowledges it; the small-max case carries the rule.
  - `theme.test.ts:45`: compares the key with itself (T13).
  - `nav.test.ts` caption cases compare keys with keys (N01).
- Mocks that hide shape bugs: `overviewReads.test.ts`, `SalaryPickList.test.ts` and the scoping harness return fixture rows whatever `select` asks for (H23).
- Source-text pins that a harmless refactor breaks:
  - `ownerHome.test.ts:180–192`: regexes on the variable names `establishmentId`/`today`/`userId`. The D21 counts are already pinned behaviourally by `recentCounts.test.ts`.
  - `theme.test.ts:103–104`: the exact layout line `const theme = parseTheme((await cookies())…)`.
  - `homeDetails.test.ts:86–89`: the D20 CSS verbatim, so a formatter changing `width < 48rem` → `max-width` fails it.
  - `wheelFocus.test.ts:200`: only matches `import "server-only";` with double quotes, so a single-quoted import evades the client-safety pin.
- **Pre-existing flake, not v1.5.** `scoping.test.ts` › "v1.2b CP2 … checkIn creates…" failed with `err.timeOrder` when run at ≈21:00 UTC (00:00 Asia/Riyadh). It then cascades into "static sweep … every (model, method) pair" (`attendanceRecord.create` unobserved). It passed again minutes later. The check-in case reads the wall clock, so pin its clock (`vi.setSystemTime`).

## Incident
- At about 21:00 UTC I ran `pkill -f vitest` to stop my own runner. That matches every vitest process on the machine, so it may have killed another agent's test run at that moment. Re-run anything that died unexplained then.
