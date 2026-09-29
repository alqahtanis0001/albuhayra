# progress/reviewer.md

Read-only reviewer. I never edit code — this file is the only thing I write.
Newest entries at the bottom.

## Files I own
- `progress/reviewer.md` — this file. Nothing else, ever.

---

## Checklist A — Backend security (from the Security list in `docs/BACKEND.md`)

Run against every completed backend task. One line per item; a miss is a finding.

1. **Gate first.** Every server action and every data-reading function's first
   statement is `requireUser()` / `requireMember()` / `requireOwner()` /
   `requireStaff()` / `requireAdmin()` / `requireCanEdit()`.
2. **Scope from the session.** Every Prisma call on Category / Transaction /
   PeriodLock / AuditLog carries `establishmentId` taken from the `requireX()`
   result. Never from an argument, a form field, a URL param or `searchParams`.
   A `findUnique({ where: { id } })` on a scoped model is a finding — it must be
   `findFirst({ where: { id, establishmentId } })`.
3. **Fresh role/status/canEdit.** Read from the DB on the mutation, never from
   the cookie. `session.role` may be used for routing only.
4. **zod on every input**, using a schema exported from `src/lib/validation.ts`.
   `z.object()` strips unknown keys (zod 4 default) — `z.looseObject` /
   `.passthrough()` would be a finding.
4b. **No bare `z.string()` / `z.number()` / `z.enum([...])`.** The
   `{ error: "err.*" }` argument matters as much as the per-constraint message:
   without it a *type* mismatch (a non-string where a string is expected) emits
   zod's English default, which no line-by-line read of the constraints catches.
   Lead's ruling, 2026-09-29, after this caught three more cases than I found by
   reading — see M1 below. Check the type-level `error` and every constraint
   message; both must be `err.*` keys that exist in `t.err`.
5. **Generic auth errors.** `login` → `err.loginFailed` for every failure
   (unknown email, wrong password, DISABLED, PENDING handled by redirect).
   Sign-up with an **existing email** must return the *same* `err.signupFailed`
   as any other invalid sign-up — a distinct "email taken" key is an
   enumeration leak and a real finding. Join code → `err.joinFailed` only.
6. **Rate limiting.** login keyed `ip + email`; signup and join-code keyed by ip;
   `clearAttempts` on success; refusal returns `err.tooManyAttempts`.
7. **Cookie + invalidation.** `httpOnly`, `secure` in prod, `sameSite: lax`,
   12h. `logout()` clears it. DISABLED user or inactive establishment cannot
   keep using a live session (checked in `requireUser()`).
8. **bcrypt cost 12** on every hash (`hashPassword`, seed, password resets).
9. **Headers.** Five constant headers in `next.config.mjs`; CSP with the
   per-request **nonce** in `src/proxy.ts`. A flat `script-src 'self'` breaks
   hydration — any "simplification" of the CSP is a finding. No page may become
   static (`export const revalidate`, `force-static`, a page that stops reading
   the session): the nonce cannot reach a prerendered page.
10. **No leaks.** No `console.log` of bodies, passwords, hashes or sessions; no
    stack trace or `err.message` in an `ActionResult`; no external runtime call,
    analytics or third-party script. Prisma `log` must never include `"query"`.
11. **Soft delete.** Every read of Transaction filters `deletedAt: null`;
    delete sets `deletedAt`, never `db.transaction.delete`.
12. **Month lock.** Every transaction mutation calls
    `src/features/locks/assertUnlocked.ts`; update checks **both** the old and
    the new month.
13. **Audit.** `writeAudit` on every mutation, inside the same `$transaction`
    where one exists; `before`/`after` carry no `passwordHash` and no session.
14. **`ActionResult` shape** identical everywhere, and every returned `error`
    is a key that actually exists in `t.err` in `src/i18n/ar.ts`.
13b. **No `redirect()` inside a `try`/`catch`.** `redirect()` navigates by
    throwing `NEXT_REDIRECT`, so any `catch` around it swallows the navigation
    and the user is left on the form with no error and no movement. It is
    invisible unless looked for: the happy path returns nothing, so nothing
    appears wrong. Check every `redirect()` call site sits *outside* its
    surrounding try/catch — and re-check after any refactor that adds a
    `$transaction`, since that is what puts a `try` around the tail of an action.
    Adopted as standing practice by the lead, 2026-09-29.
