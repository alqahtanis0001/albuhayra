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
**Status:** Phase 1, Checkpoint 1 committed. Phase 0 complete and database-verified; — `npm run build` and `npm test` pass (59 tests, 5 files); migration + seed applied to the live Neon database
**Exactly where we stopped:** Checkpoint 1 committed (B1, B2, B9, F1, F2 + four reviews). Waiting for the user's approval before starting Checkpoint 2.
**Next concrete action:** on approval, Checkpoint 2 = W1 (wire up auth pages — verified as a one-line change), F3 (owner dashboard), B3 (transaction actions + queries), B4 (lock + audit). B8 (`setCategoryOrder`) must land before F8.
**Teammates spawned:** `backend`, `frontend`, `reviewer` — all three running, all idle pending approval.

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
| 1 | B1 auth actions + proxy session/role routing | backend | 2026-09-29 |
| 1 | B2 establishment / join / approval / settings actions + queries | backend | 2026-09-29 |
| 1 | B9 review follow-ups (7 fixes incl. XFF, category reactivation, sessionConfig) | backend | 2026-09-29 |
| 1 | F1 layout, nav, 17 shared components, 3 role layouts | frontend | 2026-09-29 |
| 1 | F2 auth pages (login / signup / pending) + swap point | frontend | 2026-09-29 |
| 1 | R-B1, R-B2, R-F1, R-F2 reviews; H1 closed; zzsmoke route caught | reviewer | 2026-09-29 |

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
- 2026-09-29 — **Action signature FROZEN: `(prevState, formData) => Promise<ActionResult<T>>` with the action redirecting server-side.** `logout(): Promise<void>`. Button-invoked actions keep plain arguments. This shape flip-flopped twice in one session — my fault, not the teammates'. I drafted `(prev, formData)`, then saw an intermediate `(input) => ActionResult<AuthRedirect>` state in the tree and "ratified" that instead, believing they had converged; they had not, it was a six-minute waypoint. Both teammates rewrote work twice. The lesson recorded for the next lead: when a contract is in motion, freeze it by decree and make the code follow the doc — do not infer the contract from a tree that two agents are actively editing. `docs/BACKEND.md` now carries a FROZEN marker on that section.
- 2026-09-29 — **A PENDING account gets no session, and `/pending` therefore cannot auto-redirect when it becomes ACTIVE.** The role travels in `?as=owner|staff` so the page can still say who approves; a forged value changes only that sentence. I overruled the reviewer's recommendation to issue PENDING users a session: it would have granted a cookie to an unapproved account for a convenience, and it would have been a third change to the login contract in one session. `docs/FRONTEND.md` amended — the "auto-redirects when status becomes ACTIVE" bullet was not buildable as written. Users sign in again to discover they are approved.
- 2026-09-29 — **Duplicate categories: `createCategory` reactivates a matching inactive category instead of inserting a second row,** and `setCategoryActive` refuses to reactivate a name an active category already uses. Comparison is against active categories only. Adding just the `active` filter (the obvious fix) would have allowed two rows with one name and then two *active* ones after a later reactivation — the confusion the no-constraint Decision above was meant to avoid, arriving by another door. Reactivate-on-create keeps one row and one id's history.
- 2026-09-29 — **The rate limiter reads the LAST element of `x-forwarded-for`, not the first.** Exactly one trusted proxy fronts the app, and it appends the real client address, so the rightmost entry is the only one a client cannot forge. Taking the first made the 5/15min cap on login, sign-up and join-code attempts bypassable by rotating the header — which would also have invalidated the reasoning behind accepting the join-code oracle below. Revisit if a CDN is ever put in front of Render, since the rightmost entry would then be Render's own edge.
- 2026-09-29 — **Accepted: staff sign-up distinguishes a bad join code from an already-taken email** (`err.joinFailed` vs `err.signupFailed`), so a guesser learns when a code is valid. Accepted rather than fixed: the keyspace is 31^8 ≈ 8.5×10¹¹, the limiter caps attempts at 5/15min per ip, and the only clean fix collapses both cases into one message, costing an honest employee the ability to tell a mistyped code from a used email. Either one-line reordering merely moves the leak. Recorded so it is not re-raised.
- 2026-09-29 — **Correcting the record:** an earlier session log entry said `backend` dropped the proxy redirect that bounces a signed-in visitor off `/login`. It did not — it reinstated it with a `signedOut` marker that breaks the loop (`src/proxy.ts`), and the reviewer caught my error. The Decision above about the loop still stands as the reason the naive version is wrong; the marker is what makes the redirect safe.
- 2026-09-29 — **`agentRules: false` in `next.config.mjs`.** `next dev` appends a `<!-- BEGIN:nextjs-agent-rules -->` block to `CLAUDE.md` on every start. Two reasons to refuse it: `CLAUDE.md` is the project's instruction file and takes precedence over everything per its own precedence rule, so a build tool silently writing instructions into it is not acceptable; and the block argues for committing itself ("committing it with your work keeps the tree clean"), which is a tool lobbying for a change to the rules that govern the agents reading it. The one useful fact in it — that Next ships its docs at `node_modules/next/dist/docs/` — is recorded in Gotchas instead. Reverted the block and disabled the feature.
- 2026-09-29 — **The proxy does not redirect a signed-in visitor away from `/login`.** `backend` removed this after finding it loops forever: the proxy sees only the cookie, while authority lives in the database, so a user who has since been disabled goes `/login` → `/owner` → `/login` endlessly. I had suggested the redirect in the B1 brief; `backend` was right to drop it, and it should not be re-added. `/pending` is likewise never redirected by the proxy, because `requireUser()` is what sends PENDING users there.
- 2026-09-29 — Auth pages declare `export const dynamic = "force-dynamic"` once in `src/app/(auth)/layout.tsx` — they call no `requireX()`, so Next would prerender them, they would get no CSP nonce, and they would never hydrate. Same trap as `/_not-found` in Known issues.
- 2026-09-29 — No icon package: `docs/FRONTEND.md` mentions lucide but the stack is frozen and nothing is installed, so `src/components/icons.tsx` holds hand-written 24x24 SVGs, with `rtl:-scale-x-100` on the directional ones. Related: `NavItem.icon` is a string key into a `NAV_ICONS` map rather than a component, because nav items cross into a client component.
- 2026-09-29 — **No `@@unique([establishmentId, type, nameAr])` on `Category`**, despite the duplicate-name race the reviewer found. A hard constraint would break a legitimate flow: deactivate "إيجار", later add "إيجار" again, and the insert fails. Instead the duplicate check stays application-level and considers **only active** categories, so deactivate-then-recreate works and `err.categoryDuplicate` fires on the case users actually hit. The residual race (two near-simultaneous submits of the same name) is accepted; the realistic trigger is a double-click, which the frontend already guards with disable-while-pending.
- 2026-09-29 — Every zod message in `src/lib/validation.ts` is now an `err.*` key, closing a contract violation the reviewer found: six places used zod's default English (the two enums, three `.max(200)`, and `page`). Verifying the fix surfaced three more the review missed — the shared `cuid` helper, `optionalText` and `q` all had a bare `z.string()`, so a non-string value produced English. All nine fixed. No exported name or type changed, so the contract's shape is unaffected.
- 2026-09-29 — `@prisma/adapter-pg` and `dotenv` pinned exactly, removing the two `^` ranges npm wrote when they were installed. They contradicted the pin-everything Decision above; the rule now matches the file.
- 2026-09-29 — The quality-gate hook writes to `.claude/build.log` / `.claude/test.log` instead of `/tmp/*.log` — this is a Windows machine and `/tmp` is not writable from the hook's shell. Both files are gitignored.

