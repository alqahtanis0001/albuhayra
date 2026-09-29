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

## F4 review closed — two notes, one fix

**Empty amount now says "required", not "must be greater than zero".** The hidden field submits `""`,
`Number("")` is `0`, and the schema answers `err.amountPositive` — verified directly with a
`safeParse`, not reasoned about. The guard in the reducer tells the two cases apart using the
*visible* field, which is in the form data as `amountInput`: empty → `err.required`,
non-empty-but-unparseable → `err.amountInvalid`. That distinction matters because `AmountField`'s
`localError` already shows "invalid" while typing, and a blanket "required" would contradict it
mid-keystroke.

**`t.transaction.retiredCategory` was added and then removed while we were all looking.** The lead
added it pre-emptively, the reviewer read `ar.ts` during that window and told me it was there, and
the lead removed it as unused once I said I had not needed it. Three reads of one file at three
moments, three different answers. The label stays `t.status.DISABLED` → "صيانة (معطل)", which the
lead endorsed: one state should read the same word everywhere — a category, a staff member and an
establishment being معطل are the same idea, and a reader who learns the word once should not meet a
second word for it. The reviewer's objection (that `t.status.*` is account vocabulary) is reasonable
and recorded, not dismissed.

**Confirmed by the reviewer as the real risks in this form**, all handled: the hidden/visible amount
split (without it "1234.50" arrives non-integer and fails `.int()`); `DirectionToggle` using real
`sr-only` radios rather than a button group, so the value is submitted and the control stays
keyboard-navigable; and `today` arriving as a **server** prop so the date cap cannot disagree with a
client whose clock or timezone differs.

**Method worth copying from that review:** they checked each of the seven fields individually in the
locked-original case rather than trusting the pattern — `disabled` is applied per field, so a
pattern-level read would pass a form with one field left live, which is exactly the shape of bug that
ships.

Gates: build 0, `tsc` 0, `npm test` 137/137. F4 and F2b both reviewed clean; holding for Checkpoint 2.

## A better framing than "reports keep being wrong"

I had been counting instances where a teammate's description did not match the tree — the action
shape, `zzsmoke`'s first deletion, `getOwnStatus`, `retiredCategory` — as a reliability problem. The
reviewer's account of the last one is more useful: the key **was** added, they read a claim about it
while it existed, I read the file after it was removed, and all three reads were accurate when they
were made. That is not people being careless; it is a tree four agents are editing concurrently.

Two consequences worth keeping for whoever works this repo next:

1. **Re-read immediately before asserting, rather than reading once carefully.** A fact about a
   shared tree has a shelf life measured in minutes. The same applies to a commit hash — `9b48932`
   was correct when I verified it and dangling twenty minutes later.
2. **Triage by whether the tree lies loudly or silently.** A missing i18n key or a changed action
   signature fails at `tsc` and costs minutes. A file reported present that is absent, or a renamed
   money field paired with the wrong label, compiles and ships. The first kind needs no process; the
   second is what the verification habits are for.

The habits that actually caught these: `grep` for the symbol rather than `ls` for the file (an
emptied or renamed file passes an `ls`), `git ls-tree`/`git grep HEAD` rather than the working tree
when the question is what is committed, and reading label/value pairs by hand when every field in the
rename is the same type.

## W2 — owner dashboard wired to the real query

`stubDashboard.ts` deleted; my local `TopOutCategory` and `RecentTransaction` deleted rather than
kept as near-duplicates. The churn was exactly what the reviewer predicted: two type *names*
(`TopOutCategory`→`CategoryTotal`, `RecentTransaction`→`LedgerRow`), both of which failed loudly at
`tsc`. No shape drift.

**`data.ts` survived, but its job changed — and the new job is load-bearing.** It is now
**type-only** re-exports. Both `@/features/dashboard/queries` and `@/features/transactions/queries`
begin with `import "server-only"`, and `SixMonthChart` is a client component; `export type` is erased
by TypeScript, so nothing can reach the client bundle. The file says in a comment that nothing
importable as a *value* may live there, because the day someone adds one, that boundary stops being
safe without anything looking wrong. `getOwnerDashboard` is imported straight from the query module
by the page, which is a server component and may hold it.

