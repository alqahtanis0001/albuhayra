# BACKEND.md

Read `CLAUDE.md` and `PROGRESS.md` first. Owner of this doc: lead. Implementer: `backend` (after the lead's Phase 0).

## Prisma schema
```prisma
enum Role          { ADMIN OWNER STAFF }
enum UserStatus    { PENDING ACTIVE DISABLED }
enum Direction     { IN OUT }
enum PaymentMethod { CASH BANK_TRANSFER MADA STC_PAY OTHER }

model Establishment {
  id        String   @id @default(cuid())
  name      String
  joinCode  String   @unique          // 8 chars, uppercase, no ambiguous letters; owner can regenerate
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  users        User[]
  categories   Category[]
  transactions Transaction[]
  locks        PeriodLock[]
}

model User {
  id              String     @id @default(cuid())
  email           String     @unique
  name            String
  passwordHash    String
  role            Role
  status          UserStatus @default(PENDING)
  canEdit         Boolean    @default(false)   // STAFF only; toggled by OWNER
  establishmentId String?                       // null for ADMIN
  establishment   Establishment? @relation(fields: [establishmentId], references: [id])
  createdAt       DateTime   @default(now())
  transactions    Transaction[]
  locks           PeriodLock[]
  auditLogs       AuditLog[]
}

model Category {
  id              String    @id @default(cuid())
  establishmentId String
  establishment   Establishment @relation(fields: [establishmentId], references: [id])
  nameAr          String
  type            Direction
  active          Boolean   @default(true)
  sortOrder       Int       @default(0)
  transactions    Transaction[]
  @@index([establishmentId, type])
}

model Transaction {
  id              String        @id @default(cuid())
  establishmentId String
  establishment   Establishment @relation(fields: [establishmentId], references: [id])
  date            DateTime      @db.Date
  direction       Direction
  amountHalalas   Int
  categoryId      String
  category        Category      @relation(fields: [categoryId], references: [id])
  paymentMethod   PaymentMethod
  counterparty    String?
  note            String?
  createdById     String
  createdBy       User          @relation(fields: [createdById], references: [id])
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  deletedAt       DateTime?
  @@index([establishmentId, date])
  @@index([establishmentId, deletedAt])
}

model PeriodLock {
  id              String   @id @default(cuid())
  establishmentId String
  establishment   Establishment @relation(fields: [establishmentId], references: [id])
  year            Int
  month           Int      // 1-12
  lockedById      String
  lockedBy        User     @relation(fields: [lockedById], references: [id])
  lockedAt        DateTime @default(now())
  @@unique([establishmentId, year, month])
}

model AuditLog {
  id              String   @id @default(cuid())
  establishmentId String?  // the TARGET establishment on admin actions; null only for an admin action concerning no establishment (none exist today)
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  action          String   // see list below
  entity          String   // Transaction | PeriodLock | User | Category | Establishment
  entityId        String
  before          Json?
  after           Json?
  createdAt       DateTime @default(now())
  @@index([establishmentId, createdAt])
}
```
**`AuditLog.establishmentId` on ADMIN actions carries the TARGET establishment, not null.** The schema comment says "null for admin actions", which is right only for an admin action with no establishment (none exist today). `APPROVE_OWNER`, `REJECT_OWNER`, `DISABLE_ESTABLISHMENT`, `ENABLE_ESTABLISHMENT` and `RESET_PASSWORD` all concern one establishment, and writing null would leave an establishment's audit trail without its own approval in it.

Audit actions: `LOGIN`, `SIGNUP`, `APPROVE_OWNER`, `REJECT_OWNER`, `APPROVE_STAFF`, `REJECT_STAFF`, `SET_CAN_EDIT`, `DISABLE_USER`, `ENABLE_USER`, `RESET_PASSWORD`, `REGENERATE_JOIN_CODE`, `CREATE`, `UPDATE`, `DELETE`, `LOCK`, `UNLOCK`, `CATEGORY_CREATE`, `CATEGORY_UPDATE`, `DISABLE_ESTABLISHMENT`, `ENABLE_ESTABLISHMENT`.

Rules:
- `amountHalalas` > 0 always; direction gives the sign at calculation time.
- `date` is a calendar date; month comparisons use year/month of `date`.
- Soft delete only. All reads filter `deletedAt: null`.
- **Every query on Category / Transaction / PeriodLock / AuditLog includes `establishmentId` taken from the session, never from the client.**

## Seed (`prisma/seed.ts`)
- Creates the ADMIN from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` if no ADMIN exists. Idempotent. ADMIN has `establishmentId: null`, `status: ACTIVE`.
- Default categories are created **per establishment when an owner is approved** (in `approveOwner`), not in the seed:
  - IN: مبيعات, دفعة من عميل, رصيد افتتاحي / رأس مال, أخرى
  - OUT: إيجار, رواتب, مشتريات, كهرباء وماء, اتصالات, صيانة, مواصلات, رسوم حكومية, أخرى

## Sign-up and approval flows
1. **Owner sign-up** (`/signup?as=owner`): name, email, password, establishment name. Creates Establishment (`active: true`, new joinCode) + User `{role: OWNER, status: PENDING}`. Owner lands on `/pending`. ADMIN approves or rejects on the admin page. Reject = `status: DISABLED` and establishment `active: false`.
2. **Staff sign-up** (`/signup?as=staff`): name, email, password, join code. Looks up Establishment by joinCode (must be active, owner must be ACTIVE). Creates User `{role: STAFF, status: PENDING, establishmentId}`. Staff lands on `/pending`. OWNER approves/rejects in settings. **Every** failure returns the same generic `err.joinFailed` — wrong join code, inactive establishment, owner not ACTIVE, and an email that already exists. A caller must not be able to tell which, or the form becomes a join-code oracle (submit a known-taken email: a different key means the code was valid). Rate-limited like login.
3. **Login**: only `status: ACTIVE` users can log in. PENDING users are redirected to `/pending`; DISABLED users get the generic login error.
4. **Permissions**: OWNER toggles `canEdit` per STAFF user. Effect is immediate (checked server-side on every mutation, not cached in the session).

## Auth
- `src/lib/session.ts`: iron-session. Cookie `ledger_session`: `httpOnly`, `secure` in production, `sameSite: "lax"`, `maxAge: 12h`. Payload `{ userId, role, establishmentId }` only. `canEdit` and `status` are re-read from the DB on every request that needs them.
- `src/lib/auth.ts`:
  - `requireUser()` → loads user from DB, throws/redirects unless `status: ACTIVE`; returns `{ user, establishmentId }`.
  - `requireOwner()`, `requireAdmin()` → `requireUser()` + role check.
  - `requireCanEdit()` → OWNER, or STAFF with `canEdit: true`.
- Login rate limit: in-memory map keyed `ip + email`, 5 failures / 15 min. Same limiter for sign-up and join-code attempts keyed by ip.
- `src/proxy.ts` (Next.js 16 renamed `middleware.ts` to `proxy.ts`; same API, export `proxy`): no session → `/login` for everything except `/login`, `/signup`, `/pending`, `/api/health`, `/_next/*`, `/manifest.json`, `/icons/*`, `/sw.js`. Role-based route groups: `/admin/*` needs ADMIN, `/owner/*` needs OWNER, `/staff/*` needs STAFF. Middleware is a convenience; the real checks are in `requireX()`.

## Server actions — the contract (`src/features/<feature>/actions.ts`)
Every action: `requireX()` → zod parse → business rules → Prisma (scoped by establishmentId) → AuditLog → `revalidatePath`. Return type is always `ActionResult<T> = { ok: true, data: T } | { ok: false, error: string /* i18n key */, fieldErrors?: Record<string,string> }`.

**Signature convention — FROZEN 2026-09-29. Do not change without a lead Decision.**
An action that backs a form takes the `useActionState` shape
`(prevState: State, formData: FormData) => Promise<ActionResult<T>>` where `State = ActionResult<T> | null`,
and converts `FormData` → object itself (`Object.fromEntries(formData)`) before handing it to the zod
schema. The form component runs the *same* schema client-side first, so the two cannot drift.
That covers `login`, `signupOwner`, `signupStaff`, `changeOwnPassword`, `createCategory`,
`updateCategory`, `resetStaffPassword`. A form-backed action that operates on a specific row may
take its id **before** the state — `updateCategory(categoryId, prevState, formData)`,
`resetStaffPassword(userId, prevState, formData)` — so the component can bind it with
`.bind(null, id)`; the id then comes from the server component that rendered the row, not from the
submitted form. An action invoked from a button keeps a plain argument list —
`approveStaff(userId)`, `setCanEdit(userId, bool)`, `setCategoryActive(id, bool)`,
`setCategoryOrder(id, dir)`, `regenerateJoinCode()`.

**Auth actions redirect server-side on success** and return `{ ok: false, error }` with a generic key
on failure. `login` redirects to the role home, or to `/pending?as=owner|staff` for a PENDING account;
`signupOwner` / `signupStaff` redirect to `/pending?as=owner|staff`; `logout(): Promise<void>` destroys
the session and redirects to `/login`. `login` never returns `fieldErrors` — naming the wrong field on
a login form is an enumeration leak.

**A PENDING account never gets a session.** That is why the role travels in the `?as=` query
parameter: `/pending` needs it only to say who approves them, and a value a visitor can forge changes
nothing but that sentence. The consequence is accepted deliberately — see the Decision in
`PROGRESS.md` — and `/pending` therefore cannot auto-redirect when the account becomes ACTIVE.

| Action | Who | Rules |
|---|---|---|
| `signupOwner(input)` | public | creates establishment + pending owner |
| `signupStaff(input)` | public | valid join code; pending staff |
| `login(prev, formData)` / `logout()` | public / any | ACTIVE gets a session; PENDING redirects to `/pending?as=…` with no session; DISABLED and inactive establishment get the generic key |
| `createTransaction(prev, formData)` | any ACTIVE user in establishment | month not locked; amount > 0; date ≤ today; category active, same establishment, same direction. **Returns; never redirects** — the form has two outcomes (حفظ leaves, حفظ وإضافة أخرى stays) and only the client knows which was pressed, so the UI navigates |
| `updateTransaction(id, prev, formData)` | `requireCanEdit()` | same as create; both old and new month unlocked; STAFF with canEdit may edit any entry of the establishment. **Update is NOT "same as create" on category.** A category which has since been retired may be **kept** if it is the one the entry already carries — read from the **database**, never from the form, or it is forgeable — but may never be newly **assigned**. The exemption bypasses `active` only: existence, establishment scope and direction are still checked first, so a kept retired category cannot be used to smuggle in a direction mismatch. Without this, a note on a two-year-old entry could not be corrected without silently re-categorising it |
| `deleteTransaction(id)` | OWNER | month unlocked; soft delete |
| `lockMonth(y,m)` / `unlockMonth(y,m)` | OWNER | not current or future month |
| `createCategory` / `updateCategory` / `setCategoryActive` / `setCategoryOrder(id, "UP"\|"DOWN")` | OWNER | at least one active category per direction must remain. Duplicate names are compared against **active** categories only; `createCategory` **reactivates** a matching inactive category rather than inserting a second row, and `setCategoryActive` refuses to reactivate a name an active category already uses. `setCategoryOrder` swaps `sortOrder` with the adjacent **active** category of the same direction — skipping inactive rows, because swapping with a row the owner cannot see makes the visible order appear not to change. At the ends (first item UP, last item DOWN) it is a silent no-op returning `ok: true`; there is deliberately no error key, and the UI disables the arrow instead |
| `approveStaff(userId)` / `rejectStaff(userId)` / `setCanEdit(userId, bool)` / `setStaffActive(userId, bool)` / `resetStaffPassword(userId, prev, formData)` | OWNER | target must be STAFF of own establishment. `resetStaffPassword` is form-backed with a bound id (see the signature convention); the rest are button actions |
| `regenerateJoinCode()` | OWNER | — |
| `changeOwnPassword(prev, formData)` | any | `ChangePasswordSchema`: current + new + confirm; bcrypt compare current |
| `approveOwner(userId)` / `rejectOwner(userId)` | ADMIN | **target must be `status: PENDING`, else `err.forbidden`** — `approveOwner` inserts 13 default categories directly, so a second approval creates a second complete set that no action in the app can clean up, and `rejectOwner` on an ACTIVE owner would deactivate a business with live data. Approve creates the default categories; reject sets the user DISABLED and the establishment inactive |
| `setEstablishmentActive(id, bool)` | ADMIN | disabling blocks login for all its users (enforced in `requireUser()`; do not duplicate). **ADMIN actions are the one place an id legitimately comes from the client** — ADMIN has `establishmentId: null`, so Security rules 1-2 and the B3 gate do not apply. What replaces the session scope: zod on the id, a `findUnique`/`findFirst` confirming the row exists before the write, and `requireAdmin()` as the sole authorisation. Do not invent a session scope here, and do not omit the existence check |
| `resetOwnerPassword(userId, pw)` | ADMIN | — |

## Read queries (`src/features/<feature>/queries.ts`)
Plain async functions used by server components; all take `establishmentId` explicitly (from `requireUser()`), never from params.
**Naming rule — every money-valued field carries a `Halalas` suffix.** The unit belongs in the name:
these are integers in halalas, never SAR, and a field called `total` invites someone to format it as
riyals. It also avoids `in` as a property name, which cannot be destructured because `in` is a
reserved word. Non-money fields (counts, `ym`, ids) keep their plain names.

- `getOwnerDashboard(estId)` → `{ balanceTotalHalalas, balanceByMethod[] {method, balanceHalalas}, monthInHalalas, monthOutHalalas, monthNetHalalas, topOutCategories[] {categoryId, nameAr, totalHalalas} (this month, top 5 — **no percentage**, that is a presentation decision because of the divide-by-zero case), last6Months[] {ym, inHalalas, outHalalas}, recent[] (10) }`
- `getStaffDashboard(estId, userId)` → `{ monthInHalalas, monthOutHalalas, myRecent[] (10), canEdit }`
- `listTransactions(estId, filters)` → `{ rows[], total, filterTotals { inHalalas, outHalalas, netHalalas } }` (`PAGE_SIZE` 50). **Renamed from `pageTotals`**: it holds the totals of the whole *filtered* set, and the old name argued against its own invariant — a reader seeing `pageTotals` beside "footer totals" reaches for the page's rows, which is exactly the bug the multi-page test guards. The name now enforces the requirement without needing the comment. **No third `page` argument** — `TransactionFilterSchema` already carries `page` with a default of 1, and F5 parses URL search params straight through that schema, so a separate parameter would give one value two sources that can disagree.
- **Every exported query return type must be serialisable.** No `Date` (and no Prisma `Decimal`) may appear in a shape a server component passes to a client component — it throws at the boundary. Dates cross as ISO strings. Which helper depends on the column: a `@db.Date` calendar date uses `dateToISO()` (UTC getters, correct for a stored day), while a `DateTime` **instant** — `lockedAt`, `createdAt` — uses `todayISO(instant)`, the Riyadh formatter. Using `dateToISO()` on an instant reports the previous day for anything before 03:00 Riyadh.
- `getTransaction(estId, id)`
- `getReport(estId, from, to)` → `{ byCategoryIn[] {categoryId, nameAr, totalHalalas}, byCategoryOut[] {…}, totalInHalalas, totalOutHalalas, netHalalas }`
- `listCategories(estId)`, `listStaff(estId)`, `listLocks(estId)` (last 24 months with state)
- `getAdminOverview()` → `{ pendingOwners[], establishments[] {id, name, **ownerUserId**, ownerName, ownerEmail, status, staffCount, transactionCount, lastActivityAt} }` — **no amounts**. `ownerUserId` is required by the إعادة تعيين كلمة مرور المالك button, which binds `resetOwnerPassword(userId, …)`; the field list originally omitted it while `docs/FRONTEND.md` specified the button. An id is not an amount, so rule 10 is unaffected.

## Validation (`src/lib/validation.ts`) — shared contract, lead-owned
Exports zod schemas and inferred types: `SignupOwnerSchema`, `SignupStaffSchema`, `LoginSchema`, `TransactionInputSchema`, `CategoryInputSchema`, `LockInputSchema`, `ChangePasswordSchema`, `TransactionFilterSchema`, `ReportRangeSchema`.
- amountHalalas: int, > 0, ≤ 10_000_000_000 (100M SAR)
- date: ISO date, ≤ today
- password ≥ 10 chars; email lowercased/trimmed; name 2–60 chars; establishment name 2–80 chars; joinCode exactly 8 uppercase alphanumerics
- counterparty ≤ 200, note ≤ 500, trimmed

## API routes (the only ones)
- `GET /api/health` → `{ ok: true }` (no auth)
- `GET /api/export?from=&to=` → OWNER only; `ReportRangeSchema` on the params; exceljs; **sheet 1 transactions, sheet 2 totals by category**; filename `ledger_<from>_<to>.xlsx` via `Content-Disposition: attachment`; `Cache-Control: private, no-store`.
  - **It must reuse `listTransactions` / `getReport` rather than querying Prisma directly**, so it inherits `ledgerWhere` and is covered by the B3 scoping gate by construction. The export writes *every matching row* to a file the owner keeps and forwards, so a soft-deleted entry reappearing there is the undetectable-wrong-number class in the format most likely to be treated as authoritative. Add `src/app/api/export/route.ts` to the gate's `FILES` list either way.
  - `ReportRangeSchema` caps the span at `MAX_REPORT_SPAN_DAYS` (366) with `err.rangeTooLong` — exceljs holds the whole workbook in memory, and an unbounded range on a free-tier database is a timeout rather than a slow download.
  - `requireOwner()` works by `redirect()`, so a signed-out or wrong-role request returns **307 to `/login`, not 403**. That fails closed and is intended, but it is the first time these helpers run outside a page or action — confirm it rather than assume it.

## Money and dates (`src/lib/money.ts`, `src/lib/dates.ts`)
- `formatSAR(halalas)` → `"1,234.50 ر.س"` with Western digits (format with `en-US` grouping, never `ar-SA`).
- `parseSAR(str)` → halalas; accepts `1234`, `1234.5`, `1,234.50`; rejects negative, > 2 decimals, NaN.
- `toHijri(date)` → `"1448/04/07 هـ"` Western digits, display only.
- `monthKey(date)` → `{year, month}` in Asia/Riyadh.

## Security (non-negotiable — reviewer checks every task against this list)
1. Every action/query starts with `requireX()`; every establishment-scoped query includes `establishmentId` from the session.
2. Role and `canEdit`/`status` are checked server-side on each mutation from the DB, not from the cookie.
2b. **A scoped write carries its own tenant boundary.** On Category / Transaction / PeriodLock, use
   `updateMany({ where: { id, establishmentId } })` and `updateMany`/`deleteMany` for soft deletes —
   never `update({ where: { id } })` after a scoped `findFirst`. Prisma's `update` demands a *unique*
   `where`, and `{ id, establishmentId }` is not unique, so `update` structurally cannot carry the
   scope: it can only be made safe by trusting the read above it. `updateMany` accepts the compound
   filter, so the database enforces the boundary on every write. A write that affects 0 rows means the
   id was not the caller's and returns `err.notFound`. This also keeps the scoping test uniform — no
   "this call is safe because of the line above it" exceptions, which is how such a test rots.
3. zod on every input. Unknown fields stripped.
4. Generic error messages for login, sign-up, and join code — never reveal whether an email exists or which field was wrong. Sign-up with an existing email returns the same generic failure key as any other invalid sign-up. **This is not tradeable against usability.** Two failure paths in one form that return different keys are an enumeration oracle even when each key is individually generic; a large keyspace and a rate limiter do not make it acceptable.
5. Cookie flags as above; logout clears the cookie; session invalid if user becomes DISABLED or establishment becomes inactive (checked in `requireUser()`).
6. bcrypt cost 12.
7. Constant headers in `next.config.mjs`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy: camera=(), geolocation=(), microphone=()`, `Strict-Transport-Security: max-age=63072000; includeSubDomains`.
   CSP is set in `src/proxy.ts`, not in the config, because it carries a per-request nonce: Next.js emits two inline `<script>` tags for the hydration payload, so a flat `script-src 'self'` blocks hydration (verified on this version — see the Decision in `PROGRESS.md`). The policy is
   `default-src 'self'; script-src 'self' 'nonce-<n>' 'strict-dynamic'; worker-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests`
   **`worker-src 'self'` is not optional.** CSP resolves a worker through `worker-src` → `child-src` → `script-src` → `default-src`; with neither of the first two present it lands on `script-src`, whose `'strict-dynamic'` makes `'self'` inert — so `navigator.serviceWorker.register('/sw.js')` is refused. Dev takes the `'unsafe-eval'` branch, where `'self'` still applies, so the worker registers locally and fails **only** in production, silently.
   (dev swaps `'strict-dynamic'` for `'unsafe-eval'`, which React needs only in development). **A nonce only reaches a dynamically rendered page** — every page that calls `requireX()` is dynamic already, so do not add `export const revalidate` or make any page static.
