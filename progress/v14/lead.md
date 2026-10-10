# progress/v14/lead.md — v1.4 recording for `lead`

## My items (docs/V14-SPEC.md, user's brief 2026-10-10)
1. Step 0 alone: `docs/V14-SPEC.md`, `progress/v14/*.md`, `src/i18n/ar.v14.ts` (+ spread in `ar.ts`), schema + migration SQL (not applied), `PROGRESS.md › Current phase` row → **CP-A**, wait for "apply"
2. After "apply": Neon migrated, `npx prisma generate` passes → brief `cats`, `add`, `plans`, `reviewer` (reviewer reads all three briefs before code)
3. Answer questions; add keys on request; never implement agents' tasks
4. CP-B: gates (build, test, bundles), one commit `v1.4: simpler owner flows`, merge `progress/v14/*.md` into `PROGRESS.md` (anchored edits), Decisions, click-list for the user
5. CP-C after OK: `qa-visual` + `qa-tests`, one commit `v1.4: release prep`, README if nav wording changed, session log

Your own running notes. Only you write here. Keep entries short; newest at the bottom.

## Files I own
`docs/*`, `PROGRESS.md`, `progress/v14/lead.md`, `prisma/**`, `src/i18n/ar.v14.ts` keys (+ the spread lines in `src/i18n/ar.ts`), `package.json`.

## Tasks completed
| Task | Files touched | Build/tests pass | Notes for others |
|---|---|---|---|
| Pre-flight: tree was not clean (v1.3 release-prep files uncommitted) → committed as `1459a39 v1.3: release prep` on the user's instruction after build + 1218 tests passed | `.gitignore`, `CLAUDE.md`, `docs/FRONTEND.md`, `globals.css`, `ar.v13.ts`, `CHANGELOG.md`, `progress/v13/qa-*.md` | ✓ | HEAD for v1.4 is `1459a39` (one after the `b713ebe` the user named) |
| Strings: `ar.v14.ts` (categoryQuick, categoriesPage, addSheet, ledgerTabs, openPlan, errV14) spread into `t`, `errV14` into `t.err` | `src/i18n/ar.v14.ts`, `src/i18n/ar.ts` | typecheck pending | Agents: reuse `t.common.*`, `t.transaction.*`, `t.plans.recordPayment` — do not add duplicates |
| Schema (expand-only): `PlanKind.OPEN_ENDED`, `Plan.totalHalalas Int?`, `Plan.expectedEndDate Date?`, `Plan.transactions[]`, `Transaction.planId` + Restrict relation + index | `prisma/schema.prisma` | `prisma validate` ✓ | Migration SQL generated with `migrate diff` (see Gotchas) |
| Migration `20261010000000_v14_open_plans` (5 statements, reviewed by hand) — **not applied to Neon** | `prisma/migrations/…/migration.sql` | PGlite migration tests 4 files / 65 ✓ (drift check includes it); full suite 1218 ✓ | PG ≥ 12 allows `ALTER TYPE … ADD VALUE` inside a transaction as long as the value is not used in it — this script never uses it; PGlite applied the whole script in one `exec` |
| `planTitleOf` accepts `OPEN_ENDED` (contract widening; still derives a title only for SALARY) | `src/lib/payroll.ts` | typecheck: 13 → 8 errors | The remaining 8 are `plans`' decisions (D6): `plans/dues.ts` ×3, `plans/queries.ts` ×2, `parties/statement.ts` ×2, `transactions/payments.ts` ×1 |
| `docs/V14-SPEC.md` (spec verbatim + Decisions D1–D7), `progress/v14/*.md`, PROGRESS › Current phase row (anchored, diff-checked +2/−0) | `docs/V14-SPEC.md`, `progress/v14/*`, `PROGRESS.md` | — | |

| CP-A rulings folded in: D3 reversed (QuickActions unchanged), `plans` owns `parties/statement.ts` + the one `payments.ts` line, V14 row in CLAUDE.md | `docs/V14-SPEC.md`, `CLAUDE.md`, `progress/v14/plans.md` | — | |

