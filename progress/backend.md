# progress/backend.md

My own running notes. Only I write here; the lead merges into PROGRESS.md at checkpoints.
Newest at the bottom.

## Files I own
- `src/features/*/actions.ts`, `src/features/*/queries.ts`
- `src/app/api/**`
- `src/proxy.ts`
- `src/**/*.test.ts`
- `prisma/seed.ts` and fixes to `src/lib/*`

## Tasks completed
| Task | Files touched | Build/tests pass | Notes for others |
|---|---|---|---|
| B1 | `src/features/auth/{actions,queries}.ts` (new), `src/proxy.ts`, `src/lib/joinCode.ts` (+`allocateJoinCode`), `src/lib/auth.ts` (H1 + L6) | yes — build, `npm test` 84/84, `npm run typecheck` | Actions are `(prevState, formData)` for `useActionState` and **redirect on success**. |
| B2 | `src/features/establishments/{actions,queries}.ts` (new), `src/features/settings/{actions,queries}.ts` (new) | yes — same | `regenerateJoinCode()` returns the new code in `data.joinCode`. Duplicate category names are checked against **active** rows only. |
| B9 | `src/proxy.ts`, `src/lib/sessionConfig.ts` (new), `src/lib/session.ts`, `src/features/auth/actions.ts`, `src/features/settings/actions.ts`, `src/features/establishments/actions.ts` | yes — same | All seven review items; see the B9 section below. |
| B7 (part) | `src/lib/validation.test.ts` (+21 cases), `src/components/chrome/nav.test.ts` (new) | yes — 84/84 | The lead's `err.*` regression guard, and the `activeHref` cases `frontend` asked for. `locks.test.ts` / `auth.test.ts` are still to come with B4. |

## Contract notes for `frontend`
The rule: **an action that backs a form takes `(…ids, prevState, formData)`** so it drops
into `useActionState` after a `.bind(null, id)`; **an action that backs a button takes plain
arguments**. Signatures as implemented:
- `login(prev, formData)`, `signupOwner(prev, formData)`, `signupStaff(prev, formData)`
  → `Promise<ActionResult<null>>`, and they **redirect on success**, so the result only
  ever carries a failure. `logout(): Promise<void>` for a bare `<form action={logout}>`.
- `changeOwnPassword(prev, formData)`, `createCategory(prev, formData)`,
  `updateCategory(categoryId, prev, formData)`, `resetStaffPassword(userId, prev, formData)`
  → `ActionResult<null>`; these do **not** redirect, so settings stays on the page.
- Buttons: `approveStaff(userId)`, `rejectStaff(userId)`, `setCanEdit(userId, canEdit)`,
  `setStaffActive(userId, active)`, `setCategoryActive(categoryId, active)`,
  `regenerateJoinCode() → ActionResult<{ joinCode }>`.
- Queries: `listStaff(estId) → StaffRow[]`, `getJoinCode(estId) → string | null`,
  `getOwnStatus() → { role, status, establishmentActive } | null`,
  `listCategories(estId) → CategoryRow[]` (includes inactive; filter for a form).
- Sign-up and a PENDING login both redirect to `/pending?as=owner` / `?as=staff`, matching
  the stubs and `docs/FRONTEND.md`. A PENDING account gets **no session**.
- `login` never returns `fieldErrors` — a login form has nothing safe to say per field.
  Sign-up does return `fieldErrors` for a malformed form (password too short, name too
  short) but a bare `err.signupFailed` / `err.joinFailed` for anything else, so an email
  already in use is indistinguishable from any other failure.
- Two extra queries not in `docs/BACKEND.md` that the settings screen needs:
  `getJoinCode(estId)`, and the `active` flag on `CategoryRow`.
- The proxy sends a signed-in visitor from `/login` or `/signup` to their role home, except
  when the URL carries `?signedOut=1` — see the gotcha below. A wrong-role user now goes to
  `homePathFor(role)` rather than `/login` (L6).
- Adding a category whose name matches a **retired** one of the same direction reactivates
  that row instead of creating a second one, so the list never shows one name twice.

## B9 — the seven review follow-ups
1. **Proxy matcher escape restored.** My first write of `src/proxy.ts` went through a
   shell heredoc that collapsed `\\.` to `\.` in `.*\\.png$`. In a TS string `"\."` is just
   `.`, so the negative lookahead was matching any character before `png`. The string is now
   byte-identical to the committed Phase 0 original — I diffed it against
   `git show HEAD:src/proxy.ts` rather than eyeballing it.
2. **Category duplicates consider active rows only**, plus reactivate-on-create, plus the
   name guard when `setCategoryActive` brings a row back.
3. **`x-forwarded-for`: last hop, not first.** The header is `client, proxy1, …` and the
   caller controls what goes at the front, so keying the limiter on the leftmost entry let
   one attacker have five attempts per invented address. The last entry is the one our own
   proxy appended.
4. **`src/lib/sessionConfig.ts`** now holds the cookie name and TTL, imported by both
   `src/lib/session.ts` and `src/proxy.ts`, which removes the duplication I had flagged.
   `session.ts` re-exports both names so nothing that imported them had to change.
5. **`signupStaff` wrapped in `$transaction`**, so the user row and its SIGNUP audit row
   land together, as `signupOwner` already did.
6. **`clearAttempts` on both sign-ups.** Only the staff path cleared its counter.
7. **`regenerateJoinCode` no longer throws out of the action** — `allocateJoinCode` gives up
   after five tries, which would have reached the error boundary instead of the form.

## Verified, not just reasoned about
Run against a production build and the live Neon database, through a temporary route handler
under `src/app/api/` that called the real actions and was deleted afterwards (`grep -rn
zzsmoke src/` → 0). All test data cleaned up; the database is back to the seeded ADMIN alone.
- **B1, 16 cases:** owner sign-up → `/pending?as=owner`; a second sign-up on the same email
  → bare `err.signupFailed`; a malformed form → `fieldErrors` keyed by field name; PENDING
  login → `/pending?as=owner`; wrong password and unknown email → `err.loginFailed`; a bad
  join code and a code whose owner is not yet approved → the same `err.joinFailed`; staff
  sign-up once the owner is ACTIVE; ACTIVE owner login → `/owner`; a deactivated
  establishment blocks its owner; audit rows exactly `SIGNUP, SIGNUP, LOGIN`, with no
  password anywhere in them.
- **B2, 27 cases:** a foreign establishment's staff id returns `err.notFound` for
  `approveStaff`, `setCanEdit` and `resetStaffPassword` — the row is never touched;
  approving twice, enabling a PENDING staff and rejecting an ACTIVE one all refused;
  disabling clears `canEdit`; the join code changes and stays 8 characters; a duplicate
  active category name refused while the same name in the other direction is allowed;
  deactivating the last active category of a direction refused; a retired name reusable;
  a changed `type` on rename refused; all ten expected audit actions written.
- **B9:** retiring "إيجار" and adding it again leaves exactly **one** row, active — not two;
  a duplicate of an active name is still refused; audit reads
  `CATEGORY_CREATE, CATEGORY_CREATE, CATEGORY_UPDATE, CATEGORY_UPDATE`.
- **Routing, against a running server:** anon `/owner` → `/login`; a stale cookie on
  `/owner` → `/login?signedOut=1`, which then serves 200 (no loop); a healthy cookie on
  `/login` → role home; STAFF on `/owner` → `/staff`, ADMIN on `/owner` → `/admin`, OWNER
  on `/admin` → `/owner`; `/api/health` and `/pending` untouched either way. Re-run after
  the `sessionConfig` refactor, since a wrong cookie name there would silently stop the
  proxy seeing any session.
- **CSP:** every `<script>` in a freshly served document, both inline hydration tags
  included, carries the nonce.

## Gotchas I found
- **`requireUser()` used to 500 instead of redirecting.** It called `session.destroy()` on a
  stale session, and Next.js only allows a cookie write from a Server Action or a Route
  Handler — from a server component render it throws "Cookies can only be modified in a
  Server Action or Route Handler". So every path Security rule 5 depends on (user row gone,
  user DISABLED, establishment deactivated) returned a 500. Fixed in `src/lib/auth.ts`:
  `destroy()` is best-effort inside `forget()`, and the redirect is what closes the route.
  Reproduced with a sealed cookie for a user id that is not in the database: 500 before,
  307 to `/login?signedOut=1` after. Same as the reviewer's H1, found independently.
- **`?signedOut=1` is load-bearing, not decoration.** Bouncing a signed-in visitor off
  `/login` — which the lead asked for, and which is good UX — is a redirect loop on its
  own: the proxy sees only the cookie, never `status`, so a user the database has since
  disabled goes `/login` → `/owner` → `requireUser()` → `/login`, forever, until the 12h
  cookie expires. `requireUser()` therefore redirects stale sessions to
  `SIGNED_OUT_LOGIN_PATH` and the proxy skips the bounce when that param is present.
  **Remove either half and the loop comes back.**
- `/pending` is in `PUBLIC_PATHS` and is never redirected either way, for the same reason:
  `requireUser()` sends PENDING users to it.
- The proxy cannot import `src/lib/session.ts` — it is `server-only` and reads `cookies()`
  from `next/headers`, neither of which exists in the proxy runtime. It reads the session
  with `getIronSession(nextProxyCookies(request, response), …)`; the cookie name and TTL now
  come from `src/lib/sessionConfig.ts`, so they cannot drift.
- `allocateJoinCode(client)` in `src/lib/joinCode.ts` is structurally typed, not
  `Prisma.TransactionClient`, so `joinCode.ts` stays dependency-free and its existing test
  keeps working. Pass `db` or a `tx`. It **throws** after five collisions, so every caller
  needs a try/catch — a `"use server"` module cannot export a plain helper to share one.
- Rate-limit keys: `login:<ip>:<email>`, `signup:<ip>`, `join:<ip>`. The limiter is
  in-memory, so it resets on deploy and does not span Render instances. Fine for one
  instance; it is not a defence against a distributed attempt.
- Login spends the same bcrypt time on an unknown email as on a wrong password, so the
  reply time does not separate the two.