## Known issues
Failing builds, bugs, must-not-forget TODOs. Remove when fixed.
- **H1 (reviewer, HIGH) — open, assigned to `backend` in B1.** `requireUser()` calls `session.destroy()` on the rule-5 lockout paths (`src/lib/auth.ts`). iron-session's `destroy()` writes the cookie without `assertWritable()`, and Next seals the cookie store outside the action phase, so a DISABLED user — or one whose establishment was deactivated — gets an unhandled `ReadonlyRequestCookiesError` on every page instead of a redirect to `/login`, and the stale cookie is never cleared. Verified against both libraries' source. No data leaks (the render aborts) but the promised lockout becomes a 500 loop until the 12h TTL. Fix: wrap `destroy()` in try/catch and keep the `redirect`.
- A regression test asserting every zod message is an `err.*` key should be folded into `src/lib/validation.test.ts` as part of B7 — it caught three violations the manual review missed. `backend` owns that file; the lead has sent the test body.
- The frozen action-signature section and the `updateCategory` / `resetStaffPassword` signatures were briefly out of step; the doc is amended to describe the bound-id form. If a third such drift appears, the cause is the doc being edited while actions are being written, not the actions being wrong.
- `pg` warns that `sslmode=require` changes meaning in pg v9 / pg-connection-string v3: today it still verifies the certificate, but it will fall back to weaker libpq semantics. Harmless now. When we upgrade `pg`, switch `DATABASE_URL` to `sslmode=verify-full` to keep the current strength.
- `npm audit` reports 6 findings (2 moderate, 4 high) with no non-downgrading fix: `mysql2` and `deepmerge-ts` reach us only through the **Prisma CLI** (a devDependency; we never connect to MySQL), and `uuid` only through `exceljs`. None is reachable from the deployed app. Re-check when Prisma 8 is stable.
- **Two** routes are statically prerendered, both Next.js built-ins: `/_not-found` and `/_global-error` (confirmed from `.next/prerender-manifest.json`, not from the route table). Their inline scripts carry no nonce, so neither hydrates under the CSP. Harmless — both are plain text — but **every page we write must stay dynamically rendered**: no `export const revalidate`, no `force-static`, no `generateStaticParams`. A page calling `requireX()` is dynamic already; the auth pages, which call none, declare `export const dynamic = "force-dynamic"` once in `src/app/(auth)/layout.tsx`.
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
- **The proxy cannot import `src/lib/session.ts`** — that file is `server-only` and reads `cookies()` from `next/headers`, neither of which exists in the proxy runtime. It reads the session with `getIronSession(nextProxyCookies(request, response), …)` instead. The cookie name and TTL both sides need now live in `src/lib/sessionConfig.ts`, imported by both; do not re-inline them.
- **Never redirect a signed-in visitor away from `/login` on the cookie alone** — that is a loop, because the proxy sees only the cookie while authority lives in the DB, so a since-disabled user bounces `/login` → `/owner` → `/login` forever. The bounce that exists is safe only because of the `signedOut` marker `requireUser()` adds when it is the reason the visitor is there.
- **`updateCategory` refuses a changed `type`** (`err.categoryDirectionMismatch`): existing entries already point at the category and carry its direction, so renaming is the only safe edit.
- **`allocateJoinCode(client)`** is structurally typed rather than taking `Prisma.TransactionClient`, so `src/lib/joinCode.ts` stays dependency-free and unit-testable. Pass `db` or a `tx`. It throws after five collisions, so callers must catch and return a result.
- **The rate limiter is in-memory**, so it resets on deploy and does not span Render instances. Keys are `login:<ip>:<email>`, `signup:<ip>`, `join:<ip>`. It defends against one client hammering one instance, not against a distributed attempt.
- **`redirect()` works by throwing**, so a `try/catch` around one silently swallows the navigation and leaves the user on the form with no error. Every `redirect()` must sit outside the surrounding `catch` — in the auth actions the `catch` comes first, then the redirect. Not obvious from reading, so it is now a reviewer check.
- **Verify "nothing is static" from `.next/prerender-manifest.json`, not the build's route table** — the table omits `/_global-error`.
- **`activeHref()` in `src/components/chrome/nav.ts` picks the longest matching href**, so `/owner/transactions/new` highlights إضافة only, never إضافة *and* السجل. Exactly one `aria-current="page"` per nav.
- **`ConfirmDialog` is a native `<dialog>` + `showModal()`** — the platform supplies the focus trap and Escape, with no library. It does **not** close on a backdrop click, which is the safer default for a destructive confirmation.
- **Tailwind v4 tokens live in the `@theme` block of `globals.css`**: `--color-money-out` yields `text-money-out` / `bg-money-out` / `border-money-out`, and the `-soft` variants are the pale badge and stat-card backgrounds.
- **`getOwnStatus` was deliberately deleted, not lost.** It was written for a session-reading `/pending` before the `?as=` design settled, and `/pending` never called it — `getSession().role` covers the one thing that page needs. Withdrawn from `docs/BACKEND.md` and the file removed. Do not rebuild it; if a PENDING account ever needs a real status read, that is a new decision about what an unapproved account may hold.
- **When a report and the tree disagree, the tree wins — and `grep` for the symbol, not `ls` for the file.** This happened three times in one checkpoint: the action shape, the zzsmoke deletion, and a query reported present that was gone. An `ls` passes on an empty or renamed file; a `grep` for the exported name does not. The index is a third source that can disagree with both: a file can be deleted from disk and still be staged, so verify the **commit object** (`git ls-tree -r HEAD`, `git grep <symbol> HEAD`) rather than the working tree.
- **A green tree is not a clean tree.** An untracked file is invisible in `git diff` and will still be captured by `git add -A`. Before any commit: `git status --porcelain` including untracked directories, confirm the only routes under `src/app/api/` are `health` and `export`, and scan `src` for temporary markers. This is not hypothetical — an unauthenticated OWNER-session factory sat untracked in the tree during Checkpoint 1.
- **Next 16 is not the Next.js you remember, and its own docs ship in the repo:** `node_modules/next/dist/docs/` (start at `index.md`, App Router material under `01-app/`). Check there before trusting recalled API knowledge — the `middleware.ts` → `proxy.ts` rename in Phase 0 was exactly this trap. Read them from `node_modules`; do not let anything write guidance into `CLAUDE.md`.
- **Never append `t.common.currency` to a formatted amount.** `formatSAR()` already appends `ر.س`; doing both renders `1,234.50 ر.س ر.س`. `t.common.currency` exists only for a standalone label such as an input suffix.
- Arabic month names live **only** in `src/lib/dates.ts` (`MONTH_NAMES_AR` / `monthNameAr`), not in `ar.ts`. Import them; do not add month keys to `ar.ts`.
- The proxy does **not** see every request: its matcher excludes `_next/static`, `_next/image`, `icons`, `favicon.ico`, `*.png`, and — via the `missing:` clause — `next/link` prefetches. So prefetch responses carry no CSP header and no role routing. Defence-in-depth only, because the real checks are in `requireX()`; just never assume the proxy is a complete gate.
- Duplicate category names are prevented in application code against **active** categories only, not by a DB constraint — see the Decision above. A concurrent double-submit can still create two.
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

