# progress/frontend.md

My own running notes. Only I write here; the lead merges into PROGRESS.md at checkpoints.
Newest at the bottom.

## Files I own
- `src/app/**/page.tsx`, `src/app/**/layout.tsx`
- `src/components/**`
- `src/features/*/components/**`
- `public/**`
- `src/app/globals.css`
- `src/i18n/ar.ts` — **string values only** (new keys must be announced to `backend` + lead)

## Tasks completed

| Task | Files touched | Build/tests pass | Notes for others |
|---|---|---|---|
| F1 | `src/app/globals.css`, `src/components/*` (18 files), `src/components/chrome/*` (4), `src/app/(owner|staff|admin)/layout.tsx`, 12 placeholder pages | build ✓, 59 tests ✓, typecheck ✓ | Icons are inline SVG in `src/components/icons.tsx` — there is no icon package in the stack. Nav items name their icon (`icon: "home"`) because they cross into a client component. |
| F2 | `src/app/(auth)/layout.tsx`, `(auth)/{login,signup,pending}/page.tsx`, `src/features/auth/components/*` (8 files), `src/components/FormToast.tsx` | build ✓, 59 tests ✓, typecheck ✓ | All three screens are on stubs. W1 changes **one line** in `src/features/auth/components/actions.ts`. |

### F1 — what is there
- Shared components, all Tailwind-only, all logical utilities: `Button`, `Input`, `Select`,
  `Textarea`, `Card`, `StatCard`, `Table` (+ `Tr/Th/Td/TBody/TFoot`), `EmptyState`,
  `MoneyText`, `DateText`, `Badge` (+ `DirectionBadge`, `StatusBadge`, `LockBadge`),
  `ConfirmDialog`, `Toast`, `Tabs`, `Pagination`, `FormToast`, `icons`.
- `Input`/`Select`/`Textarea` take `error` as an **`err.*` i18n key** (straight from
  `fieldErrors`) and resolve it with `errorMessage()`. Do not pass Arabic text.
- `MoneyText` and `DateText` are the only way an amount or a date reaches the screen.
  Both wrap the value in `<bdi>` so a Western-digit number sits correctly inside RTL text.
- Chrome: `AppShell` = skip link + `TopBar` + `SideNav` (md and up) + `BottomTabs` (below md).
  Only `RoleNav` is a client component, and only to read the current path.
- The three role layouts `await requireOwner() / requireStaff() / requireAdmin()`.
- 12 placeholder pages exist so every nav link resolves; each names the task that fills it
  (F3–F9). They render the screen title and nothing else.

### F2 — what is there
- `/login`, `/signup` (choice cards → owner or staff form), `/pending`.
- Every form runs the **same zod schema as the server** on the client first, inside the
  `useActionState` reducer, then calls the action. A failed client parse returns
  `invalid(parsed.error)`, so the error shape is identical either way.
- Field errors render under their input; a failure with no `fieldErrors` raises `FormToast`.
- Submit is disabled and relabelled while pending.

## In progress
- Task: none — F1 and F2 are done and reported.
- Next action: F3 (owner dashboard) when the lead assigns it.

## Gotchas I found
- **`next dev` used to rewrite `CLAUDE.md` — fixed, but know why.** Next 16 appends a
  `<!-- BEGIN:nextjs-agent-rules -->` block to the repo's `CLAUDE.md` on every `next dev`
  start (`node_modules/next/dist/server/lib/generate-agent-files.js`). I reported it rather
  than reverting, since `CLAUDE.md` is the lead's file and the block re-adds itself. The lead
  set `agentRules: false` in `next.config.mjs` and reverted the block; I verified after that
  — `git status --short CLAUDE.md` empty, `grep -c nextjs-agent-rules CLAUDE.md` → 0,
  `next.config.mjs:11` has the flag. **If the block ever reappears, tell the lead at once**:
  it would mean the flag stopped working, and a build tool would be writing into the file that
  outranks every other instruction on this project.
- **Auth pages must say `export const dynamic = "force-dynamic"`.** Pages in a role area are
  dynamic because their layout awaits `requireX()`, but `/login`, `/signup` and `/pending`
  call nothing, so Next would prerender them, they would get no CSP nonce and would never
  hydrate. The declaration lives once in `src/app/(auth)/layout.tsx`. Verified: the build
  marks all 17 routes `ƒ`, and every `<script>` on `/login` carries a `nonce=`.
- **Two routes are prerendered, not one.** `PROGRESS.md` names only `/_not-found`, but a build
  also emits `.next/server/app/_global-error.html`. Both are Next built-ins, neither is ours,
  and both are plain text that simply will not hydrate under the nonce CSP — harmless, but do
  not go hunting for a static route you did not write. The route table in the build log does
  not list `_global-error`; the prerendered HTML under `.next/server/app/` is the real check.
  Found by `reviewer`; the lead has been asked to widen the Known issues entry.