14b. **Category duplicate check looks at ACTIVE categories only.** Lead's
    ruling, 2026-09-29 (L5 declined): there is deliberately no
    `@@unique([establishmentId, type, nameAr])`, because it would break
    deactivate-then-re-add ("إيجار" removed, later restored). So in B2/B5 a
    duplicate check that rejects a name matching an **inactive** category is a
    finding. The double-submit race is accepted and recorded in PROGRESS.md.
15. **ADMIN never sees money.** `getAdminOverview()` and every admin action
    return counts and statuses only — no `amountHalalas`, no transaction rows.
16. `.env` gitignored and untracked; `.env.example` shipped with placeholders.
17. **No single source is authoritative; the commit object is what decides what
    ships.** A file can be absent from disk and still staged in the index, an
    untracked file is invisible in a diff, and a hash can be amended out from
    under a verification. `zzsmoke` survived two "it's gone" reports and a second
    copy appeared under a different heading — I was right both times only because
    I re-checked the tree instead of trusting my own previous answer. So: do not
    trust the tree, the diff, a report, or a check you ran a minute ago; and
    re-verify against the commit, not the workspace. Use
    `git status --porcelain --untracked-files=all`, then `git grep <marker> HEAD`
    and `git ls-tree -r HEAD` to check what is actually *in* the commit. Confirm
    nothing under `src/app/api/` but `health` and `export`, and scan for
    temporary markers (`TEMPORARY`, `smoke`, `TODO: delete`, `XXX`). Adopted as
    a standing pre-commit check by the lead, 2026-09-29.

## Checklist B — Frontend RTL / a11y (from `docs/FRONTEND.md`)

1. **Logical utilities only.** `ms- me- ps- pe- start- end- text-start text-end
   rounded-s- rounded-e-`. Any `ml- mr- pl- pr- left- right- text-left
   text-right border-l border-r rounded-l- rounded-r-` is a finding every time.
   Sweep: `grep -rnE '\b(ml|mr|pl|pr)-|\b(left|right)-|text-(left|right)' src`.
2. **`<html lang="ar" dir="rtl">`** stays. Directional lucide icons get
   `rtl:-scale-x-100`.
3. **No hard-coded Arabic** outside `src/i18n/ar.ts` (`src/lib/money.ts` and
   `src/lib/dates.ts` are the two sanctioned exceptions — see L1/L2 below).
   A new key must have been announced to `backend`.
4. **Western digits only** in money and dates. Any Arabic-Indic digit, or an
   `ar-SA`/`ar-EG` locale passed to `Intl`/`toLocaleString`, is a finding.
5. **Amounts only through `<MoneyText>`** (which must call `formatSAR` /
   `formatAmount`), dates only through `<DateText>`.
6. **Never colour alone** for IN/OUT — the `+` / `−` sign must be present too.
7. **Never an amount anywhere under `/admin`**, even if a query returns one.
8. **A11y:** every input has a real `<label>`; icon-only buttons carry text or
   `aria-label`; visible focus ring; contrast ≥ 4.5:1; `ConfirmDialog` traps
   focus and closes on Escape; tap targets ≥ 44px.
9. **Do-not list:** no dark mode, no animation, no English, no UI kit, no
   client-side data fetching, no `localStorage` beyond the direction toggle.
10. **Nothing static — check the prerender manifest, not the route table.**
    No `export const revalidate`, no `force-static`, no page that stops reading
    the session: a prerendered page never receives the CSP nonce. Verify from
    `.next/prerender-manifest.json`, or `find .next/server/app -name '*.html'`
    after a clean build. **The build's route table under-reports** — it listed
    `/_not-found` but not `/_global-error` (`frontend` confirmed this
    independently, 2026-09-29). Adopted as standing practice by the lead.
11. Forms use `useActionState`; submit disabled while pending; field errors
    rendered through `errorMessage()`, never as the raw key.

---

## Reviews done

### 2026-09-29 — Phase 0 code (pre-review, before B1/B2/F1/F2 landed)
Reviewed: `src/proxy.ts`, `src/lib/*`, `src/app/layout.tsx`, `src/app/page.tsx`,
`src/app/api/health/route.ts`, `src/app/globals.css`, `prisma/schema.prisma`,
`prisma/seed.ts`, `next.config.mjs`, `package.json`, `.gitignore`, `.env.example`.