- `updateCategory` refuses a changed `type` with `err.categoryDirectionMismatch`: entries
  already point at the category and carry its direction, so renaming is the only safe edit.
  `frontend` should render the direction as fixed text, not an editable select.
- A shell heredoc is not safe for writing TypeScript that contains backslash escapes —
  item 1 of B9 came from exactly that. Use the editor tools for those files.

## Questions / requests sent to lead
- No new `err.*` keys needed — every failure maps to an existing key.
- The PENDING-session question is **settled**: `docs/FRONTEND.md` now states that a PENDING
  account deliberately has no session, that `/pending` reads the role from
  `?as=owner|staff`, and that there is no auto-redirect on approval. That is what is built.
  `getOwnStatus()` covers the doc's other half — the session-role fallback for an ACTIVE
  visitor who lands on `/pending`.
- `changeOwnPassword(old, new)` in the `docs/BACKEND.md` action table vs
  `ChangePasswordSchema`'s three fields: I followed the schema, and it takes a `FormData`.
- `allocateJoinCode` lives in `src/lib/joinCode.ts` (a `src/lib/*` fix) rather than being
  duplicated across two features.

---

## Checkpoint 2 — B3, B4, B8, B10

| Task | Files | Gates |
|---|---|---|
| B3 | `transactions/{actions,queries}.ts`, `dashboard/queries.ts`, `reports/queries.ts`, `transactions/scoping.test.ts` | build, 131/131, tsc |
| B4 | `locks/{actions,queries,assertUnlocked}.ts`, `locks/locks.test.ts` | same |
| B8 | `settings/actions.ts` (+`setCategoryOrder`) | same |
| B10 | `auth/actions.ts` (`signupStaff`), `auth/auth.test.ts` | same |

### The scoping net (`transactions/scoping.test.ts`, 26 cases)
Captures every Prisma call the read *and* write paths make through a mocked client
and checks `establishmentId` at the **top level** of `where` — a scope nested in a
relation filter does not constrain an aggregate, so it must not satisfy the check.

Widened past the brief in three ways, all cleared with the lead first: `reports/queries.ts`
(the most aggregate-heavy file of the three), `transactions/actions.ts` (an unscoped write
beats an unscoped read), and B4's two lock files.

Seven of the 26 cases test **the harness itself** — a `groupBy` with no `where`, a scope
nested under `category:`, another establishment's id, a unique-where write, a `create`
with no `establishmentId` in `data`, a correctly scoped call, and raw SQL. A net nobody
has watched fail is not evidence.

I also ran two **mutation tests** rather than trusting the green tick:
- Replacing `where: allTime` with `where: { deletedAt: null }` in the by-method `groupBy`
  failed 2 cases with `transaction.groupBy where.establishmentId is undefined`.
- Splitting `signupStaff`'s combined guard back into `joinFailed` / `signupFailed` failed
  2 cases in `auth.test.ts`.
Both reverted; `grep` confirms the originals are back.

**What it does not prove**, stated because a green tick invites over-reading: a mocked
client only sees the calls the tests drive. Every function runs twice, empty filters and
all filters, so both sides of each conditional execute, and a static sweep compares the
`(model, method)` pairs in the source against the pairs seen at runtime — so an
unexercised call site fails the suite. A *second* site with the **same** pair on an
unexercised branch would still escape. Closing that needs a coverage threshold on those
files, which is a `vitest.config.mts` change and not this task's.

### Gotchas
- **Scoped writes use `updateMany`, not `update`.** Prisma's `update` needs a *unique*
  where, and `{ id, establishmentId }` is not unique, so `update` structurally cannot
  carry the tenant scope — it can only be made safe by the `findFirst` above it. Every
  write in `transactions/actions.ts`, `locks/actions.ts` and `setCategoryOrder` uses
  `updateMany` so the boundary is in the SQL. The scoping test **bans** `update` / `delete`
  / `upsert` outright in the files it sweeps, which is why `settings/actions.ts` and
  `establishments/actions.ts` are not in that list — their B2 code uses the older shape.
  Correct today, worth a follow-up task; the exclusion is commented in the test.
- **`isClosedMonth` lives in `assertUnlocked.ts`, not `actions.ts`.** A `"use server"`
  module may only export async functions, so a sync helper exported from one breaks the
  build — not the typecheck, which is why it is worth knowing.
- **`assertUnlocked` returns rather than throws**, despite the name in the doc: an action
  has to answer with an `ActionResult`, and a throw would reach the error boundary instead
  of the form. `updateTransaction` passes **two** months in one `findFirst` with an `OR`,
  so a lock on the origin refuses a move exactly as a lock on the destination does.
- **`last6Months` buckets in JS.** A SQL `date_trunc` needs `$queryRaw`, which has no
  `where` object for the scoping test to inspect — so raw SQL is banned in these files and
  the six-month window is aggregated in memory. A few thousand rows for a business this size.
- **The raw-SQL regex is anchored on the receiver** (`db.$queryRaw`, not `$queryRaw`).
  My own comment explaining why raw SQL is avoided tripped the first version of that test.
- `lockMonth` / `unlockMonth` are **idempotent** — locking an already-locked month returns
  `ok`. A double click on the grid is the state the owner asked for, not a failure.
- `listLocks` returns **newest first**: an owner locks the month that just ended.
- `setCategoryOrder` only moves **active** categories, and reaching either end is a no-op
  success rather than an error.

### B10 — the oracle is closed on all five paths, not four
`signupStaff` now answers `err.joinFailed` to a bad code, a disabled establishment, an
owner who is not ACTIVE, **and** a taken email. Two details beyond the brief:
- The `catch` around the insert returned `err.signupFailed`. Its realistic cause is the
  email unique constraint losing a race, so that was a fifth path with a fifth answer —
  the same oracle for anyone willing to trigger it. It now returns `err.joinFailed` too.
- Both lookups run in one `Promise.all` and bcrypt is spent **before** the decision. The
  old order made a taken email one query slower than a bad code, and skipping the ~250ms
  hash on failures timed the branch far more clearly than any key named it. `auth.test.ts`
  asserts this structurally — same two queries, one hash, on all five outcomes — because a
  wall-clock assertion would be flaky.

### Open for the lead
- **`signupOwner` has the same oracle shape and I did not change it.** Its only business
  failure is a taken email, so a well-formed owner sign-up returning `err.signupFailed`
  means that address exists — which is what Security rule 4 names directly. The only fix
  that removes it is answering a taken email with a fake success, and with no email channel
  and no password reset (both out of scope) a real person who mistypes an existing address
  would wait for an approval that never comes. That trade is a product decision, not mine,
  and it is the same class the user just overruled — so it needs a ruling rather than my
  judgement.

### Reconciliation against the corrected briefs
The corrected B3/B4/B8/B10 briefs and the `Halalas` naming ruling arrived after the code
was already written, so this was a reconciliation pass, not a rewrite. Six items had
converged independently (where-present, top-level read, four files, no raw SQL, the
category rules, STAFF-canEdit-edits-any). Five were genuinely missing:

- **`where.deletedAt === null` on every Transaction read** — the one I had not thought of,
  and the lead is right that it is the same class of undetectable wrong number. Added to
  the gate; mutation-verified by removing the filter from `ledgerWhere`, which failed 8
  cases with `transaction.findMany where.deletedAt is undefined, not null`.
- **A by-value drive against a second establishment.** I had the harness case; the gate now
  also drives `listTransactions(OTHER_EST, …)` and asserts *every* call fails. A
  `toBeDefined()` check would pass that, which is the hole.
- **`Halalas` suffix on every money field** in all four query shapes.
- **`balanceByMethod` is `{ method, balanceHalalas }`** — one net figure, not my
  `{ paymentMethod, in, out, net }`.
- **`topOutCategories` percent removed**, and **`LedgerRow.date` is an ISO string** rather
  than a `Date`, since these rows cross into the recharts client component.
- **Business-rule rejections go in `fieldErrors`** — `categoryId` for `err.categoryInvalid`
  and `err.categoryDirectionMismatch`. `err.amountInvalid` and `err.dateFuture` already
  landed on their fields via `invalid(zodError)`; `err.monthLocked` stays bare.

Open contract question raised with the lead: `docs/BACKEND.md` writes
`listTransactions(estId, filters, page)`, but `TransactionFilterSchema` already carries
`page` with a default of 1, so a third argument would duplicate it. Implemented as
`listTransactions(estId, filters)` with `filters.page`.

---

## Checkpoint 3 — B5, B11, B6

| Task | Files | Gates |
|---|---|---|
| B5 | `admin/{actions,queries}.ts`, `admin/admin.test.ts` | build, 181/181, tsc |
| B11 | `establishments/actions.ts`, `settings/actions.ts`, `transactions/scoping.test.ts` | same |
| B6 | `src/app/api/export/route.ts`, `export.test.ts` | same |

### B5 — rule 10 has its own gate
`admin/admin.test.ts` (19 cases) holds "no amounts, ever", because the admin area is
deliberately **not** establishment-scoped and so is excluded from the B3 gate. It checks
three separate ways: no argument to any Prisma call mentions `amountHalalas`, no key
anywhere in the returned structure matches `/amount|halalas|total|sum|balance/i`, and every
call on the `transaction` model is a `groupBy` whose `_max` is exactly `{ createdAt: true }`
with no `_sum` or `_avg`.

`lastActivityAt` is the field that makes this necessary. It is derived *from* transactions
without being one, so the natural implementation — "find the newest entry" — pulls a whole
row and its amount into a competitor's view. **Mutation-tested**: replacing the `groupBy`
with the obvious `findMany({ select: { …, amountHalalas: true } })` failed **5** of the 19.

The static half strips comments before checking, so the rule can be explained in the file
without the explanation failing it — with a third case asserting the stripper does not blank
the file, or the other two would be vacuous.

### B11 — ten writes migrated, both files now swept
All ten `update({ where: { id } })` calls in `establishments/actions.ts` and
`settings/actions.ts` are now `updateMany` carrying the scope, via two helpers
(`updateOwnStaff`, `updateOwnCategory`) so the 0-row check cannot be forgotten at a call
site. `grep` for unique-where writes across `src/features/` returns **0**.