| Step 0 committed `8920553 v1.4: contract`; **migration applied to Neon** (`migrate deploy` → `20261010000000_v14_open_plans` applied; `migrate status` → 6 migrations, up to date); `prisma generate` ✓ | — | — | Local app and Neon are consistent again |
| Spawn prep: `PLAN_REOPEN` audit action; `ar.ts` project-meaning values («ضمن نشاط», «ملخص النشاط»); `.v14-wiggle` / `.v14-fade-out` in `globals.css`; v1.4 bundle baseline from the v1.3 build (55 routes); Decisions D8–D10 (open plans: start = today; edit-path link fixed; outside party balance); briefs `progress/v14/brief-{common,cats,add,plans}.md` | `src/lib/audit.ts`, `src/i18n/ar.ts`, `src/app/globals.css`, `progress/v14/bundle-baseline.json`, `docs/V14-SPEC.md`, briefs | typecheck still the 8 P0 errors | Uncommitted; goes into the CP-B commit |
| Team spawned: `reviewer` (pre-code brief review), `cats` / `add` / `plans` (Phase 1 orientation, no code) | — | — | Builders are resumed with "go" after the reviewer's findings are folded in |

| User's rulings on D8–D10 folded in: D8 amended (open-plan form has «تاريخ البداية», default/max today; payment date ≥ start → new key `err.paymentBeforeStart`); D9 accepted; D10 accepted + statement line `t.openPlan.statementRemaining` (owned by `plans`, incl. `PartyStatementView.tsx`) | `docs/V14-SPEC.md` (C2, D8, D10, Team), `src/i18n/ar.v14.ts` (2 keys), `progress/v14/brief-plans.md` | — | `plans` will see the amended brief when resumed with "go" |

| Handover (user closing the machine): reviewer's pre-code findings (5 B / 22 S / 19 N) ruled as D14–D15 and folded into `brief-{cats,add,plans}.md` ("Ready for go: YES"); builders' questions ruled (D11–D13); `.v14-fade-out` comment fixed (K5), `t.openPlan.progressLabelOut` added (P12); PROGRESS Current phase + Waiting on user rewritten; agents told to finalise recordings and exit | briefs, `docs/V14-SPEC.md`, `globals.css`, `ar.v14.ts`, `PROGRESS.md` | build/test at handover: see session log | No code written by any builder |

| Follow-up after the handover commit: `plans`' late Q4/Q5/Q12/Q13 ruled in `brief-plans.md`; key `t.openPlan.expectedEndShort` added | `brief-plans.md`, `ar.v14.ts` | — | Second commit, no amend |

## In progress
- Task: handed over — build phase not started
- Where I am: everything the next lead needs is in `PROGRESS.md › Current phase`, `docs/V14-SPEC.md` D1–D15, `progress/v14/brief-*.md`, `progress/v14/{cats,add,plans,reviewer}.md`
- Next action (next session): spawn the four agents from the briefs, give "go"; `plans` P0 first
- Where I am: nothing applied to Neon; nothing committed since `1459a39`
- Next action: on "apply" → `npx prisma migrate deploy` (DIRECT_URL per prisma.config.ts), `npx prisma migrate status`, `npx prisma generate`; then brief `reviewer` first with all three briefs, then `cats`, `add`, `plans`

## Gotchas I found
- **`npm run build` can crash in the PostCSS worker on this machine** (`Node.js subprocess crashed while evaluating loaders [postcss]`, exit `0xc0000005`) twice in a row with no code cause; touching a file (stash/pop) and rebuilding passed. Same family as the `exit 139` note in PROGRESS › Known issues. Retry before hunting a CSS error.
- **`migrate dev --create-only` was not used** (the brief named it): it connects to the dev database (Neon, shared with live) and needs a shadow database, and on drift offers a reset. Generated with `npx prisma migrate diff --from-schema <HEAD schema via temp file> --to-schema prisma/schema.prisma --script` instead, as every migration since v1.1e (PROGRESS Gotcha). The drift test (`migration.v12a.test.ts`) picks up every directory under `prisma/migrations`, so the new one is checked without registering it.

## Questions / requests sent to lead
- (n/a — I am the lead; questions for the user are in the CP-A report)
