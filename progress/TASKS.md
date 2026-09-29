# TASKS.md — Phase 1 shared task list (lead owns this file)

Order follows "Phase 1 — parallel" in `CLAUDE.md`. Teammates do **not** edit this file;
the lead updates status. Teammates record their own detail in `progress/<name>.md`.

Status values: `todo` · `assigned` · `blocked` · `done` · `reviewed`

Rules that apply to every task:
- Only touch the files listed for the task, and only files you own in the `CLAUDE.md` ownership map.
- `npm run build` and `npm test` must pass before a task is complete.
- Append what you did and any gotchas to `progress/<your-name>.md`.
- **Do not `git commit`.** The lead commits at checkpoints.

---

## Backend track (`backend`)

| ID | Task | Files | Status |
|---|---|---|---|
| B1 | Auth actions + proxy routing: `login`, `logout`, `signupOwner`, `signupStaff`. Rate-limit login/signup/join-code via `src/lib/rateLimit.ts`. Add session/role routing to `src/proxy.ts` around the existing CSP block (do not touch the CSP). | `src/features/auth/actions.ts`, `src/proxy.ts` | done |
| B2 | Establishment / join / approval actions: `approveStaff`, `rejectStaff`, `setCanEdit`, `setStaffActive`, `resetStaffPassword`, `regenerateJoinCode`, `changeOwnPassword`; `listStaff`, `listCategories`. Default categories created in `approveOwner` (B5). | `src/features/establishments/{actions,queries}.ts`, `src/features/settings/{actions,queries}.ts` | done |
| B3 | Transaction actions + queries: `createTransaction`, `updateTransaction`, `deleteTransaction`; `listTransactions`, `getTransaction`, `getOwnerDashboard`, `getStaffDashboard`, `getReport`. | `src/features/transactions/{actions,queries}.ts`, `src/features/dashboard/queries.ts`, `src/features/reports/queries.ts` | todo |
| B4 | Month lock + audit wiring: `src/features/locks/assertUnlocked.ts` called by every transaction mutation; `lockMonth`, `unlockMonth`, `listLocks`; `writeAudit` on every mutation. | `src/features/locks/{actions,queries,assertUnlocked}.ts` | todo |
| B5 | Admin actions: `approveOwner` (creates the default categories per `docs/BACKEND.md`), `rejectOwner`, `setEstablishmentActive`, `resetOwnerPassword`; `getAdminOverview` — **no amounts, ever**. | `src/features/admin/{actions,queries}.ts` | todo |
| B6 | Export route: `GET /api/export?from=&to=`, OWNER only, exceljs, 2 sheets, `Cache-Control: private, no-store`. | `src/app/api/export/route.ts` | todo |
| B8 | **New.** `setCategoryOrder(id, "UP"\|"DOWN")` — swaps `sortOrder` with the adjacent active category of the same direction; audit `CATEGORY_UPDATE`. F8 specifies move up/down, `sortOrder` is already populated, and no action could change it, so F8 was unbuildable as written. | `src/features/settings/actions.ts` | todo |
| B9 | **Follow-up on B1/B2 review.** Restore `\.` in the proxy matcher; `active`-only duplicate check plus reactivate-on-create and the `setCategoryActive` name guard; `x-forwarded-for` last element; `src/lib/sessionConfig.ts` shared constants; wrap `signupStaff` in a `$transaction`; make `clearAttempts` consistent across both sign-ups; stop `regenerateJoinCode` throwing out of the action. | `src/proxy.ts`, `src/features/settings/actions.ts`, `src/features/auth/actions.ts`, `src/features/establishments/actions.ts`, `src/lib/sessionConfig.ts`, `src/lib/session.ts` | done |
| B7 | Tests: `locks.test.ts` (assertUnlocked, mocked Prisma) and `auth.test.ts` (requireCanEdit matrix). | `src/features/locks/locks.test.ts`, `src/lib/auth.test.ts` | todo |

## Frontend track (`frontend`)

Build against the contract in `src/lib/validation.ts` + the `queries.ts` signatures in
`docs/BACKEND.md`, using local stub data behind a `USE_STUBS` flag until the matching
backend task lands. Stubs are removed in the wire-up task.