**Clean and confirmed:** nonce CSP intact and correct; all five constant headers
present; bcrypt cost 12 in both places; `.env` gitignored *and* untracked;
session payload carries identity only (no `status`, no `canEdit`);
`requireUser()` re-reads status/canEdit/establishment.active from the DB;
`z.object()` strips unknown keys; no physical-direction Tailwind utility
anywhere in `src`; no `revalidate`/`force-static`; seed never prints the
password; no external runtime calls; schema matches `docs/BACKEND.md` exactly
(6 models, 4 enums, all documented indexes plus extra FK indexes).

**Findings (detail sent to `backend`, `frontend` and lead):**
- H1 `src/lib/auth.ts:68,73,78` — `session.destroy()` throws during a server
  component render (Next forbids cookie mutation outside an action/route
  handler), so the rule-5 lockout path errors instead of redirecting.
- M1 `src/lib/validation.ts:109,138,140,164` + the two enums — zod default
  English messages instead of `err.*` keys; field errors degrade to
  `err.unexpected`.
- M2 `package.json` — `^` on `@prisma/adapter-pg` and `dotenv` contradicts the
  logged "pin exactly" Decision.
- L1 `src/i18n/ar.ts:48` duplicates `SAR` in `src/lib/money.ts:12` — double
  currency suffix risk in `<MoneyText>`.
- L2 `MONTH_NAMES_AR` lives only in `src/lib/dates.ts:98`; frontend must import
  it rather than add month keys to `ar.ts`.
- L3 `src/proxy.ts:17` `PUBLIC_PATHS` omits `/_next/*` and `/icons/*`.
- L4 `src/proxy.ts:66-69` — the `missing:` prefetch clause makes the proxy skip
  prefetch requests entirely (no CSP, no role routing on that path).
- L5 `prisma/schema.prisma:71` — no `@@unique([establishmentId, type, nameAr])`
  on Category although `err.categoryDuplicate` exists.
- L6 `src/lib/auth.ts:111,120,126,142` — wrong-role users are sent to `/login`
  instead of `homePathFor(role)`.

### 2026-09-29 — lead's rulings on the Phase 0 findings, and verification of the fixes

Lead replied to all ten items. Recorded so the checklists stay accurate:
- **H1 — confirmed independently by the lead**, assigned to `backend` in B1, open
  HIGH in PROGRESS.md Known issues, and a gate for Checkpoint 1. I re-check it
  when B1 is handed to me.
- **M1 — fixed, and my count was low.** I found six messageless rules by
  reading; the lead's parametrised test found three more (`cuid`,
  `optionalText`, `q`) that only misbehave on a *type* mismatch. Checklist A
  item 4b now covers this. Lesson for me: reading constraint messages is not
  enough — the `{ error }` argument at the type level is a separate surface.
- **M2 — fixed.** Both dependencies pinned exactly.
- **L1, L2, L4 — accepted**, now in PROGRESS.md Gotchas; L1/L2 restated to
  `frontend` as binding.
- **L3, L6 — passed to `backend`** for B1, including the `/login`-while-signed-in
  point; lead agrees it should redirect to `homePathFor(role)`.
- **L5 — declined, with a reason that became Checklist A item 14b.** A unique
  constraint would break deactivate-then-re-add, so the check stays in code and
  must ignore inactive categories.
- Both stale comments fixed.

Verified the fixes myself (read-only, working tree, not yet committed):
`src/lib/validation.ts` now has no bare `z.string()`/`z.number()` and no
messageless `.max()/.min()/.int()`; both enums carry `{ error: "err.invalidInput" }`;
`package.json:18,21` pin `@prisma/adapter-pg` and `dotenv` exactly;
`next.config.mjs:4` now names `src/proxy.ts`; `.env.example:1-2` now describes the
Neon pooled string. All confirmed.

Also noted in the working tree but **not reviewed**, because B1 is still in
progress and the lead has not handed it over: `src/proxy.ts` (+108),
`src/lib/auth.ts` (+20), `src/lib/joinCode.ts` (+24), `src/app/globals.css` (+39).
I deliberately did not read these as a review — half-finished code produces noise.

### 2026-09-29 — R-B1 and R-B2 (B1 + B2 review)