The lead's condition — a 0-row write must not become a silent success — has its own
describe block: five actions each asserted to return `err.notFound` when `updateMany`
reports `count: 0`.

Adding both files to the static sweep needed 14 new drivers and surfaced two things the
runtime layer had never seen:
- **`listStaff` was the only unexercised pair** (`user.findMany`) — the sweep working as
  designed, catching a call site no test reached.
- **Two legitimate exceptions to the scope rule**, both encoded narrowly rather than by
  loosening it. `changeOwnPassword` scopes by the session's own user id, which it must,
  since an ADMIN has no establishment — allowed only when `where.id` is the session user
  *and* `establishmentId` is absent. And `allocateJoinCode` probes join-code uniqueness,
  which is global by nature — allowed only for `establishment.findUnique` by `joinCode`
  selecting exactly `{ id: true }`, so it can answer "taken or not" and read nothing.

The sweep now covers 11 files. `src/features/admin/**` is the one deliberate absence, and
the exclusion comment says why and names the test that covers it instead.

### B6 — the export route
`requireOwner()` first, then `ReportRangeSchema` on `from`/`to`. The establishment comes
from the session; the URL is trusted for the range and nothing else. `export.test.ts`
asserts that directly — a request carrying `?establishmentId=est_belonging_to_someone_else`
must leave both queries called with the session's id, checked by value *and* by the string
never appearing in the recorded arguments.

It also round-trips the bytes: the response starts with `PK\x03\x04`, loads back through
exceljs with two sheets, and cell C2 is the **number** 1234.5 rather than "1,234.50" text,
so an owner can sum the column. Amounts are written in riyals with a `#,##0.00` format;
halalas would be arithmetically correct and unreadable.

### Gotchas
- **The route takes a plain `Request`, not `NextRequest`.** It read `request.nextUrl`
  first, which only exists on `NextRequest` and made the handler untestable without
  constructing a Next-specific object. `new URL(request.url).searchParams` is equivalent at
  runtime and callable from a test.
- `allRows` pages through `listTransactions` rather than adding an unpaginated query, so the
  export cannot drift from what the ledger screen shows.
- An `approveOwner` that runs twice must not double the categories, so the insert is
  guarded by `category.count === 0`. It also sets `establishment.active = true`, because an
  owner rejected and later approved needs their establishment switched back on.

### Reconciliation against the corrected B5/B11/B6 briefs
Four of the seven items were already in place; three needed work.

**Already correct.** The `status !== "PENDING"` guards on `approveOwner`/`rejectOwner` (and
the category insert is additionally guarded by `category.count === 0`, so the duplicate-set
bug the lead described was blocked twice). `writeAudit` on all four admin actions, each
carrying the **target** establishment rather than null. Every `findFirst` kept through the
B11 migration — only the write changed, so the audit `before` payloads and the status guards
are intact and the 0-row `updateMany` is a second guard, not the primary one. The self-write
rule the lead ruled on is exactly what was implemented.

**Changed.**
- The export route now returns the schema's **own** key instead of flattening every parse
  failure to `err.rangeInvalid` — so a three-year request says `err.rangeTooLong` and a
  malformed date says `err.dateInvalid`. This broke my own earlier test, which had asserted
  the flattened key; it now asserts per case, plus one at exactly the 366-day cap.
- `src/app/api/export/route.ts` added to the gate's `FILES`. It contributes no pairs, since
  it reuses `listTransactions`/`getReport` — being listed is what fails the suite if it ever
  gains a direct Prisma call.
- The admin file header now names the three guards that stand in for a session scope where
  the id legitimately comes from the client: zod on the id, an existence check *before* the
  write, and `requireAdmin()` as sole authorisation.

### `pageTotals` across pages (asked for by `frontend`, F5's criterion)
Three cases in `scoping.test.ts` on a **60-row** fixture, so page 2 exists: rows page 50/10,
`total` 60 on both, `pageTotals` identical across pages and equal to the full sum, and the
`groupBy` asserted to carry no `skip`/`take`. **Mutation-tested** with the exact regression
`frontend` predicted — deriving the totals from the rows already fetched — which failed all
three. Page 1 alone would have passed it, which is the whole point of the larger fixture.

This needed the harness to accept a **function** as a canned response so `findMany` can
honour `skip`/`take`; that is what makes any paging behaviour testable here.

### Confirmed by request rather than assumed: the signed-out export is 307, not 403
`requireOwner()` works by `redirect()`, so against a running production build:
- signed out → `307 /login`
- signed out **with a `purpose: prefetch` header**, which the proxy matcher deliberately
  skips → still `307 /login`. That one came from `requireOwner()` itself, since the proxy
  never ran, which is the useful half of the result.
- a **forged** but well-formed sealed cookie naming a user who does not exist → `307
  /login?signedOut=1` on both paths.

So the route fails closed with and without the proxy, and the reviewer's earlier L4 note
about the prefetch bypass does not reach this route: `requireX()` is doing the work, exactly
as `docs/BACKEND.md` says it should.

### Order-dependence in `scoping.test.ts` — real, found by asking
The lead asked whether a suite that failed 7 then passed was order-dependent or just
mid-edit. It was mid-edit — the 7 were `createCategory`/`categoryForm` import errors from an
incomplete edit, not flakiness. **But the question found a genuine latent fragility anyway.**

Run under `--sequence.shuffle`, seed 3 fails: the static sweep reads the `allObserved` set
that the driver blocks populate, so it must run **last**. Two of three seeds passed, which is
exactly the profile that later gets dismissed as flakiness.