Worth noting the build is a real check here rather than a formality: `server-only` throws at build
time if a client component reaches it, so a green build *is* the evidence that no query module
crossed the boundary.

One cascade worth recognising next time: renaming the type produced a second, unrelated-looking error
— `t.paymentMethod[row.paymentMethod]` "can't be used to index" — purely because `row` had become
`any` once its type failed to resolve. Fixing the real error cleared both; chasing the index error on
its own would have been wasted effort.

Gates: build 0, `tsc` 0, `npm test` 137/137.

## F5 — ledger list

Files: `src/app/(owner)/owner/transactions/page.tsx`, and in
`src/features/transactions/components/`: `ledgerParams.ts`, `LedgerFilters.tsx`, `LedgerList.tsx`,
`LedgerTotals.tsx`, `LedgerRowActions.tsx`, `DeleteEntryButton.tsx`, `validateEntry.ts`.

**Criterion 1 — `pageTotals` cover the whole filtered set.** `listTransactions` computes
`sumByDirection(where)` against the same `where` as the `count`, with `skip`/`take` applied only to
`findMany`, so it is filter-scoped by construction. My side consumes `page.pageTotals` and **never
sums `rows`** — `LedgerTotals` carries a comment saying why, because summing the rows is the natural
mistake and looks correct on page 1. The **test** the criterion asks for is in `scoping.test.ts`,
which is `backend`'s file; `grep -rn pageTotals` across every test returned nothing, so I asked them
for it rather than editing a file I do not own. What it has to prove is more than "page 1 totals are
right": it needs **more than `PAGE_SIZE` matching rows** and an assertion that page 2's `pageTotals`
equal page 1's and equal the full sum, because the regression being guarded — deriving totals from
the rows already fetched — passes on page 1.

**Criterion 2 — row actions derive from server state.** The page computes
`{ canEdit: role === "OWNER" || user.canEdit, canDelete: role === "OWNER" }` from the session and
passes booleans down; `LedgerRowActions` never asks "may I?", and `DeleteEntryButton` only performs a
deletion the page already permitted. Lock state comes from `listLocks`. Verified in a rendered page
with the flight payload stripped, so the counts are rendered DOM: the unlocked row has 2 edit links
(one per layout), the **locked row has 0** and shows a LockBadge instead, and a list rendered with
`canEdit: false, canDelete: false` has 0 edit links and 0 delete buttons.

**The filters are a plain GET form**, so the filter *is* the URL: no client component, no state, and
submitting omits `page`, which resets to the first page — the right behaviour when the filter
changes. `parseLedgerFilters` runs the URL through `TransactionFilterSchema` and falls back to the
unfiltered default on anything invalid, because a hand-edited query string should show the ledger
rather than an error. It also drops repeated params (`?q=a&q=b`), which arrive as arrays.

**Totals sit outside the table on purpose.** The table is `md`-only; a phone needs the totals just as
much, so `LedgerTotals` renders for every size and the desktop `TFoot` was removed rather than
duplicating the numbers in two places.

**`deleteTransaction` is deliberately still on a stub** even though the real action has landed, so all
three transaction actions flip together at W3. Mixing one real action into a swap point that still
points at stubs would leave the file telling two stories.

## F6 — reports

Files: `src/app/(owner)/owner/reports/page.tsx`, `src/features/reports/components/`
(`reportRange.ts`, `ReportRangePicker.tsx`, `ReportTables.tsx`, `PrintButton.tsx`), and the print
block in `globals.css`.

Month picker defaults to the current month and offers the last 24, newest first, labelled from
`monthNameAr` — **no month keys were added to `ar.ts`**. `?month=YYYY-MM` and `?from=&to=` are
separate GET forms rather than one with a mode toggle, so each URL stays meaningful on its own; the
custom path goes through `ReportRangeSchema` and falls back to the current month.

تصدير Excel is a plain `<a href="/api/export?from=&to=">` — no client code, no wiring task. طباعة is
the one client component on the page.