Reviewed: `src/features/auth/actions.ts`, `src/proxy.ts`, `src/lib/auth.ts`,
`src/lib/joinCode.ts`, `src/features/establishments/{actions,queries}.ts`,
`src/features/settings/{actions,queries}.ts`.

**The four things the lead asked about:**
1. **H1 — fixed, verified, closing it.** `forget()` at `src/lib/auth.ts:58-64`
   wraps `destroy()` in try/catch with the `redirect()` outside the try, on all
   three branches (`:90`, `:95`, `:100`). The DB re-reads were *not* weakened —
   diffed the `select` block against HEAD, it is unchanged, and the PENDING
   branch still keeps the session. The loop risk the fix introduces is handled
   by `SIGNED_OUT_LOGIN_PATH` + `SIGNED_OUT_PARAM`; I traced four scenarios
   (row gone / DISABLED / establishment inactive / bare `/login`) and all
   terminate.
2. **A-14b — violated.** `nameTaken()` (`src/features/settings/actions.ts:80-96`)
   has no `active: true` in its `where`, so deactivate-then-re-add is blocked.
3. **CSP — the byte-identical claim is false in one character.**
   `contentSecurityPolicy()` and the nonce/request-header block *are* byte-identical
   (verified by extracting both from `git show HEAD:src/proxy.ts` and comparing
   strings). The `config.matcher` `source` is not: `\\.png` became `\.png`.
4. **Rule 4 — the return side is sound**, but there is a join-code oracle in
   `signupStaff` and a `/pending` design gap. PENDING returning `ok: true` is
   *behind* a successful bcrypt verify (`actions.ts:81` before `:87`), so it
   tells only someone who already has the credentials.

