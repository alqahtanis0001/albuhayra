# PROGRESS.md — Project record (lead writes this; teammates write progress/<name>.md)

Single source of truth for project state across sessions. A new lead must be able to take over from this file alone.

## How to run
```
cp .env.example .env     # DATABASE_URL, SESSION_SECRET, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD
npm install              # then: npm approve-scripts --allow-scripts-pending  (prisma + esbuild need their install scripts)
npx prisma migrate deploy   # applies prisma/migrations/20260929000000_init (already applied to Neon)
npm run seed             # creates the ADMIN account (idempotent)
npm run dev              # http://localhost:3000
npm run build && npm test
npm run typecheck        # tsc --noEmit, not part of build
```
`DATABASE_URL` is read by `prisma.config.ts` (which loads `.env` via dotenv) for migrate/seed, and by `src/lib/db.ts` at runtime. `prisma generate` and `npm run build` work without it.

## Current phase
**Phase:** 0 — Scaffold and contract (lead alone)
**Status:** complete and database-verified — `npm run build` and `npm test` pass (59 tests, 5 files); migration + seed applied to the live Neon database
**Exactly where we stopped:** Phase 0 committed, then the migration verified on Neon and committed as `phase 0: migration verified on Neon`. Waiting for the user's approval before spawning teammates.
**Next concrete action:** on approval, spawn `backend`, `frontend`, `reviewer`; create one task per checklist item in `docs/BACKEND.md` and `docs/FRONTEND.md`, each naming the files it touches. First backend task: auth actions + the session/role routing inside `src/proxy.ts`. First frontend task: layout, nav, shared components.
**Teammates spawned:** none yet

## Done
| Phase | Task | Who | Date |
|---|---|---|---|
| 0 | Next.js 16 App Router scaffold, TypeScript, Tailwind v4, security headers | lead | 2026-09-29 |
| 0 | `prisma/schema.prisma` + initial migration `20260929000000_init` | lead | 2026-09-29 |
| 0 | `prisma/seed.ts` (idempotent ADMIN) | lead | 2026-09-29 |
| 0 | `src/lib/`: db, session, auth, permissions, rateLimit, joinCode, audit, money, dates, validation | lead | 2026-09-29 |
| 0 | `src/i18n/ar.ts` with every key the screens in `docs/FRONTEND.md` need | lead | 2026-09-29 |
| 0 | Nonce-based CSP in `src/proxy.ts`, verified against the served HTML | lead | 2026-09-29 |
| 0 | `render.yaml`, `.env.example`, `.gitignore`, `.claude/settings.json` | lead | 2026-09-29 |
| 0 | Tests: money, dates, validation, permissions, joinCode (59 tests) | lead | 2026-09-29 |
| 0 | Migration + seed verified on live Neon Postgres 18; render.yaml switched off Render Postgres | lead | 2026-09-29 |

