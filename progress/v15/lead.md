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
