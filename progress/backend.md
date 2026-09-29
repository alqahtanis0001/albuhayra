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
