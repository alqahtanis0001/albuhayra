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
4c. **Two failure paths returning different keys are an oracle**, even when each
   key is individually generic, and this is **not tradeable against usability**
   (`docs/BACKEND.md` Security rule 4, hardened 2026-09-29). A large keyspace and
   a rate limiter do not make it acceptable. I found this in `signupStaff` and
   then argued for accepting it; the lead ruled my way and the **user overruled
   us both**, correctly — rule 4 prohibits enumeration outright rather than
   pricing it. So: enumerate the failure paths of every auth-adjacent form and
   check they return one key *and* do the same work. Do not weigh a leak against
   a better error message again.
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
18. **An exception in `scopeFailure` needs a logged Decision *and* a pinning
    case.** The lead's governance rule (2026-09-29) is that each new exception
    requires a Decision; treat an unlogged one as a finding. I am adding the
    second half: an exception **without a harness case that fails when it is
    widened** is also a finding. A *new* exception is visible in a diff and a
    reviewer can demand its Decision; the silent **widening** of an existing one
    adds no exception, triggers no Decision, and reads as a small
    simplification — only a pinning case catches it. Encoding beats excluding
    (an excluded file stops being watched; an encoded exception is
    machine-checked), and this is not in tension with rule 2b's blanket ban on
    `update`: that banned *per-call waivers* which need a human to re-verify at
    each site and rot, whereas a typed, narrow, machine-checked exception is a
    rule. Corollary: every rule needs a **foreign value in the fixture to fail
    against** — `OTHER_EST` protects the tenant rule; the self-write rule needed
    an `OTHER_USER` and did not have one. **The habit that finds this is not
    "read the rule harder" but "find the case that would fail if this rule were
    deleted" — if there is none, the rule is decoration.** `backend` and I had
    each read the predicate carefully; only looking for the pin found the gap.
    Ask for **one mutation → exactly one failing case**, not merely "some case
    fails": that proves the pins are *precise*, so a future failure names the
    clause that was dropped instead of just reporting that the gate broke.
19. **An exclusion must name what covers it instead.** An excluded file is
    indistinguishable from an overlooked one unless the comment says which test
    holds the rule that applies there (`src/features/admin/**` →
    `admin.test.ts`). Hold every future exclusion to that; an unnamed exclusion
    is a hole until proven otherwise.
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

### Rulings on the brief-vs-doc read (all adopted, 2026-09-29)

Everything I raised was accepted. What to check when the code lands:

- **B3 gate, now four files** — `transactions/{queries,actions}.ts`,
  `dashboard/queries.ts`, `reports/queries.ts` — asserting `where.establishmentId`
  **by value** against a fixture holding a *second, foreign* establishment, plus
  `deletedAt: null`, reading the argument object rather than a serialised form
  (so a nested `category: { establishmentId }` fails), asserting the `where` is
  *present* on every `groupBy`/`aggregate`/`count`, and **raw SQL banned** in all
  four files because the gate is structurally blind to it.
- **B8 — ruled my way and the doc moved, verified at `docs/BACKEND.md:165`:**
  swaps with the adjacent **active** category, skipping inactive rows; at the ends
  (first UP, last DOWN) a **silent no-op returning `ok: true`**, deliberately no
  error key, and the UI disables the arrow. So when reviewing B8: a thrown error
  or an `err.*` return at the ends is a finding, and so is a swap that trades
  `sortOrder` with an inactive row.
- **B10** — both lookups issue **unconditionally** with one branch at the end, so
  the four paths do equal work and not merely return one key; the test asserts
  that *structurally*, not by wall clock. The usability cost is accepted and the
  leak-free mitigation is scheduled as **F2b** (an "already have an account?"
  link to `/login`). **Do not let anyone soften the key** — that is the line-162
  failure mode pointed at a security rule instead of a doc line.
- **B4** — brief now carries the current/future-month refusal and
  `listLocks` = 24 months with state; `currentMonthKey()` is the only sanctioned
  "now".
- **F3** — divide-by-zero guard on "% of month OUT" (a first month with no OUT
  entries is the *normal* state), Western digits on the percentage even though
  `MoneyText` does not cover it, no `server-only` import across the recharts
  client boundary, and only plain serialisable numbers in chart props.
- **F4** — the direction toggle's localStorage default is now in writing, so
  **it is not a Do-not violation**; date defaults to today as well as capping at
  today; item 13b applies to *حفظ وإضافة أخرى* from the start.

Method note: the lesson that generalised best was checking whether a rule's
*mechanism* actually reaches every case — `MoneyText` enforces Western digits for
money and therefore not for a percentage. Worth asking of any rule that is
enforced by a component rather than by a check.

### 2026-09-29 — R-B3 / R-B4 / R-B8 / R-B10

**One finding: the scoping gate does not assert `deletedAt: null`.**
`scopeFailure()` (`src/features/transactions/scoping.test.ts:170-201`) checks
`where.establishmentId` and nothing else. The *code* is correct — every
Transaction read goes through `ledgerWhere()`
(`transactions/queries.ts:90-106`, `deletedAt: null` at `:106`), which the
dashboard derives from (`:172-173`, `:215`) and reports imports (`:39`) — so
nothing is wrong today. But a future inline `where` in a new aggregate passes all
26 cases while counting deleted rows in a total: the same undetectable
wrong-number shape the gate exists for, in its **same-tenant** form. Three lines
in `scopeFailure` plus a harness case; patch sent to `backend`. Not a blocker.

**Four of my five original holes confirmed closed, each with a harness case
proving the rule fires** — no-`where`, nested relation filter (top level only),
by-value against a second foreign establishment, raw SQL banned at runtime *and*
statically. `$transaction` coverage confirmed by tracing it rather than reading
the claim: the inner client from `makeClient()` closes over the same `calls`
array, and `createTransaction`'s `tx.transaction.create` is observed at `:397`,
which is only possible if inner calls are captured. `backend` added a static
sweep comparing source `(model, method)` pairs against observed ones, closing a
case I had not raised.

**Verified clean:** B4's both-months `OR` in one `findFirst`, traced through all
three callers so a lock on the *origin* refuses a move out as well as in; the
current/future refusal via `isClosedMonth` + `currentMonthKey()`; B8's
active-only neighbour and silent no-op success at both ends; B10's five business
paths collapsed to one key including the insert `catch`; B3's category
triple-check with both `err.*` keys as a `fieldErrors` entry on `categoryId`; and
the two sweep-excluded B2 files re-checked (not trusted from R-B2, since
`settings/actions.ts` changed for B8) — every unique-where write still follows a
scoped `findFirst`.

**Judgements I recorded so they are not re-litigated:**
- `assertUnlocked` **returning** rather than throwing is correct; I would have
  flagged the reverse, because a throw reaches the error boundary instead of the
  form. The name is the doc's, not a contract.
- `err.signupFailed` on a **zod** failure in `signupStaff` is *not* an oracle: it
  depends only on the shape of the attacker's own input, and a probe submits
  well-formed input by definition. Collapsing it into `err.joinFailed` would cost
  honest users their `fieldErrors` and buy nothing. Pre-empted with `backend`
  rather than waiting to review the "fix".
