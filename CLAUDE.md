# CLAUDE.md — Ledger App (سجل المصروفات والإيرادات)

Read this file first. Then `PROGRESS.md`. Then `docs/BACKEND.md` and/or `docs/FRONTEND.md` for your task. If you are a teammate, also read `progress/<your-name>.md`.

## What this is
A small private web app where business owners in Saudi Arabia log every riyal that comes in or goes out, so they know where each SAR is going. Internal ledger only — NO invoicing, NO VAT, NO ZATCA, NO receipts/attachments, NO bank connections.

Priorities in order: **simple → secure → Arabic UI → correct numbers**. When in doubt, choose the simpler option. Build only what these files describe.

## Facts every agent must know (not in the chat history)
- Product name shown in the UI: **سجل المصروفات** (change in `src/i18n/ar.ts` only).
- Three roles: **ADMIN** (the platform administrator — one account, created by seed), **OWNER** (a business owner; signs up, must be approved by ADMIN), **STAFF** (an employee; signs up with an owner's join code, must be approved by that OWNER).
- Every OWNER has exactly one **Establishment**. STAFF belong to one Establishment. All financial data is scoped to an Establishment. ADMIN never sees amounts, only counts and statuses.
- STAFF can always add entries. STAFF can edit entries only if the OWNER has switched on their `canEdit` permission. Only OWNER can delete.
- Money is an integer in halalas. Dates are Gregorian in the DB, Hijri shown alongside in the UI.
- No VAT anywhere. No receipts anywhere.

## Files that define the project
| File | Owner | Purpose |
|---|---|---|
| `CLAUDE.md` | lead | Rules for everything, roles, team protocol, build plan |
| `PROGRESS.md` | lead only | Durable handover record: current phase, done, decisions, known issues, session log |
| `progress/<teammate>.md` | that teammate | Each teammate's own running notes; lead merges into PROGRESS.md |
| `docs/BACKEND.md` | lead | Schema, auth, server actions, security, Render |
| `docs/FRONTEND.md` | lead | Screens, Arabic/RTL, components, PWA |
| `.claude/settings.json` | lead | Team env var, permissions, quality-gate hook |

Precedence: `CLAUDE.md` > `docs/*` > code. If code disagrees with docs, fix the code, or change the doc and record a Decision in `PROGRESS.md`.

## Team protocol (agent teams are enabled)
Team shape: **lead** + `backend` + `frontend` + `reviewer`. Do not spawn more without the user asking.

**Lead**
- Does Phase 0 alone (see build plan) so the contract exists before parallel work starts.
- Creates tasks in the shared task list, one per checklist item in `docs/*`, each naming the files it touches.
- Is the only writer of `PROGRESS.md`, `CLAUDE.md`, `docs/*`, `package.json`, `next.config.js`, `prisma/schema.prisma` after Phase 0.
- Merges teammate notes into `PROGRESS.md` at every checkpoint and before ending the session.
- Waits for teammates to finish instead of implementing their tasks itself.

**Teammates**
- At start: read `CLAUDE.md`, `PROGRESS.md`, your doc, and `progress/<your-name>.md` (create it from `progress/_template.md` if missing).
- Only edit files you own (see ownership map). If you need a change in someone else's file, message that teammate or the lead — never edit it yourself.
- Before marking a task complete: `npm run build` and `npm test` pass; you appended what you did and any gotchas to `progress/<your-name>.md`.
- If blocked for more than a few minutes, message the lead with the exact blocker.

**Reviewer** (read-only): checks every completed task against the Security section of `docs/BACKEND.md` and the RTL rules of `docs/FRONTEND.md`, then messages findings to the responsible teammate and the lead. Never edits code.

### File ownership map
| Path | Owner |
|---|---|
| `prisma/**`, `src/lib/**`, `src/i18n/ar.ts` (keys only, after Phase 0) | lead (Phase 0), then `backend` for `prisma/seed.ts` and `src/lib/*` fixes |
| `src/features/*/actions.ts`, `src/features/*/queries.ts`, `src/app/api/**`, `src/proxy.ts`, `src/**/*.test.ts` | `backend` |
| `src/app/**/page.tsx`, `src/app/**/layout.tsx`, `src/components/**`, `src/features/*/components/**`, `public/**`, `src/app/globals.css` | `frontend` |
| `src/i18n/ar.ts` string *values* | `frontend` may add/edit values; new *keys* must be announced to `backend` by message |
| everything else | lead |

Contract between backend and frontend: the exported types and zod schemas in `src/lib/validation.ts`, the action signatures listed in `docs/BACKEND.md`, and the string keys in `src/i18n/ar.ts`. Change any of these only through the lead.

## Stack (do not change without a logged Decision)
Next.js 14+ App Router, TypeScript, Tailwind CSS · PostgreSQL on Render via Prisma · iron-session + bcrypt · zod · recharts (one chart) · exceljs · Vitest. Nothing else unless tiny and RTL-safe.

## Build plan
**Phase 0 — lead alone, sequential.** Scaffold, Prisma schema + first migration, seed script, `src/lib/` (db, session, auth helpers, money, dates, validation with all zod schemas and exported types), `src/i18n/ar.ts` with every key the screens need (values can be rough), `render.yaml`, `.env.example`, `.claude/settings.json`, `PROGRESS.md` filled in. `npm run build` must pass before Phase 1.

**Phase 1 — parallel.**
- `backend`: auth actions + middleware → establishment/join/approval actions → transaction actions + queries → lock + audit → admin actions → export route → tests.
- `frontend`: layout, nav, shared components → auth pages → owner dashboard → add/edit entry → ledger list → staff dashboard → reports → owner settings → admin pages → PWA + print CSS.
- `reviewer`: reviews each completed task.
- Frontend builds against the contract using stub data from `queries.ts` signatures until backend lands; when both sides are ready for a screen, the lead creates a "wire up <screen>" task assigned to `frontend`.

**Phase 2 — lead.** Integration pass, README with Render deploy steps, final PROGRESS.md.

Checkpoint after every 3–4 completed tasks: lead merges `progress/*.md` into `PROGRESS.md` and commits with `phase N: <summary>`.

## Code conventions
- Server Actions for mutations; server components for reads; `/api` only for health and export.
- Every server action and every data-reading server component starts with `requireUser()` / `requireOwner()` / `requireAdmin()` and scopes queries by `establishmentId` from the session. No exceptions.
- One folder per feature under `src/features/`: `auth`, `establishments`, `transactions`, `dashboard`, `reports`, `locks`, `settings`, `admin`, `audit`.
- All Arabic strings in `src/i18n/ar.ts`. No file over ~250 lines. Boring, readable code.

## Out of scope (do not build)
Invoicing, VAT, ZATCA, receipts/attachments, bank integrations, budgets, recurring entries, notifications/email, password-reset by email, dark mode, English UI, native apps, E2E suite, payments/subscriptions for owners.