**The print stylesheet needed no physical-direction value, and I recorded that in the CSS itself.**
The doc permits one here and told the reviewer not to flag it reflexively; the logical properties
Tailwind emits print correctly and `text-start` resolves against `dir="rtl"` in print exactly as on
screen, so there was nothing to take the exemption for. What the block does add: everything forced to
black on white (`*`), because the accent and money colours are legible backlit and muddy in
greyscale — **the `+`/`−` sign is what still separates وارد from صادر on paper**, which is the point
of that rule; visible table rules, since the on-screen grey borders vanish in print; and
`break-inside: avoid` so a category table is not split across a page break mid-total.

`TransactionForm` had reached 249 lines, so `validateEntry.ts` was extracted — now 228.

Gates: build 0, `tsc` 0 (excluding `backend`'s in-flight `api/export/route.ts`), `npm test` 181/181
in 11 files.

## Corrected F5/F6 briefs — checked each, one real gap

Seven rules the lead's briefs had dropped. Six were already satisfied because I built from
`docs/FRONTEND.md` rather than the brief alone: stacked cards plus the table, delete via
`ConfirmDialog`, `LockBadge` hiding row actions on a locked month, "أضافه: `<name>`" per row, the
month picker defaulting to the current month, a total row per report table, and the print header
carrying establishment name and range. Verified rather than assumed.

**The `direction`-in-print rule is satisfied in both report tables.** Every amount in
`ReportTables` passes `direction` — category rows and the per-table total rows alike — so a printed
report keeps the وارد/صادر distinction once colour is gone. The **net** deliberately uses `signed`
instead: it is not an IN/OUT quantity but a signed one under a label that says الصافي, so a negative
prints `−` and a positive prints bare, which is the ordinary accounting reading. Flagged to the lead
rather than assumed correct.

**The one real gap: the new 366-day cap was silently swallowed.** `MAX_REPORT_SPAN_DAYS` and
`err.rangeTooLong` landed in `ReportRangeSchema` while I was building, and my `parseReportRange` fell
back to the current month on *any* parse failure — so a user asking for two years got a
one-month report with no explanation, and would have met the real limit only at the Excel button.

**And the first fix for it was wrong in a way worth recording.** I initially echoed the rejected
`from`/`to` back as the resolved range, which meant the page would have queried the very span the cap
exists to refuse — turning a validation message into the timeout it was written to prevent. The shape
that works keeps them separate: `from`/`to` stay the safe fallback and are what gets queried, while
`rejected: { from, to, toError }` is echoed into the form so the message sits under the dates the user
actually typed. Verified in a rendered page: the message appears, `aria-describedby="to-error"` binds
it to the `to` field, exactly one `aria-invalid="true"`, the inputs show `2026-01-01`/`2027-06-30`,
and the report queried is the current month.

Checked the parser across six inputs: a month key, a valid custom range, an over-long range
(`err.rangeTooLong`), a reversed range and a malformed date (`err.rangeInvalid`), and no params at
all. A malformed `from` reports on `to` via the `?? "err.rangeInvalid"` fallback — imprecise, but a
date input cannot produce it and "الفترة غير صحيحة" reads correctly for either field.

Gates: build 0, `tsc` 0, `npm test` 185/185 in 11 files.

## Carry into F7 (staff area)

The staff ledger is the same shape as F5, so three things transfer rather than being rediscovered:

- **Totals go outside the table**, not in a `TFoot`. The table is `md`-only, so a `TFoot` hides the
  totals from every phone user — the audience `docs/FRONTEND.md` is explicit about. `LedgerTotals`
  already renders at every size and takes `LedgerPage["pageTotals"]`, so the staff page can reuse it
  unchanged.
- **`LedgerList`, `LedgerRowActions` and `LedgerTotals` are already role-agnostic.** They take
  `permissions: { canEdit, canDelete }` and a `basePath`, so `/staff/transactions` needs
  `{ canEdit: user.canEdit, canDelete: false }` and no new components — staff never delete, and edit
  depends on the live `canEdit`. Verified today that a list rendered with both flags false shows
  neither affordance.
- **Verify any "is this hidden?" claim against the rendered DOM, not the response.** Split the
  response on `self.__next_f` and count only the part before it: the RSC flight payload repeats the
  serialised props, so a naive grep finds an edit href for a row whose button was never rendered.

The staff dashboard needs `getStaffDashboard(estId, userId)` → `{ monthInHalalas, monthOutHalalas,
myRecent, canEdit }`, and `RecentTransactions` already takes `LedgerRow[]`, so `myRecent` drops
straight in. The `canEdit`-off notice is `t.dashboard.noEditPermission`.

## F5/F6 review closed — the month-year nit, fixed twice over

The reviewer's cosmetic nit was real and had a second half they did not mention.

**Their half:** `MONTH_RE` accepted any four-digit year, and `Date.UTC` maps years 0–99 to 1900–1999,
so `?month=0050-03` resolved to **March 1950**. Confirmed directly: `Date.UTC(50, 2, 1)` is
`1950-03-01`, and `0000-01` gave 1900. Shape validation was not enough, so the year is now bounded to
2000–2100 — the same range `LockInputSchema` uses — and anything outside falls back to the current
month. Checked across ten inputs: `0050-03`, `0000-01`, `1899-12`, `1999-12`, `2101-01`, `9999-12` and
`2026-13` all fall back; `2000-01`, `2026-09` and `2100-12` are accepted.

**The half they missed:** bounding the year does not fix the display, because a *valid* year outside
the picker's 24-month window — `2001-04`, say — is still a month the select has no option for, so it
would fall back to its first option and show a month other than the one reported on. The report was
right and the control lied about it. `monthOptions(selected)` now prepends the selected month when it
falls outside the window, so the picker always names the month actually being reported. Verified: 24
options normally, 25 with an out-of-window selection, and still 24 when the selection is already in
the list.

Worth keeping as a shape: **validating an input and displaying it are separate obligations.** Bounding
the year made the value *safe*; it took a second change to make the control *truthful*. A fallback
that silently shows different data than it fetched is the same class of problem as the rejected-range
bug earlier in F6 — the message was right while the behaviour was wrong.

Two contract points the reviewer took to the lead rather than to me, noted here so they are not lost:
`pageTotals` would read better as `filterTotals`, since the name says "page" while the value is the
whole filtered set and a future author will reach for the rows; and `categoryId` from the URL is not
re-checked against the establishment, which is harmless because `ledgerWhere` carries
`establishmentId` in the same `where`, so a forged id yields zero rows rather than anyone else's.

Gates: build 0, `tsc` 0, `npm test` 190/190 in 11 files.

## `pageTotals` → `filterTotals`, and criterion 1 is met

The reviewer's rename went through, so `LedgerPage.pageTotals` is now `filterTotals`. My three
references followed: `owner/transactions/page.tsx`, `LedgerTotals.tsx` (including the doc comment,
which still reads correctly) and `LedgerList.tsx`. `tsc` caught it immediately — two errors, both
mine, both one word.

The rename is worth more than a tidy-up: the old name argued against its own invariant. A reader
seeing `pageTotals` next to "footer totals" reaches for the page's rows, which is precisely the
regression the criterion guards. The name now enforces the requirement, so the comment is a
convenience rather than the only defence.

**`backend`'s multi-page test has landed and it proves the right thing** — `scoping.test.ts:933`,
"filterTotals span the filter, not the page". 60 rows against a `PAGE_SIZE` of 50, so page 1 has 50
and page 2 has 10; both report `total: 60`; `first.filterTotals` equals `second.filterTotals` and
equals the independently computed full sum; and a second case asserts the totals are **not** the
visible rows' sum. The mocked `groupBy` carries no skip/take and so answers identically for every
page, which is the property under test — a refactor to summing `rows` would fail it on page 2.

So F5's first acceptance criterion is met on both sides: filter-scoped in the query, consumed without
re-summing in the footer, and pinned by a test that fails from page 2 rather than passing on page 1.

Gates: build 0, `tsc` 0, `npm test` 190/190 in 11 files.

## F7 + F8 — owner settings, all five tabs

Files: `src/app/(owner)/owner/settings/page.tsx` and eleven in
`src/features/settings/components/`. Largest is 102 lines.

**The active tab is in the URL** (`?tab=`), for the same reason the ledger filters are: a reload, a
back button or a shared link keeps it, and the page stays a server component with nothing to
desynchronise. `parseTab` falls back to the first tab rather than erroring.

**Only the active tab's data is queried.** Five tabs' worth of queries on every visit would make the
cheap tabs pay for the expensive ones, so each is fetched behind its own `tab === …` check.

**The two action shapes are used as the frozen section specifies**, and the distinction is load-bearing:
`resetStaffPassword(userId, prev, formData)` and `updateCategory(categoryId, prev, formData)` are
form-backed with the id `.bind(null, id)`-bound **on the server**, so the id is never a form field a
client could repoint at another account or another establishment's category; `approveStaff`,
`rejectStaff`, `setCanEdit`, `setStaffActive`, `setCategoryActive`, `setCategoryOrder`, `lockMonth`
and `unlockMonth` are button actions taking plain arguments.

**`err.notFound` from `setCategoryOrder` is unreachable, not merely unlikely.** Reorder arrows render
only for active rows, and the ends of each direction group are disabled — bounded by position among
the **active** rows, since an inactive row has no arrows and cannot be a move target. Verified: three
active categories produce six arrows, the retired one none, and four arrows are disabled (the lone IN
category is both first and last).

**A rename form submits the category's existing `type` as a hidden field** and shows the direction as
fixed text, because `updateCategory` refuses a changed type with `err.categoryDirectionMismatch` — a
category's direction is structural, since entries already point at it and carry that direction.

**The lock grid uses the server's `lockable`**, so the client never decides what "now" is — the trap
`todayISO()` exists in one place to avoid. The open month shows `currentMonthHint` instead of a
button. Also worth remembering: this grid is **newest first** while the dashboard chart is oldest
first, and both are deliberate.

### Two component-level fixes this task forced

**`Input`/`Select`/`Textarea` now accept an explicit `id`.** They derived it from `name`, which is
fine until the same field name appears more than once on a page — one reset-password form per staff
row — at which point every label's `htmlFor` points at the first field. That is a real accessibility
defect in a component I own, not a settings problem. Verified the ids are unique per row:
`reset-s2`, `reset-s3`. `Select` keeps its `children` exclusion, since options come from `options`.

**Added `ChevronUpIcon` / `ChevronDownIcon` rather than rotating a horizontal chevron.** The first
version used `ChevronStartIcon` with `-rotate-90`, which points up in RTL and **down in LTR** —
correct today only because the app is always RTL. Up and down in a vertical list have nothing to do
with text direction, so they carry no `rtl:` variant and need no rotation to reason about.

**Scoped the reject `ConfirmDialog` to pending rows.** It had rendered for every staff row, so an
active employee carried hidden markup titled "رفض" describing an action not offered for them. Closed
dialogs are not announced, so this was dead misleading markup rather than an a11y bug — `<dialog>`
count is now 2 on the probe page (one reject, one regenerate) and "رفض" dropped from 10 occurrences
to 4.

## W5 — reports and export

The reports page already called the real `getReport` from F6, so W5 was the export half.

**Both refusal paths are now exercised rather than inferred**, which was the reviewer's open point:
- through the proxy with no session → **307 to `/login`**;
- with a `purpose: prefetch` header, which `config.matcher`'s `missing` clause makes the proxy skip
  entirely → **still 307 to `/login`**, this time from the route's own `requireOwner()`. The dev log
  confirms the request reached application code, so the handler ran. Nothing but the route could have
  produced that redirect.

That is the useful result: **the route's guard does not depend on the proxy.** A route handler sits
outside the server-action path and inherits none of its checks, so that mattered.

**What I could not verify: a successful workbook download.** It needs an OWNER session, and the
credentials are in `.env`, which I may not read. So "returns a workbook" is still unproven — the same
gap as the auth actions over the wire, and it closes the same way, with one real sign-in.

## W6 — settings wiring

A confirmation, not a swap. Every settings component imports the real modules directly —
`@/features/settings/actions`, `@/features/establishments/actions`, `@/features/locks/actions` and
their queries — because B2/B4/B8 had all landed before F7 started. No stub was written, so none had
to be deleted. The only stubs left in the tree are `transactions/components/stub{Actions,Data}.ts`,
which are W3/W4's to remove.

Gates: build 0, `tsc` 0, `npm test` 222/222 in 12 files.

## Corrected F7/F8/W5 briefs — six already right, one real gap

The lead's brief had put the `ConfirmDialog` on month-locking instead of إعادة توليد. Building from
`docs/FRONTEND.md` rather than the brief meant that never reached the code: the dialog is on
regenerate (`JoinCodeTab`, the only irreversible action on the screen — every existing code stops
working the instant it returns) and `LockCell` has none, since `unlockMonth` makes locking reversible.

Also already satisfied: the join code is `text-3xl`; رفض is behind a `ConfirmDialog` with
`rejectStaffConfirm`; reset-password is a field-bearing bound-id form; and the reports page already
called the real `getReport`, so W5 never had a stub to hunt.

**The cross-task tab contract, verified rather than assumed.** `src/app/(owner)/layout.tsx:20` ships
`accountHref="/owner/settings?tab=account"`, so the param must be `tab` and the value `account` or
the top bar's link silently lands on التصنيفات — working, wrong, and invisible. Checked
`parseTab` across all five keys plus a bogus one and `undefined`: `?tab=account` → `account`,
anything unrecognised → `categories`. Nothing in the doc says this; it is only discoverable by
reading F1.

**The one real gap: the last active category of a direction.** `setCategoryActive` refuses retiring
it with `err.lastActiveCategory`, and I had left the control live. Now disabled **and explained** —
the arrows need no note because "first" and "last" are self-evident, but "why can't I retire this
one?" is not, and a dead control that says nothing is worse than an error. The sentence is the same
one the server would return, resolved from `err.lastActiveCategory`, shown as a hint rather than an
error.

Verified in rendered DOM with one active IN category and two active OUT ones: the lone IN category
has three disabled controls (both arrows, since it is first *and* last, plus the retire button) and
the explanation once; the inactive IN row has no arrows and a live enable button; each active OUT row
has exactly one disabled arrow and a live retire button.

Gates: build 0, `tsc` 0, `npm test` 222/222 in 12 files.

## Locks: one source of truth

Pointed the three transaction pages at the real `listLocks` in `@/features/locks/queries` and deleted
the hand copy of `LockRow` from `transactions/components/data.ts`, along with the stub `listLocks`.
All four pages that care about lock state — settings, ledger, new entry, edit entry — now read the
same query.

The lead's reason is worth keeping verbatim, because it reclassifies the work: **two sources for lock
state in a running app is a correctness risk, not untidiness.** The settings grid and the ledger
disagreeing about whether a month is closed would be a real bug, and "the hand copy is currently
identical field for field" is precisely the state that drifts. Same shape as the duplicated cookie
name that became `sessionConfig.ts`, and as `LedgerRow`/`RecentTransaction` at W2.

`data.ts` now carries a note saying `listLocks` and `LockRow` are deliberately *not* re-exported
there, so the next person does not helpfully reintroduce the convenience.

**The identical case exists for `listCategories`, and it has already drifted** — mine is
`{ id, nameAr, type, active }`, the real one adds `sortOrder`. `/owner/settings` and
`/owner/transactions` read the real query; `/owner/transactions/new` and `…/[id]/edit` still read the
stub, so the ledger filter and the add-entry select can disagree about which categories exist.
Raised with the lead rather than fixed, because "after the locks swap, hold" was explicit and
extending a ruling to a case they did not name is theirs to decide while the user is away. They ruled
go, and it is done: `CategoryRow` and `LockRow` each now have exactly **one** declaration in the tree
(`settings/queries.ts` and `locks/queries.ts`), and all four pages plus `TransactionForm` read them
from there.

`getTransaction` is deliberately still stubbed and is the only stub left. It belongs to W3 because
the edit page needs its actions wired at the same time — the same reason `deleteTransaction` stayed
stubbed so all three transaction actions flip together, rather than a swap point telling two stories.

**The exchange itself is worth recording, because the asymmetry is the general lesson.** I had the
better argument and still asked. If I had been right to extend, asking cost one message; if I had
been wrong, the lead would have found an unrequested change in the diff at commit time. When the cost
of asking is fixed and small and the cost of being wrong is discovered late by someone else, ask —
even when confident. That is a different rule from "ask when unsure".

Gates: build 0, `tsc` 0, `npm test` 222/222 in 12 files.