- **No icon package.** `docs/FRONTEND.md` mentions lucide, but nothing is installed and the
  stack is frozen, so `src/components/icons.tsx` holds hand-written 24×24 SVGs. Add new
  icons there; directional ones get `rtl:-scale-x-100` (verified in the compiled CSS).
- **Nav items cannot carry a component.** `SideNav`/`BottomTabs` are client components, so
  `NavItem.icon` is a string key into `NAV_ICONS`. Same rule for any future client nav.
- `activeHref()` in `src/components/chrome/nav.ts` picks the **longest** matching href, so
  `/owner/transactions/new` highlights إضافة only, not إضافة *and* السجل. Verified in a
  running dev server: exactly one `aria-current="page"` per nav.
- `ConfirmDialog` is a native `<dialog>` opened with `showModal()`. That gives focus
  trapping and Escape-to-close with no library; the parent owns the `open` prop and
  `onClose` fires for both Escape and a programmatic close.
- Tailwind v4 tokens live in the `@theme` block of `globals.css`. `--color-money-out`
  yields `text-money-out` / `bg-money-out` / `border-money-out`; the `-soft` variants are
  the pale backgrounds for badges and stat cards.
- `.safe-bottom` (the tab bar) and `.safe-bottom-space` (padding under `<main>` so the bar
  never covers the last row) are plain CSS classes in `globals.css`, not Tailwind
  utilities — `env(safe-area-inset-bottom)` has no utility.
- I could not visually verify the owner/staff/admin chrome with a real session: login needs
  B1. I verified it by rendering `AppShell` on a public route in dev, checking the HTML
  (both navs, top bar, skip link, `<main>`, active marking), then deleting the probe.

## Questions / requests sent to lead
- **W1 is verified ready and is one line — held by the lead, not by me.** B1 landed with
  exactly the shape my stubs use, so `src/features/auth/components/actions.ts` only needs its
  last line pointed at `@/features/auth/actions` and `stubActions.ts` deleted. I tested that
  flip — typecheck and build both pass against the real actions — then reverted it. The lead
  has it recorded as verified-ready and it goes first once the user approves checkpoint 1.
- **No new `ar.ts` keys needed** for F1 or F2. Every string came from the existing key set.
- `src/**/*.test.ts` is `backend`'s, so I did not add a unit test for
  `activeHref(pathname, items)` in `src/components/chrome/nav.ts`. It is pure and worth
  four cases — `backend`, please pick it up, or the lead can reassign the file.

## Session 2 — contract settled with `backend`

B1 landed twice with different shapes while I was aligning to it, so for the record, the shape
now in `src/features/auth/actions.ts` and mirrored by my stubs is:

- `login(prev: AuthState, formData: FormData) -> Promise<ActionResult<null>>`, **redirects** to
  the role home on success. Never returns `fieldErrors` — one generic `err.loginFailed`, because
  naming the wrong field would say whether the address exists. My client-side pre-check returns
  the same single key rather than per-field errors.
- `logout() -> Promise<void>`, redirects. A bare `<form action={logout}>` in a server component
  is all it needs, in the top bar and on `/pending`.
- `signupOwner` / `signupStaff(prev, formData) -> Promise<ActionResult<null>>`, redirecting to
  `/pending?as=owner` / `?as=staff`. They *do* return `fieldErrors` for a malformed form; an
  email already in use and a bad join code come back as bare `err.signupFailed` / `err.joinFailed`,
  which `FormToast` renders as one form-level message.
- `export type AuthState = ActionResult<null> | null` — the same name my swap point exports.

Both sides parse `Object.fromEntries(formData)` with the same zod schema.

**The `?as=` hint replaced the `getOwnStatus()` request.** A PENDING account gets no session
cookie, so `/pending` cannot look the visitor up and there was nothing for a query to read.
`backend` now puts the role in the redirect instead. `/pending` reads `?as=`, falls back to the
session role for an ACTIVE visitor who lands there, and with neither it omits the who-approves
line rather than guessing. Verified all three cases against a running server. This closes the
gap `docs/FRONTEND.md` left ("auto-redirects when status becomes ACTIVE") — as specified it was
not implementable, and the lead has the note.

Things that changed in my files as a result: `LoginForm`, `SignupOwnerForm`, `SignupStaffForm`
lost the client-side navigation they briefly had; `TopBar` and `/pending` keep the plain logout
form; `stubs.ts` (the `USE_STUBS` flag) is gone, because the swap-point module *is* the flag now
and a second switch would only be a way to disagree with itself.

