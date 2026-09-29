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
  establishmentId String?  // null for admin actions
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
2. **Staff sign-up** (`/signup?as=staff`): name, email, password, join code. Looks up Establishment by joinCode (must be active, owner must be ACTIVE). Creates User `{role: STAFF, status: PENDING, establishmentId}`. Staff lands on `/pending`. OWNER approves/rejects in settings. Wrong join code → generic error, and rate-limited like login.
3. **Login**: only `status: ACTIVE` users can log in. PENDING users are redirected to `/pending`; DISABLED users get the generic login error.
4. **Permissions**: OWNER toggles `canEdit` per STAFF user. Effect is immediate (checked server-side on every mutation, not cached in the session).

## Auth
- `src/lib/session.ts`: iron-session. Cookie `ledger_session`: `httpOnly`, `secure` in production, `sameSite: "lax"`, `maxAge: 12h`. Payload `{ userId, role, establishmentId }` only. `canEdit` and `status` are re-read from the DB on every request that needs them.
- `src/lib/auth.ts`:
  - `requireUser()` → loads user from DB, throws/redirects unless `status: ACTIVE`; returns `{ user, establishmentId }`.
  - `requireOwner()`, `requireAdmin()` → `requireUser()` + role check.
  - `requireCanEdit()` → OWNER, or STAFF with `canEdit: true`.
- Login rate limit: in-memory map keyed `ip + email`, 5 failures / 15 min. Same limiter for sign-up and join-code attempts keyed by ip.
- `src/middleware.ts`: no session → `/login` for everything except `/login`, `/signup`, `/pending`, `/api/health`, `/_next/*`, `/manifest.json`, `/icons/*`, `/sw.js`. Role-based route groups: `/admin/*` needs ADMIN, `/owner/*` needs OWNER, `/staff/*` needs STAFF. Middleware is a convenience; the real checks are in `requireX()`.

## Server actions — the contract (`src/features/<feature>/actions.ts`)
Every action: `requireX()` → zod parse → business rules → Prisma (scoped by establishmentId) → AuditLog → `revalidatePath`. Return type is always `ActionResult<T> = { ok: true, data: T } | { ok: false, error: string /* i18n key */, fieldErrors?: Record<string,string> }`.

| Action | Who | Rules |
|---|---|---|
| `signupOwner(input)` | public | creates establishment + pending owner |
| `signupStaff(input)` | public | valid join code; pending staff |
| `login(input)` / `logout()` | public / any | ACTIVE only |
| `createTransaction(input)` | any ACTIVE user in establishment | month not locked; amount > 0; date ≤ today; category active, same establishment, same direction |
| `updateTransaction(id, input)` | `requireCanEdit()` | same as create; both old and new month unlocked; STAFF with canEdit may edit any entry of the establishment |
| `deleteTransaction(id)` | OWNER | month unlocked; soft delete |
| `lockMonth(y,m)` / `unlockMonth(y,m)` | OWNER | not current or future month |
| `createCategory` / `updateCategory` / `setCategoryActive` | OWNER | at least one active category per direction must remain |
| `approveStaff(userId)` / `rejectStaff(userId)` / `setCanEdit(userId, bool)` / `setStaffActive(userId, bool)` / `resetStaffPassword(userId, pw)` | OWNER | target must be STAFF of own establishment |
| `regenerateJoinCode()` | OWNER | — |
| `changeOwnPassword(old, new)` | any | bcrypt compare old |
| `approveOwner(userId)` / `rejectOwner(userId)` | ADMIN | creates default categories on approve |
| `setEstablishmentActive(id, bool)` | ADMIN | disabling blocks login for all its users |
| `resetOwnerPassword(userId, pw)` | ADMIN | — |

## Read queries (`src/features/<feature>/queries.ts`)
Plain async functions used by server components; all take `establishmentId` explicitly (from `requireUser()`), never from params.
- `getOwnerDashboard(estId)` → `{ balanceTotal, balanceByMethod[], monthIn, monthOut, monthNet, topOutCategories[] (this month, top 5), last6Months[] {ym, in, out}, recent[] (10) }`
- `getStaffDashboard(estId, userId)` → `{ monthIn, monthOut, myRecent[] (10), canEdit }`
- `listTransactions(estId, filters, page)` → `{ rows[], total, pageTotals {in,out,net} }` (50/page)
- `getTransaction(estId, id)`
- `getReport(estId, from, to)` → `{ byCategoryIn[], byCategoryOut[], totalIn, totalOut, net }`
- `listCategories(estId)`, `listStaff(estId)`, `listLocks(estId)` (last 24 months with state)
- `getAdminOverview()` → `{ pendingOwners[], establishments[] {id, name, ownerName, ownerEmail, status, staffCount, transactionCount, lastActivityAt} }` — **no amounts**.

