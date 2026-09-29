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
| B3 | Transaction actions + queries. **Actions:** `createTransaction` (month unlocked; amount > 0; date ≤ today; category **active, same establishment, same direction** — `err.categoryInvalid` / `err.categoryDirectionMismatch`), `updateTransaction` (`requireCanEdit()`; **both** old and new month unlocked; STAFF with canEdit may edit **any** entry of the establishment), `deleteTransaction` (OWNER only, **soft delete**). **Queries:** `listTransactions` → `{ rows, total, pageTotals { in, out, net } }` at `PAGE_SIZE` 50; `getTransaction`; `getOwnerDashboard`; `getStaffDashboard` (**must return `canEdit`** — F6 needs it); `getReport`. **No `$queryRaw`/`$queryRawUnsafe` in any of the four files** — raw SQL is invisible to the scoping gate. **Acceptance criterion (user-set): `src/features/transactions/scoping.test.ts` must capture every Prisma call made by `transactions/{actions,queries}.ts`, `dashboard/queries.ts` and `reports/queries.ts` through a mocked client and, for each, assert (a) a `where` object is present — a call with no `where` fails, (b) `where.establishmentId` read at the **top level** of the argument object, never a stringified form, equals the fixture's own establishment id **by value**, with a second foreign establishment in the fixture so a wrong-but-present id fails, and (c) for every Transaction read, `where.deletedAt === null`. B3 is not complete until it passes.** | `src/features/transactions/{actions,queries}.ts`, `src/features/dashboard/queries.ts`, `src/features/reports/queries.ts`, `src/features/transactions/scoping.test.ts` | done |
| B4 | Month lock + audit wiring. `assertUnlocked` called by every transaction mutation; `updateTransaction` asserts **both** the old and the new month (`docs/BACKEND.md:162`). `lockMonth` / `unlockMonth` **must refuse the current month and any future month** (`err.cannotLockCurrentMonth`). `listLocks` = **last 24 months with state** (`:171`). `writeAudit` on every mutation. Use `currentMonthKey()` from `src/lib/dates.ts` as the **only** way to decide "now" — never `new Date()` local getters on a stored date. Per reviewer item 13b, the `$transaction` wrappers this task adds are what can capture a trailing `redirect()`. | `src/features/locks/{actions,queries,assertUnlocked}.ts`, `src/features/locks/locks.test.ts` | done |
| B5 | Admin actions: `approveOwner` (creates the default categories per `docs/BACKEND.md`), `rejectOwner`, `setEstablishmentActive`, `resetOwnerPassword`; `getAdminOverview` — **no amounts, ever**. | `src/features/admin/{actions,queries}.ts` | todo |
| B6 | Export route: `GET /api/export?from=&to=`, OWNER only, exceljs, 2 sheets, `Cache-Control: private, no-store`. | `src/app/api/export/route.ts` | todo |
| B10 | `signupStaff` returns the same generic `err.joinFailed` for **all four** failure paths: bad join code, inactive establishment, owner not ACTIVE, already-taken email. **Issue both the join-code and the email lookups unconditionally with a single branch at the end** — otherwise the key is uniform but the latency is not. Test the four paths, and assert indistinguishability **structurally** (both queries always issued), never by wall clock. | `src/features/auth/actions.ts`, `src/features/auth/auth.test.ts` | done |
| B8 | `setCategoryOrder(id, "UP"\|"DOWN")` — swaps `sortOrder` with the adjacent **active** category of the same direction, skipping inactive rows. At the ends (first UP, last DOWN) a **silent no-op returning `ok: true`** — no error key; F8 disables the arrow. Audit `CATEGORY_UPDATE`. `docs/BACKEND.md:165` amended to match. | `src/features/settings/actions.ts` | done |
| B9 | **Follow-up on B1/B2 review.** Restore `\.` in the proxy matcher; `active`-only duplicate check plus reactivate-on-create and the `setCategoryActive` name guard; `x-forwarded-for` last element; `src/lib/sessionConfig.ts` shared constants; wrap `signupStaff` in a `$transaction`; make `clearAttempts` consistent across both sign-ups; stop `regenerateJoinCode` throwing out of the action. | `src/proxy.ts`, `src/features/settings/actions.ts`, `src/features/auth/actions.ts`, `src/features/establishments/actions.ts`, `src/lib/sessionConfig.ts`, `src/lib/session.ts` | done |
| B11 | Migrate `establishments/actions.ts` and `settings/actions.ts` from `update({ where: { id } })` to `updateMany({ where: { id, establishmentId } })` per Security rule 2b, and extend the scoping gate to cover them. Correct today, but the scope lives in the read rather than the write. **Not in Checkpoint 2 — awaiting the user's call on scheduling.** | `src/features/establishments/actions.ts`, `src/features/settings/actions.ts`, `src/features/transactions/scoping.test.ts` | todo |
| B7 | Tests: `locks.test.ts` (assertUnlocked, mocked Prisma) and `auth.test.ts` (requireCanEdit matrix). | `src/features/locks/locks.test.ts`, `src/lib/auth.test.ts` | todo |

## Frontend track (`frontend`)

Build against the contract in `src/lib/validation.ts` + the `queries.ts` signatures in
`docs/BACKEND.md`, using local stub data behind a `USE_STUBS` flag until the matching
backend task lands. Stubs are removed in the wire-up task.