- Reordering an **inactive** category returns `err.notFound` (B8's `current`
  requires `active: true`). Consistent; F8 must not surface that key.
- `signupOwner`'s oracle is **with the user**, not open against the code. Not to
  be raised in review. My only observation for their decision: the remedy is
  worse here than in the staff case, because a fake success with no email channel
  leaves someone who mistyped a known address waiting for an approval that never
  comes.

**Follow-up: gate gap closed, and a business-rule loosening reviewed.**
`backend` and I converged on the `deletedAt` fix independently; it landed before
my review did, with a second harness case (`deletedAt: { not: null }`) that a
presence-only check would have missed, mutation-tested to 8 failures.
`snapshot()` now uses `dateToISO()`.

`checkCategory` was then loosened so a **retired category may be kept but never
newly assigned** — `frontend` found it from the UI: an owner could not fix a typo
on an old expense whose category had been retired without re-categorising it,
i.e. rewriting history to satisfy validation. I checked it closely because a
loosening deserves more review than a tightening, and it is sound. The
load-bearing detail is **check order**: existence → direction → active-unless-kept,
so the exemption bypasses only `active`. One line earlier and "keep the retired
category" would have become "skip the direction check", letting an entry sit
under a category of the opposite direction — corrupting the very report totals
the B3 gate protects. `keptCategoryId` comes from `existing.categoryId` selected
from the scoped `findFirst`, so it cannot be forged; `createTransaction` omits
the argument entirely; it fails closed if that `select` is trimmed.

Consequences raised: `docs/BACKEND.md:161-162` now contradicts the code (update
is no longer "same as create") and must move, since docs outrank code; and F4's
edit-mode category select must offer the entry's own retired category or it
cannot represent the row — it would render empty or silently post a different
category, which is the original complaint one layer up.

**Two kinds of blindness, and neither subsumes the other.** The unscoped
aggregate was invisible from the UI and only a structural check could catch it.
The retired-category trap was invisible structurally — the rule was
self-consistent and enforced exactly as written — and only imagining a real
owner's afternoon could catch it. Keep both kinds of attention pointed at this
codebase.

**A rule's mechanism again did not reach every case** — the same lesson as
`MoneyText` and percentages. `ledgerWhere` enforces soft delete for every caller
that *uses* it, and the gate that was supposed to enforce it for everyone checks
a different clause. Ask of every guard: what does it *not* see?

### 2026-09-29 — R-F3 (reviewed unprompted; it was ready)

**Clean.** The trap the lead named — every `OwnerDashboard` field is a `number`,
so a crossed label/value wire compiles and shows the wrong figure under the right
label — does not bite: all four StatCards pair correctly, and `TopOutCategories`
takes `monthOutHalalas` as its denominator rather than the net or the balance.
The `Halalas` suffix is what made this checkable **by reading**; with four bare
numbers I would have had to run it.

Both advance flags closed: `percentOfTotal` returns null on `total <= 0` so the
normal first-month state renders "—" not `NaN%`, and `formatPercent` uses `en-US`.
Chart boundary pure, `data.ts` types every crossing value as plain number or ISO
string. `frontend` also built the `sr-only` fallback table I raised only as a
judgement — correctly, `sr-only` not `hidden`, with `aria-hidden` on the chart.

**One consistency point:** the fallback table calls `formatSAR` directly where
`<MoneyText>` would work. Harmless, but told them to align it. Explicitly told
them *not* to change the recharts `tickFormatter`/`Tooltip`, which **cannot** use
`<MoneyText>` because recharts needs a string. Third instance of the same
lesson: the rule is "Western digits"; `<MoneyText>` is its usual mechanism, not
the rule. Pre-empting the over-correction is as much the job as finding the gap.

**W2 verified early rather than at the swap.** `data.ts` and
`dashboard/queries.ts` define the contract independently, so I compared them
field by field: `MethodBalance`/`MonthTotals` identical, `TopOutCategory` ==
`CategoryTotal`, and `LedgerRow` is a strict superset of `RecentTransaction`.
**W2 will compile**; the only churn is type names, which fails loudly. Checking a
two-copy contract *before* the task that merges them is cheap and turns a
possible surprise into a known quantity.

### 2026-09-29 — R-F4 and F2b. Checkpoint 2 clear from my side.

**F2b meets the user's condition.** `FormError.tsx:24-25` returns null unless
there is a non-field error, and the `/login` link is a **child** of that alert
box in both signup forms — so it cannot appear without the error. A grep for the
link alone would have passed either way, which is why the lead was right to ask
for it verified. Traced the path that matters: a taken email returns the generic
key with no `fieldErrors`, so the alert renders with the link attached.

**F4 clean.** All five of the lead's priorities hold: the edit-mode select keeps
the entry's own retired category (and `frontend` found the half I missed —
**controlled rather than `defaultValue`**, because an uncontrolled select retains
a stale DOM value when the option list is replaced); the retired option cannot
survive a direction flip because `c.type === direction` stops matching, making
the bad state structurally impossible rather than merely cleared; the
locked-month split is two distinct guards (`dateLocked` → buttons only,
`originalLocked` → every field), checked field by field; `intent` is stripped by
`z.object()`; and there is no `try` around the action call, confirmed by absence.

**What I actually spent the time on: whether the form posts the right body.** A
form can look entirely correct and submit the wrong thing.
- `AmountField` splits a visible `amountInput` (SAR text) from a hidden
  `amountHalalas` carrying `parseSAR(value)`. Without that, "1234.50" arrives as
  a non-integer and fails `.int()`.
- `DirectionToggle` uses **real radios** with `name="direction"`, `sr-only`
  rather than hidden. A segmented control built from buttons would look identical
  and post nothing.
- `today` arrives as a server prop, so the date cap cannot disagree with a client
  whose clock or timezone differs.
Generalise: for any form, check the three things that are invisible in the
markup — what each control is *named*, what value it actually submits, and which
side decided "now".

Two cosmetic notes only: the dedicated `t.transaction.retiredCategory` ("متوقف")
is unused while the label uses `t.status.DISABLED` ("معطل") — account vocabulary
applied to a category; and an empty amount reports `err.amountPositive` rather
than `err.required` because `Number("")` is `0`.

`frontend`'s comment at `TransactionForm.tsx:78-82` is a better formulation of my
own item 13b than mine: it says the no-`try` rule must hold *for whichever action
changes its mind later*, rather than resting on what the actions do today.

### 2026-09-29 — Checkpoint 2 committed (`2826a0a`, plus `3d838dd`)

No open findings from me. F3, F4 and F2b clean; B3/B4/B8/B10 clean after the
`deletedAt` gate patch. `3d838dd` is the empty-amount message on its own commit,
because it changes user-visible text and deserved to be findable.

Decisions recorded by the lead from this checkpoint: `t.status.DISABLED` is the
single word for that state across staff, establishments **and** categories (one
state, one word, beats a per-context synonym), and the `Halalas` suffix stays
because it converted label/value pairing from a runtime-only bug into a
reviewable one.

The lead has adopted the commitment `backend` made after `getOwnStatus`: when
they reverse something they have told me, they say so. That is the actual fix for
the stale-key episode, and it sits on their side rather than mine.

### 2026-09-29 — Checkpoint 3 brief-vs-doc pass (before any code)