## Decisions
Format: date — decision — reason. Anything that changed from the docs or chose between valid options.
- 2026-09-29 — No receipts/attachments in v1 — owner only needs to know where money goes; keeps DB small and app simple.
- 2026-09-29 — Multi-establishment data model (one Establishment per OWNER) even though the first deployment serves few owners — sign-up + admin approval implies several owners; retrofitting tenancy later is expensive.
- 2026-09-29 — ADMIN sees counts and statuses only, never amounts — data privacy for owners.
- 2026-09-29 — STAFF join via owner's join code + owner approval; STAFF edit rights are a per-user `canEdit` flag toggled by the owner.
- 2026-09-29 — Versions pinned exactly (no `^`): Next 16.3.6, React 19.3.0, Prisma 7.10.0, zod 4.6.5, Tailwind 4.3.3, Vitest 5.0.2, iron-session 9.0.1, TypeScript 5.9.3 — three agents installing at different times must get identical trees. TypeScript stays on 5.x, not 7.x, to avoid the native-port rewrite under Next/Prisma type definitions.
- 2026-09-29 — Prisma 7 needs `prisma.config.ts` and a driver adapter: `url` in the `datasource` block is rejected, so the connection string lives in `prisma.config.ts` (migrate/seed) and in `new PrismaPg({connectionString})` inside `src/lib/db.ts` (runtime). Added `@prisma/adapter-pg` and `dotenv`, neither optional on Prisma 7.
- 2026-09-29 — Prisma client is generated to `src/generated/prisma` (gitignored) and imported as `@/generated/prisma` — Prisma 7 requires an explicit `output`. `npm run build` runs `prisma generate` first, so Render and CI regenerate it.
- 2026-09-29 — Initial migration written with `prisma migrate diff --from-empty --to-schema` instead of `migrate dev` — there is no local Postgres on this machine, and `migrate diff` needs no database. The SQL is a normal Prisma migration, and this has since been confirmed: `migrate deploy` applied it to the live Neon database without modification.
- 2026-09-29 — Next.js 16 renamed `middleware.ts` to `proxy.ts` (same API, exported function named `proxy`). `docs/BACKEND.md` and the ownership map in `CLAUDE.md` updated. `src/middleware.ts` is still accepted as a legacy alias but does not get the rename's guarantees, so we use the current name.
- 2026-09-29 — **Nonce-based CSP, as rule 7 of `docs/BACKEND.md` anticipated.** Verified on the served HTML that Next.js emits two inline `<script>` tags for the hydration payload, so a flat `script-src 'self'` blocks hydration. CSP therefore moved out of `next.config.mjs` into `src/proxy.ts`, which puts a fresh nonce on the request header (where the renderer reads it) and on the response header. Re-verified: every `<script>` in the response, both inline tags included, now carries `nonce=`. The five constant headers stay in `next.config.mjs`.
- 2026-09-29 — Tailwind v4, not v3 — v4 is CSS-first, so there is no `tailwind.config.ts` at all; tokens live in an `@theme` block in `src/app/globals.css`. Logical utilities (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`) are unchanged, so the RTL rules in `docs/FRONTEND.md` still apply as written.
- 2026-09-29 — zod v4 — `z.email()` replaces the deprecated `z.string().email()`, and `toFieldErrors()` walks `error.issues` directly instead of the deprecated `.flatten()`.
- 2026-09-29 — Four extra files in `src/lib/` beyond the list in `docs/BACKEND.md`: `permissions.ts` (pure role/`canEdit` predicates with no DB or Next.js import, so they are unit-testable), `rateLimit.ts`, `joinCode.ts`, `audit.ts`. Splitting the predicates out is what lets the permission matrix be tested without mocking Prisma.
- 2026-09-29 — `next.config.mjs` and `vitest.config.mts` use ESM extensions — Vite warns that a `.ts` config loaded as CommonJS breaks under its native loader, and the project has no `"type": "module"`.
- 2026-09-29 — Render region `frankfurt` for the web service — closest Render region to Saudi Arabia, and it matches the Neon project's `eu-central-1` so the DB round trip stays short. (Superseded in part by the Neon decision below: there is no Render database to co-locate any more.)
- 2026-09-29 — **Database is Neon (serverless Postgres 18), not Render Postgres.** `render.yaml` therefore has no `databases:` block and `DATABASE_URL` is `sync: false` — a secret pasted into the Render dashboard. Two consequences: production must use Neon's **pooled** connection string (`-pooler` host), because Render opens a connection per instance and the free tier caps direct connections; and **backups are Neon's job, not Render's**, so the old "enable daily backups in the Render dashboard" step is gone. Free-tier Neon also suspends an idle compute, so the first request after a quiet spell pays a cold start. `docs/BACKEND.md` Render section rewritten to match.
- 2026-09-29 — Migration and seed verified against the live Neon database: `migrate deploy` applied `20260929000000_init` cleanly, all 6 model tables and 4 enum types exist, and the seed is idempotent (3 runs, still exactly 1 ADMIN row). Neon reports PostgreSQL 18.6; the schema uses nothing version-specific.
- 2026-09-29 — The quality-gate hook writes to `.claude/build.log` / `.claude/test.log` instead of `/tmp/*.log` — this is a Windows machine and `/tmp` is not writable from the hook's shell. Both files are gitignored.

## Known issues
Failing builds, bugs, must-not-forget TODOs. Remove when fixed.
- `pg` warns that `sslmode=require` changes meaning in pg v9 / pg-connection-string v3: today it still verifies the certificate, but it will fall back to weaker libpq semantics. Harmless now. When we upgrade `pg`, switch `DATABASE_URL` to `sslmode=verify-full` to keep the current strength.
- `npm audit` reports 6 findings (2 moderate, 4 high) with no non-downgrading fix: `mysql2` and `deepmerge-ts` reach us only through the **Prisma CLI** (a devDependency; we never connect to MySQL), and `uuid` only through `exceljs`. None is reachable from the deployed app. Re-check when Prisma 8 is stable.
- `/_not-found` is the one statically prerendered route, so its inline scripts carry no nonce and it will not hydrate under the CSP. Harmless today — it is static text — but **every page must stay dynamically rendered**: no `export const revalidate`, no static pages. Any page calling `requireX()` is dynamic already.
- `src/proxy.ts` currently does CSP only. `backend` must add the session/role routing from `docs/BACKEND.md` around it and leave the CSP block intact.
- `src/app/layout.tsx`, `src/app/page.tsx` and `src/app/globals.css` are minimal lead-written placeholders so Phase 0 could build. They are `frontend`'s files from Phase 1 on.
- `public/manifest.json` and the PWA icons do not exist yet (a `frontend` task). `layout.tsx` already references `/manifest.json`.
- `docs/BACKEND.md` lists `locks.test.ts` and `auth.test.ts` as tests to write; those are `backend`'s. The lead wrote the four `src/lib` test files its own Phase 0 code needed.

## Gotchas
- Whole app is RTL: Tailwind logical utilities only (`ms-`, `me-`, `ps-`, `pe-`, `text-start`).
- Every query is scoped by `establishmentId` from the session — never trust an id from the client.
- Month lock is enforced in `src/features/locks/assertUnlocked.ts`; every transaction mutation calls it. (Not written yet — `backend`.)
- `src/lib/validation.ts` is the backend/frontend contract; only the lead changes exported names.
- Error contract: every zod message and every `ActionResult.error` is an **i18n key** (`err.*`), never Arabic text. `errorMessage(key)` in `src/i18n/ar.ts` resolves one for display. Use `invalid(zodError)` in actions so every failure has the same shape.
- Dates: `@db.Date` columns round-trip through `isoToDate` / `dateToISO`, which read and write in **UTC** on purpose. Only `todayISO()` and `currentMonthKey()` use Asia/Riyadh, and they are the only place "today" may be decided. Never use `new Date()` local getters on a stored date.
- `parseSAR` returns `null` rather than throwing, and rejects zero as well as negatives — an amount of 0 is never valid.
- Tests run with `TZ=Asia/Riyadh` (set in `vitest.config.mts`) so they do not depend on the machine's clock settings.
- `npm install` on a fresh clone leaves Prisma and esbuild uninstalled until `npm approve-scripts --allow-scripts-pending` runs; the approvals are recorded in `package.json` under `allowScripts`.
- Do not import `src/lib/session.ts`, `auth.ts` or `audit.ts` from a test — they are `server-only`. Test `permissions.ts` instead; that is why it exists.

## File map
```
src/app/                 routes: (auth)/login,signup,pending · (owner)/…, (staff)/…, (admin)/… · api/health, api/export
src/proxy.ts             CSP nonce now; session/role routing to come (backend)
src/features/            auth, establishments, transactions, dashboard, reports, locks, settings, admin, audit
src/components/          shared UI
src/i18n/ar.ts           all UI strings
src/lib/                 db, session, auth, permissions, rateLimit, joinCode, audit, money, dates, validation
src/generated/prisma/    generated Prisma client — gitignored, rebuilt by `prisma generate`
prisma/                  schema.prisma, migrations/20260929000000_init, seed.ts
prisma.config.ts         Prisma 7 config: schema path, migrations path, datasource url
docs/                    BACKEND.md, FRONTEND.md
progress/                _template.md, backend.md, frontend.md, reviewer.md
```

## Session log
Append one entry per lead session (newest at bottom).

### 2026-09-29 — lead session
- Phase / tasks worked on: Phase 0 in full, alone, as `CLAUDE.md` requires.
- Finished: scaffold; Prisma schema + first migration; idempotent seed; all of `src/lib/`; the complete `src/i18n/ar.ts` key set; `render.yaml`; `.env.example`; `.gitignore`; updated `.claude/settings.json`; nonce-based CSP verified against served HTML; 59 tests across money/dates/validation/permissions/joinCode.
- Not finished: nothing in Phase 0's scope. Everything in Phase 1 is untouched by design.
- Teammate notes merged from: none — no teammates spawned yet.
- Build passes: yes. `npm run build`, `npm test` (59/59) and `npm run typecheck` all pass. `/api/health` returned `{"ok":true}` from a real `npm start`, with all five constant security headers and the nonce CSP present on the response.
- Two doc changes needed and made, both logged as Decisions: `middleware.ts` → `proxy.ts` (Next 16 rename) in `docs/BACKEND.md` and the `CLAUDE.md` ownership map; and rule 7's CSP rewritten around the nonce, which rule 7 itself told us to do if Next.js needed one.
- Next: waiting for the user's approval to start Phase 1.

### 2026-09-29 — lead session (database verification)
- Phase / tasks worked on: verifying Phase 0's migration against a real database, at the user's request.
- Docker is not installed on this machine (no `docker`, no `podman`, WSL absent), so the user supplied a **Neon** Postgres 18 instead.
- Finished: `.env` created (gitignored, `git check-ignore` confirmed); `render.yaml` stripped of its `databases:` block with `DATABASE_URL` now `sync: false`; `docs/BACKEND.md` Render section rewritten for Neon; `migrate deploy` applied `20260929000000_init`; `npm run seed` created the ADMIN; verified 6 model tables, 4 enum types, exactly 1 ADMIN row (`status: ACTIVE`, `establishmentId: null`); ran the seed twice more and the row count stayed at 1.
- Correction to the previous session's commit message: it said "the eight models from docs/BACKEND.md". The schema has **6 models** (Establishment, User, Category, Transaction, PeriodLock, AuditLog) and 4 enums. The schema itself was always right; only that sentence was wrong.
- Build passes: yes. `npm run build` and `npm test` (59/59) re-run after the config changes.
- Next: still waiting for the user's approval to start Phase 1.