## Validation (`src/lib/validation.ts`) — shared contract, lead-owned
Exports zod schemas and inferred types: `SignupOwnerSchema`, `SignupStaffSchema`, `LoginSchema`, `TransactionInputSchema`, `CategoryInputSchema`, `LockInputSchema`, `ChangePasswordSchema`, `TransactionFilterSchema`, `ReportRangeSchema`.
- amountHalalas: int, > 0, ≤ 10_000_000_000 (100M SAR)
- date: ISO date, ≤ today
- password ≥ 10 chars; email lowercased/trimmed; name 2–60 chars; establishment name 2–80 chars; joinCode exactly 8 uppercase alphanumerics
- counterparty ≤ 200, note ≤ 500, trimmed

## API routes (the only ones)
- `GET /api/health` → `{ ok: true }` (no auth)
- `GET /api/export?from=&to=` → OWNER only; exceljs; sheet 1 transactions, sheet 2 totals by category; filename `ledger_<from>_<to>.xlsx`; `Cache-Control: private, no-store`.

## Money and dates (`src/lib/money.ts`, `src/lib/dates.ts`)
- `formatSAR(halalas)` → `"1,234.50 ر.س"` with Western digits (format with `en-US` grouping, never `ar-SA`).
- `parseSAR(str)` → halalas; accepts `1234`, `1234.5`, `1,234.50`; rejects negative, > 2 decimals, NaN.
- `toHijri(date)` → `"1448/04/07 هـ"` Western digits, display only.
- `monthKey(date)` → `{year, month}` in Asia/Riyadh.

## Security (non-negotiable — reviewer checks every task against this list)
1. Every action/query starts with `requireX()`; every establishment-scoped query includes `establishmentId` from the session.
2. Role and `canEdit`/`status` are checked server-side on each mutation from the DB, not from the cookie.
3. zod on every input. Unknown fields stripped.
4. Generic error messages for login, sign-up, and join code — never reveal whether an email exists or which field was wrong. Sign-up with an existing email returns the same generic failure key as any other invalid sign-up.
5. Cookie flags as above; logout clears the cookie; session invalid if user becomes DISABLED or establishment becomes inactive (checked in `requireUser()`).
6. bcrypt cost 12.
7. Headers in `next.config.js`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy: camera=(), geolocation=()`, `Strict-Transport-Security: max-age=63072000; includeSubDomains`, CSP `default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'none'` — if Next.js needs a nonce for its inline scripts, implement nonce-based CSP and log a Decision.
8. Never log bodies, passwords, sessions. Never return stack traces. No external runtime calls, analytics, or third-party scripts.
9. `.env` gitignored; `.env.example` shipped.
10. ADMIN endpoints never return `amountHalalas` or transaction rows.

## Tests (Vitest)
`money.test.ts`, `validation.test.ts`, `locks.test.ts` (assertUnlocked with mocked Prisma), `auth.test.ts` (requireCanEdit matrix: OWNER / STAFF canEdit true / STAFF canEdit false / PENDING).

## Render deployment
`render.yaml` (backend verifies plan names against current Render docs before committing):
```yaml
services:
  - type: web
    name: ledger
    runtime: node
    plan: starter
    buildCommand: npm ci && npx prisma generate && npx prisma migrate deploy && npm run build
    startCommand: npm start
    healthCheckPath: /api/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase: { name: ledger-db, property: connectionString }
      - key: SESSION_SECRET
        generateValue: true
      - key: SEED_ADMIN_EMAIL
        sync: false
      - key: SEED_ADMIN_PASSWORD
        sync: false
databases:
  - name: ledger-db
    plan: basic-256mb
```
- After first deploy: run `npm run seed` once from the Render shell, log in as ADMIN, change the password from the admin page, then delete `SEED_ADMIN_PASSWORD` from env.
- Never `prisma db push` or `migrate reset` against Render. Enable daily backups in the Render dashboard (README step).