Gates after the rework: `npm run build` clean (all 17 routes still `ƒ`), `npm test` 84/84,
`npm run typecheck` clean, no physical-direction utilities anywhere. `/login`, `/signup?as=owner`,
`/signup?as=staff`, `/pending?as=owner`, `/pending?as=staff` and bare `/pending` all render
correctly, and every `<script>` on `/login` still carries a nonce.

## Session 3 — contract frozen, nothing to change

The lead ratified the wrong contract for a few minutes: they read the tree during the six-minute
window when `src/features/auth/actions.ts` was an object-input / `ActionResult<AuthRedirect>`
version, mistook it for convergence, and rewrote `docs/BACKEND.md` to forbid the `(prev, formData)`
+ server-redirect shape that the file actually shipped and that my forms call. I reported the
mismatch with the evidence (mtime, `grep -c AuthRedirect` → 0, the five `redirect()` line numbers)
and **stopped instead of guessing** — that shape had already been rewritten twice and a third wrong
guess would have cost more than the wait. The lead chose "code stands", had already corrected the
doc, and logged the lesson.

`docs/BACKEND.md:131` now carries **FROZEN 2026-09-29**. I checked my code against it line by line
and it conforms with nothing to change:

| Frozen rule | Where mine satisfies it |
|---|---|
| `(prevState, formData) => Promise<ActionResult<T>>`, `State = ActionResult<T> \| null` | `AuthState` in `src/features/auth/components/actions.ts` |
| Action converts `Object.fromEntries(formData)` itself | stubs and B1 both do; forms pass `formData` straight through |
| Form runs the *same* schema client-side first | the `submit` reducer in each of the three forms |
| Auth actions redirect server-side on success | nothing in my forms navigates; no `useRouter` in any of them |
| `login` never returns `fieldErrors` | `LoginForm` returns one `err.loginFailed`, and its inputs take no `error` prop |
| `logout(): Promise<void>` | plain `<form action={logout}>` in `TopBar` and on `/pending` |
| `?as=owner\|staff` on the `/pending` redirect | `/pending` reads it, falls back to the session role, omits the line when neither is known |

`docs/FRONTEND.md:37` was also amended to describe exactly this `/pending` behaviour, including that
there is **no** auto-redirect when an account becomes ACTIVE. My implementation already matched.

Two things the lead flagged for when I resume: the `USE_STUBS` preamble in `docs/FRONTEND.md` will be
reworded rather than the flag reinstated (the swap-point module is the switch), and F8's category
move up/down now has `setCategoryOrder(id, "UP"|"DOWN")` specified with task B8 behind it — it had no
action at all before, so F8 was unbuildable as written.

**Status: holding.** W1 and F3 are both held pending the user's approval of checkpoint 1; B1/B2 have
open review findings assigned to `backend` as B9. Nothing of mine is in flight, and the tree is green
on my side: build clean, 84/84 tests, `tsc --noEmit` clean.

## Session 4 — F1/F2 reviewed clean

`reviewer` passed F1 and F2 against Checklist B with **no findings in my code**, having checked it
properly: a Unicode-range scan for Arabic literals, the prerendered HTML from the build output
rather than the reported route table, and every accessibility item. Two notes, both acted on:

1. **Fixed.** My comment at `ConfirmDialog.tsx:52` said "Escape and the backdrop both land here".
   Escape does reach `onClose`; a backdrop click on a native modal `<dialog>` does **not** dismiss
   it. The behaviour was always right — a stray click outside must not cancel a destructive
   confirm — but the comment described something the platform does not do. Comment corrected to
   state the real behaviour and why it is wanted. No behaviour change.
2. **Recorded above as a Gotcha.** A build prerenders two routes, `_not-found` and
   `_global-error`, not one. Neither is mine.

Also confirmed by the review, worth keeping: `<bdi>` in `MoneyText`/`DateText` was beyond what the
doc asked and is the right call for a Western-digit number inside an RTL run; the native `<dialog>`
is the correct answer for the focus trap; and `--color-accent-dark` is a token name, not dark mode.

Not mine but in the tree with my work: `src/app/api/zzsmoke/route.ts`, a leftover `backend` smoke
route that mints an OWNER session with no auth check. Reported by `reviewer` to `backend` and the
lead, who are holding the Checkpoint 1 commit until it is deleted. If the commit looks delayed, that
is why — it is not F1 or F2.

## Carried forward into F3+ (reviewer's Checklist B additions)

Three rules land on my code from the F1/F2 review. Recording them here so they are not
rediscovered the hard way in F3–F10.

1. **`redirect()` must never sit inside a `try`/`catch`.** It navigates by *throwing*, so a
   `catch` swallows it and the user silently stays put. Checked today: the only `redirect()`
   calls in my files are `stubActions.ts:24,32,39` and `src/app/page.tsx:9,10`, and there is no
   `try`/`catch` anywhere in `src/components`, `src/features/auth/components` or `src/app` — so
   nothing is swallowed today. The trap arrives the first time a form wraps an action call in a
   `try`, which F4's save-and-add-another is the likely candidate for.
2. **"Nothing static" is checked against the prerender manifest, not the build's route table.**
   The table lists `/_not-found` but omits `/_global-error`, so it under-reports. Use
   `find .next/server/app -name '*.html'` or read `.next/prerender-manifest.json`; the two agree
   and either beats the table. I had been reporting "only `/_not-found` is static" off the table,
   which was wrong. This is now Checklist B item 10.
3. **The print stylesheet is read by hand, not grepped.** `@media print` rules using shorthand
   escape the physical-direction sweep, and it is the one place a physical value is sometimes
   defensible. F7 owns the real print stylesheet — if a physical value is genuinely needed there,
   it gets a comment saying why, so the reviewer does not have to ask. The current block in
   `globals.css` has no physical directions at all (checked), only `display`, colours and a
   symmetric `padding: 0`.

Also worth keeping for the next reader of `ConfirmDialog`: `closedby="any"` is the attribute that
*would* give light dismiss on recent Chrome, and we deliberately do not use it.

## Session 5 — checkpoint 1 closed out from my side

Everything I raised is resolved, and I verified each claim in the tree rather than on the message
that reported it — which is the habit this session earned, because a report and the tree disagreed
three separate times (the action shape, `zzsmoke`'s first "deletion", and `getOwnStatus` being
described as present after it was gone). In every case the file was right and the report was stale.

**One thing I got wrong, recorded so nobody chases it:** I inferred that the untracked
`src/features/auth/queries.ts` had been destroyed as collateral when `zzsmoke` was cleaned up, and
said so. It was not. The lead ordered it deleted as dead code — `getOwnStatus` lost its only caller
when `?as=` replaced it — and `backend` removed that one file deliberately. No untracked work was
lost and there is nothing to investigate. The absence was real; my explanation of it was a guess
dressed up as a finding, which is the failure mode to avoid: report what the tree shows, and label a
mechanism as a guess when that is what it is.

Verified now:
- `find src/app/api -type f` → `health/route.ts` only; `grep -rn zzsmoke src/` → 0.
- `src/features/auth/` → `actions.ts` and `components/` only. `getOwnStatus` is gone for good, the
  lead removed it from `docs/BACKEND.md`'s read-queries list, and `/pending` never wanted it:
  `getSession().role` is enough to choose between "المدير" and "صاحب المنشأة", which is the only
  use that line has.
- `src/components/chrome/nav.test.ts` pins `activeHref` from both directions —
  `/owner/transactions/new` → itself, `/owner/transactions/abc123/edit` → `/owner/transactions` —
  plus the `/adminx` and `/staffing` sibling-prefix traps a bare `startsWith` would fail. `nav.ts`
  was not changed to suit the test.

`backend` has committed to sending signatures before writing them from here, and the four auth
signatures are frozen. Useful thing to carry into F3+: **read the file, not the message.** A grep
for the symbol beats an `ls` for the file, since a renamed or emptied file passes an `ls`.

Final state of F1 + F2: build clean, `npm test` 84/84 in 6 files, `tsc --noEmit` clean, no
findings open against my code from `reviewer`. W1 is one line and verified; W1 then F3 once the
lead lifts the hold. Nothing of mine is in flight.

## Session 6 — verification addendum, and the commit hash moved

**Checkpoint 1 is `2dc246b`, not `9b48932`.** I verified `9b48932 phase 1: checkpoint 1` and
reported that hash; the lead then amended or replaced the commit. `git cat-file -t 9b48932` still
resolves — the object survives — but `git merge-base --is-ancestor 9b48932 HEAD` fails, so it is
unreachable and dangling. `git rev-parse --short HEAD` → `2dc246b`. A verified commit hash has a
shelf life; re-read HEAD rather than quoting an earlier check.

**Verify the commit object, not the working tree.** This is the lead's rule and it closes the gap my
own checks had: the working tree, the index and the commit can all disagree, and a file deleted from
disk can still be staged. So the checks that count are `git ls-tree -r --name-only HEAD` and
`git grep <symbol> HEAD`, not `find` and `grep` over `src/`. Re-run against `2dc246b`:

- `git ls-tree -r --name-only HEAD | grep -ci zzsmoke` → **0**
- `git ls-tree -r --name-only HEAD | grep -c 'features/auth/queries'` → **0**
- `git grep getOwnStatus HEAD -- src docs` → **no matches**
- api files in HEAD → `src/app/api/health/route.ts` only
- my F1/F2 files in HEAD → **51**
- `grep -rn getOwnStatus docs/` → nothing; the lead had already removed it from the read-queries
  list before I read the doc, so my citation of it was simply out of date.

Three directions a report can be wrong, all seen in one checkpoint: a file reported **present** that
is absent, a file reported **absent** that is present, and a file **absent from disk but staged**.
`grep` for the symbol beats `ls` for the file (an emptied or renamed file passes an `ls`), and
`git grep ... HEAD` beats both.

## W1 — auth pages wired to the real actions

One line, as designed. `src/features/auth/components/actions.ts` now re-exports from
`@/features/auth/actions`, and `stubActions.ts` is deleted. No form, page or component changed;
`grep -rn 'stubActions|USE_STUBS|stubs' src/` finds only the word in that file's own comment.
`src/features/auth/components/` is down to six files: `AuthCard`, `LoginForm`, `RoleChoice`,
`SignupOwnerForm`, `SignupStaffForm`, `actions.ts`.

Gates, on real exit codes: `npm run typecheck` → 0. `npm run build` → 0, all 17 routes `ƒ`, only
`/_not-found` static. `npm test` → 84/84 in 6 files. `stubActions` appears nowhere in
`.next/server/server-reference-manifest.json`.

**What I could not verify, stated plainly:** I did not invoke a server action over the wire. I tried
— pulled the client chunks for `/login`, found one `createServerReference` id
(`60131278…b12f`), and POSTed it with `Next-Action`; Next answered 404, as it did for eight other
candidate tokens. So the id I found was not the dispatchable one and I stopped rather than keep
reverse-engineering the RSC protocol. Worth being clear that **this gap is not new and W1 did not
introduce it**: no action was ever exercised over the wire in this project, stubs included. What
closes it is one real sign-in with the seeded ADMIN, whose password lives in `.env`, which I am not
allowed to read — so it is the lead's or `backend`'s check, not mine. Everything the build can prove
is proven: a wrong module or a drifted signature would have failed `tsc`, since the forms are typed
against `AuthState` and the action's parameter list.

**Environment note for anyone debugging a red build:** `npm run build` exited **139** (SIGSEGV) once,
with the crash inside the npm CLI itself — the log was 154 bytes and died before `prisma generate`
printed anything. The retry exited 0 with no changes to any file. So a single segfaulting build here
is npm flakiness on this machine, not a compile error; re-run once before believing it. The earlier
`npm test` in the same command also showed a segfault line while still reporting 84/84.

## F3 — owner dashboard

Files: `src/app/(owner)/owner/page.tsx`, `src/features/dashboard/components/{data,stubDashboard,
percent,BalanceByMethod,TopOutCategories,SixMonthChart,RecentTransactions}.{ts,tsx}`. Largest is
101 lines. Gates: build 0, `tsc` 0, `npm test` 106/106 in 7 files.

`data.ts` is the swap point *and* the contract: `docs/BACKEND.md` names `getOwnerDashboard`'s
top-level fields but not the shape of its four arrays, so I spelled them out and sent them to
`backend` before B3 was finished rather than after. W2 points that file's last line at
`@/features/dashboard/queries` and deletes `stubDashboard.ts`.

**The percentage guard, verified not assumed.** `percentOfTotal(part, total)` returns `null` when
`total <= 0` or either side is not finite, and the cell renders `—`. Checked with a throwaway script:
`(0,0)`, `(500,0)`, `(100,-50)` and `(NaN,100)` all give `null`; `(1,3)` gives `33.3%`. Also verified
in a real render — a `monthOut={0}` table produced five `—` cells and no `NaN`. A percentage is not
money, so `<MoneyText>` does not cover it: `formatPercent` does its own `en-US` formatting to keep
the digits Western.

**The chart does not server-render, and that matters more than it sounds.** recharts'
`ResponsiveContainer` needs a measured DOM, so the served HTML contains the container and **zero
`<svg>` elements** — the bars appear only after hydration. So the six-month figures would be
invisible with JS off or before hydration, not merely hard to read. The `sr-only` table inside
`SixMonthChart` therefore earns its place twice over: screen readers *and* the no-JS case. It is
plain server-rendered HTML and I verified all six month names are in the response. The reviewer
raised this as judgement rather than a rule; I would now call it closer to a requirement.

**Client-boundary rules that held:** `SixMonthChart` is the only `"use client"` file here, and it
imports nothing but recharts, `@/components/Table`, `@/i18n/ar`, `@/lib/dates` and `@/lib/money` —
all pure. No `server-only` module crosses it, and every prop is a plain number or string. `ym` is a
string and `date` is an ISO string precisely so no `Date` or `Decimal` can reach a client prop.

**RTL in the chart:** `XAxis reversed` so the months read right-to-left with the rest of the UI, and
`YAxis orientation="right"`. Bar colours come from `var(--color-money-in)` / `var(--color-money-out)`
rather than hardcoded hex, so they stay tied to the `@theme` tokens.

Render probe (the `/pending` trick again, restored afterwards and verified): 0 Arabic-Indic digits,
no `ر.س ر.س` double suffix anywhere, the negative STC Pay balance rendered with U+2212, 30 `<bdi>`
wrappers, Hijri dates under every Gregorian one, and both empty states reachable. No warnings or
`server-only` complaints in the dev log.

## F4 — TransactionForm (new + edit)

Files: `src/app/(owner)/owner/transactions/new/page.tsx`,
`src/app/(owner)/owner/transactions/[id]/edit/page.tsx`, and
`src/features/transactions/components/{data,stubData,actions,stubActions,DirectionToggle,
AmountField,LockedNotice,TransactionForm}.{ts,tsx}`. Largest is 211 lines.

**The amount is submitted as an integer string of halalas**, per `backend`: the visible field is
`inputMode="decimal"` with the ر.س suffix, `parseSAR` runs on every change, and a hidden
`amountHalalas` field carries the integer. `parseSAR` returns `null` — never throws — for empty,
zero, negative, over two decimals or out of range, and `null` is a field error rather than something
to submit. Verified in a rendered page: a 1,234.50 entry submits `"123450"`.

**The `redirect()`-inside-`try` trap does not materialise, and that is deliberate, not luck.** There
is no `try` around the action call at all — the comment in `TransactionForm.tsx` says why: a server
action that redirects does it by *throwing*, so a `catch` would swallow the navigation and leave the
user on the form with no error. The only `try`/`catch` in the feature is around `localStorage` in
`DirectionToggle`. This remains correct whether or not `createTransaction` ends up redirecting —
which is still an open question with `backend`; I build for *returns* and send an `intent` field so
they can redirect only for حفظ if they prefer.

**localStorage, the one sanctioned use.** Confined to `DirectionToggle.tsx`: `ledger:lastDirection`,
read and written inside `try`/`catch` because a private window or blocked site data makes the
accessor throw. It is read **after mount only**, in an effect — seeding state from it during render
would be a hydration mismatch, since the server has no localStorage.

**Two bugs the render probe caught, neither in the brief nor the doc:**
1. **An entry whose category was later deactivated.** Filtering the select to `active` rows only
   would drop that category, and saving the edit would silently reassign the entry to a different
   one. The select now also includes `initial.categoryId` even when inactive. Verified: editing an
   entry on the retired صيانة shows صيانة selected; a new entry does not offer it. Asked `backend`
   whether `updateTransaction` accepts an unchanged inactive category — if it returns
   `err.categoryInvalid`, an old entry's note cannot be edited without re-categorising it.
2. **The category placeholder read "لا شيء"** — "nothing" — because I reached for `t.common.none`.
   As a prompt that is simply wrong. The lead has since added
   `t.transaction.chooseCategory` = "اختر التصنيف" and the select now uses it — the
   `t.transaction.category` fallback was only ever a stopgap while the key was the lead's to add.

**Locked months arrive as `string[]` of "YYYY-MM"**, not a boolean, because whether the form is
blocked depends on the date the user picks. On edit, `backend`'s warning that *both* months must be
open drives a distinction the doc does not make:
- the chosen date is in a closed month → notice, submit disabled, **fields stay editable** so the
  user can move the date to an open month;
- the entry's *current* month is closed → notice, submit disabled, **and fields disabled**, because
  no edit can rescue it and leaving them live invites a form that fails on submit.

Probe results (restored afterwards): 4 direction radios across two forms, category select correctly
filtered per direction, 5 payment methods, `max` on the date input equal to Riyadh today, the
locked notice and 8 disabled attributes on the locked edit, `value="saveAndAdd"` present only in
`new` mode, and 0 Arabic-Indic digits.

**Gates.** My own: `tsc --noEmit` exit 0, and a full `npm run build` exit 0 with all F4 files in
place. `npm test` 131/131 in 9 files. **The build is red right now on two of `backend`'s files**
(`features/dashboard/queries.ts`, `features/reports/queries.ts` — ten `DirectionSums` errors, mtimes
06:51 and 06:54), which is B3 landing mid-refactor. `npm run build 2>&1 | grep -E
'^src/(components|app|features/[a-z]+/components)'` returns nothing, so none of mine are involved.
Re-run the full build once they are green to confirm my last two patches against a complete tree.

## Halalas-suffix rename applied to F3

The lead extended the `Halalas` suffix to every money-valued field in a query return shape, so
`data.ts` and its callers moved: `balanceTotal` → `balanceTotalHalalas`, `monthIn` → `monthInHalalas`,
`monthOut` → `monthOutHalalas`, `monthNet` → `monthNetHalalas`, and `TopOutCategories`' prop
`monthOut` → `monthOutHalalas`. The four array shapes already complied. `docs/BACKEND.md:180` is the
reference.