Findings sent to `backend` and lead: M-A `/pending` has no session; M-B
`nameTaken` ignores `active`; M-C `clientIp()` trusts the leftmost
`x-forwarded-for` (rate limit bypassable, provisional on Render's behaviour);
L-D the matcher regex; L-E `signupStaff` create+audit not atomic; L-F
`clearAttempts` inconsistent between the two sign-ups; L-G `sessionReadOptions()`
duplicates the cookie name/TTL; L-H a bad `SESSION_SECRET` degrades silently to
"no session"; L-I `regenerateJoinCode` can throw out of a server action; L-J
`AuthRedirect` is a contract type living outside `validation.ts`; L-K the
`joinFailed`/`signupFailed` ordering oracle (recommended as a logged Decision,
not a code change); plus an F8 scope gap (category reordering has no backend
action in any task).

**Verified clean:** every action opens with `requireX()`; every scoped lookup is
`findFirst` with `establishmentId` from the session (`findOwnStaff:44`,
`findOwnCategory:73`) and every subsequent `update` keys off the id that scoped
read returned; `writeAudit` on all nine mutations with no hash or session in any
payload; `revalidatePath` present; all 28 `err.*` keys referenced in `src` exist
in `t.err` (checked programmatically); no `console.*` anywhere in
`src/features`, `src/lib` or `src/proxy.ts`; login timing equalised by
`burnPasswordTime`.

**Correction to send the lead:** their handover said `backend` *dropped* the
`/login` bounce for signed-in visitors. It is present at `src/proxy.ts:124-129`,
reinstated with the `signedOut` marker to break the loop. Good solution, but the
lead's stated context is out of date and they told me its absence was deliberate.

**Process note for me:** `src/proxy.ts` and `src/lib/auth.ts` changed *between*
my first `git diff` and my second read in the same review — the first diff had
no `SIGNED_OUT_PARAM` and no `OPEN_PATHS`. Re-read every file immediately before
writing a finding; a stale snapshot nearly cost me a wrong report about the
`/login` bounce being absent.

### 2026-09-29 — R-F1 and R-F2, plus a HIGH found in the tree

**HIGH — `src/app/api/zzsmoke/route.ts` is still in the tree.** Its own line 1
says "TEMPORARY — backend B2 verification only. Deleted before the task is
reported." B2 was reported and the lead is about to commit. The route has no
`requireX()`; `?step=setup` creates establishments and users with a known
password and calls `startSession()` for the OWNER it just made, handing the
caller an authenticated OWNER cookie, and the no-arg call runs `deleteMany`.
Reachable by **any signed-in user of any role** (`/api/…` matches no
`OPEN_PATHS`, no `SIGNED_OUT_PATHS` and no `ROLE_AREAS` prefix, so
`destinationFor` returns null and lets it through) and by **anyone at all**
through the prefetch bypass — the `missing:` clause in `config.matcher` means a
request carrying `purpose: prefetch` never reaches the proxy. That is L4 from the
Phase 0 review composing with a stray file into a real auth bypass. Not an F1/F2
defect; found by listing the tree rather than the handed-over file list.

**F1/F2 themselves are clean.** Verified: no physical-direction utility anywhere
in `src/components`, `src/app`, `src/features` (one comment mentions
`text-left`); no Arabic literal outside `src/i18n/ar.ts` except in comments;
`MoneyText` renders only through `formatSAR`/`formatAmount`, never appends
`t.common.currency`, and carries `+`/`−` plus `<bdi>` — L1 respected; `DateText`
uses `toHijri`/`dateToISO` only; `ConfirmDialog` uses a native `<dialog>` +
`showModal()`, so focus trap and Escape are real; all three role layouts `await`
their `requireX()` before returning any chrome; `:focus-visible` ring in
`globals.css:26`; labels wired by `htmlFor`/`id` with `aria-describedby` for
hint and error; icons `aria-hidden`, nav and close buttons labelled, `Toast` has
`role`/`aria-live`; no amount anywhere under `src/app/(admin)`; nothing from the
Do-not list (`transition-none` is disabling transitions, `--color-accent-dark`
is a token name, not dark mode); field errors rendered via `errorMessage()`.

**Static-rendering claim verified from the build, not the report.**
`.next/prerender-manifest.json` lists exactly `/_not-found` and
`/_global-error`; `export const dynamic` appears only in
`src/app/(auth)/layout.tsx:9` and `src/app/api/health/route.ts:4`; no
`revalidate`, no `force-static`, no `generateStaticParams` anywhere.
`/_global-error` is a *second* unnoticed prerendered route — Known issues names
only `/_not-found`.

**The lead's question 2 rested on a stale contract.** `AuthRedirect` and
`redirectTo` do not exist anywhere in `src/` or `docs/` any more. The converged
design is the opposite of what the handover described: the actions `redirect()`
server-side and return `ActionResult<null>` (`src/features/auth/actions.ts:32`),
and the forms correctly do nothing with a destination. So no form *can* drop a
`redirectTo`. The real risk in that design is a `redirect()` swallowed by a
`catch`, since it works by throwing — I checked all six call sites and every one
sits outside the surrounding try/catch.

**M-A closed by the lead**, who updated `docs/FRONTEND.md:37` to the `?as=`
design and removed the auto-redirect requirement. `/pending` matches the doc.
Side effect: `getOwnStatus()` in `src/features/auth/queries.ts` is now dead code.

**M-B fixed** — `active: true` is in `nameTaken`, and `setCategoryActive` gained
the reactivation name guard I suggested. **L-E still present** in the tree
(`signupStaff` create + audit with no `$transaction`) but tracked in the lead's
new B9, along with the rest of my low findings; B8 covers the F8 reorder gap.

### 2026-09-29 — lead's rulings on A/B/C, and the frozen contract

- **A (`/pending` session) — overruled, and the lead is right.** Their reasoning
  is least privilege: the question is not "what can this cookie currently
  reach" (which is how I argued it, and `requireUser()` does turn PENDING away)
  but "what should an unapproved account hold at all". Plus it would have been
  the third login-contract change in one session, and churn had already cost
  `frontend` two rewrites. `docs/FRONTEND.md:37` and `docs/BACKEND.md:131` now
  describe the `?as=` design. **Do not re-raise.** `getOwnStatus` is withdrawn
  from the doc but is still dead code in `src/features/auth/queries.ts` — B9.
- **B — adopted as I framed it**: `createCategory` reactivates a matching
  inactive category, `setCategoryActive` refuses a name an active category holds.
- **C — adopted and promoted off provisional.** The lead's improvement on my
  framing: rightmost is correct whether the proxy appends or overwrites, so
  there was nothing to confirm with Render first and the current code is
  unconditionally wrong. Decision notes it must be revisited if a CDN is ever
  put in front of Render, since rightmost would then be Render's edge.
- **Rule 4 / join-code oracle — logged**, with the acceptance recorded as
  *depending on* fix C. If the limiter is ever weakened, the oracle reopens.
- The auth contract is now **FROZEN 2026-09-29** at `docs/BACKEND.md:131`. Item 2
  of the F1/F2 brief (forms honouring `redirectTo`) was withdrawn — it described
  a contract that existed for minutes. My review had already used the landed
  shape, so no pass was lost.

**Re-verified F1/F2 against the frozen text** (which I had not seen at review
time): every clause conforms — the three forms' `(prev, formData)` +
`Object.fromEntries` + shared schema, `AuthState = ActionResult<null> | null`,
`login` returning no `fieldErrors`, `logout(): Promise<void>`, PENDING →
`/pending?as=…` with no session, `setCategoryActive(categoryId, active)` as a
button action.

**New low finding, on the frozen text itself.** `updateCategory(categoryId,
_prev, formData)` (`src/features/settings/actions.ts:183-187`) and
`resetStaffPassword(userId, _prev, formData)`
(`src/features/establishments/actions.ts:170-174`) take an id *before* the state.
Both are `.bind(null, id)`-compatible and I think the shape is right, but the
frozen paragraph describes form-backed actions as `(prevState, formData)` flatly
and lists `updateCategory` among them, and the table still shows
`resetStaffPassword(userId, pw)` in the plain-argument group. `CLAUDE.md` puts
docs above code, so I did not treat the code as authoritative; recommended the
lead amend the text (one sentence permitting a bound id) rather than the code.
F8 builds against this.

**Checkpoint 1 is still blocked:** `src/app/api/zzsmoke/route.ts` remains
present and untracked as of this entry.

### 2026-09-29 — B9 re-verification (7 of 8 confirmed in the tree)

Checked against the tree, not the report:
- **Matcher restored.** `src/proxy.ts` `source` is byte-identical to
  `git show HEAD:src/proxy.ts` again — compared as strings, not by eye.
- **`clientIp()` takes the rightmost hop** (`src/features/auth/actions.ts:46-54`):
  splits, trims, filters empties, returns the last. Correct whether the proxy
  appends or overwrites. This was the one with real consequences, since the
  join-code oracle acceptance depends on the limiter working — it now does.
- **`signupStaff` is transactional** — `$transaction` at `:236` with
  `client: tx` at `:255`, matching `signupOwner` at `:162`/`:185`. L-E closed.
- **`sessionConfig.ts` exists and both sides import it** — `src/lib/session.ts:5`
  and `src/proxy.ts:5`. The constants are stated once. L-G closed.
- **`clearAttempts` consistent at four sites** (`:104`, `:118`, `:194`, `:262`) —
  both sign-ups now clear, as does login on PENDING and on success.
- **`regenerateJoinCode` catches** (`establishments/actions.ts:208-213`) and
  returns a key instead of letting `allocateJoinCode` throw past the action.
  L-I closed.
- **Applied the new 13b check to the rewrite**: both signup `redirect()` calls
  still sit *after* their `catch`, so the added `$transaction` did not capture
  them. This is exactly the refactor that could have broken it.
- **Outstanding: `getOwnStatus` is still in `src/features/auth/queries.ts`.**
  Nothing anywhere imports it or that module, so deleting the whole file leaves
  no dangling import — confirmed by grepping for both the symbol and the module
  path. Safe to delete; that is the last change before the checkpoint commit.

`zzsmoke` is gone. The lead confirmed it was in their commit set; the reason it
surfaced was listing the tree instead of the handed-over file list, since an
untracked file is invisible in a diff. It composed with the
`missing: [purpose: prefetch]` clause I had filed as defence-in-depth only —
so a cosmetic finding plus a stray file made an unauthenticated
privilege-escalation endpoint. **Keep filing the cosmetic ones.**

### 2026-09-29 — Checkpoint 1 closed (commit `9b48932`)

Verified by the lead in the **commit object**, not the tree: `git grep zzsmoke HEAD`
and `git grep getOwnStatus HEAD` both empty, no `src/features/auth/queries.ts` in
`git ls-tree -r HEAD`.

Why the blocker had to be repeated: there were **two** smoke routes. The lead's
`ls` ran in a window when the first was absent, and `backend` had created a
second headed "B9 verification" rather than "B2 verification". I reported it as
still present *after* being told it was gone, and was right both times — because
I checked the tree each time instead of trusting the previous answer. The
sharper method, now Checklist A item 17: a file can be absent from disk and
still staged in the index, so the commit object is the only authority.

Frozen-contract mismatch amended as recommended — text changed, not code.
`docs/BACKEND.md` now permits a form-backed action to take its id before the
state for `.bind(null, id)`, names `updateCategory` and `resetStaffPassword`,
and no longer lists `resetStaffPassword(userId, pw)` among the button actions.
Landed before F8 builds against it.

### Prep for R-B3 / R-B4 (Checkpoint 2: W1, F3, B3, B4)

Written in advance so the review is fast. The heavy lifting is Checklist A
items 1, 2 and 13; these are the specific traps in *this* feature set:

**Scoping (item 2) — the single highest-risk area so far.**
- `getTransaction(estId, id)` and every update/delete path must be
  `findFirst({ where: { id, establishmentId, deletedAt: null } })`. A
  `findUnique({ where: { id } })` followed by an `if (row.establishmentId !== …)`
  check is *not* equivalent and I will treat the `findUnique` form as a finding:
  it leaks existence through timing and invites a later refactor to drop the
  guard. The B2 pattern to insist on is `findOwnStaff` / `findOwnCategory` —
  scope in the query, then key the `update` off the id that query returned.
- `listTransactions` filters arrive from **URL search params** (F5), so they are
  attacker-controlled: `categoryId` and `paymentMethod` must be parsed by
  `TransactionFilterSchema` and the category must be re-checked as belonging to
  the establishment, not merely passed into the `where`.
- Aggregates (`getOwnerDashboard`, `getReport`) are the easy place to forget a
  scope: check **every** `groupBy`, `aggregate`, `count` and `$queryRaw` clause
  separately. One unscoped aggregate leaks another establishment's totals
  without leaking a single row.
- `getStaffDashboard(estId, userId)` takes two ids — confirm `myRecent` filters
  on *both*, and that `userId` comes from the session rather than an argument a
  caller chose.

**Soft delete (item 11).** `deletedAt: null` on every read *including every
aggregate and count* — the dashboard and report totals are where a deleted
entry silently reappears. `deleteTransaction` must set `deletedAt`, never call
`db.transaction.delete`.

**Month lock (item 12).** `assertUnlocked` on create, update **and** delete.
`updateTransaction` must check both the old and the new month — moving an entry
*out of* a locked month is the case that gets missed.

> **An implementation tripwire, not a specification defect.** I briefly recorded
> the opposite on the lead's ruling; both the lead and `backend` then corrected
> it, and I verified: `docs/BACKEND.md:162` has said "same as create; **both old
> and new month unlocked**" since the Phase 0 commit `9a2dbb1` (line 137 there).
> The doc was always right — my own prep note above derives the requirement from
> it. What was loose was the one-line B4 summary in `progress/TASKS.md`, which
> compressed it to "month lock + audit wiring": a summary lossier than its
> source, not a deficient spec.
>
> It stays a real thing to watch for in B4, because a single lock check satisfies
> a careless reading of the doc while missing the entry that moves *out* of a
> locked month. But it is not evidence the doc needs fixing, and nobody should be
> sent to "correct" line 162.

Lock/unlock must refuse
the current and any future month (`err.cannotLockCurrentMonth`), using
`currentMonthKey()` from `src/lib/dates.ts`, which is the only sanctioned way to
decide "now" (Asia/Riyadh). Any `new Date()` local getter on a stored date is a
finding per the PROGRESS.md gotcha.

**Money and dates.** `amountHalalas` integer > 0 — reject 0 as well as negatives.
Direction supplies the sign at calculation time; nothing stores a negative.
Category must be active, same establishment *and* same direction as the entry.
`isoToDate`/`dateToISO` for `@db.Date` round-trips, never local getters.

**Audit (item 13).** `writeAudit` inside the same `$transaction` as the mutation,
with `before`/`after` on update and `before` on delete. And per item 13b,
re-check that adding those `$transaction` wrappers has not captured a trailing
`redirect()` inside a new `try` — that is exactly how B9 nearly broke the
sign-ups.

**W1** should be the one-line import swap in
`src/features/auth/components/actions.ts` plus deleting `stubActions.ts`. If it
turns into more than that, the frozen contract drifted and I want to know why.

## In progress
- Task: Checkpoint 1 reviews all delivered and closed. Standing by for the
  user's approval of Checkpoint 2 (W1, F3, B3, B4).
- **Checkpoint 1 is `2dc246b`, not `9b48932`** — the lead amended twice after
  announcing the first hash. Settled, and explicitly not to be re-verified; the
  lead will announce the new hash on any future amend. Recorded only so the
  dangling hash in earlier entries of this file does not mislead me later.
- Three items from my B3/B4 prep went to `backend` *before* it writes the code:
  the scoped-`findFirst` rule, per-aggregate scoping and `deletedAt: null`, and
  the old-and-new-month check. Prevention beat detection here; doing the prep
  during a wait is worth repeating at the start of every checkpoint.
- W1 tripwire: it must be the one-line import swap in
  `src/features/auth/components/actions.ts` plus deleting `stubActions.ts`.
  Anything more means the frozen contract drifted, and I ask why rather than
  reviewing the diff on its merits.
- Where I am: one HIGH still open (the zzsmoke route), one new low on the frozen
  contract, three notes. F1/F2 clean against Checklist B and against the frozen
  text.
- Next action: when the lead says B9 has landed, re-verify five things — the
  proxy matcher back to `\\.`, rightmost `x-forwarded-for`, the `signupStaff`
  `$transaction`, the zzsmoke route deleted, and `getOwnStatus` gone.

## Working rules I have learned this session
- **Re-read immediately before writing a finding.** `src/proxy.ts`,
  `src/lib/auth.ts` and `src/features/settings/actions.ts` all changed mid-review;
  line numbers shifted under me twice. A stale snapshot nearly produced a wrong
  report about the `/login` bounce.
- **Review the tree, not the handed-over file list.** The one HIGH of the session
  was a file nobody listed.
- **Check claims against artefacts, not reports** — `.next/prerender-manifest.json`
  for static routes, `git show HEAD:<file>` for "unchanged", a Unicode scan
  rather than a grep the shell can mangle.
- **Check the docs against the code in both directions.** Doc-versus-code drift
  found M2, the F8 reorder gap and the frozen-signature mismatch; the code being
  better than the doc still means one of them must change.
- **A brief from the lead can be stale.** Two of their five F1/F2 questions and
  one handover fact were wrong because the tree moved. Verify the premise before
  spending a pass on the question. The lead has asked to be treated this way
  explicitly, having been corrected on three factual claims in one session, each
  asserted from memory where a check was cheap.
- **Verify a correction too, not just a claim.** I accepted "this is a
  specification defect" as a ruling and wrote it into these notes — about a line
  of `docs/BACKEND.md` I had already read correctly and had derived my own prep
  note from. A ruling that contradicts a document I have read is exactly as
  checkable as any other claim, and `grep` would have settled it in seconds.
  Deference is not verification, and a wrong entry here would have sent a future
  reader to "fix" a correct line.
- **Read a task doc for *unstated* cases**, not only code against stated ones.
  The illustration is aggregate scoping: nothing in `docs/BACKEND.md` says
  "scope every `groupBy` and `count` separately", yet an unscoped aggregate
  leaks another establishment's totals while passing a row-level review and
  every RTL check, leaving an owner a wrong number they cannot detect. With
  "correct numbers" among the four priorities in `CLAUDE.md`, that is the worst
  available outcome for this app.
- **Prepare before the code exists.** The three items that mattered most in
  Checkpoint 1 were found in prep, not review. The lead will now send task briefs
  at assignment time so prep runs against the same text the implementers build
  from — read the brief *beside* the doc it summarises, since that is what would
  have caught the lossy B4 summary.

## Gotchas I found
- `errorMessage()` in `src/i18n/ar.ts:293` silently falls back to
  `t.err.unexpected` for an unknown key. Good (no English leak) but it also
  **hides** a wrong or missing `err.*` key — so I verify every returned key
  against `t.err` by hand rather than trusting the UI.
- Reading `.env` is denied in `.claude/settings.json`, so I check secret
  handling from `.env.example` and the code that reads `process.env`.
- `src/lib/session.ts`, `auth.ts` and `audit.ts` are `server-only`: they cannot
  be imported from a Vitest test. A "why is this untested" observation about
  them is not a finding.

## Questions / requests sent to lead
- H1, M1, M2, L1–L6 above, with the note that `src/lib/validation.ts`,
  `package.json` and `prisma/schema.prisma` are lead-owned, so M1, M2 and L5
  are the lead's call, not `backend`'s.