| ID | Task | Files | Status |
|---|---|---|---|
| F1 | Layout, nav, shared components: `Button, Input, Select, Textarea, Card, StatCard, Table, EmptyState, MoneyText, DateText, DirectionBadge, StatusBadge, LockBadge, ConfirmDialog, Toast, Tabs, Pagination`. Role layouts + bottom tab bar / side nav. | `src/components/**`, `src/app/(owner)/layout.tsx`, `src/app/(staff)/layout.tsx`, `src/app/(admin)/layout.tsx`, `src/app/globals.css`, `src/app/layout.tsx` | done |
| F2 | Auth pages: `/login`, `/signup` (two choice cards, then owner/staff form), `/pending`. | `src/app/(auth)/login/page.tsx`, `src/app/(auth)/signup/page.tsx`, `src/app/(auth)/pending/page.tsx`, `src/features/auth/components/**` | done |
| F3 | Owner dashboard: 4 StatCards, balance-by-method table, 6-month bar chart (recharts), top-5 OUT categories, last 10 movements. | `src/app/(owner)/owner/page.tsx`, `src/features/dashboard/components/**` | todo |
| F4 | Add / edit entry: shared `TransactionForm` (direction toggle, amount, date, category, method, counterparty, note). Locked-month notice. | `src/app/(owner)/owner/transactions/new/page.tsx`, `src/app/(owner)/owner/transactions/[id]/edit/page.tsx`, `src/features/transactions/components/**` | todo |
| F5 | Ledger list: URL-param filters, table on desktop / cards on mobile, footer totals, 50/page, row actions gated by role + lock. | `src/app/(owner)/owner/transactions/page.tsx`, `src/features/transactions/components/**` | todo |
| F6 | Staff area: dashboard, new entry, list (no delete, edit only if `canEdit`), `/staff/account`. | `src/app/(staff)/staff/**` | todo |
| F7 | Reports: month picker / custom range, two by-category tables, net, Excel + print buttons. | `src/app/(owner)/owner/reports/page.tsx`, `src/features/reports/components/**` | todo |
| F8 | Owner settings, 5 tabs: categories, staff, join code, month locks, account. | `src/app/(owner)/owner/settings/page.tsx`, `src/features/settings/components/**` | todo |
| F9 | Admin pages: requests, establishments (search), account. **Never render an amount.** | `src/app/(admin)/admin/**`, `src/features/admin/components/**` | todo |
| F10 | PWA + print CSS: `manifest.json`, icons 192/512, minimal service worker (app shell only, never `/api/*`), print stylesheet. | `public/manifest.json`, `public/icons/**`, `public/sw.js`, `src/app/globals.css` | todo |

## Wire-up tasks (`frontend`) — blocked until both sides land

Each removes the `USE_STUBS` path for its screen and calls the real action/query.

| ID | Screen | Depends on | Status |
|---|---|---|---|
| W1 | Auth pages | B1 + F2 | ready — verified as a one-line change; awaiting user approval |
| W2 | Owner dashboard | B3 + F3 | blocked |
| W3 | Add / edit entry | B3 + B4 + F4 | blocked |
| W4 | Ledger list | B3 + B4 + F5 | blocked |
| W5 | Staff area | B3 + F6 | blocked |
| W6 | Reports | B3 + B6 + F7 | blocked |
| W7 | Owner settings | B2 + B4 + F8 | blocked |
| W8 | Admin pages | B5 + F9 | blocked |

## Reviewer (`reviewer`) — read-only, no code edits

Reviews each completed task against the **Security** list in `docs/BACKEND.md` and the
**RTL rules** in `docs/FRONTEND.md`; messages findings to the responsible teammate and the lead.

| ID | Reviews | Status |
|---|---|---|
| R-B1 | B1 | reviewed |
| R-B2 | B2 | reviewed |
| R-F1 | F1 | reviewed |
| R-F2 | F2 | reviewed |

## Checkpoints
Every 3–4 completed tasks the lead merges `progress/*.md` into `PROGRESS.md`, commits as
`phase 1: checkpoint N`, reports to the user, and **waits for approval** before continuing.

- **Checkpoint 1** covers B1, B2, F1, F2, B9 (+ R-B1/R-B2/R-F1/R-F2). — committed 2026-09-29
- **Checkpoint 2** planned: W1, F3, B3, B4. — awaiting user approval
