# PROGRESS.md — Project record (lead writes this; teammates write progress/<name>.md)

Single source of truth for project state across sessions. A new lead must be able to take over from this file alone.

## How to run
```
cp .env.example .env     # DATABASE_URL, SESSION_SECRET, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD
npm install
npx prisma migrate dev
npm run seed             # creates the ADMIN account (idempotent)
npm run dev              # http://localhost:3000
npm run build && npm test
```

## Current phase
**Phase:** 0 — Scaffold and contract (lead alone)
**Status:** not started
**Exactly where we stopped:** —
**Next concrete action:** create Next.js app (TypeScript, Tailwind, App Router, `src/` dir), add Prisma, write `prisma/schema.prisma` from `docs/BACKEND.md`, run first migration.
**Teammates spawned:** none yet (spawn `backend`, `frontend`, `reviewer` only after Phase 0 build passes)

## Done
| Phase | Task | Who | Date |
|---|---|---|---|
| — | — | — | — |

## Decisions
Format: date — decision — reason. Anything that changed from the docs or chose between valid options.
- 2026-09-29 — No receipts/attachments in v1 — owner only needs to know where money goes; keeps DB small and app simple.
- 2026-09-29 — Multi-establishment data model (one Establishment per OWNER) even though the first deployment serves few owners — sign-up + admin approval implies several owners; retrofitting tenancy later is expensive.
- 2026-09-29 — ADMIN sees counts and statuses only, never amounts — data privacy for owners.
- 2026-09-29 — STAFF join via owner's join code + owner approval; STAFF edit rights are a per-user `canEdit` flag toggled by the owner.

## Known issues
Failing builds, bugs, must-not-forget TODOs. Remove when fixed.
- none

## Gotchas
- Whole app is RTL: Tailwind logical utilities only (`ms-`, `me-`, `ps-`, `pe-`, `text-start`).
- Every query is scoped by `establishmentId` from the session — never trust an id from the client.
- Month lock is enforced in `src/features/locks/assertUnlocked.ts`; every transaction mutation calls it.
- `src/lib/validation.ts` is the backend/frontend contract; only the lead changes exported names.

## File map
```
src/app/                 routes: (auth)/login,signup,pending · (owner)/…, (staff)/…, (admin)/… · api/health, api/export
src/features/            auth, establishments, transactions, dashboard, reports, locks, settings, admin, audit
src/components/          shared UI
src/i18n/ar.ts           all UI strings
src/lib/                 db, session, auth, money, dates, validation
prisma/                  schema.prisma, migrations/, seed.ts
docs/                    BACKEND.md, FRONTEND.md
progress/                _template.md, backend.md, frontend.md, reviewer.md
```

## Session log
Append one entry per lead session (newest at bottom).

### YYYY-MM-DD — lead session
- Phase / tasks worked on:
- Finished:
- Not finished:
- Teammate notes merged from: progress/backend.md, progress/frontend.md, progress/reviewer.md
- Build passes: yes/no
- Next:
