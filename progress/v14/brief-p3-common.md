# v1.4 part 3 — common brief for `words` and `flows` (read with your own brief)

Lead: the session's lead agent. Product owner: the user (away; the lead rules in their place and records every decision in `docs/V14-SPEC.md`). Spec: `docs/V14-SPEC.md` › **v1.4 part 3** (D29–D31) — binding; D1–D28 still apply where they touch your files. Part 2 is on `main` (`eeee963`, record `4967449`); you build on branch `claude/zakhm-v14-part3-wording-z53lw5`.

Goal (the user's): remove every confusion `docs/OWNER-TEST-v14.md` found **without removing or adding a function** — labels, helper lines, subtitles, empty states, toasts, defaults, ordering, one layout bug. If a ruling seems to need a new function, stop and ask the lead.

## Read first, in this order
1. `CLAUDE.md` (roles, conventions, out of scope, Pushing — you never push)
2. `PROGRESS.md` — *Current phase*, *Known issues*, *Gotchas*
3. `docs/V14-SPEC.md` — D29–D31 twice; skim D16–D28 for the parts you touch
4. `docs/OWNER-TEST-v14.md` — sections (b) and (c): the confusions your work removes, with screenshot numbers
5. `docs/BACKEND.md › Security` (rules 1–11); `docs/FRONTEND.md › RTL, Forms, Accessibility, Motion, v1.4`
6. `progress/v14/brief-p3-<you>.md`, then `progress/v14/<you>.md` (create it from `progress/_template.md`; keep it current — you are its only writer)
7. Precedents: `src/features/plans/components/PaymentRecorded.tsx` (a `?param` consumed once with `replaceState`), `src/features/transactions/components/{DirectionToggle,EntryDetails}.tsx`, `src/features/settings/components/settingsPages.test.ts` (page render tests with mocked reads), `src/i18n/instalmentWording.test.ts` + `v14Rename.test.ts` (wording sweeps), `src/components/Switch.tsx`.

## What the lead already did (do not redo)
- Every new key of D30 exists with a draft value: `ar.ts` (`common.apply` «عرض», `direction.help`, `transaction.newSubtitle/saved/categoryHelpIn`, `status.verified/unverified`, `settings.staffActive/editAllowed/editNotAllowed/editHelp/linkLoginHint/resetPasswordFor/noStaff/lockConfirm/locksSubtitle/tabJoinCode/joinCodeTitle`, `lock.badgeHintOwner/badgeHintStaff`, `dashboard.monthNetHint`), `ar.v12a.ts` (`navItem.logins/joinCode`, `plans.subtitle/titlePrefill/archive`, `dues.subtitle/emptyIntro/cashLink/partiesLink`, `payment.salaryTitle/salaryRemaining/upcomingSalaries/salaryRollsOver`, `parties.other`, `schedule.firstDate/editHint`), `ar.v12b.ts` (`quickActions.recordPayment`, `attendance.computed`), `ar.v12c.ts` (`aging.title/tab/printTitle`), `ar.v14.ts` (`addSheet.recordPayment/newProjectHint`, `partyQuick.add`, `pendingJoin.one/open`).
- `dateCaption(iso)` in `src/lib/dates.ts` (+ test). The R7 data migration. README nav lines.
- `tsc` is green; **one** test is red on purpose and is `words`' first task: `nav.test.ts:238` pins the literal «تسجيل دفعة».

## Rules (all binding)
- **Edit only files you own** (your brief and D30). Need a change elsewhere or a new `ar.*` key → write it under *Questions / requests sent to lead* in your recording and return with it in your report. Never edit `PROGRESS.md`, `CLAUDE.md`, `docs/*`, `package.json`, `prisma/**`, `src/lib/**`, another agent's files.
- **No git writes** (no add/commit/stash/checkout/push). **Never run prisma against a database, never `npm start`, never touch `.env`** (a local throwaway `.env` exists for the lead's browser pass; it is not Neon, and it is not yours). **Do not use TaskCreate/TaskUpdate.**
- **Gates** before a task is "done": `npm run typecheck`, `npx vitest run`, `npm run build`. Two agents share one `.next/`: hold `.claude/build.lock` (`mkdir .claude/build.lock`; if it exists, wait and retry), build, `rmdir` it. Retry once on a PostCSS-worker crash / exit 139.
- **Every rule in the spec gets a mutation-proven test**: break the rule, see exactly that case fail, restore byte-exactly (`git diff` must show only your intended changes), record "mutation: X → case Y failed" in your recording. Mutate on **scratchpad copies** or in-tree with a `cp` backup restored at once; never leave a mutation in the shared tree.
- **Tests**: Vitest, `src/**/*.test.ts` (no `.tsx`), node env; components via `createElement` + `renderToStaticMarkup`; prefer pure helpers for rules; mock `server-only`, `@/lib/auth`, `next/cache`, `@/lib/db`, `next/navigation` as neighbours do. New reads are driven by the scoping gate (`src/features/transactions/scoping.test.ts`). No new dependency.
- **UI**: RTL logical utilities only (`ms-/me-/ps-/pe-/start-/end-/text-start`); Western digits; every string via `t.*`; `prefers-reduced-motion` honoured; every input has a `<label>`; icon buttons carry text or `aria-label`; tap targets ≥ 44 px; `no-print` on everything new that is not content; every page stays dynamic; no nested `<form>`; buttons inside the entry form `type="button"` unless they submit it.
- **Server**: `requireOwner()` / `requireUser()` first; scope by `establishmentId`; no amount reaches an admin path; `redirect()` outside try/catch.
- **Bundle**: after your final build, `node progress/v13/measure-bundles.mjs progress/v14/bundles-p3-<you>.json` vs `progress/v14/bundle-baseline.json`; no route may grow more than 40 KB gz relative to the baseline. Client leaves import types and small constants only — never the `@/lib/validation` barrel.
- **Files**: under ~250 lines; new modules, not growth. `TransactionForm.tsx` may grow by the few lines R4/R7/R13 need and must stay below 250.
- **Reporting**: short plain English; when done return: tasks done, tests added (with their mutations), gate output (counts), bundle deltas, requests to the lead, open questions.