### 2026-09-29 — lead session (Phase 1, Checkpoint 1)
- Tasks: B1 (auth actions + proxy routing), B2 (establishment/join/approval/settings), B9 (7 review follow-ups), F1 (layout, nav, 17 components, 3 role layouts), F2 (auth pages), and reviews R-B1/R-B2/R-F1/R-F2.
- Gates at commit: `npm run build`, `npm test` (84/84 in 6 files) and `tsc --noEmit` all exit 0, verified on real exit codes.
- Reviewer found and closed H1 (the `session.destroy()` 500 on every rule-5 lockout path), then found four more: the CSP matcher losing a backslash, the category duplicate check blocking deactivate-then-re-add, a leftmost `x-forwarded-for` read that made the rate limiter bypassable, and F8 being unbuildable for want of a reorder action. All fixed or scheduled.
- **The catch of the checkpoint:** an untracked `src/app/api/zzsmoke/route.ts` — an unauthenticated endpoint that minted an OWNER session and whose bare URL ran `deleteMany` across four tables. It appeared twice (once for B2 verification, once for B9) and was in my commit set. Found by the reviewer listing the tree rather than working from the file list I handed it. Nothing was committed.
- **Three lead mistakes worth recording.** (1) I inferred the action contract from a tree two agents were actively editing and "ratified" a six-minute waypoint, costing `frontend` two rewrites of three forms; fixed by freezing the section by decree. (2) I told two teammates the zzsmoke route was already gone, because my `ls` ran in a window when it was; both were right and I was wrong. (3) I reported a passing typecheck from a shell pipeline whose exit status came from `tail`, and reported a stale test count. All three share a cause: trusting a snapshot of a tree under concurrent edit. Mitigations now in Gotchas.
- Not finished: B8 (`setCategoryOrder`), which must land before F8.
- Teammate notes merged from: progress/backend.md, progress/frontend.md, progress/reviewer.md
- Build passes: yes.
- Next: user's approval, then Checkpoint 2 (W1, F3, B3, B4).
