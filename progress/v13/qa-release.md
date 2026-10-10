# progress/v13/qa-release.md — v1.3 recording for `qa-release`

## My five items (docs/V13-SPEC.md, Step 4)
1. Verify `PROGRESS.md` and `docs/*` describe v1.3 as built (V13-SPEC, FRONTEND.md motion/print/components)
2. Verify a CHANGELOG entry for v1.3 exists and is accurate (report if the repo has no CHANGELOG)
3. Check for leftover TODOs, `console.log`, debug code and unused v1.3 keys in the v1.3 diff
4. Confirm `render.yaml`, `prisma/**`, `package.json`, `.env.example` are untouched by v1.3
5. Write the push checklist (commits, gates, migrations none, env vars none, post-deploy checks)

Only I write here. Read-only everywhere else; no build run (qa-tests runs it).
Range reviewed: `5646e93..b713ebe` (5 commits, 106 files, +4633 / −201) plus the untracked `CHANGELOG.md`.

## Results
| # | Task | Result |
|---|---|---|
| 1 | Docs match v1.3 | **FAIL** (stale statements, no blocker for the code) |
| 2 | CHANGELOG accuracy | **PASS with notes** (nothing claimed that isn't built; a few omissions and one overstatement) |
| 3 | Leftovers | **PASS with notes** (3 unused keys, 1 RISK on untracked PNGs) |
| 4 | Untouched files / env | **PASS** |
| 5 | Push checklist | written below |

## 1. Docs — stale statements
- **DEFECT** `CLAUDE.md:32` precedence sentence names only the V12-SPEC exception. Fix: "…except that `docs/V12-SPEC.md` (v1.2) and `docs/V13-SPEC.md` (v1.3), the product owner's, outrank every other doc and brief, as their rows above say."
- **DEFECT** `CLAUDE.md:64` Stack: "recharts (one chart)". v1.3 adds a second recharts chart (the expense donut, `ExpenseDonut.tsx`) on the dashboard. Fix: "recharts (dashboard only: six-month bars + expense donut)".
- **DEFECT** `docs/FRONTEND.md` has no v1.3 section. Several lines now misdescribe the screens:
  - `:14` "no decorative animation — the only motion is what *Motion (v1.1d)* describes, all of it feedback for an action the user took" — count-ups, sparkline draws, meter fills, the ticking clock are not user feedback. Add "…and, since v1.3, the motion `docs/V13-SPEC.md` lists (it outranks this line)".
  - `:88` "No … animations (beyond *Motion (v1.1d)*)" — same fix.
  - `:100` Motion intro "only in answer to something the user did" — same pointer.
  - `:15` "the served HTML contains … zero `<svg>` elements" — still true of recharts, but v1.3 pages now serve hand-written SVG (sparklines, rings, bars, illustrations). Scope it to recharts.
  - `:16` Layout: no mention of the `.app-bg` art behind the content column (hidden in print).
  - `:22` Shared components list lacks `CountUp`, `Sparkline`, `illustrations/*`, `useReducedMotion`, `visualPalette`; `EmptyState` gained `kind`.
  - `:41` `/owner` dashboard: still "Bar chart last 6 months" and "أعلى المصروفات (top 5 … with amounts and %)" as a table — now count-up + sparklines + momentum, donut (table sr-only/print), and a «التدفق النقدي» tab.
  - `:62` `/staff` dashboard: count-up not mentioned (minor).
  - `:119` / Auth section `:35`: no mention of the auth background, wordmark and footer link now inside the card.
  - `:162`, `:164` projects list/detail: meter tones and amounts, category ring on detail.
  - `:168` `/owner/plans`: `t.plans.progress` is now the sr-only text behind the segmented `InstalmentBar`; plan detail (`:170`) gets the bar + legend + `?paid=` highlight.
  - `:173` statement: header with balance words + sparkline not described.
  - `:195` (v1.2b) and `:198` (v1.2c): no mention of the tinted grid / heat strip / live clock / payslip hero / aging tiles and bars.
  - Print rules for v1.3 (`.print-plain`, `.sr-only-screen`, backgrounds white in print) are not in the doc.
  Suggested fix: one short `## v1.3 — visual pass` section after v1.2c: "Binding spec `docs/V13-SPEC.md` (outranks this doc's animation rules). Components …; print hooks `.print-plain`, `.sr-only-screen`, `.no-print`; backgrounds white in print; all motion in the `.v13-*` block of `globals.css`, ≤ 800 ms, reduced-motion off" — plus the one-word pointers at `:14`, `:88`, `:100`. (`:167` was already updated for the budget meter — good.)
- **DEFECT** `PROGRESS.md:22`, `:25`, `:296` say v1.2 is "nothing pushed … awaiting push", but `origin/main` is `5646e93` (`git status -sb` → `ahead 5`): v1.2 is pushed. Update the phase block and *Waiting on user* (and check whether `CRON_SECRET` / the settings edit are still open).
- **NOTE** `PROGRESS.md:20` v1.3 phase still reads "awaiting the user's approval … Next: run qa-*" — update when QA closes; the "≈ −13 KB, to be explained by `qa-tests`" needs qa-tests' answer merged.
- **NOTE** `PROGRESS.md` *Session log* has no v1.3 entry (last entry is v1.2a CP2, `:532`); *File map* `:413` is pre-v1.2 (no `progress/v13/`, `CHANGELOG.md`, `ar.v1x.ts`). Add a v1.3 session entry at least.
- **NOTE** `README.md` needs no v1.3 change for deploy (no env/migration), but could point to `CHANGELOG.md` for release notes.

## 2. CHANGELOG (`CHANGELOG.md`, untracked)
Every *Added* / *Changed* line was checked against the code; all are built as described (count-up on `/owner` and `/staff` cards; sparklines line/bars as stated in `OwnerStatCards.tsx`; donut links `direction=OUT&categoryId&from&to`; ribbon = overdue tile + every day today → `weekEnd` (`ribbon.ts:47`); bar statuses 1:1; budget tones; six illustrations; grid tints + `.print-plain`; clock ring amber < 5 min / red after grace; payslip hero; statement «لنا عنده/علينا له/متسوٍّ»; aging tiles + bars; animations 300–800 ms, recharts `animationEasing="ease-out"` 600 ms, `isAnimationActive={!reduced}`; proxy `.svg`).
- **NOTE** `CHANGELOG.md:6` "no rule, number or data path changed" overstates slightly: queries gained read-only fields (`daily30`, `prevMonthToDateNetHalalas`, per-month opening balances, `instalmentStatuses`, `AgingSide.counts`, `getAttendanceYear`, `MySelf.nowMs`/`graceMinutes`). Suggest "…no rule or number changed; queries only gained read-only fields."
- **NOTE** Built but not listed: momentum capped at ±999% («أو أكثر») and «—» when there's nothing to compare; donut **legend rows** also link; payments from the transaction form now return to the plan with `?paid=` (`transactions/new/page.tsx:47`) and the param is cleared with `history.replaceState`; ribbon/plan bar/aging bars/statement header hidden in print; loading skeletons reshaped (auth card, sparkline height); the project ring is hand-written SVG (not recharts).
- **NOTE** `CHANGELOG.md:21` "The proxy no longer redirects `.svg` requests" — precise wording: ".svg requests skip the proxy, like .png (no auth redirect, no CSP header on the file)".
- **NOTE** «agreements» illustration is `kind="reminders"` in code (PROGRESS ruling 4); the CHANGELOG wording is the user-facing one — fine.

## 3. Leftovers in the v1.3 diff
- TODO/FIXME/XXX, `console.*`, `debugger`: **none** in `src/` or `public/`.
- Commented-out code: **none** found.
- Stray files: `progress/v13/measure-bundles.mjs` + `bundle-baseline.json` are committed QA tooling, not deployed — justified.
- **Unused `t.*` keys in `src/i18n/ar.v13.ts`** (all other keys, nested plural forms included, are referenced; `statementHeader.owesUs/weOwe` are used via `t.statementHeader[kind]`):
  - `payslipHero.stepsText` (`ar.v13.ts:117`) — **confirmed unused.** `PayslipHero.tsx` renders each step as a visible label + `MoneyText`, so the text equivalent exists without it. Fix: delete the key.
  - `agingVisual.barLabel` (`ar.v13.ts:139`) — **confirmed unused.** The stacked bar is `aria-hidden` (`AgingTable.tsx:65`); the row's numbers are its text equivalent. Fix: delete the key.
  - `dashVisual.share` (`ar.v13.ts:33`) — **also unused** (not in the report you received). The sr-only table header uses `t.dashboard.percentOfMonthOut` (`TopOutCategories.tsx:48`). Fix: delete the key.
- **NOTE** exported but unreferenced outside their file: `MOMENTUM_CAP` (`dashboard/visuals.ts`), `MAX_GAPPED_SEGMENTS` (`plans/components/instalmentSegments.ts`), `RING_TOP` (`projects/components/budgetVisual.ts`) and types `GraceLeft`, `DonutEntry`, `Waterfall`, `WaterfallBar`, `RibbonRow`, `BalanceKind`, `BarInstalment`, `SegmentState`, `RingSlice`. Harmless; drop `export` or leave.
- **NOTE** files over ~250 lines touched by v1.3: `src/features/plans/queries.ts` 266 → 271 (already over); `src/app/globals.css` 382 → 543 (CSS; acceptable); `scoping.test.ts`, `ar.ts`, `ar.v12a.ts` pre-existing. No new file over 250 (largest new: `visuals.ts` 187).
- **NOTE** `src/app/globals.css:40-44` — the new v1.3 tint-token comment and tokens were inserted between the "Squared corners" comment and the `--radius-*` lines it describes; move the block above that comment.
- **RISK** `public/brand/zakham-bg-v3/preview-app.png` (272 KB) and `preview-auth.png` (319 KB) are untracked but **not ignored** (`git check-ignore` → nothing). A `git add -A`/`git add .` before the push would commit them into `public/` and publish them. Fix: move them out of `public/` (e.g. to `progress/v13/` or outside the repo), or add `public/brand/zakham-bg-v3/preview-*.png` to `.gitignore` (lead's file). Stage files by name when committing the CHANGELOG.

## 4. Untouched since 5646e93
`git diff --stat 5646e93..HEAD -- render.yaml prisma package.json package-lock.json .env.example next.config.mjs .claude/settings.json prisma.config.ts src/lib src/instrumentation.ts src/app/api` → **empty**. No working-tree changes to tracked files. No added `process.env` read anywhere in the v1.3 diff. Migrations folder still 5 (`…_init` → `20261003000000_v1_2c_reminders`). Only runtime-config change: `src/proxy.ts:183` matcher skips `.*\.svg$` (known, justified; `next.config.mjs` `headers()` still applies nosniff/HSTS/X-Frame to the SVGs; the two SVGs contain no script, only internal `<use href="#…">`). **PASS.**

## 5. Push checklist
**Commits to push, in order** (all on `main`, `origin/main` = `5646e93`):
1. `b50c7a2` v1.3: page backgrounds
2. `62d6949` docs: v1.3 spec
3. `609ed41` v1.3: dues, plans, projects and empty states
4. `9543a74` v1.3: dashboard visuals
5. `b713ebe` v1.3: employees, parties, reports visuals
6. any lead fix commits from this QA round
7. a docs commit: `CHANGELOG.md`, `progress/v13/qa-*.md`, PROGRESS/CLAUDE/FRONTEND fixes — `git add` by name, **not** `-A` (preview PNGs).
Then `git push origin main` (fast-forward; `git status -sb` should show `ahead N`, never `behind`).

**Gates to re-run on the final tree** (expected counts: from `qa-tests` when it lands — placeholder values from PROGRESS.md:20):
- `npm run typecheck` → 0 errors
- `npx vitest run` → **67 files / 1218 tests passed** (placeholder; qa-tests to confirm; more if fixes add tests)
- `npm run build` → compiled, no errors
- `node progress/v13/measure-bundles.mjs` vs `progress/v13/bundle-baseline.json` → no route > +60 KB gz (recorded max +2.1 KB on `/owner`)

**Migrations:** none. Verified: no diff under `prisma/`; `npx prisma migrate status` should still read 5 migrations, up to date. Render's `npx prisma migrate deploy` step will report "No pending migrations to apply".

**Env changes:** none. No new `process.env` read; `render.yaml` and `.env.example` unchanged. Nothing to add in the Render dashboard.

**Render:** push to `main` → auto-deploy of service `ledger` (`npm ci --include=dev && npx prisma migrate deploy && npm run build`, health check `/api/health`). Watch the Events/Logs tab until "Deploy live".

**Post-deploy smoke checks** (`https://ledger-8c5g.onrender.com`):
1. `GET /api/health` → 200 `{"ok":true,"keepAlive":{…}}`; after ~4–5 min `keepAlive.lastStatus` = `health=200` (plus `reminders=200` if `CRON_SECRET` is set); Logs show `[keepalive]` lines.
2. Signed out: `curl -sI https://…/brand/zakham-bg-v3/auth-bg.svg` and `…/app-bg.svg` → **200 `image/svg+xml`**, not 307 to `/login`. Same for an existing `.png` (regression).
3. `/login`, `/signup`, `/forgot`, `/pending`: background art visible, white card overlapping the green band, wordmark and footer link inside the card, no CSP errors in the console. iPhone Safari: art scrolls (not fixed), no jank.
4. Owner `/owner`: stat cards count up once, sparklines on all four cards, momentum line on الصافي, donut with centre total; click a slice → السجل filtered (OUT, category, this month); «التدفق النقدي» tab switches without navigating; «الإضافات الجارية» shows the meter.
5. `/owner/dues`: ribbon (متأخرة + days to week end); tap a day → scrolls and highlights its rows.
6. `/owner/plans` + a plan: segmented bar on cards and header, focus/hover shows the popover; «تسجيل دفعة» → saved → back on the plan with the row highlighted and `?paid=` gone from the URL.
7. `/owner/projects` + a project: meter colour/amounts, category ring with legend.
8. A fresh/empty establishment: illustrations on ledger, parties, dues, projects, employees, agreements empty states.
9. `/owner/staff/[id]`: tinted month grid with letters, 12-month strip with % in each cell; payslip hero.
10. Linked staff `/staff/me`: live clock ticks, ring colour, check-in → check + server time. `/staff`: count-up.
11. Party statement header (words + sparkline); `/owner/reports/aging`: tiles + bars.
12. Print preview of a report, a statement, the attendance grid and a payslip: white page, no backgrounds, grid letters on white, tables as before.
13. OS "reduce motion" on: no count-up/draw/fill animations; clock still ticks.

**Rollback:** v1.3 has no schema, migration or env change, so rollback is code-only and safe: Render dashboard → `ledger` → Deploys → **Rollback** to the `5646e93` deploy (immediate), then `git revert --no-edit 5646e93..HEAD` (or a revert of the specific block commit) and push so `main` matches what runs — otherwise the next push redeploys v1.3. The Neon database needs nothing.
