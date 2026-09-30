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
- amountHalalas: int, > 0, ≤ 2_000_000_000 (20M SAR — lowered in v1.2a: every money column is int4, max ≈ 21.47M SAR)
- date: ISO date, ≤ today
- password ≥ 10 chars; email lowercased/trimmed; name 2–60 chars; establishment name 2–80 chars; joinCode exactly 8 uppercase alphanumerics
- counterparty ≤ 200, note ≤ 500, trimmed

## API routes (the only ones)
- `GET /api/health` → `{ ok: true }` (no auth)
- `GET /api/export?from=&to=` → OWNER only; `ReportRangeSchema` on the params; exceljs; **three sheets (v1.1c)** — «الحركات», «الملخص», «معلومات» — specified in *Export workbook* below; filename `ledger_<from>_<to>.xlsx` via `Content-Disposition: attachment`; `Cache-Control: private, no-store`.
  - **It must reuse `listTransactions` / `getReport` rather than querying Prisma directly**, so it inherits `ledgerWhere` and is covered by the B3 scoping gate by construction. The export writes *every matching row* to a file the owner keeps and forwards, so a soft-deleted entry reappearing there is the undetectable-wrong-number class in the format most likely to be treated as authoritative. Add `src/app/api/export/route.ts` to the gate's `FILES` list either way.
  - `ReportRangeSchema` caps the span at `MAX_REPORT_SPAN_DAYS` (366) with `err.rangeTooLong` — exceljs holds the whole workbook in memory, and an unbounded range on a free-tier database is a timeout rather than a slow download.
  - `requireOwner()` works by `redirect()`, so a signed-out or wrong-role request returns **307 to `/login`, not 403**. That fails closed and is intended, but it is the first time these helpers run outside a page or action — confirm it rather than assume it.