Order: W2 → B5 ∥ F5 ∥ F6 → B11 → B6 → W4. Sent the lead 4 items needing a
decision and 9 dropped doc rules. What to verify when the code lands:

**B5**
- `approveOwner` **must guard on PENDING**. It creates 13 categories, so a second
  approval of an ACTIVE owner creates a second complete set — duplicate active
  categories that `nameTaken` cannot prevent (it lives in `createCategory`) and
  no action can clean up. `rejectOwner` needs the same guard: rejecting an ACTIVE
  owner disables a live business. Neither doc nor brief said so.
- **ADMIN actions are the one place an establishment id legitimately comes from
  the client** — ADMIN has `establishmentId: null`, so item 2 and the B3 gate do
  not apply. Replacement guard: zod on the id, confirm the row exists, and
  `requireAdmin()` as the only authorisation. Do not flag the absent session
  scope here as a finding.
- `writeAudit` absent from the brief; `APPROVE_OWNER` / `REJECT_OWNER` /
  `DISABLE_ESTABLISHMENT` / `ENABLE_ESTABLISHMENT` / `RESET_PASSWORD` are
  reserved for it. Ambiguity flagged: schema says `AuditLog.establishmentId` is
  "null for admin actions", but `approveOwner`'s natural value is the target.
- Category counts in the brief (4 IN, 9 OUT) match the doc.

**B11**
- The scoped `findFirst` **stays** — it supplies the audit `before` payload and
  the status guards. Only the write changes. A 0-row `updateMany` is a *second*
  guard (concurrent delete), not the primary one.
- **`changeOwnPassword` cannot be scoped by `establishmentId`** and lives in a
  file being added to the sweep: it serves ADMIN too, whose `establishmentId` is
  null. The correct scope is the session's own user id. `scopeFailure` needs a
  **self-write rule** (`user` model: `where.establishmentId === EST` **or**
  `where.id === <session user id>`) decided before the migration, or the last
  step of B11 cannot be completed without weakening the rule or breaking ADMIN.

**B6**
- **The export route is a Transaction read outside the gate** — `scoping.test.ts`
  `FILES` has seven entries and `api/export/route.ts` is not one. Recommended it
  call `getReport`/`listTransactions` so it inherits `ledgerWhere` by
  construction; otherwise add the file to `FILES` in the same task. An exported
  workbook is the format most likely to be treated as authoritative.
- Brief drops the sheet contents (1 = transactions, 2 = totals by category) and
  the filename `ledger_<from>_<to>.xlsx`, which needs `Content-Disposition`.
- `ReportRangeSchema` has **no maximum span**; exceljs holds the whole workbook
  in memory. Cap it or record the decision.
- `requireOwner()` works by `redirect()` — first time these helpers run outside a
  page or action. Fails closed (307 to `/login`), but confirm rather than assume.

**F5** — brief drops stacked cards on mobile, delete via `ConfirmDialog`,
`LockBadge` hiding actions on locked months, and "أضافه: `<name>`" per row. The
LockBadge rule is the *visible* half of the user's server-derived-actions
criterion; the gating and the affordance must agree.

**F6** — brief drops the current-month default, a total row per table, and the
print header (establishment name + range; `t.reports.printedFor` and
`rangeLabel` exist for it). **Unstated and the most valuable: print is
black-on-white, so the IN/OUT colour signal disappears and `+`/`−` becomes the
only carrier of direction.** `MoneyText` emits a sign only when `direction` is
passed, so every amount in the report tables must pass it explicitly. Print is
not an edge case for "never colour alone" — it is the case that proves the rule.
Read the print stylesheet **by hand**; a justified physical-direction value with
a comment is not a finding there.

### 2026-09-29 — R-B5 / R-B11 / R-B6 / R-F5 / R-F6

**One finding (B5/B11/B6): the two encoded `scopeFailure` exceptions are tight
but unpinned by any harness case** — nine pre-existing rules each have one, these
two have none, so widening them later fails nothing. Sent `backend` three cases;
`OTHER_USER` beside `OTHER_EST` is the missing half. This produced Checklist A
item 18, and the lead amended the governance rule to "a logged Decision **and** a
pinning case". The general shape worth reusing: **a rule with no foreign value in
the fixture to fail against is a rule that cannot be tested.**

**F5/F6 clean.** The range separation holds past the parser — the page queries the
safe range and the **export link inherits it**, so a rejected span can be neither
queried nor exported. The print case I raised is handled: every report row and
both table totals pass `direction`, so `+`/`−` survives black-on-white. The
`@media print` block took **no** physical-direction exemption — `frontend`
checked whether the permission implied a need. All four F5 doc rules present, and
both renderings pass `locked=`, so the two layouts cannot disagree.

**Two judgement calls I made rather than reflexive findings:**
- `categoryId` from the URL is **not** re-checked against the establishment, so
  the user's criterion is literally unmet — but `ledgerWhere` carries
  `establishmentId` in the same `where`, so a forged category yields **zero rows,
  not anyone else's**. Recommended amending the criterion rather than adding a
  lookup per page load to make an empty list nicer. Trace the guarantee before
  reporting a missing check: the protection may be structural.