| ID | Task | Files | Status |
|---|---|---|---|
| F1 | Layout, nav, shared components: `Button, Input, Select, Textarea, Card, StatCard, Table, EmptyState, MoneyText, DateText, DirectionBadge, StatusBadge, LockBadge, ConfirmDialog, Toast, Tabs, Pagination`. Role layouts + bottom tab bar / side nav. | `src/components/**`, `src/app/(owner)/layout.tsx`, `src/app/(staff)/layout.tsx`, `src/app/(admin)/layout.tsx`, `src/app/globals.css`, `src/app/layout.tsx` | done |
| F2 | Auth pages: `/login`, `/signup` (two choice cards, then owner/staff form), `/pending`. | `src/app/(auth)/login/page.tsx`, `src/app/(auth)/signup/page.tsx`, `src/app/(auth)/pending/page.tsx`, `src/features/auth/components/**` | done |
| F3 | Owner dashboard: 4 StatCards, balance-by-payment-method table, 6-month IN/OUT bar chart (recharts), top-5 OUT categories with amount and **% of month OUT — guard the divide-by-zero**, a month with no OUT entries is the normal first-month state and `0/0` renders `NaN%`; the percentage needs Western digits and `MoneyText` will not cover it because it is not money. Last 10 movements. recharts is a **client** component: no `server-only` import may cross the boundary, and chart props must be plain serialisable numbers (a `Date` or Prisma `Decimal` reaching a client prop is the usual failure). | `src/app/(owner)/owner/page.tsx`, `src/features/dashboard/components/**` | done |
| F4 | Add / edit entry — shared `TransactionForm`. Direction segmented toggle, **default = last used from localStorage, else صادر** (the *one* sanctioned localStorage use in the app). المبلغ `inputMode="decimal"` + ر.س suffix; `parseSAR` returns `null` rather than throwing and rejects zero, so empty/zero is a field error. التاريخ **defaults to today** and is capped `max` today. التصنيف filtered by direction; طريقة الدفع; الجهة, ملاحظة optional. حفظ · حفظ وإضافة أخرى (new only). Locked month → blocking notice, submit disabled. **`redirect()` throws: *حفظ وإضافة أخرى* deliberately stays on the form, so do not wrap both paths in one `try` — that swallows the save-and-leave navigation** (reviewer item 13b). | `src/app/(owner)/owner/transactions/new/page.tsx`, `src/app/(owner)/owner/transactions/[id]/edit/page.tsx`, `src/features/transactions/components/**` | done |
| F5 | Ledger list: URL-param filters, table on desktop / cards on mobile, footer totals, 50/page, row actions gated by role + lock. | `src/app/(owner)/owner/transactions/page.tsx`, `src/features/transactions/components/**` | todo |
| F6 | Staff area: dashboard, new entry, list (no delete, edit only if `canEdit`), `/staff/account`. | `src/app/(staff)/staff/**` | todo |
| F7 | Reports: month picker / custom range, two by-category tables, net, Excel + print buttons. | `src/app/(owner)/owner/reports/page.tsx`, `src/features/reports/components/**` | todo |
| F8 | Owner settings, 5 tabs: categories, staff, join code, month locks, account. | `src/app/(owner)/owner/settings/page.tsx`, `src/features/settings/components/**` | todo |
| F9 | Admin pages: requests, establishments (search), account. **Never render an amount.** | `src/app/(admin)/admin/**`, `src/features/admin/components/**` | todo |
| F2b | **done.** "already have an account?" link to `/login` on the sign-up form — the leak-free mitigation for B10 telling an employee with a registered email that the join code is wrong. | `src/features/auth/components/**` | done |
| F4b | One cosmetic from the F4 review: an empty amount reports `err.amountPositive` ("must be greater than zero") rather than `err.required`, because the hidden field submits `""` and `Number("")` is `0`. It lands under the right field by the right mechanism; it just names the wrong problem for an untouched form. | `src/features/transactions/components/**` | done |
| F10 | PWA + print CSS: `manifest.json`, icons 192/512, minimal service worker (app shell only, never `/api/*`), print stylesheet. | `public/manifest.json`, `public/icons/**`, `public/sw.js`, `src/app/globals.css` | todo |

## Wire-up tasks (`frontend`) — blocked until both sides land

Each removes the `USE_STUBS` path for its screen and calls the real action/query.

| ID | Screen | Depends on | Status |
|---|---|---|---|
| W1 | Auth pages | B1 + F2 | done — one line, as predicted |
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
| R-B3 | B3 brief + code | brief sent at assignment |
| R-B4 | B4 brief + code | brief sent at assignment |
| R-B8 | B8 brief + code | brief sent at assignment |
| R-B10 | B10 brief + code | brief sent at assignment |
| R-F3 | F3 brief + code | brief sent at assignment |
| R-F4 | F4 brief + code | brief sent at assignment |
| R-W1 | W1 | blocked on W1 |
| R-B1 | B1 | reviewed |
| R-B2 | B2 | reviewed |
| R-F1 | F1 | reviewed |
| R-F2 | F2 | reviewed |

## Checkpoints
Every 3–4 completed tasks the lead merges `progress/*.md` into `PROGRESS.md`, commits as
`phase 1: checkpoint N`, reports to the user, and **waits for approval** before continuing.

- **Checkpoint 1** covers B1, B2, F1, F2, B9 (+ R-B1/R-B2/R-F1/R-F2). — committed 2026-09-29
- **Checkpoint 2** committed 2026-09-29: W1, B3, B4, B8, B9(→B10), B10, F3, F4, F2b + R-B3/R-B4/R-B8/R-B10/R-F3/R-F4. W2 deferred to Checkpoint 3.
- **Checkpoint 3** proposed: W2 (verified to compile), F5 ledger list, B5 admin actions, F4b cosmetics. B11 and B6/B7 still unscheduled. — awaiting user approval