8. Never log bodies, passwords, sessions. Never return stack traces. No external runtime calls, analytics, or third-party scripts.
9. `.env` gitignored; `.env.example` shipped.
10. ADMIN endpoints never return `amountHalalas` or transaction rows.

## Tests (Vitest)
`money.test.ts`, `validation.test.ts`, `locks.test.ts` (assertUnlocked with mocked Prisma), `auth.test.ts` (requireCanEdit matrix: OWNER / STAFF canEdit true / STAFF canEdit false / PENDING).

## Render deployment
Render runs the **web service only**. The database is **Neon** (external, serverless Postgres), so `render.yaml` has no `databases:` block and `DATABASE_URL` is a plain secret you paste into the Render dashboard.

`render.yaml` in the repo root is the source of truth; it is not copied here, because the copy that used to live here drifted (`plan: starter`, a generated `SESSION_SECRET`, seed variables). What it must keep:
- `plan: free`, no `databases:` block, `healthCheckPath: /api/health`.
- `buildCommand: npm ci --include=dev && npx prisma migrate deploy && npm run build`. `--include=dev` is required: `NODE_ENV=production` is visible at build time, and without it `npm ci` skips the devDependencies the build needs (`prisma`, `typescript`, `tailwindcss`). **No seed in the build** — the ADMIN already exists in Neon.
- `DATABASE_URL`, `DIRECT_URL` and `SESSION_SECRET` are all `sync: false`, pasted in the dashboard. No `SEED_ADMIN_*` on Render.
- **`DATABASE_URL` is Neon's pooled string** (host with `-pooler`), used by the app at runtime: Render opens a connection per instance and Neon's free tier caps direct connections. **`DIRECT_URL` is the direct string** (no `-pooler`), used only by `prisma migrate deploy` via `prisma.config.ts`, because migrate takes a session-level advisory lock that the pooler's transaction mode cannot hold. Locally `DIRECT_URL` may be unset; the config falls back to `DATABASE_URL`. `sslmode=require` is mandatory on both; keep `channel_binding=require` if Neon supplies it.
- `migrate deploy` runs in the build command, so a deploy applies pending migrations automatically. It is safe to re-run: applied migrations are skipped.
- The seed never runs on Render (the free plan has no shell). If an ADMIN ever has to be created again, run `npm run seed` from a developer machine whose `.env` points at the Neon database, then remove `SEED_ADMIN_PASSWORD` from that `.env`.
- Never `prisma db push` or `migrate reset` against the Neon database. **Backups are Neon's job, not Render's** — the old "enable daily backups in the Render dashboard" step does not apply. Set the retention window in the Neon console (free tier keeps a short history), and note that the free tier also suspends an idle compute, so the first request after a quiet period pays a cold start.