- `pageTotals` correctly holds *filtered-set* totals (the doc's name), but the
  name argues for the bug the user made a criterion. Raised as a rename for the
  lead, not a finding against `frontend`.

**My error, recorded:** I attributed the `// null for admin actions` comment to
`prisma/schema.prisma`; it exists only in `docs/BACKEND.md`'s schema copy. The
substance held, but I put a finding on a file `backend` owns instead of one the
lead owns. **Grep for *which file* as well as for what is in it** — a
misattributed finding lands on the wrong person's task.

### 2026-09-29 — Checkpoint 4 brief-vs-doc pass (Checkpoint 3 = `f81a9f6`)

Order: B7 ∥ F7 → F8 → W5 → W6, then the lead commits and stops. **No HIGHs**, so
the lead was told to keep going — with the user away, that judgement gates
whether they continue, so it needs saying explicitly rather than implied.

What to verify when the code lands:

**B7** — the lead asked whether testing the pure predicate satisfies the doc. **It
does not.** Three of the doc's four matrix rows *are* `canEditTransactions`'s
truth table, already covered by `permissions.test.ts` since Phase 0. The fourth
settles it: for PENDING the predicate returns `false` but the wrapper's observable
behaviour is a **destination** (`/pending`, not `/login`). Only a wrapper test
catches: (a) that `requireCanEdit` **redirects rather than returns** — every
mutation depends on the throw; (b) `requireUser`'s DISABLED / deleted-row /
inactive-establishment branches, which the predicate never sees, and which I
asked be **added to the doc's matrix**; (c) **H1 is still unpinned** — nothing
tests that a throwing `session.destroy()` still redirects, so reverting `forget()`
to a bare `destroy()` reintroduces the 500-loop and fails nothing. By item 18
that is decoration, and it was a HIGH when first found. `server-only` is not an
obstacle: `scoping.test.ts:111` already mocks it.

**F8 — the one real trap.** The brief put the `ConfirmDialog` on month-locking;
the doc puts it on **إعادة توليد**, the only irreversible action on the screen
(every existing code dies instantly and an employee mid-signup is stranded).
`t.settings.regenerateConfirm` exists for it. Also dropped: the code shown
**large**, and what the deactivate control does on the **last active category**
per direction (`err.lastActiveCategory` refuses it — same "refused but reachable"
shape as the reorder arrows).

**F7 — cross-task constraint invisible in both brief and doc:** the tab param must
be `tab` and the account value `account`, because
`src/app/(owner)/layout.tsx:20` already ships
`accountHref="/owner/settings?tab=account"`. Wrong naming = top-bar account link
silently lands on the wrong tab. Discoverable only by reading F1. Also
`t.settings.rejectStaffConfirm` implies رفض goes behind a `ConfirmDialog`.

**W5 — half already done:** the reports page imports the real `getReport`
(`page.tsx:7`); F6 never stubbed it. W5 reduces to exercising the export link.

**Method note that produced most of this round:** `src/i18n/ar.ts` keys are a
**specification**. `regenerateConfirm`, `rejectStaffConfirm`, `resetPasswordFor`
and `lastActiveCategory` each imply behaviour no brief mentioned. A key that
exists and is unused is either a missing feature or dead weight — reading the
string table against the screens finds requirements neither doc states.

### 2026-09-29 — R-F7 / R-F8 / R-W5 / R-W6. **No HIGHs; cleared the commit.**

Verified all four of the lead's pointers. Arrow bounding uses
`active.findIndex(...)` — position among *active* rows within a per-direction
group — so both ends are genuinely closed and `err.notFound` from
`setCategoryOrder` is unreachable. `frontend` extended the same standard to
`err.lastActiveCategory` via `isOnlyActive`, a case I raised in the brief read
and never chased in review. The id fix is complete across every repeating call
site (`add-${type}`, `rename-${id}`, `reset-${row.id}`), and deriving
`hintId`/`errorId` from `fieldId` is the easily-missed half — otherwise the label
points right while `aria-describedby` still points at row one. No bound id
arrives from a form; the only hidden field is `type`, and `updateCategory`
refuses a type change, so a forged one cannot move a category between directions.

Both brief-read traps were already handled before I arrived: regenerate behind
`ConfirmDialog` at `text-3xl`, and رفض behind one on the strength of
`t.settings.rejectStaffConfirm` existing.

**Lessons worth keeping:**
- **A fix that is opt-in is only as good as its last call site.** The `id` prop
  defaulting to `name` is the right trade (a `useId()` fix would have forced
  `"use client"` onto three shared primitives), but it means a future repeating
  form that forgets `id` silently reintroduces the defect. Check the whole set,
  not the motivating case.
- **Correctness by coincidence is worth removing precisely because nothing
  breaks.** The rotated chevron pointed up in RTL and down in LTR — correct only
  by accident of the Do-not list forbidding LTR. The next person sees a working
  component and learns the wrong rule from it.
- **"It reaches the route" and "it returns a workbook" are different claims.**
  `frontend` stated which one it had rather than showing a green check that
  quietly meant the first. That honesty is worth more than the coverage.

**B7 is held out of the commit** pending the user, because it contradicts a
Phase 0 Gotcha forbidding a test to import `auth.ts`. Holding is right
procedurally. On the merits, for when they return: `scoping.test.ts:111` already
mocks `server-only`, so the technique is established and the Gotcha's *purpose* —
no accidental dependence on Next internals — is served rather than violated by a
deliberate, documented mock. The six-row destination matrix plus pairwise-distinct
refusals is what I argued the doc requires, and it pins **H1**, the invariant I
have been calling decoration since Checkpoint 3. My view: it should land.

### 2026-09-29 — Checkpoint 5 brief-vs-doc pass (F9, F10, P1, W7, W8, T1)

**Strongest finding, pre-code: the CSP will block the service worker in
production.** No `worker-src` and no `child-src` in the policy, so worker loading
falls back `worker-src → child-src → script-src`, and production's `script-src`
carries `'strict-dynamic'`, which makes `'self'` **ignored**. `/sw.js` loads by
URL, not by a nonced tag, so registration fails. **Dev takes the other branch**
(`'unsafe-eval'`, so `'self'` still applies) — it works locally, passes every
test, and dies on Render. Fix: add `worker-src 'self'`; additive, weakens
nothing. *Generalisable: when a config has a dev branch and a prod branch, ask
which failures are visible only in the branch nobody runs locally.*

**P1 second:** "cache the app shell" has **no referent** in this app — every HTML
response is server-rendered and session-scoped. An implementer honouring the
phrase reaches for an HTML route, which is the tenancy bug. Real rule: allowlist
`/_next/static/*`, `/icons/*`, `/manifest.json`, and the fetch handler must **not
call `respondWith` at all** otherwise. "Never `/api/*`" is insufficient — the
dangerous responses are HTML pages.

**F9:** `docs/FRONTEND.md` lists **five** staff routes, the brief four —
`/staff/transactions/[id]/edit` was missing from brief *and* tree, so a
canEdit-enabled staff member would have got an edit button to a 404.
*Resolved: `frontend` built it at 15:10 as part of F9.* The lead read it as my
`find` being stale; it was not — `git status` shows `??` (untracked),
`git cat-file -e HEAD:…` reports "exists on disk, but not in 'HEAD'", and the
`[id]/` mtime is 15:10 against 05:06 for its siblings, so it post-dates my pass.
Worth settling because the lead invoked the false-finding standard: **a
false-finding entry teaches the wrong lesson about whether these passes are
worth running.** Same moving-tree shape as the `retiredCategory` key — the
difference is that here the evidence of *when* survives in git and the mtimes,
so it could be settled rather than left as competing plausible accounts.
*Prefer evidence that carries its own timestamp.*

**The trigger is the question type, not the rule.** "Does X exist?" and "did X
exist when Y looked?" are different questions and only the second was at issue;
`find` answers the first, `git cat-file -e HEAD:<path>` answers the second in one
command. The lead had written this rule down for three checkpoints and still
reached for `find` — because a written rule does not fire at the moment of need.
So: when a claim is about **history**, reach for history commands
(`git cat-file -e HEAD:<path>`, `git log --diff-filter=A -- <path>`,
`git status --short`), never the working tree. Also dropped: the
`canEdit`-off notice, the explicit "no export", and that month StatCards are
**establishment-wide** while حركاتي is user-scoped (the query is already right;
the labels must match, or it is a wrong number in the only sense this app cares
about).

**T1 — the lead's direct question: yes, offline, and favourably.** Three tiers:
(1) the five constant headers — import `next.config.mjs` and call `headers()`;
(2) the nonce plumbing — call `proxy()` directly and assert the response CSP's
nonce **equals** the `x-nonce` request header (that pairing is the mechanism; a
mismatch breaks hydration while both headers look fine individually), nonces
differ per call, prod has `'strict-dynamic'` and **never** `'unsafe-eval'`, and
`script-src` is never bare `'self'` — the literal Phase 0 regression, currently
guarded by a comment alone; (3) Next stamping `nonce=` on script tags — **not**
reachable offline, but it also cannot fail *silently* (every page would fail to
hydrate). **The silent failure mode is the testable one.** Trap to state up
front: Vitest's `NODE_ENV` is `"test"`, so `proxy()` takes the dev branch —
stub it, and assert prod two-sided.

**F10:** the sweep is for **money**, not numbers — `staffCount` and
`transactionCount` are numbers the screen exists to show. Dates
(`requestedAt`, `lastActivityAt`) must go through `<DateText>`.

**Checklist changes from the user's ruling:** `src/lib/auth.test.ts` stays (the
Phase 0 rule now permits importing `auth.ts` with `server-only` and Prisma
mocked — my argument carried). **Security rule 2 and H1 are standing invariants
that must always be pinned by a test**; treat deletion *or hollowing-out* of that
pinning as a finding. And nothing is held back via `.git/info/exclude` — held
work goes under `## Waiting on user` in `PROGRESS.md`. *Hidden state is worse
than blocked state*; flag any recurrence.

