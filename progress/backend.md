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