**Two traps in doing a rename like this, both hit:**
1. A word-boundary regex catches the i18n keys too — `t.dashboard.monthIn` must **not** become
   `t.dashboard.monthInHalalas`, because that key does not exist and the label would silently fall
   back. Excluding a preceding `.` protects the keys but then also skips `data.monthIn`, so the data
   references need their own pass anchored on `data\.`. `tsc` caught the half-done state.
2. **`tsc` cannot catch a crossed wire here.** Every one of these fields is a `number`, so pairing
   `t.dashboard.monthIn` with `data.monthOutHalalas` would compile and simply show the wrong figure.
   Re-read the label/value pairs by hand after the rename; they are adjacent lines in
   `src/app/(owner)/owner/page.tsx` (40/41, 44/45, 48/50, 53/55) and each is correctly paired.

Tree is green again: build exit 0, `tsc` 0, `npm test` 134/134 in 9 files. `backend`'s
`DirectionSums` errors are resolved, so the full build now confirms F3 and F4 together.

## F4 realigned to the real `listLocks`

My F4 stub had `listLockedMonths(estId) -> string[]`, a shape I invented before B4 landed. `backend`
implemented `listLocks(estId) -> LockRow[]`, **newest first**, with
`{ year, month, ym, locked, lockedAt, lockedByName, lockable }`. I replaced mine with theirs rather
than leaving the mismatch for W3 to reconcile — a swap point only stays one line if the stub has the
*real* signature, not a convenient one.

The pages call `listLocks` and derive `locks.filter(l => l.locked).map(l => l.ym)`, so
`TransactionForm` still takes a plain `string[]`. The adaptation belongs server-side in the page, and
the component never receives fields it does not use.

Verified the stub against the contract: order `2026-09, 2026-08, 2026-07`; the open month has
`lockable: false`; the oldest is `locked` with a `lockedByName`; derived list `['2026-07']`, the same
value my earlier probe exercised, so the locked-notice behaviour is unchanged.

**Two orderings that differ on purpose** — worth knowing before F7 and F8: `last6Months` is
**oldest first** so the chart reads forward in time, `listLocks` is **newest first** because an owner
locks the month that just ended. And `lockable` is decided on the server, so F8 disables the open
month and anything after it without the client deciding what "now" is — the trap `todayISO()` exists
to avoid.

**Asked `backend` to make `lockedAt` an ISO string.** It is a Prisma `DateTime`, and F8's grid shows
"أقفله <name>" with the date, so it crosses a client boundary exactly as `recent.date` does. Typed
`string | null` on my side; if the query returns a raw `Date`, W7 breaks the way `date` would have.

**Told `backend` not to split `LedgerRow`.** `recent` rows carry two fields more than my
`RecentTransaction` (`categoryId`, `note`) and F5 needs both. Two near-identical types would drift,
and mine accepts theirs structurally, so at W2 I delete my local type and import theirs. One owner
for the row shape, and it is not me.

Gates after all of it: build 0, `tsc` 0, `npm test` 137/137 in 9 files.

## F4 questions closed

**`createTransaction` returns, never redirects** — confirmed by `backend`, and neither do
`updateTransaction` or `deleteTransaction`. There is no `redirect()` in
`src/features/transactions/actions.ts`. Only the auth actions redirect. So the reducer navigating on
`ok: true` for حفظ and resetting for حفظ وإضافة أخرى is correct, and *حفظ وإضافة أخرى* is the reason
the action cannot redirect: an action that redirects cannot offer "stay here".

**The `intent` field stays, and it is not for the server.** `useActionState` hands the reducer
`(prevState, formData)` and no submitter, so a named submit button contributing to `FormData` is the
only way to distinguish حفظ from حفظ وإضافة أخرى. It reaches the server only as a side effect of
being a form field; verified inert — `TransactionInputSchema.safeParse` with an extra `intent` key
succeeds and the key is absent from `r.data`, so it never reaches Prisma. The alternative, a `useRef`
set in `onClick`, is racier and less honest. Both comments in `TransactionForm.tsx` now say this, so
the next reader does not "tidy" the field away.

**The retired-category bug was real and is fixed server-side.** `checkCategory` had refused *any*
inactive category, so an owner could not fix a typo in the note of an old expense whose category had
since been retired without re-categorising it — rewriting history to satisfy a validation rule. The
rule now: a retired category may be **kept but not newly assigned**. `updateTransaction` compares
against the existing row's `categoryId` read from the database, never from the form, so the exception
cannot be forged. My select matches exactly: the entry's own retired category is offered and
preselected; a new entry never sees it.