### 2026-09-29 — R-F9 / R-F10 / R-P1 / R-W7 / R-W8 / R-T1. **No HIGHs; cleared.**

Both priorities resolved. The staff hint sits beneath the two cards and outside
`RecentTransactions`, so it cannot attach to حركاتي where it would be wrong —
and the lead's ruling beat my framing: I was thinking about *fixing a label*
when no label could carry the distinction, because a reader will not infer scope
from the absence of a possessive. Some meaning needs its own sentence.
`canDelete: false` is built on the server and the staff edit route gates on
`requireCanEdit()`, so a revoked permission redirects rather than relying on no
link having been drawn.

SW allowlist correct, and the **trailing slashes** are what make it correct
(`/icons/` vs `/iconsomething`, `/_next/static/` vs `/_next/data/`). The test
dispatches the **fetch handler** and asserts `respondWith` was never called —
testing the protection, not the predicate.

T1 added two assertions I would not have specified, and both are better than
mine: `script-src` named **specifically** (a nonce in the wrong directive would
satisfy a naive check), and **`next.config.mjs` must declare no CSP at all** — a
negative assertion about a *different file*, which is the only place that failure
is visible, since a CSP moved there is constant, therefore nonce-less, therefore
breaks hydration while every proxy-side assertion still passes.

**Refinement I proposed to the lead's new comment-stripping rule.** The rule as
phrased mandates a stripper everywhere, but `scoping.test.ts` deliberately
*anchors* instead — `/\b(?:db|tx|client)\.\$(?:query|execute)Raw/` cannot match
prose naming `$queryRaw`. Adding a stripper there would introduce the blanking
risk the rule's second half exists to guard against. Proposed: **strip comments
*or* anchor the pattern so prose cannot match; if you strip, prove the stripper
did not blank the file.** The stripping path can fail *silently*; the anchoring
path fails *loudly* (a comment containing the literal `db.$queryRaw` trips it),
and loud is the safe direction. *A rule that mandates one technique can force a
worse one where a different technique already solves the problem.*

Delivered the user's **first sign-in checklist** (10 steps) closing the two gaps
no test could reach: server actions over the wire, and the export actually
returning a workbook. Step 8 — confirming the service worker registers in a
**production** build — is the one not to skip: it is the only place the
`worker-src` fix is observable, and it is invisible in development by
construction.

## In progress
- Task: Checkpoint 2 committed. Holding for the user's approval of Checkpoint 3
  (proposed: W2, F5, B5). **Advance brief-vs-doc pass comes first** — it has been
  worth more than the reviews both times.
- What to prepare for when the briefs arrive:
  - **W2** — the swap I already verified compiles: `data.ts` re-exports from
    `dashboard/queries.ts`, `stubDashboard.ts` deleted. Churn should be type
    names only (`TopOutCategory`→`CategoryTotal`,
    `RecentTransaction`→`LedgerRow`). More than that means the contract drifted.
  - **F5** (ledger list) — filters arrive from **URL search params**, so they are
    attacker-controlled: `TransactionFilterSchema` must parse them, and
    `pageTotals` must be the filtered totals rather than the page's. Row actions
    gated by role *and* lock. 50/page against `PAGE_SIZE`.
  - **B5** (admin) — Checklist A item 15 is the whole task: `getAdminOverview()`
    returns counts and statuses only. Check every `select` for `amountHalalas`
    and every return shape for transaction rows, and re-sweep
    `src/app/(admin)` for a rendered amount even if a query leaks one.
    `approveOwner` creating the default categories is the other half. — `frontend` on W1 then F3 ∥ F4, `backend` on B3.
  Reviewing code as it lands. Brief-vs-doc pass done and fully adopted; the
  "Rulings" block above is my checklist for these reviews.
- Order: W1 → B3 ∥ F3 ∥ F4 → B4, B8, B10 → W2.
- First things to check on each: **W1** — is it only the import swap plus
  `stubActions.ts` deleted? **B3** — the four-file gate, by value, with
  `deletedAt`, plus the five dropped doc rules (category triple-check first).
  **F4** — 13b on *حفظ وإضافة أخرى*. **F3** — the `0/0` percentage guard.
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
- **A moving tree is not the same as a wrong claim, and the remedy is the same.**
  `t.transaction.retiredCategory` was added by the lead, then removed as unused
  after `frontend` said it was not needed. The lead's claim, my read and
  `frontend`'s grep were each accurate *at the moment they were made*. That is
  why the rule is **re-read immediately before asserting**, not "read once
  carefully" — no amount of care at time T survives an edit at T+1. What was
  genuinely mine: relaying the claim without checking at all.
- **Verify before a claim becomes a *finding*.** This is the narrow, correct
  lesson from the `t.transaction.retiredCategory` episode — the lead ruled that
  the stale claim was theirs (they added the key, told me, removed it, and did
  not tell me), and that a reviewer cannot re-check every fact a teammate reports
  about a file they own and just edited; if it could, review would cost more than
  it returns. Agreed. But two acts got conflated and only one was reasonable:
  *believing* the lead was fine; *filing a review note that asked `frontend` to
  change working code* on the strength of it was not. A finding is where my word
  carries weight, so that is the point at which the cheap check is owed — not on
  every fact I hear. **`grep` for the symbol, not `ls` for the file — before
  writing it down as a finding.**
- **Deference propagating down a chain turns one stale fact into someone else's
  bug.** Had `frontend` complied as readily as I had, the build would have broken
  and been attributed to *their* task. They checked instead. A teammate who
  verifies rather than complies is a safety mechanism, and telling them so is
  part of keeping it.
