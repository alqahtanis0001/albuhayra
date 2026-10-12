# progress/v15/lead.md — lead's record for v1.5

## Step 0 (2026-10-11)
- `main` = `3369686` (≥ required), tree clean; branch `claude/v15-wheel-nav-theme` created from it.
- `npm ci` + build (placeholder `DATABASE_URL`): exit 0. Gates: `tsc` 0 · vitest 118 files / 1613 tests.
- Bundle baseline `progress/v15/bundle-baseline.json`: 55 routes, max `/(owner)/owner` 323.7 KB gz.
- Wrote `docs/V15-SPEC.md` (A–C verbatim, team table, D1–D15), CLAUDE.md row/precedence/out-of-scope, `src/i18n/ar.v15.ts` (+ wiring in `ar.ts`), briefs `brief-{common,theme,home,nav}.md`, recordings.
- Watched the mock in Playwright (draw order 1→2→3→dial, rows light in step, tap dims others to 0.18, centre shows the focused name/amount).

## Checkpoints
| CP | Commit | Gates | Notes |
|---|---|---|---|
| CP-A | `22259e7` v1.5: contract (pushed) | tsc 0 · 118/1613 · build 0 | spec, keys, briefs, baseline |

## Pre-code review (reviewer)
5 BLOCKER / 24 SHOULD / 14 NOTE (`progress/v15/reviewer.md`). Every finding ruled → D18–D35 in `docs/V15-SPEC.md` and an "Amendments" block in each brief. Lead edits made for them: stub `overviewReads.ts` / `salaryPick.ts` + gate `FILES`/S8 entries + two append zones in `scoping.test.ts`; `staffViews.test.ts` OWNER_READS +3 names; `ar.v15.ts` keys (centreSubCapped, arrows, plural cluster/clusterOverdue, salaryPick.empty; three duplicates retired); FRONTEND.md "Do not" and localStorage allow-list (six uses).
Rulings where the reviewer offered options: D22 ring 3 keeps salary arrears (رواتب = all unpaid salary ≤ month end; علينا = Σ owedByUs − salaries); D23 ring 3 keeps the user's `?type=` links (difference recorded); D34 week row excludes SALARY.

## Build
- Spawned `theme` (T1 first, stops for the token-layer commit), `home`, `nav` in parallel; home/nav do logic first and check `git log` for `v1.5: token layer` before visuals.
| token layer | `92e1f72` (pushed) | theme gates green | D36 |
| CP-F | v1.5: wheel, nav, theme | tsc 0 · 133/1909 · build 0 · max +5.1 KB gz | reviews all closed (nav R1–R2, home R1–R2, theme R1–R2); D37–D41 |

## Reviewer rounds (summary)
- nav R1: 0 B / 2 S (mutations for D37/icon; client import of a server-only module → `salaryPickRules.ts`) — closed R2.
- home R1: 1 B (D39) / 6 S (bidi isolate, ink on gold, label truncation, zero sides, row-4 count, queries.ts size + staff count pin) — closed R2.
- theme R1: 0 B / 1 S (lint bypass: named colours, palette classes without dark values) — closed R2.
- Lead: FRONTEND.md stale `/owner/reports` lines (R1-N3). Open for release prep: unused `ReportsSkeleton`/`AgingReportSkeleton` exports and their stale comments (`skeletons/screens.tsx:119`, `skeletons/v12c.tsx:38`); README nav block; CHANGELOG.

## QA
- `qa-visual`: 0 B / 3 S / 12 N → D42 (fixed by home/nav/theme; reviewer round 3 closed). Owner-test (g) pasted into `docs/OWNER-TEST-v14.md`: task 1 5→5, 6 2→4 (wheel path; visible open hint added after), 10 5→4, reports 5→5, dark —→4. 371 PNGs converted to JPEG (74 MB → ~17 MB) before commit.
- `qa-tests`: 53 unlisted mutations, 8 killed / 45 survived (6 BLOCKER test gaps) → D43, dispatched to home/nav/theme. Lead: `src/i18n/v15Wording.test.ts` (9 cases; mutation: `addHints.newParty` → «عميل أو مورد» → "B3: the seven owner rows" failed; restored byte-exact). Incident: qa-tests ran `pkill -f vitest` (~21:00 UTC), which explains nav's transient 18 failures.
| release prep | v1.5: release prep → merge into main | tsc 0 · 136/1976 · build 0 · max +5.5 KB gz | D42–D44; all reviews closed (rounds 1–4); smoke test on the release build |

## Follow-up (2026-10-12)
| CP | Commit | Gates | Notes |
|---|---|---|---|
| follow-up | v1.5: follow-up → merge into main | tsc 0 · 138/2025 · build 0 · max +6.2 KB gz | D45–D51; reviewer closed; qa-visual 0 B / 0 S; task 6 → 2 taps |
| category palette | v1.5: category palette → merge into main | tsc 0 · 139/2087 · build 0 · max +6.2 KB gz | D52; reviewer closed (S1 short-ring pairs fixed); qa-visual 0 B / 0 S |