### Export workbook (v1.1c)
Every label comes from `src/i18n/ar.ts` (`t.export.*`, plus existing keys). All sheets `views: [{ rightToLeft: true }]`.
- **«الحركات»:** rows 1–3 a title block — `t.export.ledgerTitle`; the establishment name; «الفترة: من … إلى …» and «تاريخ الإنشاء»; row 4 empty; **row 5 the header**, bold white on `006C35`, frozen below it, autofilter on it; column widths sized to content. Date column holds **real Excel dates** (a `Date` at UTC midnight with a date `numFmt`, never text). Amount column is numeric riyals, **signed** (IN positive, OUT negative), `numFmt` `#,##0.00 "ر.س"` built from `t.common.currency`; IN rows green font, OUT rows red `B91C1C`; zebra rows light grey. After one blank row, three totals rows under the amount column (labels merged A:B): IN = `SUMIF(range,">0")`, OUT = `SUMIF(range,"<0")`, net = `SUM(range)`, each written as `{ formula, result }` with the result summed in integer halalas, so viewers that do not recalculate still show the number. The autofilter covers header + data only; the totals ignore an active filter and are always whole-period totals. An empty period writes plain `0`s, never a formula (a formula over zero rows would reference itself). Generated-at is Riyadh time written as text (Excel has no time zone). Zebra `#FAFAFA` (the IN green fails 4.5:1 on Excel's usual `#F2F2F2`).
- **«الملخص»:** وارد by category and صادر by category (صادر negative, as on sheet 1), same styling, each with a `SUM` totals row, then a net cell (`in + out`); under them a small «حسب طريقة الدفع» table. The payment-method breakdown is **derived in the route from the rows `listTransactions` already returned** — no new Prisma call.
- **«معلومات»:** establishment, period, generated-by (the owner's name from `requireOwner()`), generated-at, app version (`package.json`).
- **Tests pin the numbers, not only the layout:** `export.test.ts` evaluates every formula on sheets 1–2 from the loaded cells and requires it to equal its cached result (desktop Excel recalculates on open, so a wrong formula would show the owner a wrong number while a cached-result check stayed green); a source scan fails any `@/lib/db`, relative `lib/db`, `@prisma/*` or `generated/prisma` import and any `db.`/`tx.`/`client.` call under `src/app/api/export/`.
- Invariants unchanged: `requireOwner()` first; establishment from the session only; data only via `listTransactions` / `getReport`; no `db.` call anywhere under `src/app/api/export/**`; `Cache-Control: private, no-store`. Workbook-building code may live in a module beside the route (`src/app/api/export/workbook.ts`) to stay under ~250 lines per file.

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
10. ADMIN endpoints never return `amountHalalas` or transaction rows — **and (v1.2a) nothing from `Party`, `Project`, `Plan` or `Instalment`: no rows, names or counts.**
11. **(v1.2a) No enumeration across establishments.** Every by-id read or write of a party, project, plan or instalment carries the session's `establishmentId`; another establishment's id behaves exactly like a nonexistent one. Nothing lists, searches or counts them across establishments.

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

## Email verification, password reset, sign-up quality (v1.1e)
Scope ruling and stack Decisions in `PROGRESS.md` (Brevo REST, no SDK; PGlite dev-only; expand-only migration; no enumeration anywhere). Strings are in `src/i18n/ar.ts` (`t.err.*`, `t.signupForm.*`, `t.verify.*`, `t.forgot.*`, `t.reset.*`, `t.mail.*`, `t.status.verified`).

### Data (schema contract is in `prisma/schema.prisma`)
- `User.firstName` / `middleName?` / `lastName`, `User.emailVerifiedAt?`, `User.legacyName` (`@map("name")`, nullable — the old column, kept for the expand step), model `EmailCode` (`VERIFY` | `RESET`).
- **Migration `prisma/migrations/<timestamp>_v1_1e_email_names/`** — generated with `prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script` (no database needed), then hand-edited to backfill **in the same file**: split `name` on whitespace after `trim` — first word → `firstName`, last word → `lastName` (empty when the name is one word), words between → `middleName` (null when none); `emailVerifiedAt = now()` for every existing row; drop `NOT NULL` on `name`. Expand-only: nothing the previous release reads is removed. **Tested with PGlite** (apply `20260929000000_init`, seed rows with 1-, 2-, 3- and 4-word names, extra spaces, Arabic and Latin, then apply the new migration and assert every column). **Nobody applies it to Neon but the user** — Render's build runs `migrate deploy` on push.
- A later *contract* migration (not v1.1e) drops `name` once v1.1e is live.

### Names — `src/lib/names.ts`
- `displayName({ firstName, lastName })` = first + " " + last (trimmed). `fullName` adds the middle name between. **Display name everywhere; full name on the admin and owner lists.**
- `AuthedUser` drops `name` and gains `firstName`, `middleName`, `lastName`, `displayName`. Query fields keep their names where they already carry a display string (`createdByName`, `lockedByName`, export `generatedBy` → display name); list rows gain `fullName` (admin pending owners, admin establishments' `ownerName`, owner staff list) and `emailVerified: boolean`.

### Validation — `src/lib/validation.ts` (shared) + server-only helpers
Every rule returns its own `err.*` key, so the form can say exactly which rule failed.
- **Name part** (first, middle if present, last): trim + collapse spaces + NFC; 2–30 characters (`err.nameShort` / `err.nameLong`); any digit, ASCII or Arabic-Indic (`\p{Nd}`) → `err.nameDigits`; otherwise only Arabic letters (incl. harakat), Latin letters, space, hyphen, apostrophe → `err.nameChars`; the same character three times in a row → `err.nameRepeated`; the whole part (case-insensitive) in a small junk list — `asd`, `asdf`, `test`, `tester`, `qwe`, `qwerty`, `aaa`, `xxx`, `abc`, `zzz`, `name`, `user`, `تجربة`, `اختبار`, `اسم` … → `err.nameJunk`; first and last equal after normalising → `err.nameFirstLastSame` (reported on `lastName`).
- **Password:** at least 10 characters (`err.passwordShort`); at most **72 UTF-8 bytes** (`err.passwordLong`) — bcrypt silently ignores bytes past 72 and an Arabic letter is 2 bytes, so a character limit would let two different passwords collide; at least one letter (`\p{L}`) and one digit (after normalising Arabic-Indic digits) → `err.passwordLetterDigit`; contains, case-insensitively, the email's local part or any name part of 3+ characters → `err.passwordPersonal`; in the bundled list of the 10,000 most common passwords → `err.passwordCommon`.
  - The list is `src/lib/passwords/common.txt` — SecLists `100k-most-used-passwords-NCSC.txt` (MIT, pinned commit in `src/lib/passwords/README.md`; chosen over the 10k list because only 5 of its entries survive our other rules) — compared on the normalised, lower-cased copy. See A12 for how it is shipped.
  - `passwordStrength(password, { email, names, common? })` — pure, shared by the meter and the tests: `weak` while any rule fails, `strong` when every rule passes and the password is 14+ characters or mixes 3+ character classes, else `fair`. The schema and the meter call the same rule functions.
- **Email:** trim + lower-case; zod email shape (`err.emailInvalid`); `..` anywhere → `err.emailDots`; domain without a dot → `err.emailDomain`; domain in `src/lib/emails/disposable.txt` (a few hundred entries from the CC0 `disposable-email-domains` project; credit in a README beside it; server-only) → `err.emailDisposable`. `emailTypoSuggestion(email)` — pure, a small map (`gmial.com`, `gmai.com`, `gmail.co`, `gmail.con`, `hotmial.com`, `hotmail.co`, `outlok.com`, `yahooo.com`, `icloud.co` …) → the corrected address or `null`. A hint only, never a rejection.
- Sign-up schemas: `SignupOwnerSchema` = `firstName`, `middleName?`, `lastName`, `email`, `password`, `confirmPassword`, `establishmentName`; `SignupStaffSchema` the same with `joinCode`. Cross-field rules (`passwordMismatch`, `passwordPersonal`, `nameFirstLastSame`) in `superRefine`, reported on the field the user must change.

### Codes — `src/lib/codes.ts` (server-only)
- 6 digits from `crypto.randomInt(0, 1_000_000)`, zero-padded. Stored as `HMAC-SHA256(SESSION_SECRET, userId:purpose:code)`; compared with `timingSafeEqual`. The code itself is never stored, logged or returned.
- Valid 10 minutes. 5 wrong attempts burn it (`attempts` incremented with a conditional `updateMany … where attempts < 5`, so two parallel guesses cannot both slip under the cap). Resend allowed 60 s after `sentAt`; a resend consumes the old code and issues a new one — at most one live code per user and purpose.

### Flow cookie — `src/lib/session.ts`
- A second iron-session cookie (`zk_flow`, httpOnly, `secure` in production, `sameSite: lax`, 30 min) carrying either `{ verify: { userId, email } }` or `{ reset: { email } }`. It identifies a flow in progress; it never grants access to data. `requireUser()` does not read it.

### Actions — `src/features/auth/actions.ts` (the contract; all `(prev, formData)` unless noted)
- **`signupOwner` / `signupStaff`** — validate (schema + server-only common-password and disposable checks). **Always** end the same way: set the flow cookie, `redirect("/verify")`.
  - New address: create the PENDING user (and the establishment for an owner) with `emailVerifiedAt: null`, issue a VERIFY code, send the verification email.
  - Address already registered: **no write**; send that address the `t.mail.existsSubject` email instead of a code; the flow cookie carries a random id that matches no user, so `/verify` behaves identically and no code ever succeeds. The bcrypt hash and the same number of queries run on both paths.
  - Staff: a bad or inactive join code, or an owner not ACTIVE, is still `err.joinFailed` (B10 unchanged).
- **`verifyEmail`** (`code`) — rate-limited; errors `err.codeFormat` / `err.codeInvalid` / `err.codeExpired` / `err.codeAttempts` / `err.verifySessionExpired`. **Specific errors are safe only because the fake flow (sign-up with a registered address) runs the identical state machine** — see *Amendments* (A1). Success: `emailVerifiedAt = now()`, code consumed, audit `EMAIL_VERIFIED`, flow cookie cleared, `redirect("/pending?as=owner|staff")`.
- **`resendVerification()`** — button action; rate-limited; before 60 s → `err.resendTooSoon`; returns `{ ok: true, data: { retryAfterSeconds: 60 } }`. For the random-id flow it waits the same and sends nothing.
- **`requestPasswordReset`** (`email`) — rate-limited; always `{ ok: true }` (the page shows `t.forgot.sent`) and always sets `{ reset: { email } }`; issues a RESET code and sends it only if the address exists. Same work on both paths.
- **`resetPassword`** (`code`, `newPassword`, `confirmPassword`) — rate-limited; every code failure (wrong, expired, burnt, unknown address, no cookie) is the single `err.codeInvalidOrExpired`; password rules in the order of *Amendments* (A3) — the name rule runs only after the code is proven. Success: new hash, code consumed, `emailVerifiedAt` set if it was null (the code proved the address), audit `PASSWORD_RESET_SELF`, cookie cleared, `redirect("/login?reset=1")`. Manual resets by ADMIN/OWNER are unchanged.
- **`login`** — a correct password on an unverified account sets `{ verify }`, issues a code if none is live, and redirects to `/verify` — never to a dashboard. Wrong password unchanged (`err.loginFailed`).

### Gates
- `requireUser()`: an account with `emailVerifiedAt = null` never gets past it — forget the session, `redirect(SIGNED_OUT_LOGIN_PATH)` (not `/verify`: a render cannot clear the cookie, so `/verify` would loop through the proxy; `/login` re-enters the flow — see A8). (Defence in depth: such an account is never issued a session in the first place.) Pinned by `src/lib/auth.test.ts`.
- `approveOwner` / `approveStaff` refuse an unverified account with `err.emailNotVerified`.
- `src/proxy.ts`: `/forgot` and `/reset` join the signed-out paths; `/verify` joins the open paths.
- Rate limits: the login limiter (5 failures per 15 min per IP) also guards `verifyEmail`, `resendVerification`, `requestPasswordReset`, `resetPassword`.

### Email — `src/lib/mail/**` (server-only)
- `sendMail({ to, subject, html, text })` → `POST https://api.brevo.com/v3/smtp/email` with `api-key: BREVO_API_KEY`, sender `{ name: t.mail.senderName, email: MAIL_FROM }`, `AbortSignal.timeout(10_000)`. Without `BREVO_API_KEY` it logs once that mail is disabled and returns (local development).
- **Sending happens after the database write and after the response:** schedule it with `after()` from `next/server`; never `await` it in the response path. Failures are logged as status + Brevo error code only — never the API key, the code, or the full recipient (domain at most).
- Templates (`verify`, `reset`, `exists`): Arabic, `dir="rtl" lang="ar"`, plain HTML with inline styles, the green wordmark as `<img src="${APP_URL}/brand/zakham-brand/zakham-wordmark-green.png" alt="زخم">` (text-only when `APP_URL` is unset), the code large with `dir="ltr"` and Western digits, the expiry line, the ignore line, plus a plain-text part. All text from `t.mail.*`.

### Tests (v1.1e)
Codes (hash never equals the code, expiry, 5-attempt cap under parallel guesses, 60 s resend, one live code), the `requireUser` verification gate, approval refusal, every name/password/email rule with its exact key (including the common-password and disposable lists and the generated-module equality), the generic messages (`/forgot`, `/reset`, existing-email sign-up — same result shape and the same query count on both paths), mail scheduling (sent via `after`, never awaited, no secret in logs), and the migration split on PGlite.

### Amendments after the pre-code review (binding — they override the text above)
- **A1 — The fake flow is a perfect twin.** For a sign-up with a registered address, `codes.ts` keeps an in-memory `Map` keyed by the flow id (`{ sentAt, expiresAt, attempts, issued }`, swept like `rateLimit.ts`) and runs **the same transitions** as a real code: 5 wrong → `codeAttempts`, 10 min → `codeExpired`, resend inside 60 s → `resendTooSoon`, resend resets. The same database statements run too (they match zero rows), so the query count is equal. Test: one script drives both flows (5 wrong, +10 min, resend at 30 s and 61 s, wrong after resend) and asserts identical results.
- **A2 — Limiter parity.** Neither sign-up action calls `clearAttempts` any more (it would make the exists path hit `tooManyAttempts` where the new path never does). Any cap that stops a send stops it **silently** and returns the same response.
- **A3 — `resetPassword` order:** (1) rules needing no account — length, bytes, letter+digit, common, email local part; (2) the code check → `err.codeInvalidOrExpired`; (3) the name rule, only once the code is proven. Test: an unknown email with a name-bearing password answers `codeInvalidOrExpired`.
- **A4 — Caps across codes (per user and purpose, rolling 24 h, no schema change — counted from `EmailCode` rows):** at most **5 codes issued** (then send nothing, silently); once the **summed attempts reach 10**, every code is burnt. RESET gets the same **60 s resend gate** as VERIFY. `resetPassword` is limited per cookie email **and** per IP. The fake flow emulates the same caps. Mutation-test the cap.
- **A5 — Increment first, compare second.** `updateMany where { id, consumedAt: null, expiresAt > now, attempts < 5 } → attempts + 1`; count 0 ⇒ burnt/expired; only then compare the HMAC. Success: `updateMany where { id, consumedAt: null } → consumedAt` requiring `count === 1`, in the same `$transaction` as the user write (a double submit consumes once). Read only the newest unconsumed code (`orderBy sentAt desc, take 1`).
- **A6 — Timing.** Every branch that depends on the address runs inside `after()`: the response path of `signupOwner`/`signupStaff` is validate → bcrypt → (staff) join-code check → flow cookie with a pre-made `randomUUID()` id → `redirect("/verify")`; creating the user (with that id), the establishment, the code and the email all happen in `after()`. `requestPasswordReset` likewise. `after()` is scheduled only after the transaction it depends on commits (it runs even when the response redirects or errors); failures inside it are logged (no secrets) and the flow simply never produces a working code — the user can retry. Tests mock `after` from `next/server` (it throws outside a request).
- **A7 — Limiter keys** (each consumed identically on real and fake paths): `verify:{flowId}` + `verify:{ip}`, `resend:{flowId}`, `forgot:{ip}`, `reset:{email}` + `reset:{ip}`. **Mail caps** (Brevo's free plan is 300/day): `mail:{ip}` per day and `mailto:{email}` per hour via a `windowMs` option on `consumeAttempt`; when hit, skip the send silently. In production a missing `BREVO_API_KEY` logs at error level on every send.
- **A8 — Login order:** wrong password → `err.loginFailed`; DISABLED or inactive establishment → `err.loginFailed`; unverified → flow cookie + `/verify`; PENDING → `/pending`. After `verifyEmail`, route by the database status: PENDING → `/pending?as=…&verified=1` (shows `t.verify.done`), ACTIVE → `/login`. `resetPassword` success → `/login?reset=1` (shows `t.reset.done`). `zk_flow` is cleared on login and logout, and its payload shape is disjoint from the session's (no top-level `userId`) — tested.
- **A9 — Expand-step gaps:** every v1.1e create **dual-writes** `legacyName = fullName`; `displayName` falls back to `legacyName` when `firstName` is `''` (rows the old release inserts during Render's build). The contract migration re-splits rows with `firstName = ''` before dropping the column.
- **A10 — Migration split, locale-proof:** trim and split on an explicit class `[\s\u00A0\u2000-\u200B\u202F\u205F\u3000\uFEFF]+` (Postgres `trim()` strips only U+0020 and `\s` differs from JS); before splitting, glue the connectors `عبد|أبو|ابو|آل|بن|ابن` to the following word with a placeholder and restore the space afterwards (so «عبد الله محمد القحطاني» → first «عبد الله», last «القحطاني»; «محمد بن سلمان آل سعود» → first «محمد», middle «بن سلمان», last «آل سعود»); `NULLIF(…, '')` on the middle. PGlite cases: NBSP, tab, double spaces, empty and whitespace-only names, 1/2/3/4/6 words, the two examples above, Latin names.
- **A11 — Validation corrections:** normalise names (and email, join code) before checking: NFKC, strip tatweel (U+0640) and bidi/zero-width marks (U+200B–U+200F, U+202A–U+202E, U+2066–U+2069, U+061C, U+FEFF), collapse spaces, trim. Name characters: must match `/^[\p{L}\p{M} '\-’]+$/u` and must not match `/[^\p{sc=Arabic}\p{sc=Latin}\P{L}]/u`; at least 2 **letters**; lengths counted in letters; repeat check case-insensitive. Email local-part rule: split the local part on `[._+-]` and check only tokens of 3+ characters. `err.emailDots`/`err.emailDomain` run **before** `z.email()` (zod 4 rejects both first). The account-free password rules (72 bytes, letter+digit, common) apply to **every** place a password is set — the shared `password` const also feeds change-password and admin/owner resets. The password that is hashed is never normalised; only the copy used for checks is.
- **A12 — The common list (amended after R-G1, user's constraint: client-side only on `/signup` and `/reset`):** `common.txt` is the full SecLists NCSC 100k list (MIT); `common.generated.ts` holds only the entries that could pass every other rule (≈5.9k, ~70 KB), with a test that it rejects exactly what the full list would. **Nothing under `src/lib/validation/**` imports it** (a static import, even as a default parameter, puts it in every client bundle that imports the barrel): `passwordBaseError`/`passwordError`/`passwordStrength` take the set from the caller (default: empty set); the shared `newPassword` schema has no common check; every password-setting server action (both sign-ups, reset, change password, owner-resets-staff, admin-resets-owner) calls a server-side `commonPasswordError()` that imports the generated module; on the client only `PasswordFields.tsx` imports it. Gates: a test that no file under `src/lib/validation/**` imports `passwords/common`, and after a build the list's marker entry appears only in the `/signup` and `/reset` client manifests. Disposable domains match the domain and every parent domain.
- **A13 — Contract additions:** `getVerifyFlow(): Promise<{ email: string; resendInSeconds: number } | null>` (read for `/verify`); `resendVerification(prev: ResendState): Promise<ActionResult<{ retryAfterSeconds: number }>>`; `prisma/seed.ts` writes the name parts, `legacyName` and `emailVerifiedAt` (else a freshly seeded ADMIN is locked out by the gate) — `backend`'s. HMAC key derived from `SESSION_SECRET` (e.g. HKDF with a fixed label), equal-length Buffers into `timingSafeEqual`; rotating the secret voids live codes (fine). No user-supplied text in any email template.
- **A14 — File size:** `src/features/auth/actions.ts` and `src/lib/validation.ts` will pass ~250 lines; split by concern (`src/features/auth/actions/{login,signup,verify,reset}.ts`, `src/lib/validation/{names,password,email,index}.ts`) keeping the existing import paths working (`@/features/auth/components/actions` stays the forms' single import point; `@/lib/validation` re-exports).

## v1.2a — navigation, الجهات, إضافة, الاتفاقيات, المستحقات
Scope ruling, release plan and Decisions in `PROGRESS.md` (v1.2a). Schema contract: `prisma/schema.prisma` (models `Party`, `Project`, `Plan`, `Instalment`; `Transaction.partyId/projectId/instalmentId`). Validation contract: `src/lib/validation/{primitives,parties,plans}.ts` via `@/lib/validation`. Strings: `src/i18n/ar.v12a.ts`, spread into `t` (`t.parties.*`, `t.projects.*`, `t.plans.*`, `t.dues.*`, `t.err.*` …). Feature folders: `src/features/parties`, `src/features/projects`, `src/features/plans`. Delivered in two checkpoints: **CP1** = navigation, parties, projects, transaction links; **CP2** = plans, instalments, payments, dues, statements, home widgets.

### Migration (CP1) — expand-only
- `prisma/migrations/20261001000000_v1_2a_parties_projects_plans/` generated with `prisma migrate diff --from-schema <HEAD's schema.prisma> --to-schema prisma/schema.prisma --script` (Gotcha: `--from-migrations` needs a shadow DB). **Only additions:** 3 enums, 4 tables, 3 nullable columns + FKs + indexes on `Transaction`. The previous release keeps inserting transactions without the new columns — local and production share one Neon database and Render serves the old release while it builds.
- **PGlite test** (a sibling of `src/lib/migration.test.ts`): apply init → v1.1e → v1.2a; an old-shape `INSERT INTO "Transaction"` (no new columns) still succeeds; a transaction can reference a party/project/instalment; FKs refuse a dangling id; applying all migrations equals `--from-empty` of the schema (drift check). **Nobody applies it to Neon but the user** (Render's `migrate deploy` on push).

### Tenancy for the new models (Security rules 1, 2b, 11)
- `Party`, `Project`, `Plan`, `Instalment` each carry `establishmentId`, and **every** read and write on them has `establishmentId` from the session at the top level of `where` (or in `data` for `create`/`createMany` — every element of a `createMany` array). Writes are `updateMany`/`deleteMany` with `{ id, establishmentId }`; never `update`/`delete`/`upsert`.
- **Links on `Transaction` are validated, never trusted:** `partyId`, `projectId`, `instalmentId` each resolved by a scoped `findFirst({ where: { establishmentId, id } })` before the write. A foreign or unknown id gets the same field error (`err.partyInvalid`, `err.projectInvalid`, `err.instalmentInvalid`) — rule 11.
- **Rule 11 (new, Security list): no enumeration across establishments.** A by-id read of another establishment's party/project/plan/instalment behaves exactly like a nonexistent id (`null` → `notFound()` / `err.notFound` / the field error). No query lists, searches or counts these models outside the session's establishment.
- **Rule 10 extended:** nothing in `Party`/`Project`/`Plan`/`Instalment` is ever returned to ADMIN — not rows, not names, not counts. `src/features/admin/**` and `src/app/(admin)/**` never touch these models or import `features/{parties,projects,plans}`; pinned by a static case in `admin.test.ts`. `getAdminOverview` is unchanged.

### Transactions (CP1 part; CP2 adds payments)
- `TransactionInputSchema` gains optional `partyId`, `projectId`, `instalmentId` (`""` → undefined). `createTransaction` / `updateTransaction`:
  - `partyId`: must exist in the establishment and be **active — unless it is the entry's existing party** (same kept-not-newly-assigned rule as categories, read from the DB). When `partyId` is set, `counterparty` is stored **null** (the party is the name); with no party, free-text `counterparty` works as before («أخرى»).
  - `projectId`: must exist; status `ACTIVE` unless it is the entry's existing project → else `err.projectClosed` on `projectId`.
  - `instalmentId`: **CP1 refuses any value** with `fieldErrors.instalmentId = err.instalmentInvalid`; CP2 implements the payment path below.
  - Audit snapshots add `partyId`, `projectId`, `instalmentId`.
- `TransactionFilterSchema` gains optional `partyId`, `projectId` (equality filters inside `ledgerWhere`, which stays scoped). `q` also matches the party name (`OR: [counterparty, note, party.name]`, all `contains`, insensitive).
- `LedgerRow` gains `partyId | null`, `partyName | null`, `projectId | null`, `projectName | null`, `instalmentId | null`. `TransactionRow` (edit form) gains `partyId`, `projectId`, `instalmentId`.
- Export: the counterparty column shows `partyName ?? counterparty`; no other workbook change.

### Parties — `src/features/parties/{queries,actions}.ts` (CP1)
Queries (establishment from `requireX()`):
- `listParties(estId, filter: { type?: PartyTypeValue }) → PartyRow[]`, `PartyRow = { id, name, type, phone: string|null, email: string|null, active, owedToUsHalalas, owedByUsHalalas, hasHistory }`. Active first, then by name. Balances = Σ(`amountDueHalalas − paidHalalas`) over instalments of **OPEN** plans with that party, IN → `owedToUs`, OUT → `owedByUs` (zero until CP2 creates plans; the query is real from CP1). `hasHistory` = any transaction (soft-deleted included — the FK still points at it) or any plan references it.
- `listPartyOptions(estId) → { id, name, type, active }[]` — every party; the form shows active ones plus the entry's own.
- `getParty(estId, id) → PartyRow & { notes: string|null, createdAt: string } | null`.
- CP2: `getPartyStatement(estId, id)` — see *Statement*.

Actions — **all `requireOwner()`**; staff only select existing parties:
- `createParty(prev, formData) → ActionResult<{ id }>` — returns, UI navigates. A name equal (case-insensitive, after the schema's normalisation) to another **active** party → `fieldErrors.name = err.partyDuplicate`; an inactive namesake is not reactivated (unlike categories — a party carries contact data, so two rows are two contacts). Audit `PARTY_CREATE`.
- `updateParty(partyId, prev, formData) → ActionResult<null>` — same duplicate rule excluding itself. `PARTY_UPDATE`.
- `setPartyActive(partyId, active: boolean) → ActionResult<null>` — reactivating onto an active namesake → `err.partyDuplicate`. `PARTY_ACTIVE`.
- `deleteParty(partyId) → ActionResult<null>` — refused with `err.partyHasHistory` when `hasHistory`; otherwise `deleteMany({ where: { id, establishmentId } })`, `count` 0 → `err.notFound`. `PARTY_DELETE`.

### Projects (إضافة) — `src/features/projects/{queries,actions}.ts` (CP1)
- `listProjects(estId, filter: { status?: ProjectStatusValue }) → ProjectRow[]`, `ProjectRow = { id, name, status, budgetHalalas: number|null, spentHalalas, incomeHalalas, remainingHalalas: number|null, startDate, endDate: string|null, transactionCount }` — `spent` = Σ OUT of the project's **non-deleted** transactions, `income` = Σ IN, `remaining = budget − spent` (negative = over budget; null without a budget). ACTIVE first, then newest `startDate`.
- `getProject(estId, id) → ProjectRow & { description: string|null, byCategory: { categoryId, nameAr, direction, totalHalalas }[] } | null`. The attached transactions come from `listTransactions(estId, { projectId, page })` — no second ledger query.
- `listProjectOptions(estId) → { id, name, status }[]`.
- CP2: `topActiveProjects(estId, limit = 3) → ProjectRow[]` — ACTIVE, highest `spentHalalas` first.
- Actions, **all `requireOwner()`**: `createProject(prev, formData) → ActionResult<{ id }>` (`PROJECT_CREATE`); `updateProject(projectId, prev, formData)` (`PROJECT_UPDATE`); `setProjectStatus(projectId, status)` (`PROJECT_STATUS`; any status may move to any other — reopening is allowed); `deleteProject(projectId)` — refused with `err.projectHasHistory` if any transaction (deleted included) references it (`PROJECT_DELETE`). Names may repeat.

### Pure helpers (CP2) — client-safe, no DB
- **`src/lib/schedule.ts`** `buildSchedule({ totalHalalas, count, frequency, everyDays?, firstDueDate }) → { dueDate, amountDueHalalas }[]`. Equal split: every row `floor(total / count)`, the **last** row adds the remainder, so rows always sum to the total. `WEEKLY` +7k days; `EVERY_N_DAYS` +n·k (n 1–365); `MONTHLY` keeps the **anchor day** of `firstDueDate` and clamps to month end per month (31 Jan → 28/29 Feb → 31 Mar — never drifting to the 28th). ISO strings, UTC date arithmetic. `count` 1–`MAX_INSTALMENTS`.
- **`src/lib/instalments.ts`** `dayOffset(dueDateISO, todayISO) → number` (due − today, whole days); `instalmentStatus({ dueDate, amountDueHalalas, paidHalalas }, todayISO, reminderDays)`, first match wins: (1) paid ≥ due → `PAID`; (2) due < today → `OVERDUE`; (3) paid > 0 → `PARTIAL`; (4) `dayOffset ≤ reminderDays` → `DUE`; (5) `UPCOMING`. `planStatus({ state, startDate, instalments }, todayISO)`: `CANCELLED`/`ARCHIVED` from `state`; else every instalment paid → `COMPLETED`; `today < startDate` and nothing paid → `UPCOMING`; else `ACTIVE`. "Today" is only ever `todayISO()` (Riyadh) passed in — the helpers never read a clock.
- **`src/lib/allocation.ts`** `allocate(instalments: { id, dueDate, seq, amountDueHalalas }[], payments: { id, instalmentId, date, createdAt, amountHalalas }[]) → { paid: Record<instalmentId, number>, overpaidHalalas }`. Instalments ordered by `(dueDate, seq)`, payments by `(date, createdAt, id)`. Each payment fills **its own instalment first**, then rolls forward through the later ones, then wraps to the earliest still unpaid; whatever is left is `overpaidHalalas` (zero whenever the action rules held — shown as a warning if not). Deterministic: the same rows always give the same result, so re-allocation after any edit is "recompute from scratch", never an incremental patch.

### Plans and instalments — `src/features/plans/{queries,actions,allocate}.ts` (CP2)
- **`reallocatePlan(tx, establishmentId, planId, userId)`** (`allocate.ts`, server-only, in the gate): reads the plan's instalments and its linked **non-deleted** transactions (both scoped), runs `allocate`, writes `paidHalalas` with one `updateMany({ where: { id, establishmentId } })` per changed instalment, and writes one `PLAN_ALLOCATE` audit (`before`/`after` = `[{ instalmentId, paidHalalas }]` of the changed rows) when anything changed. Called inside the same `$transaction` as every payment create/update/delete and every schedule edit.
- **Revision lock.** Every plan-affecting mutation reads `plan.revision` with its checks, then as the **first statement of its `$transaction`** runs `plan.updateMany({ where: { id, establishmentId, revision: seen }, data: { revision: { increment: 1 } } })`; `count` 0 → the transaction aborts and the action returns `err.concurrentChange`. Two simultaneous payments therefore cannot both pass the remaining-amount check.
- Actions, **`requireOwner()`** (payments are the transaction actions, below):
  - `createPlan(prev, formData) → ActionResult<{ id }>` — `instalments` arrives as a JSON string field (parse failure → `err.scheduleInvalid`); `PlanInputSchema` (rows sum to total, none before `startDate`, 1–120 rows). Party exists and active (`err.partyInvalid`); category exists, active, `type === direction` (`err.categoryInvalid` / `err.categoryDirectionMismatch`). Creates the plan and `createMany` instalments (each with `establishmentId`), `seq` = order by `(dueDate, input order)`. `PLAN_CREATE` with the rows in `after`.
  - `updatePlan(planId, prev, formData) → ActionResult<null>` — plan must be `OPEN` (`err.planClosed`). A row is **fixed** when `paidHalalas > 0` or **any** transaction row (soft-deleted included — its FK still points there) references it. Fixed rows must come back unchanged (same `id`, `dueDate`, `amountDueHalalas`) or → `err.schedulePaidRowChanged`; an `id` not in this plan → `err.scheduleInvalid`; unfixed rows may change or disappear (`deleteMany` scoped); new rows are created. With any fixed row, `partyId` and `direction` may not change (`err.planPartyLocked`). Total = Σ rows (schema); since every fixed row's due ≥ its paid, total ≥ paid follows (`err.totalBelowPaid` kept for the message if the check ever runs first). Renumber `seq`, reallocate, `PLAN_UPDATE` (before/after).
  - `cancelPlan(planId) → ActionResult<null>` — `OPEN` and no **non-deleted** payment → `state CANCELLED`, `closedAt now`, `PLAN_CANCEL`; else `err.planHasPayments`.
  - `archivePlan(planId) → ActionResult<null>` — `OPEN` → `ARCHIVED`, `closedAt now`, `PLAN_ARCHIVE`. The unpaid remainder is written off (it leaves the party balance and the dues; the statement shows the write-off row). No un-archive in v1.2a.
- Queries:
  - `listPlans(estId, filter: { direction?, status?, partyId? }) → PlanRow[]`, `PlanRow = { id, title, partyId, partyName, partyType, direction, startDate, totalHalalas, paidHalalas, remainingHalalas, status: PlanStatus, instalmentCount, paidCount, nextDue: { instalmentId, dueDate, remainingHalalas, status, dayOffset } | null }`. `status` is derived, so that filter applies after derivation.
  - `getPlan(estId, id) → PlanDetail | null` — row fields + `categoryId, categoryNameAr, reminderDays, notes, closedAt, canCancel, overpaidHalalas, instalments: { id, seq, dueDate, amountDueHalalas, paidHalalas, remainingHalalas, status, dayOffset, fixed, payments: { transactionId, date, amountHalalas, createdByName }[] }[]` (payments listed under the instalment they were **recorded against**).
  - `getDues(estId) → { today, weekEnd, overdue: DueRow[], thisWeek: DueRow[], totals: { overdueInHalalas, overdueOutHalalas, weekInHalalas, weekOutHalalas } }`, `DueRow = { instalmentId, planId, planTitle, partyId, partyName, direction, seq, dueDate, remainingHalalas, status, dayOffset }` — `OPEN` plans, unpaid instalments; `overdue` = due < today; `thisWeek` = today ≤ due ≤ today + 6 (**this week = the next 7 days including today**, Decision). Both directions.
  - `getOverdueCount(estId) → number` — for the nav badge; one `count` with `paidHalalas < amountDueHalalas` via a Prisma field reference (`db.instalment.fields.amountDueHalalas`), `dueDate < today`, `plan: { state: "OPEN" }`.
  - `getInstalmentForPayment(estId, instalmentId) → { instalmentId, planId, planTitle, seq, direction, partyId, partyName, categoryId, instalmentRemainingHalalas, planRemainingHalalas } | null` — null when not found, plan not `OPEN`, or already paid.
- **Payments = the transaction actions with `instalmentId`:**
  - `createTransaction` with `instalmentId`: the caller must pass `canEditTransactions` (OWNER, or STAFF with `canEdit` read from the DB) → else `err.forbidden` (returned, not redirected: plain entry creation stays open to all staff). Instalment found in the establishment (`err.instalmentInvalid`); plan `OPEN` (`err.planClosed`); instalment not fully paid (`err.instalmentPaid`); `direction === plan.direction` (`err.paymentDirectionMismatch`); a given `partyId` must equal `plan.partyId` (`err.paymentPartyMismatch`), an absent one is set to it; `amountHalalas ≤ plan remaining` (`fieldErrors.amountHalalas = err.paymentExceedsRemaining`); month lock and category rules as for any entry; `projectId` allowed. `$transaction`: revision bump → create → `reallocatePlan` → audit `CREATE`.
  - `updateTransaction` of a payment: the link is fixed — a form `instalmentId` that differs, or one added to an unlinked entry, → `err.paymentLinkFixed`; direction stays the plan's; party forced to the plan's; `amount ≤ plan remaining + this entry's current amount`; archived plans may still have payments corrected. Revision bump → update → reallocate.
  - `deleteTransaction` of a payment (OWNER): revision bump → soft delete → reallocate (un-pays). Month locks apply to all three exactly as for any entry — a payment in a closed month can be neither added, moved, edited nor deleted.

### Statement — `getPartyStatement(estId, partyId)` (CP2)
`→ { party, rows: { date, kind: "PLAN"|"PAYMENT"|"WRITE_OFF", planId, planTitle, transactionId: string|null, deltaHalalas, balanceHalalas }[], closingBalanceHalalas, other: LedgerRow[] } | null`. Signed from the establishment's side: **+ = لنا, − = علينا**. Plans in `OPEN` or `ARCHIVED` (cancelled plans have nothing paid and are left out): a `PLAN` row on `startDate` (IN +total, OUT −total); a `PAYMENT` row per linked non-deleted transaction (IN −amount, OUT +amount); for an archived plan with a remainder, a `WRITE_OFF` row on `closedAt` (Riyadh date) cancelling it. Order: date, then PLAN < PAYMENT < WRITE_OFF, then `createdAt`. Invariant (tested): `closingBalanceHalalas === owedToUs − owedByUs` from `listParties`. `other` = the party's transactions with no `instalmentId`, informational, outside the balance.

### Audit (v1.2a)
Actions: `PARTY_CREATE`, `PARTY_UPDATE`, `PARTY_ACTIVE`, `PARTY_DELETE`, `PROJECT_CREATE`, `PROJECT_UPDATE`, `PROJECT_STATUS`, `PROJECT_DELETE`, `PLAN_CREATE`, `PLAN_UPDATE`, `PLAN_CANCEL`, `PLAN_ARCHIVE`, `PLAN_ALLOCATE`; entities `Party`, `Project`, `Plan` (`src/lib/audit.ts`). Instalment changes are audited on their `Plan`. Every audit row is written inside the same `$transaction` as its write.

### Revalidation
Mutations revalidate the pages that show their numbers: the ledger paths, plus `/owner/parties`, `/owner/projects`, `/owner/plans`, `/owner/dues`, and the owner layout (`revalidatePath("/owner", "layout")` — the المستحقات badge lives there).

### Tests
- **CP1:** the scoping gate (`scoping.test.ts`) — harness knows `party`, `project`, `plan`, `instalment`; `createMany` checked element by element; every new query and action driven with empty and populated filters; `parties/*`, `projects/*` added to the static sweep `FILES`; a foreign-establishment id for each link returns the field error. `admin.test.ts` — the static no-new-models case. Validators — `PartyInputSchema`, `ProjectInputSchema`, the new `TransactionInputSchema` fields (`""` → undefined, `intent` still stripped). Guards — each party/project mutation calls `requireOwner` (pinned like `transactions/actions.test.ts`); duplicate party; delete-with-history refused; a closed project refuses a new link but keeps an existing one; an inactive party likewise. The PGlite migration test. Mutation-verify each gate.
- **CP2:** `allocate` (exact, partial, overpay rolls forward, wrap to earlier unpaid, order by date then createdAt, overpaid residue); edit/delete re-allocation through the actions (amount up/down, delete un-pays, the recorded-against instalment keeps its link); lock enforcement on payment create/update/delete; `instalmentStatus`/`dayOffset` at day boundaries (23:59 and 00:00 Riyadh, due today, due yesterday, reminder window edge); `buildSchedule` sums for awkward totals (1 halala × 3, 100 000.01 ÷ 7) and month-end clamping; canEdit matrix for payments (OWNER ✓, STAFF canEdit ✓, STAFF without ✗ `err.forbidden`, plain entry by STAFF without canEdit still ✓); revision conflict → `err.concurrentChange`; cancel vs archive; fixed rows on `updatePlan`; statement closing = party balance; scoping gate extended to `plans/*`.

### v1.2a amendments after the pre-code review (binding — they override the v1.2a text above)
Reviewer findings in `progress/reviewer.md` → v1.2a (2 BLOCKER, 10 SHOULD, 8 NOTE), all accepted.
- **V1 — Reference probes in the gate (B1).** "Counts soft-deleted rows" (party `hasHistory`, `deleteProject`, fixed plan rows) needs `transaction` reads with no `deletedAt` filter, which `scopeFailure` rejects. Add a narrow, named exemption: `transaction.count`/`findFirst`/`groupBy` whose `where` keys are a subset of `{ establishmentId, partyId, projectId, instalmentId }` (with `establishmentId === EST`, `deletedAt` absent) and which read no amount (`_sum`, `_avg`, or `amountHalalas` in `select`) — it can answer "is anything linked", never a total. Pin its bounds with unit cases (an amount select fails; an extra where key fails; a missing scope fails). Add a static rule: no nested `transactions:` inside `select`/`include`/`_count` in `parties/*`, `projects/*`, `plans/*` — a nested read is invisible to the harness. This is the third encoded gate exception → Decision logged.
- **V2 — `onDelete: Restrict` on the three links (B2).** Prisma's default for an optional relation is `SET NULL`, so a hard delete would have silently stripped links from soft-deleted rows. The schema now says `Restrict` on `Transaction.party/project/instalment`. `deleteParty`/`deleteProject`/`updatePlan`'s row deletion map Prisma `P2003` to `err.partyHasHistory` / `err.projectHasHistory` / `err.schedulePaidRowChanged` (the app-side check stays for the friendly path; the FK is what holds under a race). The PGlite test asserts each such delete fails.
- **V3 — Amount ceiling 20M SAR (S1).** Money columns are int4; `MAX_AMOUNT_HALALAS` lowered from 10 000 000 000 to 2 000 000 000 in `src/lib/money.ts` (update `money.test.ts`). Plan totals, budgets and instalments share it. Backend verifies on PGlite how Prisma 7 returns an `_sum` over int4 above 2^31 (Postgres widens `sum(int4)` to bigint) and records the result; if it arrives as `bigint`, convert with `Number()` at the query boundary.
- **V4 — Revision order (S2).** `revision` is read in the **same `findFirst` as the plan's state/total/direction, before** instalments or payments are summed. Bumped by: payment create/update/delete, `updatePlan`, `cancelPlan`, `archivePlan`.
- **V5 — Payments ignore the party's `active` flag (S3).** The party comes from the plan and is not re-checked. `updatePlan` applies kept-not-newly-assigned to party **and** category.
- **V6 — `buildSchedule` refuses `count > totalHalalas` (S4)** (returns `null`; the UI caps the count and says why). The awkward-total test becomes: 3 halalas × 3 ✓, 2 halalas × 3 → `null`, 100 000.01 ÷ 7 sums exactly.
- **V7 — Row ids (S5).** `updatePlan`: a duplicate `id` → `err.scheduleInvalid`; an omitted fixed row → `err.schedulePaidRowChanged`. `createPlan` refuses any row `id` (`err.scheduleInvalid`).
- **V8 — `ProjectRow` and `getProject` gain `hasHistory` (S7)** (any transaction, deleted included — via a V1 probe).
- **V9 — Revalidation after the settings split (S8).** `establishments/actions.ts`, `locks/actions.ts`, `settings/actions.ts` → `backend` (K3): replace `revalidatePath("/owner/settings")` with `revalidatePath("/owner/settings", "layout")`, plus `/owner/staff/logins` where staff rows change.
- **V10 — Plurals (S9).** Counted strings are `PluralForms` records (`t.countdown.inDays/lateDays`, `t.navItem.overdueBadge`, `t.dues.overdueStrip`), rendered with `plural(forms, n)` from `src/lib/plural.ts` (`Intl.PluralRules("ar")`); `t.plans.progress` reworded to «سُدّد {paid} من {count}».
- **V11 — Staff nav label (S10):** the staff item reads `t.navItem.newEntry` (حركة جديدة) — same destination, same three items; the word «إضافة» now means a project everywhere.
- **V12 — Notes N1–N8:** route params win over search params on party/project pages; the project chip links only on the owner's `basePath`; the drift check mechanism is: `execSync("npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script")` → second PGlite → compare `information_schema.columns`, `pg_indexes`, `pg_constraint`; HEAD's schema goes through a temp file (no `<( )>` on Windows); `createManyAndReturn` is not in the harness — adding it is deliberate; the badge is stale until the next navigation (accepted), and the admin static case also asserts `src/components/chrome/**` imports nothing from `features/{parties,projects,plans}`; the printed project summary labels its entries «صفحة X من N» (from `t.common.page` + `t.common.of`); a write-off row sorts by `closedAt` and a later-dated correction may follow it (accepted — closing balance unaffected); clearing an optional field writes `null`; an absent `instalmentId` on edit means "keep", never "differs".

### v1.2a CP2 additions (lead, 2026-09-30 — binding with V1–V12)
- **Payments live in their own module:** `src/features/transactions/payments.ts` (server-only, in the static sweep) holds the payment path — instalment resolution, the checks listed under *Payments*, the revision bump and the `reallocatePlan` call — and `actions.ts` calls into it. `actions.ts` (325 lines at CP1) must not grow.
- **Staff dues (user's ruling, option a):** `getStaffDues(estId) → { instalmentId, partyName, remainingHalalas, dueDate }[]` in `src/features/plans/queries.ts` — the same window as `getDues` (overdue + today…today+6, OPEN plans, unpaid, both directions), ordered by `dueDate`, at most 20 rows, and **no other field** (no plan title, no direction, no totals). The staff home calls it only when the DB-read `canEdit` is true; otherwise it is not called at all.
- **Staff payment route:** `/staff/transactions/new?instalmentId=…` is the payment form for STAFF; **(amended at R-Q3, S-Q3a)** when `instalmentId` is present the page calls `getStaffPaymentPrefill` only if the DB-read `canEdit` is true; a STAFF without `canEdit` gets the **ordinary new-entry form plus an `err.forbidden` toast**, the same for any id (nothing about the instalment is read, so nothing is enumerable) — the plain entry path stays open to them, and `createTransaction` enforces the same rule server-side (`err.forbidden`). Editing a payment by STAFF follows the existing `requireCanEdit()` edit rule; deleting stays OWNER-only.
- **Confirmed readings (`backend`, ratified by the lead):** (1) "plan remaining" for the payment check = `totalHalalas − Σ amountHalalas` of the plan's linked **non-deleted transactions**, read after `revision` in the same request — never `Σ paidHalalas`, which is a cache and could be stale after an interrupted run. (2) An **ARCHIVED** plan refuses a new payment (`err.planClosed`) but allows editing or deleting an existing one, which re-allocates (the write-off shrinks or grows accordingly); a CANCELLED plan has no non-deleted payments by construction. (3) The revision bump is the first statement inside `$transaction`; 0 rows → throw a sentinel so the whole transaction rolls back → `{ ok: false, error: "err.concurrentChange" }`; nothing is written before the bump. (4) `createTransaction` keeps `requireMember()`; with `instalmentId` it checks `canEditTransactions()` on the per-request DB read and **returns** `err.forbidden`; `updateTransaction` stays `requireCanEdit()`, `deleteTransaction` stays `requireOwner()`. The scoping harness gains `fields` on model proxies for the field reference in `getOverdueCount`.
- **A real-client test for the money path:** at least one test drives create-plan → pay partially → overpay with rollover → edit → delete through the actions against PGlite with `src/lib/testing/pgliteClient.ts`, and asserts `paidHalalas` per instalment and `getOverdueCount` (the field reference) on real Postgres — the mocked gate cannot vouch for SQL semantics.

### v1.2a CP2 amendments after R-brief-2 (binding — W1–W13 override the CP2 text above)
- **W1 — Editing a payment has its own read (S2-1).** `getPaymentLink(estId, instalmentId) → { planId, planTitle, direction, partyId, partyName } | null` — scoped, **no** state or paid filter; used only by the two `[id]/edit` pages when `row.instalmentId` is set (the staff edit page strips `planId`/`planTitle` per W2).
- **W2 — "Nothing more" covers the staff payment form too (S2-2, lead's reading of the user's ruling).** On `/staff/transactions/new?instalmentId=` the page calls `getStaffPaymentPrefill(estId, instalmentId) → { instalmentId, direction, partyId, partyName, categoryId, instalmentRemainingHalalas } | null` — no plan title, no plan total or plan remaining. The staff banner shows the party, this instalment's remaining and `t.payment.rollsOver`; never `t.payment.forInstalment`, `planRemaining` or `viewPlan`. The staff edit notice likewise shows only party and direction. Stripping happens on the server (the shape never reaches the RSC payload).
- **W3 — Payment-path order (S2-3).** (a) With `instalmentId` present, `payments.ts` runs **before** `checkLinks`, resolves party and direction from the plan and hands `checkLinks` only `projectId` (V5: no party-active check on a payment). (b) **Refuse, never silently force:** a submitted direction ≠ the plan's → `err.paymentDirectionMismatch`; a submitted `partyId` ≠ the plan's → `err.paymentPartyMismatch`; an absent `partyId` is set to the plan's. (c) The canEdit check runs **first**, before any instalment lookup — STAFF without canEdit always get `err.forbidden`, whatever the id. (d) The UI locks both fields, so (b) is reachable only by a forged request.
- **W4 — Plan edit (S2-4).** Party and category selects offer the plan's own party/category even when inactive, labelled (mirrors V5). Once any row is fixed, **equal mode is disabled** on edit — custom mode only.
- **W5 — Gate the cache invariant (S2-5).** Static case: no `paidHalalas` key inside a `data:` object anywhere in `src/**` except `src/features/plans/allocate.ts` (regex with a self-test); `getStaffDues` rows tested for `Object.keys(row)` equal to exactly the four keys, and `getStaffPaymentPrefill` for exactly its six.
- **W6 — The real-client test (S2-6).** Mocks `@/lib/auth` (the `requireX` context), `next/cache`, `server-only`, and `@/lib/db` → `pgliteClient(lite)`. It covers create → partial → overpay rollover → edit → delete → archive, then `getPartyStatement(...).closingBalanceHalalas === owedToUs − owedByUs` from `listParties`, and `getOverdueCount` on real SQL. **Concurrency is not claimed from PGlite** (one connection); `err.concurrentChange` stays in the mocked gate (bump returns `count: 0`).
- **W7 — Stable orders (N2-1).** Dues and staff dues sort by `(dueDate, seq, id)`; staff dues take at most 20.
- **W8 — "Today" is the server's (N2-2).** Every status, countdown and `weekEnd` is computed on the server from `todayISO()` and passed down; no client component derives today from `new Date()`. `weekEnd` = today + 6 days by UTC date arithmetic on the ISO string.
- **W9 — `?instalmentId=` wins over `?projectId=` (N2-3);** a project given alongside is still validated as ACTIVE.
- **W10 — `PaymentBanner.tsx` (N2-4)** holds the banner and locked fields; `TransactionForm.tsx` (249 lines) must not grow past ~250.
- **W11 — Statement `other` capped (N2-5):** newest 50, then `t.statement.otherCapped` and a «عرض في السجل» link to `/owner/transactions?partyId=…`; the printed statement shows the same line when capped.
- **W12 — `PLAN_CREATE` audit (N2-6)** stores the rows without ids (`{ seq, dueDate, amountDueHalalas }`); no `createManyAndReturn`.
- **W13 — Manual checks named (N2-7):** the staff-route `requireCanEdit()` redirect and "`getStaffDues` is not called at all without canEdit" are page behaviour no test reaches — reviewer checks them by reading in R-Q3/R-Q6, and they go on the user's live test plan.
- **W14 — Precision on the confirmed readings (reviewer addendum).** (1) The remaining-amount read is an **amount** read: it carries `deletedAt: null` (scoped via `instalmentId: { in: … }` or `instalment: { planId }`) and is not a V1 probe; keep the real-SQL assertion statement closing = party balance, since `listParties`/`getDues` read the `paidHalalas` cache. (3) The rollback catch matches **only** a dedicated sentinel class (`instanceof`) and rethrows everything else — likewise the P2003 catch in `updatePlan`; the conflict case asserts no write after the bump returns 0. (4) canEdit before the instalment lookup (= W3c). Harness: `fields` on model proxies is **not** recorded as a call, or the sweep reports a phantom `instalment.fields` pair.
- **W15 — File split (lead, during P2):** the dues family and the payment reads — `getDues`, `getOverdueCount`, `getStaffDues`, `getInstalmentForPayment`, `getStaffPaymentPrefill`, `getPaymentLink` — live in `src/features/plans/dues.ts` (server-only, in the sweep); `listPlans`/`getPlan` stay in `plans/queries.ts`. Where the text above says `plans/queries.ts` for those six, read `plans/dues.ts`.
- **W16 — `plans/scheduleEdit.ts` (lead, during P2):** `resolveSchedule` holds `updatePlan`'s fixed-row, duplicate-id and party-lock rules; the sentinel `ConcurrentChangeError` and `bumpRevision` live in `plans/allocate.ts` and `payments.ts` imports them.
- **W17 — `parties/statement.ts` (lead, during P4):** `getPartyStatement` lives there (server-only, in the sweep); `transactions/actions.ts` is down to 240 lines (`checkCategory`, `snapshot`, `EXISTING_SELECT` moved to `links.ts`, the payment path in `payments.ts`). CP1 behaviour change per the doc: an edit adding `instalmentId` to an unlinked entry now answers `err.paymentLinkFixed` (was `err.instalmentInvalid`).

## v1.2b — الموظفون / الحضور / الرواتب
**The binding spec is `docs/V12B-DESIGN.md`** (rulings R1–R8, lead decisions D1–D12, data, screens, security, tests); it is not duplicated here. Schema: `prisma/schema.prisma` v1.2b block. Validation: `src/lib/validation/employees.ts`. Strings: `src/i18n/ar.v12b.ts`. Audit actions: `EMPLOYEE_CREATE`, `EMPLOYEE_UPDATE`, `EMPLOYEE_END`, `EMPLOYEE_REACTIVATE`, `SALARY_GENERATE`, `SALARY_UPDATE`, `DEDUCTION_ADD`, `DEDUCTION_DELETE`, `ATTENDANCE_SET`, `CHECK_IN`, `CHECK_OUT`; entities `Employee`, `SalaryPeriod`, `AttendanceRecord`. Security rules 10/11 extend to every v1.2b model; D8 (salary privacy for staff) is a server-side rule.

## v1.2c — التذكيرات والتقارير
**Binding spec: `docs/V12-SPEC.md` §4, implemented per `docs/V12C-DESIGN.md` (C1–C16).** Amendments to this file's earlier rules, by the spec: the API routes become health, export (incl. `/api/export/statement`) **and `/api/reminders/run`** (C2); `/api/reminders/run` joins the proxy's `OPEN_PATHS` (C3, one path added — session logic untouched); owner-entered text may appear in the digest and client-reminder emails, HTML-escaped (C7; v1.1e A13 still binds the auth emails). New secret `CRON_SECRET` (`sync: false`). Audit actions `DIGEST_SETTINGS`, `DIGEST_SENT`, `PARTY_REMINDERS`, `CLIENT_REMINDER_EMAIL`, `CLIENT_REMINDER_WHATSAPP`.