- **Triage tree-versus-claim mismatches by whether they fail loudly or silently**
  (`frontend`'s distinction). Four this session: the action shape, `zzsmoke`'s
  first deletion, `getOwnStatus`, this key. The missing key fails loudly — `tsc`
  rejects it — so it was cheap; the action shape could have stayed quiet. Spend
  verification effort on the silent ones first.
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

---

## 2026-09-29 — v1.1a-2 R-brief (pre-code review of B1–B3, U1–U3)

Checked against CLAUDE.md, docs/FRONTEND.md, PROGRESS.md (Decisions, Known issues, Gotchas), the current code, and the Next 16.3.6 docs in `node_modules/next/dist/docs/`. Brand hashes: all 13 files OK against `progress/brand-assets.sha256` (baseline).

### BLOCKER
- **R1 [B2] The filled green top bar contradicts the docs.** FRONTEND.md:14 says never use a gov.sa look-alike header. TopBar.tsx:6-7 records the v1.1a choice: "A thin green rule on top instead of a filled green band, which keeps it clear of a gov.sa-style header." Fix: put `zakham-wordmark-green.png` on the existing white bar, which needs no contrast, focus-ring or height rework. If the green band stays, first log a Decision that reverses the TopBar rationale and amend FRONTEND.md:14/16. R4 and R9 then apply.
- **R2 [all] The briefs contradict higher-precedence files.** CLAUDE.md:11 still names the product سجل المصروفات and says to change it "in ar.ts only", but the manifest carries it too. FRONTEND.md:14 names BrandMark.tsx. FRONTEND.md:80 still has the manifest name and the placeholder icons. FRONTEND.md:81 has the `/icons/*` SW allowlist. FRONTEND.md:14 and :88 forbid decorative animation, which rules out the U3 fade and the U1 pulse. CLAUDE.md says to build only what the files describe, and loading/404/error/transitions are not described. Fix: before any code, the lead amends CLAUDE.md:11 and FRONTEND.md :14, :80, :81 and :88, adds a short loading/404/error/transition section, and logs one Decision. Afterwards: BACKEND.md:128 (`/icons/*`) and PROGRESS Known issues (placeholder mark, `/_not-found` prerendered).
- **R3 [U3] A template.tsx per area does not replay on each page.** template.md → Behavior says a template is keyed on its own segment level and "Navigations within deeper segments do not remount higher-level templates." `(owner)/template.tsx` is keyed on the child segment `owner`, which is the same for every owner page, so it fades once on entering the area and never again. Fix, CSS only, with no template or JS: in globals.css add `@media (prefers-reduced-motion: no-preference) { #main > * { animation: fade-in 180ms ease-out both } }`. The page's root DOM is recreated on each route change but not on a search-param change, so ledger filters do not flash, and the swap from skeleton to content fades as well. `(auth)/layout.tsx` is unowned and its main wraps children in a div, so use `main > div > *` there. The alternative is a client wrapper keyed on `usePathname()` inside AppShell. Verify by going from /owner to /owner/transactions to /owner/transactions/new.
- **R4 [B2, only if the green bar stays] Focus ring and contrast on green.** The unlayered `:focus-visible { outline: 2px solid var(--color-accent) }` (globals.css:54-57) gives 1:1 on bg-accent. A `focus-visible:outline-white` utility will not fix it, because Tailwind v4 utilities sit in `@layer utilities` and an unlayered rule always wins. Fix: ux changes the rule to `var(--focus-ring, var(--color-accent))`, and brand sets `[--focus-ring:#fff]` on the header (6.57:1). Add this to the contract. Two more failures:
  - TopBar.tsx:34 `text-accent-dark` on the accent is 1.53:1. Use `text-white`, or `text-accent-soft` (5.77:1). `white/80` gives 4.81:1, which is the floor.
  - TopBar.tsx:41 `text-gray-700` must become `text-white`, and `hover:bg-gray-100` must become `hover:bg-accent-dark` (10:1).

### SHOULD
- **R5 [U2] Use `retry`, not `reset`.** error.md for 16.3: `retry` has been stable since 16.3.0 and re-fetches. `reset` only clears state, so a server-component error, such as a DB blip, stays on the error screen.
- **R6 [U1] A loading boundary turns the `notFound()` 404 into a 200.** loading.md → Status Codes. Edit pages `owner/.../[id]/edit/page.tsx:30` and `staff/...:34` would return 200 + noindex. That is not a leak, since the response is the same for a missing id and another establishment's id, but it is a behaviour change. Lead: accept it and log it. Also, `notFound()` there reaches the root `not-found.tsx`, which sits above the group layout, so the AppShell disappears. An optional `(owner)/not-found.tsx` and `(staff)/not-found.tsx` (ux) would keep the chrome.
- **R7 [U1] One loading.tsx per group cannot be shaped like each screen.** The dashboard skeleton would flash before the add form.
  - Fix: a loading.tsx per route, beside each page.tsx.
  - Accessibility: one `role="status"` + `aria-busy` + sr text per loading.tsx, with the pieces `aria-hidden`.
  - Motion: `motion-safe:animate-pulse`. No gradient shimmer, because `bg-gradient-to-r` is physical and would run the wrong way in RTL.
  - Widths as classes, not `style={{}}`.
  - Greys: gray-100 on the body's gray-50 is 1.05:1, which is invisible. Use gray-200 inside white surfaces (1.26:1).
- **R8 [U3] The immediate active state may already be free.** With U1's loading.tsx, navigation is instant and `usePathname()` (and so `aria-current`) updates at once. use-link-status.md says "pending state will be skipped" when the route is prefetched or has loading.js. Build U1 first, then check. If something is still needed, call `useLinkStatus` in a child of `<Link>` for a visual-only pending style, and keep `aria-current` on the real page. Do not touch `nav.ts` `activeHref`, which nav.test.ts pins. Avoid onClick local state: it sticks when you tap the active item, and it fires on a ctrl/cmd-click.
- **R9 [B2↔U3] The SideNav offset depends on the TopBar height.** RoleNav.tsx:57-58 uses `md:top-[69px]`, which is 4px + h-16 + 1px from TopBar.tsx:27-28. Brand keeps the header at 69px or messages ux the new value.
- **R10 [B2] The top bar overflows on phones.** At 36px tall the wordmark is about 198px wide. At 360px: 32 + 198 + ≤160 + 44 + 36 is more than 360, so the establishment name (`flex-1 min-w-0`) shrinks to 0. Use h-6 (about 132px) below sm, h-9 from sm, with `w-auto shrink-0`. Test with a long establishment name.
- **R11 [B2] Print header layout and colour.**
  - Layout: `@media print .print-only { display:block }` (globals.css:86-88) is unlayered and beats `flex` on the same element. Put the icon and name in an inner flex div.
  - Colour: the `*` print rule (globals.css:102-105) sets colour and background only, so the green/gold icon prints in colour. Add `grayscale` on the img in PrintHeader.tsx; the print block itself does not change.
  - Alt text: `alt=""`, because زخم is the text right next to it.
- **R12 [lead: public/sw.js] The manifest goes stale for returning visitors.** sw.js caches /manifest.json cache-first under `ledger-static-v1` and never revalidates, so earlier visitors keep the old name and the `/icons/` manifest. Fix: bump `CACHE` to `ledger-static-v2`; the activate handler purges v1, and the test does not pin the cache name. Deleting `public/icons/` breaks no test, because serviceWorker.test.ts:94-95 and :110 test URL strings, not files. Leave `/icons/` in `STATIC_PREFIXES` and in proxy `OPEN_PATHS`/matcher as dead but harmless: allowlist edits are a pinned invariant (Decision, PROGRESS:145). The `/brand/` icons stay network-only.

### NOTE
- **N1 [U2]** Signed-out visitors are sent to /login before the 404 (proxy.ts:131), so test the styled 404 signed in, e.g. /owner/nope as OWNER. The toLogin branch only shows on /pending/x-style paths and on paths the matcher excludes (`*.png`, `/icons/x`). Excluded paths bypass the proxy, so they get no CSP and no nonce; that is already true today and harmless. Check that `/_not-found` is dynamic in `.next/prerender-manifest.json`, not in the route table (Gotcha PROGRESS:214). Guard with `session.userId && session.role`, as page.tsx does.
- **N2 [U2]** error.tsx is a client component, so it cannot export metadata. Use React `<title>` and compose `${t.errorPage.title} — ${t.app.name}` by hand. The keys are sufficient.
- **N3 [B3]** The `--font-brand` contract is enough. It resolves on :root like `--font-sans` (globals.css:17), provided the zakham variable class goes on `<html>`. Reem Kufi 700 with the arabic subset exists in next/font. Consider `preload: false`, since the font is used only in the footer and on print.
- **N4 [B2]** The tagline is about 18% of the image height. Keep the AuthCard image at 64px tall or more (about 11px glyphs, 253px wide). The tagline in the image matches the new `t.app.tagline`. Every `<img>`: `h-* w-auto` plus width/height attributes.
- **N5 [B1]** Build the template from `t.app.name` (`` `%s — ${t.app.name}` ``). manifest.json is the one unavoidable Arabic-literal file. The /signup tab title still uses `signupTitle` for staff too; signup/page.tsx is unowned, as in the v1.1a Decision.
- **N6 [ownership]** Unowned files the tasks touch: `(auth)/layout.tsx` (R3), `public/sw.js` (R12), and docs (R2). Splitting RoleNav is safe: only AppShell imports it, and nav.test.ts imports nav.ts only.

### R-U1 — skeleton loading states (2026-09-29)

Files reviewed: `src/components/skeletons/{Skeleton,screens,AuthSkeleton}.tsx`, the 17 `loading.tsx`, the `(auth)/layout.tsx` id, and the `globals.css` diff. `tsc --noEmit` exits 0. `vitest run` passes 274/274. The `.next/prerender-manifest.json` built at 21:15, after the skeleton files, still lists only `/_global-error` and `/_not-found`, so every page is still dynamic.

**Passes**
- **Live region:** each loading file renders exactly one `SkeletonPage`: one `role="status"` with sr-only `t.common.loading`, and every shape inside an `aria-hidden` wrapper.
- **Motion:** `motion-safe:animate-pulse` is opacity only, with no gradient.
- **RTL:** logical utilities only. No inline `style`. Arabic appears only in comments.
- **Print block:** untouched. The `--focus-ring` fallback and the `--font-brand` token match the contract.
- **Visibility:** gray-200 on white measures 1.26:1 and gray-300 on the gray-50 body 1.42:1. Both are decorative, so WCAG 1.4.11 does not apply, and both are visible.
- **Shape:** shapes match the real screens. The auth wordmark bone is 64×256, against a real image of 64×253.

**SHOULD**
- **S1: the ledger skeleton wraps the add and edit forms.** `owner/transactions/loading.tsx` and `staff/transactions/loading.tsx` also wrap `transactions/new` and `transactions/[id]/edit`, because a loading.js wraps its segment's children too.
  - Where it bites: navigating to Add from anywhere outside the transactions segment. That covers the dashboard's "+ إضافة حركة" button and the إضافة tab from the dashboard, reports or settings.
  - Why: link.md:302 says a dynamic route prefetches "down to the nearest segment with a loading.js", and that segment is `transactions`. So the ledger skeleton (filters, totals, rows) flashes before the entry form, on the most frequent action in the app.
  - Fix (project-structure.md:395, "Opting for loading skeletons on a specific route"): move `transactions/page.tsx` and `transactions/loading.tsx` into a route group `transactions/(list)/`, in both areas. The URL does not change.
  - Ownership: this moves a `page.tsx`, so it needs the lead's approval. Deleting `transactions/loading.tsx` instead would make the dashboard skeleton the fallback for the ledger, which is worse.
  - Verify in the browser: dashboard → إضافة should show `EntryFormSkeleton`.

**NOTE**
- **N1: `aria-busy="true"` on the live region itself.** It is per the brief, but ARIA lets assistive technology hold announcements in a busy region, and a region inserted already holding its text is often not announced at all. The more robust form is `role="status"` without `aria-busy`. This is the lead's call because the brief specifies both.
- **N2: the auth layout id.** It is about to move to the inner div, and I will re-check it with U3's fade selector.

### R-B1..B3 — rename, brand assets, Reem Kufi (2026-09-29)

Reviewed from the code; I did not see it in a browser.

**Verified**
- **Brand files:** `sha256sum -c` gives 13/13 OK, with no extra files in `public/brand/zakham-brand/`.
- **Images:** all are plain `<img>` (no next/image) with the real ratios: 3897×707 (top bar), 3907×988 (AuthCard), 512×512 (print).
- **Stale references:** `public/icons/` and `BrandMark.tsx` are deleted, and nothing imports either. `/icons` is left only in the pinned `sw.js` allowlist, `proxy.ts:37` and `BACKEND.md:128`, all as ruled.
- **sw.js:** the diff is the `CACHE` constant only (v1 → v2).
- **Manifest:** name, short_name and description are updated. There are 4 icons: 192/512 `any` and maskable-192/512 `maskable`. Theme colour is unchanged.
- **layout.tsx:** the title template is built from `t.app.name`. Favicons are 32 and 64 and the apple-touch icon is 180, all with correct `sizes`. Reem Kufi 700 (arabic, swap, `preload:false`) sets `--font-zakham` on `<html>`.
- **Print:** the `@media print` block in `globals.css` has no hunk. The reports page diff is only the import and the header swap. `PrintHeader` keeps the same text, keys and `<bdi>` dates, and adds an inner flex row, a `grayscale` icon with `alt=""`, and `font-brand` on the name.
- **Arabic:** none outside `ar.ts`, except `manifest.json`, which is allowed. The other grep hits are `·` and `×`.
- **RTL:** logical utilities only (`border-s`, `ps-3`). The order is still wordmark and name on the right, user and logout on the left.
- **Contrast on the green band:**
  - White text and icons on `#006c35`: 6.57:1.
  - The user link's hover, white on `#004d26`: 10.05:1.
  - The logout Button stays `secondary` (gray-900 on white).
  - Focus ring: `[--focus-ring:#fff]` is read by the unlayered `:focus-visible` rule, giving white on green at 6.57:1.
  - The `white/40` divider and the `accent-dark` borders are decorative.
- **Height:** stays 69px (4 + 64 + 1).
- **Typecheck:** `tsc --noEmit` exits 0.

**SHOULD**
- **S1 [B2] TopBar.tsx: the establishment name disappears on a 360px phone.**
  - Below `sm` the fixed widths add up to 245px: 32 padding + 132 wordmark (h-6) + 24 gaps + 44 logout + 13 divider and `ps-3`.
  - That leaves 115px for the user link and the name together. The link's content is 38px plus the text, up to 160px. The name is `flex-1`, whose flex-basis is 0.
  - Once a user name is wider than about 77px (roughly ten Arabic letters, e.g. عبدالرحمن القحطاني), the establishment name gets 0px and shows only as an ellipsis. Showing the name is the reason for B2's "owners/staff still see the establishment name".
  - The wordmark cannot be cropped: about 31% of its width is transparent space between the letters and the gold bars.
  - Fix: `<span className="sr-only truncate sm:not-sr-only">{userName}</span>`, the same pattern as the logout label. The link becomes about 34px, so the name gets about 81px at 360px, and the link keeps its accessible name.

**NOTE**
- **N1 [B1] Stale comment at ar.ts:10.** "Second line of the top bar for ADMIN" is now the only text beside the wordmark.
- **N2 [B1] Alt text can drift.** `t.brand.logoWithTaglineAlt` repeats the name and tagline as literals, so if either changes, the alt drifts. Optional: hoist `NAME` and `TAGLINE` constants above `t` and compose from them.
- **N3 [B3] Print font.** The print header's font depends on the on-screen footer having already loaded Reem Kufi (`preload:false`, and the header is `display:none` on screen). On /owner/reports the footer renders on screen, so the face is loaded before `window.print()`. The fallback is IBM Plex, which is acceptable.

### R-U2 — 404 and error pages (2026-09-29)

Result: **no BLOCKER and no SHOULD. Two NOTEs.**

**Reproduced.** The build at 21:18:54 postdates every U2 file. `.next/prerender-manifest.json` now lists only `/_global-error`: `/_not-found` is dynamic. I ran `next start -p 3107`, signed out, under the build lock, then stopped the server and released the lock. No data was created.

| Path | Status | Title | Scripts | Inline `style=` |
|---|---|---|---|---|
| `/login/nope` | 404 | `الصفحة غير موجودة — زخم` | 12/12 nonced, nonce matches the CSP header | 0 |
| `/pending/nope` | 404 | same | 12/12 nonced | 0 |
| `/definitely-not-here` | 307 → /login (proxy, expected) | — | — | — |
| `/nope.png` | 404 without CSP | — | — | — |

The `/login/nope` page contains the green wordmark and a link to `/login`. The `/nope.png` case is outside the proxy matcher, as known before.

**Code**
- **Authorisation:** not-found reads only `getSession()` to pick the link target (`userId` present → `homePathFor(role)`, else `/login`). It calls no `requireX()` and no `redirect()`. The group not-founds do the same, inside the chrome. A missing entry and another establishment's entry get the same page, so nothing leaks.
- **retry vs reset:** confirmed in both places.
  - Docs: error.md says `retry` has been stable since 16.3.0.
  - Runtime: `error-boundary.js:43` implements `retry` as `startTransition(() => { router.refresh(); reset(); })`.
  - All five error files use `retry()` only and show no message, stack or digest. Each has `role="alert"` around its heading and body.
- **Chrome and ids:** the root `error.tsx` catches errors in the group layouts, which then do not render. Its `<main id="main">` therefore never sits next to AppShell's.
- **Wordmark:** used unmodified, 3897×707 at `h-10 w-auto`.
- **Contrast:** "404" in accent-dark on white is 10.05:1. gray-600 on white is 7.81:1. The white link on accent is 6.57:1, and 10.05:1 on hover.
- **RTL:** logical utilities and `text-start` only.
- **Arabic and logic:** no Arabic outside `ar.ts`, and no logic changes.

**NOTE**
- **N1: comment typo.** `(owner)/not-found.tsx:11` reads "a owner page"; it should be "an owner page".
- **N2: duplicated markup.** The four group `error.tsx` files are identical, and so are the two group not-founds, since the shared panels were withdrawn. This is acceptable at this size. If one changes, change them all.

### R-B re-check (2026-09-29)
The S1 fix is confirmed. Below sm at 360px: 32 padding + 132.3 wordmark (24×3897/707) + 24 gaps + 44 link (min-w-11) + 44 logout = 276.3px, which leaves about 84px for the name, about 71px after the divider and ps-3. The sr-only span is absolutely positioned, so it takes no flex space, and it stays the link's accessible name. The SVG is aria-hidden. N1 and N2 are fixed through the APP_NAME / APP_TAGLINE consts and the rewritten comment. Nothing else changed in TopBar.tsx or ar.ts, whose diff is a single hunk.

### R-U3, follow-ups and final sweep (2026-09-29)

**Result: no BLOCKER and no SHOULD.** The task is clean for the commit.

**U3 (the fade-in)**
- **What changed:** only `globals.css`. It adds `@keyframes fade-in` (from opacity 0 only) and `#main > * { animation: fade-in 180ms ease-out }` inside `@media (prefers-reduced-motion: no-preference)`. The rule is top-level, not inside print, and there is no transform.
- **The no-`both` reasoning is correct.** The Web Animations spec's "side effects of animation" says that while an effect is current or in effect, the user agent acts as if `will-change` included the animated property. `will-change: opacity` creates a stacking context, and a forwards fill stays in effect indefinitely. With `both`, the page root would stay a stacking context at z-index auto. The z-50 fixed Toast inside it would then be painted within that context, below the sibling z-30 top bar and z-40 tab bar. Without a fill, that only lasts the 180ms of the run.
- `opacity` never creates a containing block for `position: fixed`, and ConfirmDialog is in the top layer, so neither is affected.
- **Where `#main` sits:** on AppShell's `<main>` (the skip link target is unchanged), on the root not-found and error `<main>`, and on the inner `max-w-md` div in the `(auth)` layout. The `<main>` landmark is kept there.
- **Nav:** no pending style was added, and RoleNav, AppShell and nav.ts are unchanged. ux measured the active state moving within about 20ms.

**Follow-ups**
- **S1, the ledger move:** `transactions/(list)/page.tsx` is byte-identical to HEAD in both areas (git blob `2709f6b…` owner and `fedbcaa…` staff). `app-path-routes-manifest` maps `(list)/page` to `/owner/transactions` and `/staff/transactions`, so the URLs are unchanged. `new/` and `[id]/edit/` each keep their own `loading.tsx`. `(list)/loading.tsx` renders `LedgerSkeleton`.
- **N1:** `aria-busy` is gone from `Skeleton.tsx`, and `role="status"` remains.
- **Typo:** fixed at `(owner)/not-found.tsx:11`.

**Final sweep of the whole working tree**
- **Brand files:** `sha256sum -c` gives 13/13 OK, 13 files.
- **Print block:** everything from `/* Print:` to the end of `globals.css` is byte-identical to HEAD (CRLF ignored). No animation rule is inside it.
- **Build freshness:** the build at 21:26 is newer than every file in `src/` and `public/`. `prerender-manifest` lists only `/_global-error`, so every page is dynamic.
- **Arabic:** none outside `ar.ts` in any changed or new `.ts`, `.tsx` or `.css` file, apart from comments. `manifest.json` is allowed.
- **Direction and inline code:** no physical-direction utilities, no `style=`, no `dangerouslySetInnerHTML` and no `<script>`.
- **Logic:** no action, query, `src/lib`, proxy, prisma, test or package file changed. `sw.js` changed the `CACHE` constant only.
- **Gates:** `tsc --noEmit` exits 0 and `vitest run` passes 274/274, both re-run by me.

**NOTE**
- **The first 180ms.** For the 180ms of each run, the page root is a stacking context. A Toast shown at the very moment of navigation could sit under the bars for that long. Toasts follow a user action, so in practice this does not occur.
