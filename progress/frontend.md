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
that reported it — which is the habit this session earned, because a teammate's description and the
tree disagreed three separate times (the action shape, `zzsmoke`'s first "deletion", and
`getOwnStatus`). In every case the file was right and the description was stale.

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