The project does not shuffle (`vitest.config.mts` does not set it, and that file is the
lead's), so this is latent rather than live. Mitigation: a floor assertion on
`allObserved.size` whose message names the cause — under shuffle the failure now reads "the
static sweep ran before the driver blocks … it is not a scoping failure" instead of printing
every pair as unexercised, which looks exactly like a scoping regression.

Not fixed by making the sweep self-driving, because that would duplicate every driver's
response fixture. Reported to the lead as a constraint on ever enabling shuffle.

### Both encoded exceptions are now pinned (reviewer finding)
Nine rules in `describe("the scope rule actually bites")` had pinning cases; the two
exceptions I added did not. Five cases now, three refusals and two accepted shapes, each
**mutation-verified** by widening the exception it guards:

| Widening | Case that fails |
|---|---|
| drop `Object.keys(select).length === 1` | refuses a join-code probe that selects more than the id |
| relax `where.id === USER` to a typeof check | refuses a self-write naming somebody else |
| delete `where.establishmentId === undefined` | refuses a self-write carrying a foreign establishment |

Each mutation failed exactly one case, so the pins are precise rather than broadly
overlapping. All three reverted and the originals confirmed by `grep`.

Needed a new `OTHER_USER` constant beside `OTHER_EST`, and the reason is the reviewer's,
worth keeping: the tenant rule has always been protected by a foreign **id existing in the
fixture to fail against**, and the self-write rule had no equivalent — a rule asserted only
against the id it accepts can be widened to accept everything without failing anything.
That asymmetry is why the gap was easy to miss.

The governance point behind it: a logged Decision catches a **new** exception, because that
is visible in a diff. Only a pinning case catches the silent **widening** of an existing one,
which adds no exception and so triggers no Decision — and reads as a tidy-up.

Also recorded: the 307 status on a refused export is **inference plus a manual check**, not
test-backed. `requireOwner` is mocked in `export.test.ts` and resolves, so the refusal path
never runs there. The property is safe structurally — `redirect()` throws, so the handler
cannot fall through to building a workbook — but nobody should cite the suite as evidence.

---

## Checkpoint 4 — B7

| File | Cases | Gates |
|---|---|---|
| `src/features/locks/locks.test.ts` | 10 → 26 | build, 222/222, tsc |
| `src/lib/auth.test.ts` | 16 — ~~in the tree, held out of the commit~~ **[lead correction, post-shutdown: the user ruled it STAYS. Committed in `7417419`, and `PROGRESS.md`'s Gotcha now reads "tests may import `auth.ts` when they mock `server-only` and Prisma". Security rule 2 and H1 are standing invariants that must always be pinned — if a refactor makes this file inconvenient, it moves rather than being deleted.]** | same |

### Status: the locks half is committed-ready, the auth half awaits the user
`src/lib/auth.test.ts` exists and passes, and the lead is deliberately **excluding it from the
Checkpoint 4 commit** so the user's decision stays open — the choice is keep-or-discard rather
than should-we-build-it. The question is not the test's quality but that the lead's "test the
wrapper" ruling overrides `PROGRESS.md:179`, and a documented-rule change is a stop-and-wait
while the user is away.

It briefly left the tree and came back: the hold arrived after the file was written, I removed
it so an untracked file could not carry a rule change into a commit, and the lead's next
message asked for it to stay in the tree but out of the commit instead. Restored from the
session scratchpad. **The lesson is about the protocol, not the file:** three messages in a row
crossed with work already done, and the reason each was recoverable is that the tree state was
re-verified rather than inferred from the last message received.

### What it contained — the wrapper, six rows, destinations not booleans
Tested against `requireCanEdit`/`requireUser` rather than the predicate, because
`permissions.test.ts` has covered `canEditTransactions` as a truth table since Phase 0 and a
predicate-only file would have duplicated it. The PENDING row is what settles it: the
predicate returns `false`, but the wrapper's observable behaviour is a **destination** —
`/pending`, not `/login` — and only the wrapper can express that.

Six rows: OWNER allowed · STAFF canEdit true allowed · STAFF canEdit false → **`/staff`**
(their account is fine, they lack a permission) · PENDING → **`/pending`** · DISABLED →
**`/login?signedOut=1`** · inactive establishment → **`/login?signedOut=1`**. One case
asserts the three refusal destinations are pairwise distinct, which is the property that
makes the matrix worth more than a boolean.

**H1 is pinned** — five cases. `forget()` wraps `session.destroy()` in try/catch because a
server component render cannot write cookies; without the catch the throw escapes *before*
the redirect and every page load for a disabled user is a 500 rather than a trip to the login
form. Nothing tested it until now, so simplifying `forget()` back to a bare `destroy()` would
have failed nothing. Covered on all three branches that call it, plus that PENDING keeps its
session (it is waiting, not refused) and that the clear is still attempted when it can work.

### Precision, and how the mutations were made safe
`auth.ts` is off-limits, so each mutation was taken against the **committed** file and undone
with `git checkout -- src/lib/auth.ts` rather than a reverse string replace — an exact
restore rather than a hopefully-symmetric one, verified by `git status --porcelain` returning
empty after each. `auth.ts`, `session.ts` and `permissions.ts` are all identical to
`f81a9f6`; nothing was changed to make a test pass.

| Mutation | Failures |
|---|---|
| bare `session.destroy()` on the DISABLED branch | **1** — the H1 DISABLED case |
| drop `canEditTransactions` from `requireCanEdit` | 2 — both canEdit-false cases |
| drop the PENDING redirect | 3 — all three PENDING-named cases |

Each failure names the row. The 2 and 3 are not imprecision: every failing case is named for
the rule that broke, and a clause governing three observable behaviours should fail three
times rather than hide two of them.

### `locks.test.ts` extensions
The gap was the actions and `listLocks` — the scoping gate drives them but asserts only
scoping, never behaviour. `lockMonth` refuses the open and future months, rejects month 13
before touching the database, is idempotent on an already-locked month **and writes nothing**,
scopes both check and insert, audits `LOCK`. `unlockMonth` mirrors it, refusing the open month
symmetrically. `listLocks` is 24 newest-first, marks the open month unlockable, fills empty
months rather than leaving gaps, and returns `lockedAt` as a string.

Mutation-verified: dropping the idempotence guard failed exactly *"is idempotent … and writes
nothing"*; dropping `establishmentId` from `unlockMonth`'s `deleteMany` failed exactly
*"removes an existing lock, scoped to the establishment"*.

### The rule question that caused the hold
`PROGRESS.md:179` says not to import `auth.ts` from a test because it is `server-only`. That
was true of the tooling at the time and is no longer: `vi.mock("server-only", () => ({}))`
plus mocks for `next/navigation`, `./session` and `./db` reaches every branch. The line should
now read that the *predicate* is testable without mocks and the *wrapper* needs four — not
that the wrapper is untestable. Raised with the lead rather than edited, since it is theirs.

---

## Checkpoint 5 — T1 + the worker-src CSP fix

| File | What | Gates |
|---|---|---|
| `src/proxy.ts` | `worker-src 'self'` added (authorised, 8 lines, **insertion only**) | build, 237/237, tsc |
| `src/proxy.test.ts` (new) | 15 cases, tiers 1 and 2 | same |

### The `worker-src` fix — a production-only failure that passes every local check
A worker resolves through `worker-src` → `child-src` → `script-src` → `default-src`. With the
first two absent it lands on `script-src`, where **production's `'strict-dynamic'` makes
`'self'` inert**. `/sw.js` is fetched by URL rather than from a nonced tag, so nothing permits
it and `navigator.serviceWorker.register()` is refused — **but only in production**, because
the dev branch has no `'strict-dynamic'` and `'self'` still applies.

That is the shape worth remembering: the PWA would have worked locally, passed every test, and
been silently absent on Render, with no error to search for. `git diff --numstat` is `8 0` —
insertion only, no line of the nonce logic, matcher or `script-src` touched.

### T1 — two tiers, and the third deliberately out of scope
**Tier 1**, the five constant headers, read from `next.config.mjs`'s own `headers()`.
**Tier 2**, the nonce plumbing through `proxy()` directly:
- the response CSP carries `nonce-<32 hex>`, and `script-src` names *that* nonce;
- the **`x-nonce` request header equals the response CSP's nonce** — the pairing *is* the
  mechanism, since Next reads the request header while the browser enforces the response one,
  and a mismatch breaks hydration while both headers look individually fine;
- two calls produce **different** nonces, because a constant nonce is no nonce;
- production has `'strict-dynamic'` **and never** `'unsafe-eval'` — asserted two-sided,
  because `'unsafe-eval'` in production is a real weakening rather than the wrong branch;
- `script-src` is never a bare `'self'`, in either branch — the literal Phase 0 regression;
- `worker-src 'self'` present in both branches.

**Tier 3** — that Next stamps `nonce=` onto the inline tags — is out of reach without a
running server and deliberately skipped. It is Next's behaviour rather than ours and *cannot*
fail silently: a Next that stopped honouring `x-nonce` would fail to hydrate every page on
first load. The silent failure is someone simplifying **our** CSP, which tier 2 catches.

**A third guard neither tier named**, and the one I think actually matters: `next.config.mjs`
must declare **no** `Content-Security-Policy`. A header declared there is constant and cannot
carry a per-request nonce, so a CSP moved back into the config breaks hydration app-wide while
every other assertion here still passes.

### Gotchas
- **Under Vitest `NODE_ENV` is `"test"`, so `proxy()` takes the dev branch.** `vi.stubEnv`
  is needed for any production assertion. There is now a case asserting the *dev* branch too —
  stated as a case rather than a comment, because the two branches differing is precisely why
  a production-only CSP failure passes every local check.
- **`next.config.mjs` has no declaration file and `allowJs` is false**, so importing it is
  implicitly `any` and the implicit-any spreads into every assertion. One `@ts-expect-error` on
  the import line plus an immediate cast to a declared shape confines it — and if a
  declaration file is ever added, `@ts-expect-error` becomes an error itself, which is the
  right prompt to remove it.
- Mutation-verified: removing `worker-src 'self'` failed **exactly** *"permits the service
  worker in both branches"*, then re-added, with `git diff --numstat` confirming the file is
  HEAD plus the authorised insertion and nothing else.

### The three T1 mutations — all exact
| Mutation | Failure |
|---|---|
| declare a CSP in `next.config.mjs` | **1** — *does not declare a Content-Security-Policy* |
| drop `requestHeaders.set("x-nonce", …)` | **1** — *hands the same nonce to the renderer* |
| hoist the nonce to a module constant | **1** — *gives every request its own nonce* |

No two assertions test the same thing. `next.config.mjs` restored with `git checkout --`;
`proxy.ts` restored from an **exact byte copy**, because a git restore would have stripped the
authorised `worker-src` line along with the mutation — the mechanism had to change to keep the
same "provably unchanged" guarantee. `git diff --numstat` confirms `8 0` after each.

### `ownerUserId`
`EstablishmentSummary.ownerUserId: string | null`. Null rather than `""` when an establishment
has no owner row: the screen drops the control, and an empty string is a valid-*looking* id
that would have failed inside `SetPasswordSchema` rather than at the screen. Two cases, one
asserting rule 10 is undisturbed — an id is not an amount.

### `src/serviceWorker.test.ts` — the SW cache allowlist, 23 cases
The subject is `public/sw.js`, which cannot hold its own test because `public/` is served.

Why it earns a place beside rule 2 and H1: every other tenancy protection here has `requireX()`
behind it as a backstop; **this one has nothing behind it**, because a cached response never
reaches the network and no server-side gate runs. Cache one HTML page and the next person to
open the app on that device sees it.

Three mutations, each naming its clause:

| Mutation | Failure |
|---|---|
| `/icons/` → `/icons` | **2** — *prefix confusion* (behaviour) and *keeps the trailing slash* (source) |
| drop the `mode === "navigate"` check | **1** — *a navigation, by mode rather than by URL pattern* |

The two failures on the first are deliberate belt-and-braces rather than duplication: one
proves the behaviour, one names the clause whose absence is invisible on inspection.

Beyond `isCacheable`, the fetch handler itself is exercised: `respondWith` must **not** be
called for a navigation or for `/_next/data/owner.json`, and must be for a static asset. That
is the actual protection — a catch-all `respondWith` with any strategy caches a data page by
accident, and excluding `/api/*` would not prevent it.

### Gotcha — the same trap for the third time
A source-level assertion tripped over the subject file's own prose: `sw.js` documents *why* it
never calls `respondWith` off the allowlist, and the check found that word in the comment.
Third instance of this shape (`$queryRaw`, `amountHalalas`, now `respondWith`). **The rule:
strip comments before any source-level assertion, and add a case proving the stripper did not
blank the file** — otherwise both checks pass vacuously forever.

## 2026-09-29 — v1.1c X1: Excel export redesign

### Files
- `src/app/api/export/route.ts`: still `requireOwner()` first, range through `ReportRangeSchema`,
  `listTransactions` (every page) + `getReport`, both with the session's `establishmentId`. The
  workbook-building moved out. New: it passes `user.name`, `user.establishmentName` (from
  `requireOwner()`'s `AuthedUser`, no extra read) and `package.json`'s `version` as meta.
  400 key behaviour, filename and `Cache-Control` unchanged.
- `workbook.ts`: pure `buildWorkbook({ rows, report, meta })`, the «معلومات» sheet and
  `riyadhStamp()`.
- `ledgerSheet.ts` («الحركات»), `summarySheet.ts` («الملخص» + `byPaymentMethod(rows)`),
  `style.ts` (colours, `MONEY_FORMAT`, fresh-object style helpers, `totalValue`, `widthFor`).
  All under 200 lines. `src/features/reports/queries.ts` untouched.

### Shape decisions worth knowing
- **Sheet 1 totals are three rows, not one**, under the amount column: إجمالي الوارد
  (`SUMIF >0`), إجمالي الصادر (`SUMIF <0`), الصافي (`SUM`), label merged over A:B. A single row
  cannot hold three amounts in one amount column without putting money under the category or
  method columns. `t.export.totalsRow` is used on the payment-method table's totals row instead.
- Green/red font goes on the **direction and amount cells** of each row, not the whole row;
  the rest of the row stays default ink. The direction text column stays, so colour is never
  the only signal.
- Title block: A1:H1 title, A2:H2 establishment, A3:D3 period, E3:H3 generated-at (text).
  Merged, so they never feed the width calc.
- «الملخص»: وارد table, صادر table (negative), each with a `SUM` totals row, then الصافي =
  `B<inTotal>+B<outTotal>`; then the method table (enum order, empty methods omitted) with a
  `SUM` totals row. Every total is `{formula, result}`, or a plain 0 when there is nothing to sum.
- `riyals()` adds `+ 0`: negating a zero OUT total gave `-0`, which a `toBe` caught.

### Tests — 11 new, 2 updated in place (export.test.ts: 8 → 19; suite 274 → 285)
Fixture now 7 rows over Aug/Sep 2026 and CASH / BANK_TRANSFER / MADA / STC_PAY (OTHER empty on
purpose). The mocked `getReport` is computed from the same rows. The old OUT row stays first.
Updated in place per the resolution: "three sheets" (was two), row 6 = −1234.5 (was row 2, +).

Mutation checks (each broke, the named test failed, restored, 19/19 again):
| Mutation | Failed |
|---|---|
| `">0"` → `">=0"` in the SUMIF | totals formulas + cached results |
| OUT amount no longer negated | the old riyal-number case **and** the signed-by-direction case |
| empty period writes the formula anyway | plain zeros for an empty period |
| «الملخص» صادر sign flipped to + | category summary |
| method table IN/OUT swapped | payment-method breakdown |
| `"@/lib/db"` text / a `db.x` call appended to `style.ts` | the source scan (both regexes) |

An actual `import { db } from "@/lib/db"` in `workbook.ts` fails the whole file at load (the real
module needs env), so it is caught too, but not by the scan — the text mutations prove the scan.

### Gotcha
The source scan does **not** strip comments, on purpose: a comment containing `db.` or
`@/lib/db` in this folder fails loudly (rephrase it) rather than letting a stripper blank the
file and pass vacuously. Compare the Checkpoint 5 note.

### Gates
`npx tsc --noEmit` 0 · `npm test` 285/285, exit 0 · `npm run build` 0 (under the build lock).
Sample workbook (fixture data, not real) written by an uncommitted scratchpad script.

### R-X1 follow-up (reviewer-2): X1-S10 and the scan note
- **X1-S10:** the «الملخص» totals were pinned only by their cached `result`, which comes from
  halalas / `getReport`, not from the formula. Desktop Excel recalculates when the file opens,
  so a wrong range or operator would show a wrong number while every assertion stayed green. New
  case: a small evaluator for the three shapes written (`SUM(Xa:Xb)`, `SUMIF(Xa:Xb,">0"|"<0")`,
  `Xn+Xm`) computes every `{formula, result}` on sheets 1–2 from the loaded cells and compares in
  halalas. It expects 9 formulas. It is **strict**: a referenced cell that holds no amount
  throws, and so does an unknown formula shape.
- Mutations: net `+`→`-` failed · method SUM one row long (into the totals row) failed · ledger
  range into the blank row failed (two tests) · category SUM range into the header **survived at
  first**, because SUM skips text and Excel would show the right number too. Making the
  evaluator strict caught it. All restored; 20/20.
- **Scan:** now `/lib\/db\b|generated\/prisma|@prisma\//` plus the receiver regex. A relative
  `../../../lib/db`, `@prisma/client` and `@/generated/prisma` are each mutation-checked.
- Gates: tsc 0 · 286/286 · build 0. export.test.ts is now 496 lines.
- Lead note applied: the title-block muted grey is now `#525252`, the app's neutral (7.81:1 on
  white); it was `#4B5563`. Gates re-run under the lock: tsc 0 · 286/286 · build 0. Sample
  workbook regenerated from the same fixture.

## 2026-09-29/30 — v1.1e (email verification, password reset, sign-up quality)

### E0 — contract layer
- `src/lib/names.ts` (`displayName`, `fullName`, `NAME_SELECT`; legacy fallback per A9).
- `src/lib/validation.ts` → `src/lib/validation/{index,names,password,email,normalize}.ts` (A14);
  `@/lib/validation` unchanged as the import path. New: sign-up schemas with name parts +
  `confirmPassword`, `VerifyCodeSchema`, `ForgotPasswordSchema`, `ResetPasswordSchema`, rule
  functions, `passwordStrength`, `emailTypoSuggestion`. Cross-field rules use
  `superRefine(fn, { when: () => true })` so they show while other fields are still invalid.
- `AuthedUser` drops `name` (+ first/middle/last/displayName); lists gain `fullName` +
  `emailVerified` (`EstablishmentSummary.emailVerified` is the owner's).
- Auth actions split into `src/features/auth/actions/{login,signup,verify,reset,flows,shared,types,index}.ts`.
  `index.ts` is a plain re-export module; `shared.ts`/`flows.ts` are `server-only`, NOT
  `"use server"` (every export of a `"use server"` file is a callable endpoint).
- Gates: tsc 0 · 306/306 · build 0.

### Gotchas
- `git mv` stages the rename — I undid it with `git reset -- <paths>` so the index stays the lead's.
- zod 4 object refinements are skipped when any field failed unless `when` is given.
- The 10k SecLists list leaves 5 relevant entries after A12's filter (reported to lead).

### E1 — migration `20260930000000_v1_1e_email_names`
- DDL from `prisma migrate diff --from-schema <HEAD schema> --to-schema prisma/schema.prisma --script`
  (no database; `--from-migrations` needs a shadow DB in Prisma 7). Backfill hand-written in the
  same file per A10: explicit whitespace class, bidi/ZWNJ/tatweel stripped, connectors glued with
  U+E000 (two passes, so chained «أبو عبد الله» stays together), `NULLIF` on the middle,
  `emailVerifiedAt = CURRENT_TIMESTAMP` for all existing rows. `name` kept, nullable.
- `src/lib/migration.test.ts` (PGlite): 23 split cases + 6 expand-step cases (verified backfill,
  `name` nullable, old-release insert still works and shows its legacy name, EmailCode cascade,
  no v1.1d column dropped). Mutations: NBSP out of the class (3 fail), single glue pass (1),
  COALESCE for NULLIF (6), no mark stripping (1). Restored byte-identical (`cmp`).
- Drift check (one-off, scratchpad): init + v1.1e on PGlite vs `migrate diff --from-empty
  --to-schema` on another PGlite → columns, indexes and constraints identical.
- Gates: tsc 0 · 342/342 · build 0.

### E2 — lists + validators
- `src/lib/passwords/common.txt` = SecLists `10k-most-common.txt` @913b327 (MIT, README);
  `common.generated.ts` from `generate.mjs` — 5 entries survive A12's filter.
- `src/lib/emails/disposable.txt` = 336 domains from disposable-email-domains @51fafcd (CC0,
  README); `disposable.ts` server-only, matches the domain and every parent domain.
- Tests: `validation/names.test.ts` (40), `password.test.ts` (28, incl. the A12 equivalence
  against the full list and the generator-drift check), `email.test.ts` (27, incl. disposable).
- Mutations (each failed its named cases, restored from byte copy): dots rule removed (3),
  exact-domain-only disposable (1), script check removed (3), common on the raw password (2),
  characters instead of bytes (2), no 3-char minimum on email tokens (5).
- Gates: tsc 0 · 437/437 · build 0.

### Gotcha — the Write tool decodes `\uXXXX`
Writing `"‏"` into a .ts file with the Write tool stores the real (invisible) character.
Harmless at runtime, unreadable in review. Fixed every file with a script that re-escapes by
code point; in tests I now use `String.fromCodePoint(...)` for invisible characters.

### E3 — codes, flow cookie, mail, actions, gates
- `src/lib/codes/{index,stores,constants}.ts`: HMAC (HKDF-derived key) codes; one state machine
  over two stores — EmailCode rows, or an in-memory map for the fake flow, which runs the DB
  store's statements first (0 rows) so answers *and* statement counts match (A1). Increment
  first (conditional `updateMany`), compare second (A5); newest unconsumed only; caps across
  codes per user+purpose in 24 h: 5 issued, 10 summed attempts (A4); 60 s gate on both purposes.
- `src/lib/session.ts`: `zk_flow` (`getFlow`/`startFlow`/`clearFlow`), sealed with a password
  HKDF-derived from SESSION_SECRET; payload has no top-level userId.
- `src/lib/mail/{send,templates}.ts`: Brevo REST via fetch, 10 s timeout, logs status + Brevo
  code + recipient domain only; `deliver()` applies the mail caps silently; templates carry no
  user text, logo only for an http(s) APP_URL.
- Actions: sign-up response path = validate → disposable → limiter → (staff) join code → bcrypt
  → flow cookie with `randomUUID()` → `/verify`; the address is first looked at inside `after()`
  (`flows.ts`). No `clearAttempts` on sign-up (A2). verify/resend, forgot/reset (A3 order),
  login (A8 order), logout clears `zk_flow`. Audits `EMAIL_VERIFIED`, `PASSWORD_RESET_SELF`.
- Gates in `requireUser` (unverified → signed-out login) and approveOwner/approveStaff
  (`!emailVerifiedAt` → `err.emailNotVerified`; falsy, so an unselected field also refuses).
- Proxy: `/forgot`, `/reset` signed-out; `/verify` open.
- Test helper `src/lib/testing/memoryDb.ts` (in-memory user/establishment/emailCode/auditLog +
  `$transaction` rollback + statement log). Returns copies — returning the stored object hid an
  off-by-one in the fake store that the twin test then caught.
- Tests: codes (18), verify incl. the A1 twin script (8), reset (15), login (10), mail (12),
  session (6), sign-up (14), approval refusals (4), proxy paths (6).
- Mutations (each failed its named cases; restored from byte copies): no cap in the increment;
  no issue cap; no summed-attempts cap (refusal and mismatch answer, after the test was fixed to
  isolate it — it survived at first); fake skips a statement; fake ignores the issue cap;
  specific reset keys; name rule before the code; owner looks the address up before the
  response; clearAttempts back on sign-up; requireUser gate removed; both approval refusals
  removed; DISABLED check dropped from login; consume count ignored in verify.
- Gates: tsc 0 · 510/510 in 25 files · build 0 (first attempt died with a V8 fatal error — the
  known flaky crash on this machine; the immediate retry exited 0).

### Residuals (for Known issues)
- Fake-flow state is in memory: across a restart a fake flow loses its code while a real one
  keeps it in the DB, so the two can differ for one step (e.g. resend inside 60 s). Same class as
  the in-memory limiter resetting on deploy.
- A resend's code is issued in `after()`, so two resends a few ms apart can both pass the 60 s
  gate; bounded by `resend:{flowId}` 5/15 min and the 5-codes/day cap.
- `getVerifyFlow` has no requireX() by design (no session exists on /verify).

### Rulings applied after E0 (2026-09-30)
- **Common list → SecLists NCSC 100k** (`common.txt` full, 99,839 passwords, file as of `1a7bb91`);
  generated module 5,794 entries. The generator no longer filters on bytes: every rule except
  the byte limit reads the normalised copy, so the equivalence holds for any input.
- **G-B1 / A12 amended:** `validation/password.ts` imports no list (rules take `common` from the
  caller, default empty); `newPassword` schema has no common check; `src/lib/passwords/server.ts`
  `commonPasswordError()` is called by both sign-ups, reset, change password, owner-resets-staff
  and admin-resets-owner (each tested). A source scan fails if anything under
  `src/lib/validation/**` imports `passwords/`. After a build, the chunk holding the list is
  referenced only by the `/signup` and `/reset` client manifests.
- **E0-S1:** the length rule also counts the normalised copy (`"password1 "`, `"password1"+ZWSP`
  → passwordShort); the equivalence test covers padded/upper-case/ZWSP variants of every entry.
- `"bar"` dropped from the junk names.
- **A1 across a restart:** no code at all ⇒ `err.codeExpired` (what a lapsed real code answers);
  the flow cookie carries `startedAt`, and with no code the countdown runs from it, so a real
  flow right after sign-up and a fake flow whose state a restart lost read the same. Tested by a
  second twin script at +15 min with the fake state wiped.
- Login of an unverified or PENDING account also destroys a stale `ledger_session` (R-E0 note).
- Mutations: length on raw only (3 fail), list as default param (2), change password without the
  server check (1), missing state reads invalid (3), no-code countdown ignores flow start (1).

### LIMITS (approved as-is by the lead)
| Key | Max | Window |
|---|---|---|
| `verify:{flowId}` | 10 | 15 min |
| `verify:{ip}` | 20 | 15 min |
| `resend:{flowId}` | 5 | 15 min |
| `forgot:{ip}` | 5 | 15 min |
| `reset:{email}` | 10 | 15 min |
| `reset:{ip}` | 20 | 15 min |
| `mail:{ip}` | 20 | 24 h |
| `mailto:{email}` | 5 | 1 h |
Unchanged from before: `login:{ip}:{email}`, `signup:{ip}`, `join:{ip}` at 5 / 15 min.

### Gotchas (tooling, this session)
- The harness rewrites `\uXXXX` and sometimes `\r`/`\n` escapes in text I send (Write tool and
  heredocs alike) into real characters. A `/\r?\n/` in a test became a raw CR/LF and the suite
  failed to *load* — while my `grep "×|Tests "` filter still showed a green count for the other
  files. Always grep `Test Files` too, and patch escapes by byte value (`bytes([92])`).
- core.autocrlf=true here: working copies are CRLF, the index LF. Normal; not a diff.

### R-E3 E3-B1 (2026-09-30)
- `resendVerifyCode` now reads the row by id: none → (re)start the fake twin; already verified →
  send nothing and never mark the id fake; unverified → send. `storeFor` returns the fake store
  only for VERIFY, so RESET codes always live in the database.
- Tests: two-device script (verify on B, resend on A, then /forgot + /reset succeeds and the id is
  not fake) and a codes-level case (an id marked fake still gets DB RESET codes). Each fix
  mutation-checked alone (1 named failure each).
- E3-S1 (stale `ledger_session` on unverified/PENDING login) was already in, with tests.
- Gates: tsc 0 · 530/530 · build 0; the list chunk is referenced only by /signup and /reset.

## v1.2a — checkpoint 1 (K1–K5), 2026-09-30

### Done
- **(0)** `src/lib/money.test.ts`: the ceiling case now pins 20M SAR (2_000_000_000 ≤ 2^31−1).
- **K1** `src/features/parties/{queries,actions}.ts`, `src/features/projects/{queries,actions}.ts`
  with the doc's names; extra exported types `PartyDetail`, `PartyOption`, `PartyFilter`,
  `PartyState`, `ProjectDetail`, `ProjectCategoryTotal`, `ProjectOption`, `ProjectFilter`,
  `ProjectState`. `LedgerRow` gains `partyId/partyName/projectId/projectName/instalmentId`
  (ROW_SELECT reads `party.name`, `project.name`). `TransactionRow` is frontend's Pick in
  `components/data.ts` — told them to widen it. Ran `npx prisma generate` (gitignored output).
- **K2** `prisma/migrations/20261001000000_v1_2a_parties_projects_plans/migration.sql` via
  `migrate diff --from-schema <HEAD schema in scratch file> --to-schema …`, CR stripped, additions
  only (grep for DROP/ALTER COLUMN/DELETE/UPDATE: only the FK `ON DELETE RESTRICT ON UPDATE
  CASCADE` clauses). `src/lib/migration.v12a.test.ts` (13): pre-existing row keeps null links;
  old-release insert works; new columns nullable; links work; dangling FK refused ×3; Restrict ×3
  (row survives); drift vs `--from-empty` (columns, pg_indexes, pg_constraint); V3; Prisma P2003.
- **K3** party/project rules, audits (inside the `$transaction`), P2003 → `*HasHistory`,
  revalidation (`/owner/parties|projects` + `/owner` and `/staff` layouts). V9: establishments,
  locks, settings actions revalidate `("/owner/settings", "layout")`; staff-row actions also
  `/owner/staff/logins`; `regenerateJoinCode` settings only.
- **K4** `checkLinks` in `transactions/actions.ts` (party active unless kept; project ACTIVE unless
  kept → `err.projectClosed`; unknown → `err.projectInvalid`; any `instalmentId` →
  `err.instalmentInvalid`); party set ⇒ `counterparty` null; update never writes `instalmentId`
  (absent = keep); snapshots carry the three links; `ledgerWhere` partyId/projectId + party-name
  in `q`; export column F = `partyName ?? counterparty` (+ export test case).
- **K5** `scoping.test.ts`: models party/project/plan/instalment; `createMany` per element;
  `createManyAndReturn` refused; V1 `isReferenceProbe` + 9 pin cases; drivers for every new
  query/action (empty + populated); foreign link id ×3 → field error with scoped lookups;
  parties/projects in `FILES`; static "no nested `transactions: true|{`" in
  parties/projects/plans. `admin.test.ts`: static no-v1.2a-models case over
  `src/features/admin/**`, `src/app/(admin)/**`, `src/components/chrome/**` (imports) with
  pattern self-checks. New: `parties/parties.test.ts` (16), `projects/projects.test.ts` (15),
  `transactions/links.test.ts` (13), `lib/validation.v12a.test.ts` (16); `validation.test.ts`
  ceiling case now 2_000_000_000 / 2_000_000_001.

### Decisions / readings (flag if wrong)
- `updateParty` runs the duplicate check only while the party is **active**; an inactive party is
  checked when reactivated (`setPartyActive`), which is where a clash would become visible.
- The V1 probe is slightly stricter than the doc: also no `_min/_max/include`, `groupBy.by` only
  link keys, and a `findFirst` must `select` ids only (a select-less findFirst returns the amount).
- Party balances: `plan.findMany` (scoped, all states → `hasHistory`) + `instalment.groupBy` by
  planId over OPEN plans; `max(0, due − paid)` per plan.

### V3 result (recorded)
Postgres widens `sum(int4)` to **bigint** (`pg_typeof` confirmed), and Prisma 7 + adapter-pg
returns the `_sum` as a JavaScript **number** (4_000_000_000 arrived as `number`). The `Number()`
at each query boundary is therefore a no-op kept as a guard. Proven by driving the real generated
client on PGlite through a `pg.Pool` stand-in (`prismaOn()` in `migration.v12a.test.ts`).

### Gotchas
- **`ON DELETE RESTRICT` raises SQLSTATE 23001 (restrict_violation), not 23503.** adapter-pg maps
  both to P2003, so the actions' mapping holds; a raw-SQL test must expect 23001.
- A Restrict test must use a row referenced **only** by the link under test: a party held by a
  plan also refuses deletion, which would hide a missing Restrict on `Transaction.partyId`.
- A test on a row inserted by an earlier test goes vacuous when that insert fails (UPDATE of 0
  rows raises nothing) — the dangling-FK cases target the row seeded before the migration.
- Prisma on PGlite works: the adapter needs `instanceof pg.Pool`, raw text values
  (`parsers` for OIDs 0–8191 → identity) and pg's own `getTypeParser`. Reusable for CP2 if the
  lead wants it in `src/lib/testing/`.
- Heredocs through the Bash tool choke on some long Python blocks ("unexpected EOF looking for
  `'`"); use Edit/Write for big test insertions.

### Mutation verification (each broken alone, restored byte-exact, suite re-run)
Migration: SET NULL on project link → Restrict(Project)+drift; renamed `counterparty` → old
insert, kept row, drift; dropped instalment FK → dangling(instalment), Restrict(Instalment),
drift; dropped an index → drift only. Scoping: 13 mutations (probe unscoped, each V1 clause
dropped, createMany first-only, link lookups unscoped, instalment not refused, nested
`transactions` select, delete probe unscoped) — each failed its named case; dropping the V1
`by` or where-key clause also fails one older soft-delete case (those inputs become probes).
Rules: 19 mutations over parties/projects/links/admin/phone — each failed its named case(s).

### Gates
`npx tsc --noEmit` 0 · `npx vitest run` 645/645 in 30 files · `npm run build` 0 (under the lock).

### After R-K1 (reviewer: pass, 3 notes) and the lead's K5 ruling
- Lead: K5 stays in `scoping.test.ts` (one scopeFailure / observed set / sweep); V1 pins sit
  right after the scope-rule unit cases; drivers under "v1.2a" describe blocks — as built.
- N-K1a: added the balance case (OPEN IN 1000 − 300 → owedToUs 700; ARCHIVED → 0; `hasHistory`
  from the plan alone, no transaction). Mutation-checked: counting archived plans and dropping
  plan-derived history each fail it alone.
- N-K1b: V3 established by test (see "V3 result" above), not by assumption.
- N-K1c: comment on `byCategory`'s unreachable `""` fallback.
- Gates: tsc 0 · vitest 646/646.

### Lead rulings (a)(b)(c) + grants — applied
- (c) `src/features/transactions/links.ts` (server-only, not "use server") now holds
  `checkLinks`/`linkColumns`; `actions.ts` imports them (325 lines). Added to the sweep `FILES`.
  Mutation-checked: a stray `db.party.count({ where: {} })` in links.ts fails the sweep; unscoped
  party/project lookups and a dropped instalment refusal in links.ts each fail their cases.
- (b) Each V1 bound has its own pin and each widening now fails **exactly one** case: added pins
  for `_avg`, `_min`, `_max`, `include` (dropping any one fails only its case). The two older
  soft-delete cases were reshaped so they are not probe candidates on independent grounds
  (groupBy now carries `_sum`; the "asks for deleted rows" case is a `findMany`) — re-run: the
  `by` and where-key widenings each fail one case now.
- Grant 2: `src/lib/testing/pgliteClient.ts` exports `pgliteClient(lite)` (the Prisma-7-on-PGlite
  stand-in); `migration.v12a.test.ts` uses it and carries a static case that nothing but a
  `*.test.ts` imports it (mutation-checked).
- Gates: tsc 0 · vitest 652/652 in 30 files · build 0 (under the lock).

### R-K2..K5: pass + S-K5a fixed (last CP1 blocker)
- S-K5a: `isReferenceProbe` now requires (1) at least one link key besides `establishmentId`
  and (2) every link key naming ids — a string or `{ in: [strings] }`, never `null`/`{ not }`.
  Pins: `{ establishmentId }` alone, and `partyId: null` (+ `{ not: null }`). Dropping clause 1
  fails only the first pin; dropping clause 2 fails only the second (mutation-checked).
- links.ts sweep proof re-run: a stray `db.party.count({ where: {} })` fails "every (model,
  method) pair … exercised"; restored byte-exact. The foreign-link cases drive links.ts's
  `party.findFirst`/`project.findFirst` (unscoping either fails its foreign case).
- N-K5b noted: CP2's payment path goes in its own module; actions.ts (325) must not grow.
- Gates: tsc 0 · vitest 654/654 in 30 files · build 0 (under the lock).
- S-K5a tightened per reviewer: ids must be non-empty (`""` and `{ in: [] }` / `{ in: [""] }`
  refused). Four clauses mutation-checked, each fails exactly one S-K5a pin.

## v1.2a — checkpoint 2 (P1–P5) — plan, before the go (2026-09-30)
Waiting on R-brief-2 + the lead's go. Order when it comes: P1 (export signatures → frontend
first) → P2 → P3 → P4 → P5, gates after each.
- **P1** `src/lib/schedule.ts` `buildSchedule(...) → Row[] | null` (UTC date math, anchor-day
  monthly clamp, remainder on the last row, `count > total` → null); `src/lib/instalments.ts`
  `dayOffset`, `instalmentStatus`, `planStatus` (no clock read — `todayISO` passed in);
  `src/lib/allocation.ts` `allocate`. All pure, no `server-only`, no db import.
- **P2** `plans/allocate.ts` `reallocatePlan(tx, est, planId, userId)`; revision lock as a
  helper `bumpRevision(tx, est, planId, seen)` that throws a sentinel inside `$transaction`
  (rollback) mapped to `err.concurrentChange` outside. `revision` read in the same `findFirst` as
  state/total/direction/partyId (V4), before any payment sum.
- **P3** `transactions/payments.ts` (server-only): `preparePayment` / `paymentUpdate` /
  `paymentDelete` hooks the three actions call, keeping actions.ts ≤ 325 lines.
- **P5 harness needs:** `db.instalment.fields.amountDueHalalas` (field reference) — the model
  proxy must expose `fields`; the real-client test mocks `@/lib/db` with `pgliteClient(lite)`
  built in an async `vi.mock` factory.
- Lead ratified readings 1–4 (binding in docs/BACKEND.md → CP2 additions → Confirmed readings);
  harness `fields` approved. Extra test owed: deleting a payment on an ARCHIVED plan
  re-allocates, and the statement's WRITE_OFF row grows to match.

### P1 — pure helpers (done)
- `src/lib/schedule.ts` `buildSchedule → ScheduleRow[] | null` (+ `MAX_EVERY_DAYS`),
  `src/lib/instalments.ts` `dayOffset`/`instalmentStatus`/`planStatus` (+ status types),
  `src/lib/allocation.ts` `allocate`. Signatures sent to frontend before the tests.
- Tests: schedule (13), instalments (12, incl. 23:59 vs 00:00 Riyadh via `todayISO(instant)`),
  allocation (10). 15 mutations, each fails its named case(s).
- **Finding — allocation is order-independent in its totals.** Each payment fills a circular run
  from its own instalment; like parking on a one-way ring, the final per-instalment totals are
  the same in every payment order (brute-forced: 2 payments × equal rows, 3 payments × unequal
  rows — no counter-example). So the doc's payment order `(date, createdAt, id)` cannot change
  any result; it is kept for deterministic iteration and pinned as a property ("same in every
  order"), not as an order-sensitive case that cannot exist. The **instalment** order does
  matter (roll forward = later) and is pinned incl. `seq` over `id` on a shared due date.
- Gates: tsc 0 · vitest 689/689 in 33 files · build 0 (lock).

### P2–P5 (done, 2026-10-01)
- **Files:** `plans/{allocate,queries,dues,actions,scheduleEdit}.ts`, `transactions/payments.ts`,
  `parties/statement.ts` (dues.ts / scheduleEdit.ts / statement.ts split for size — reported);
  `transactions/links.ts` now also holds `checkCategory`, `snapshot`, `EXISTING_SELECT`, so
  `actions.ts` went **325 → 240** despite the payment path; `topActiveProjects` in projects.
- **Revision lock:** `bumpRevision` (first statement) throws `ConcurrentChangeError`; callers catch
  by `instanceof` only (`inEntryTransaction` for ledger actions, `updatePlan`/`closePlan`).
  `updatePlan`'s P2003 catch is `instanceof Prisma.PrismaClientKnownRequestError` + code.
- **Payment path order (W3):** link fixed on edit → canEdit (before any lookup) → instalment →
  plan (revision in the same read, V4) → state/paid → direction/party refused → remaining
  (`aggregate` with `deletedAt: null` over `instalment: { planId }`) → `checkLinks` (project only).
- `ledger` mutations now revalidate `("/owner","layout")` + `("/staff","layout")`.
- **Statement:** `getPartyStatement → { party, rows, closingBalanceHalalas, other, otherCapped }`
  (`other` newest 50 via `recentTransactions(..., { partyId, instalmentId: null })`).
- **Tests:** `plans/plans.test.ts` (21), `plans/allocate.test.ts` (6),
  `transactions/payments.test.ts` (14), `plans/moneyPath.test.ts` (8, real client on PGlite:
  create → partial → overpay rollover → edit → delete → archive → archived delete; invariant
  statement closing = party balance after every step; `getOverdueCount`/`getDues` on real SQL),
  scoping CP2 drivers (11) + W5 static cache gate with self-test + `fields` not recorded.
  CP1 cases updated: an edit adding `instalmentId` is now `err.paymentLinkFixed`.
- **Mutations:** 26 (R1–R4, C1–C2, U1–U5, K1, Y1–Y6, D1–D4, S1–S2, W5, F1) — each fails its
  named case(s); D1 (overdue count without the plan-state filter) caught only by the real-SQL test.
- Gates: tsc 0 · vitest 751/751 in 37 files · build 0 (lock).
- **S-P1a fixed:** the order-independence pin now re-keys the *processing* order (one date,
  `createdAt` assigned in the permuted order) and uses amounts below capacity (a full ring
  hides any rule). Order-dependent variant OD2 ("a same-day later payment starts at the
  earliest row") fails **only** this pin; OD1 fails it plus the wrap case.
- dues.ts / scheduleEdit.ts sweep proofs: a stray `db.party.count` in either fails the
  observed-pairs check; unscoping scheduleEdit's read fails the updatePlan driver + sweep.
  scheduleEdit **does** call the db (instalment.findMany + the V1 probe) → in FILES, driven by
  the updatePlan scoping driver; its rules are unit-pinned through updatePlan in plans.test.ts.
- **S-P3a fixed (R-P2..P5 otherwise pass):** a payment edit's limit is `total − Σ others`, the
  others read after the revision with `id: { not: existing.id }`, `deletedAt: null`, scoped — the
  pre-revision `existing.amountHalalas` is never added back. Pin in payments.test.ts (entry
  changed 5000 → 1000 between reads; 6001 refused, 6000 accepted); reverting to the add-back
  fails exactly that case. N-P3b commented at the `err.instalmentPaid` check.

## v1.2b — checkpoint 1 (L1–L6), 2026-09-30

### L2 — pure helpers (done)
- `src/lib/payroll.ts`: `SALARY_CATEGORY_NAME`, `ymOf`, `addMonthsYm`, `payDateFor` (D3 clamp),
  `salarySeq` (N10: `year*12 + month-1`, derived from the month so a pay-day change or a gap never
  renumbers; screens show the month), `grossOf`, `salaryMonthsToGenerate` (D2 through end of next
  month, pay date ∈ [start, end], skip existing periods — Y1 lower bound comes from the plan's
  `startDate`), `salaryLinkedWhere(ids)` (Y3; each branch requires its FK `not: null` so the
  `NOT` can never evaluate to SQL NULL and hide an unlinked row). `nowRiyadhHHMM` in `dates.ts`
  (`hourCycle: "h23"` — midnight is `00:xx`, never `24:xx`).
- `src/lib/payroll.test.ts` (16).

### L1 — migration (done)
- `prisma/migrations/20261002000000_v1_2b_employees_salaries/` from `migrate diff --from-schema
  <HEAD schema in scratch> --to-schema`, LF, only CREATE/ADD (4 enums, 5 tables, `Plan.kind` NOT
  NULL DEFAULT 'STANDARD', `Plan.employeeId`, `Instalment.periodYm`, indexes, FKs).
- `src/lib/migration.v12b.test.ts` (15): old-release Plan/Instalment inserts, pre-existing rows
  read STANDARD/null, many null months per plan, both month uniques, one login per employee,
  Restrict on Employee.party / SalaryPeriod.instalment / Plan.employee (each case isolated to a
  row held by exactly one FK), the N5 delete order, attendance per day, no sensitive columns.
- Drift check in `migration.v12a.test.ts` now applies **every** migration dir in name order to a
  fresh PGlite. `plans/moneyPath.test.ts` likewise applies every dir (it broke on `Plan.kind`).
- Mutations: unique index → plain index fails the idempotence case + drift; Plan.employee FK →
  SET NULL fails the Employee Restrict case + drift. Restored by byte copy (`cmp`).
- Gotcha: the generated client must be regenerated (`npx prisma generate`, no DB) before tsc
  sees the v1.2b models.
- Gates: tsc 0 · vitest 782/782 in 39 files · build 0 (lock).

### L3 + L4 — employees and generation (done)
- `employees/actions.ts` (create/update), `employees/lifecycle.ts` (endEmployment, reactivateEmployee —
  split for size), `employees/form.ts` (parse, scoped reference checks, `refusal()` mapping),
  `employees/salaryPlan.ts` (X4/Y10 «رواتب» resolve, `startSalaryPlan`, D5/S4 `applySalaryChange`,
  D6 `endSalaryPlan`), `employees/queries.ts`, `employees/payslip.ts`.
- `payroll/core.ts` (tx helpers: `generateMonths`, `recomputePlanTotal` by aggregate (D8),
  `deleteUnfixedMonthsAfter` (v1.2a delete predicate + V1 probe, N5 order), `resnapshotFutureMonths`
  (D5/S4 predicate: paid 0 AND no non-deleted payment; `DeductionExceedsGrossError` sentinel),
  `archiveSalaryPlan`), `payroll/generate.ts` (`syncSalaryPlan`, `runSalaryGeneration`,
  `ensureSalaryInstalments = cache(...)`; per-plan transaction, lost race (ConcurrentChangeError /
  P2002) swallowed per plan; plans processed oldest first so S3 is deterministic).
- Readings: reactivation of an OPEN plan (future end not yet passed) reuses it; otherwise a new
  plan from max(hire, today) (Y1 — the reactivateConfirm string still says "next month", flagged).
  An ENDED employee's salary fields may be edited (stored for reactivation, no plan effect).
  Page-load generation audits under the session user.
- Tests: `payroll/salaryPath.test.ts` (12, PGlite, Date-only fake clock), `employees/employees.test.ts`
  (16), `parties.test.ts` +5 (D14).
- Gotcha: `vi.useFakeTimers({ toFake: ["Date"] })` is enough for `todayISO()`; PGlite is unaffected.

### L5 — v1.2a integration (done)
- `payroll/privacy.ts`: `staffSalaryFilter`, `withSalaryHidden(estId, where, hide)` (AND, never
  spread). `listTransactions`/`getTransaction`/`recentTransactions` take `{ hideSalary }`;
  staff dashboard recent hides (Y4); STAFF edit reads through it (err.notFound); STAFF payment on a
  SALARY plan → err.instalmentInvalid (after canEdit, same key as missing — N2).
- Dues: `kind`/`periodYm` on rows; staff dues + prefill exclude SALARY. Plans: `kind`,
  `employeeId`, `periodYm`, derived title (`planTitleOf`, X13), Y8 status, `canCancel` false,
  update/cancel/archive refuse SALARY (`err.salaryPlanManaged`). Parties: `employeeId`; statement
  title derived. Y2: balance/statement semantics unchanged.
- `payroll/privacy.test.ts` (14, PGlite): each Y3 branch isolated by one fixture row.
- Found: removing the `fk: { not: null }` guards does NOT break the unlinked-row case — Prisma 7
  already renders the negated relation filter NULL-safely. Guards kept, comment corrected.
- Mutations (restored by byte copy each): P1–P3 (each Y3 branch), P6 staff dues kind, P7 prefill,
  P8 STAFF salary payment, P9 STAFF edit filter, P10 staff recent, P11 Y8, P12 title, P13/P14 plan
  refusals — each fails its named case. P4/P5 (NULL guards) survive — see above.
- Gates: tsc 0 · vitest 829/829 in 42 files · build 0 (lock).

### L6 — gates (done)
- `scoping.test.ts`: the five v1.2b models joined `MODELS` (L3); v1.2b drivers appended before the
  sweep (reads empty + populated; create with «رواتب» created; adopt; D5 change; S4 removal with
  the N5 delete order asserted; salary added + retired «رواتب» reactivated; end + reactivate;
  both `ensureSalaryInstalments` passes; the staff privacy reads carry `NOT`; rule 11 foreign ids).
  `FILES` += employees/{actions,lifecycle,form,salaryPlan,queries,payslip}, payroll/{core,generate,
  privacy}; nested-transactions scan covers employees/ and payroll/; new S8 static case (server-only,
  never "use server"). `scopeFailure`/`isReferenceProbe`/constants untouched (Y12).
- `admin.test.ts`: the rule-10 static case's three patterns widened to the v1.2b features, models
  and relation keys (+9 pattern self-checks). Only widened (Y12).
- `src/lib/validation.v12b.test.ts` (14): every `EmployeeInputSchema` refinement incl. S7 edge,
  stripped sensitive keys, times/grace/work days/pay day, allowances; deduction; attendance row/day.
- Mutations (byte-copy restore via scratch `mutate.py`): G1 unscoped read in core, G2 unscoped
  createMany element, G3 stray unexercised call site, G4 privacy filter dropped, G5 "use server" on
  generate.ts, G6 unscoped employee.updateMany — each fails its case(s) (G1/G2 also the sweep, as in
  v1.2a, since the failing driver records nothing). Admin: a salaryPeriod call + relation read and
  an employees import each fail. Validators: S7, allowancesNeedBasic, same-minute timeOrder each fail.
- W5 `paidHalalas` gate unchanged and green (writers = plans/allocate.ts only).
- Gates: tsc 0 · vitest 854/854 in 43 files · build 0 (lock).

### After R-L1..R-L5 and the lead's rulings (done)
- **N-L1a:** drift `shape()` gains a fourth list, enum labels per type in sort order (pg_enum).
  E1 (drop REMOTE) and E2 (reorder AllowanceType) on the migration each fail the drift case.
- **Ruling 2 (widen):** `salaryLinkedPlanWhere(ids)` in `lib/payroll.ts` = SALARY, or EMPLOYEE
  party + salary category. Staff dues (`AND: [staffPlanFilter]`), staff prefill (a scoped visibility
  probe first) and the STAFF payment refusal (`isStaffHiddenPlan`) use it; `salaryLinkedWhere`'s
  branch 1 is now "instalment of such a plan". PGlite case: a STANDARD plan with a موظف party in
  «رواتب» (R1 fails 3 cases). Mocked payments.test.ts case for the refusal.
- **S-L3a:** `salaryCategoryIds(estId)` (payroll/privacy.ts) = Employee.salaryCategoryId ∪ SALARY
  plan categories ∪ categories named «رواتب»; `resolveSalaryCategory` prefers the employee's own,
  then the newest SALARY plan's, then any employee's, then the name, then creates. PGlite rename case
  (R2 resolve-by-name-only fails it; R3 set-without-ids fails it + the ledger cases).
- **S-L5a:** `payroll/staffViews.test.ts` — every listTransactions/getTransaction/recentTransactions
  call under src/app/(staff) and getStaffDashboard's passes `hideSalary: true`; no staff file calls
  an owner-shaped read; scanner self-tests. Verified by removing the flag from each staff page and the
  dashboard, and by swapping getStaffDues → getDues (frontend files restored byte-exact).
- **S-L4a:** the automatic ACTIVE→ENDED flip reads ids, compare-and-sets each (status ACTIVE + the
  endDate read) and writes `EMPLOYEE_END { auto: true }`; `archiveSalaryPlan` audits only when it
  changed a row. PGlite: exactly one auto audit across two runs (S3 fails it); scoping driver pins
  the compare-and-set where (S4 fails it).
- **Payslip fails loud (R-note 6):** `AllowanceSnapshotSchema.parse` (throws ZodError) plus a
  sum check (basic + allowances must equal the stored gross). PGlite: ZodError on a bad row, the sum
  error on `[]`; S1 (fallback to []) and S2 (no sum check) each fail.
- Reviewer R-L2 items: empty salary-category set on real SQL; catch-up generation pin.
- Splits: `parties/rules.ts` (lookups + D14 `employeeIdOfParty`; actions.ts 274 → 215),
  `payroll/resnapshot.ts` (core.ts 254 → 180). Still over 250: plans/actions.ts 261,
  plans/queries.ts 258 (v1.2a files, +~10 each for SALARY). Nested employee read in PARTY_SELECT
  commented (note 5).
- Reviewer notes 2 (hire date later / pay day past a future end date): accepted, not cleaned —
  earlier unpaid months stay owed; a month pushed past a future end date is written off with the
  plan when the end passes (the end form already warns).
- Gates: tsc 0 · vitest 867/867 in 44 files · build 0 (lock).
- R-final (reviewer): CP1 delta verified, all backend findings closed. Residual note recorded in
  `payroll/staffViews.test.ts`: calls are matched by name, so an aliased import escapes the scan.
- Final gates: tsc 0 · vitest 867/867 in 44 files · build 0 (lock).
