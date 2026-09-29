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