**For F8:** `setCategoryOrder` refuses inactive categories with `err.notFound`, so do not render
reorder arrows on retired rows — the error should be unreachable, not merely unlikely.

## F2b + reviewer follow-ups

**F2b — "already have an account?" on the sign-up error.** The user accepted that `signupOwner`
keeps `err.signupFailed` for an already-registered email, so the existence leak stays; the condition
was that the link out be visible **on the error**. Same situation for staff, where B10 now returns
`err.joinFailed` for a taken email — an employee with a registered address is told their join code is
wrong.

I added `src/components/FormError.tsx`, an inline `role="alert"` banner carrying the message *and* a
slot beneath it, and used it in both sign-up forms in place of `<FormToast>`. **That is a deliberate
deviation** from `docs/FRONTEND.md`'s "generic Toast for a form-level failure", and the reason is the
condition itself: a floating toast can be dismissed or simply missed, which would leave exactly the
honest user the link exists for without it. `/login` keeps the toast — a login link on the login page
is pointless. Reported to the lead as a deviation rather than done quietly. Verified: `err.signupFailed`
and `err.joinFailed` both render with the link; a result carrying `fieldErrors` renders nothing, same
as `FormToast`.

**The category select is now controlled.** The reviewer was right that one path was still open. The
retired category was already offered on edit, but the select used `defaultValue`, and an
**uncontrolled select can keep a stale DOM value when its option list is replaced** — so flipping
direction could leave a retired IN category selected on an OUT entry, which the server rejects with
`err.categoryDirectionMismatch`. `categoryId` is now React state, cleared on every direction change
and on حفظ وإضافة أخرى, so that combination is unreachable rather than merely unlikely. Worth
remembering generally: a `defaultValue` select whose options change is a stale-value trap.

**No new key was needed to mark a retired option.** `t.status.DISABLED` ("معطل") already says it, so
the option renders "صيانة (معطل)". Verified: the new form lists only the three active OUT categories;
the edit form on a retired category lists it labelled and preselected.

**`intent` stays, and I pushed back on the instruction to drop it.** Both the lead and `backend` read
it as asking the server to branch. It is not: `useActionState` gives the reducer `(prevState,
formData)` and no submitter, so a named submit button is the only way to tell حفظ from حفظ وإضافة
أخرى. Removing it makes both buttons identical. `backend` accepted the correction and added the part
I had missed — that unknown-key stripping is pinned by `validation.test.ts`, not merely zod's default.
Comments on both the field and the reducer line record this so it is not tidied away.

Gates: build 0, `tsc` 0, `npm test` 137/137.

## F3 review follow-up

**`MoneyText` in the chart's `sr-only` fallback.** The reviewer's one consistency point: the fallback
table rendered a bare `formatSAR()` where a React element is allowed. It now uses
`<MoneyText direction="IN"|"OUT">`, so the fallback carries the same `+`/`−` convention as the
visible UI and the "amounts go through MoneyText" rule stays mechanical rather than remembered.

**Two lines in that file that must NOT be "fixed" to use `<MoneyText>`**, now commented in place
rather than left in a review: the `XAxis tickFormatter` and the `Tooltip formatter`. recharts needs a
**string**, not an element, so `formatAmount`/`formatSAR` are correct there. The reviewer's framing is
the part worth keeping — the rule is *Western digits*, and `<MoneyText>` is only its usual mechanism,
not the rule itself. Same shape as `formatPercent`: a percentage is not money, so it formats its own
digits.

**`t.transaction.retiredCategory` does not exist**, despite being described to me as already added.
`grep -in 'retired|متوقف' src/i18n/ar.ts` → no matches; the `transaction:` block's only recent
addition is `chooseCategory`. Nothing was blocked: the retired option renders "صيانة (معطل)" from
`t.status.DISABLED`, which already means "deactivated" and is the same word staff and establishment
rows will use for the same state — one state reading the same everywhere is worth more than a
category-specific synonym. Fourth instance this session of a report not matching the tree; this one
would have failed loudly (`tsc` rejects a missing key) rather than silently.

**Useful for W2, from the reviewer's field-by-field comparison** of `data.ts` against
`dashboard/queries.ts` — a check I could not run myself without reading a file I do not own:
`MethodBalance` and `MonthTotals` are identical, `TopOutCategory` matches `CategoryTotal`, and
`LedgerRow` is a **strict superset** of `RecentTransaction`. So W2's only churn is type *names*
(`TopOutCategory`→`CategoryTotal`, `RecentTransaction`→`LedgerRow`), which surfaces as a compile
error rather than a silent mismatch.

Status: F1, F2, F2b, F3, F4 and W1 all delivered. Build 0, `tsc` 0, `npm test` 137/137. Holding for
Checkpoint 2; F4 and F2b are with the reviewer.
