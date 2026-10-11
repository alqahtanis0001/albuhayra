# v1.5 — common brief for `theme`, `home`, `nav` (read with your own brief)

Ready for go: yes (after the reviewer's pre-code pass — see "Amendments after the pre-code review" at the bottom, if any)

Lead: the session's lead agent. Product owner: the user (away; the lead rules in their place and records every decision in `docs/V15-SPEC.md › Decisions`). Spec: `docs/V15-SPEC.md` — binding, sections A–C verbatim from the user plus Decisions D1…; `docs/V14-SPEC.md` D1–D34 still apply where they touch your files. Branch `claude/v15-wheel-nav-theme` (from `main` `3369686`).

**The user's visual theme (colours, cards, background, fonts, the v1.3 visuals) does NOT change in light mode. v1.5 adds, folds and reorders; it never restyles.**

## Read first, in this order
1. `CLAUDE.md` (roles, conventions, out of scope — dark mode is now in scope, Pushing — you never push)
2. `PROGRESS.md` — *Current phase*, *Known issues*, *Gotchas*
3. `docs/V15-SPEC.md` — twice; then the parts of `docs/V14-SPEC.md` your files touch
4. `docs/mocks/v15-overview-wheel.html` — the approved centrepiece (open it with Playwright: `executablePath: '/opt/pw-browsers/chromium'` is not needed, Playwright finds Chromium; never run `playwright install`). Note its dark palette: it is the user's own sketch of the dark tokens.
5. `docs/BACKEND.md › Security` (rules 1–11); `docs/FRONTEND.md › RTL, Forms, Accessibility, Motion`
6. `progress/v15/brief-<you>.md`, then `progress/v15/<you>.md` (already created from the template; keep it current — you are its only writer)

## What the lead already did (do not redo)
- `docs/V15-SPEC.md` (A–C, team table, D1–D15); CLAUDE.md row + precedence + out-of-scope line.
- `src/i18n/ar.v15.ts` with every key the spec needs, wired into `t` (sections `wheel`, `attention`, `homeDetails`, `addHints`, `reportsTabs`, `salaryPick`, `theme`). Reuse existing labels as its header lists. A key you need that is missing → ask the lead (write it under *Questions* in your recording and message the lead); never add keys yourself. You may improve values only in your own sections.
- Bundle baseline `progress/v15/bundle-baseline.json` (55 routes; `/owner` 323.7 KB gz). Gates at step 0: `tsc` 0, vitest 118 files / 1613 tests, build 0.

## Sequencing (the user's rule)
`theme` lands the token layer (C1) first; the lead commits and pushes it (`v1.5: token layer`) and messages `home` and `nav`. Until then `home` and `nav` work on logic, reads, routes and tests (pure helpers, queries, redirects, nav model) and use only **existing** token classes/vars for anything visual (`bg-white`, `text-gray-*`, `bg-accent`, `text-money-in`, `var(--color-accent)` …) — those flip in dark automatically once the layer lands. **Never write a hex colour** in your code (the token lint, C4, will fail it); in SVG use `var(--color-…)` or Tailwind `fill-*`/`stroke-*` token classes.

## Rules (all binding)
- **Edit only files you own** (the spec's ownership table). Need a change elsewhere → message the owner or the lead; never edit it yourself.
- **No git writes** (no add/commit/stash/checkout/push/reset). **Never run prisma against a database, never `npm start`/`npm run dev` against a real DB, never touch `.env`.** Do not use TaskCreate/TaskUpdate.
- **Gates** before you report a task done: `npm run typecheck`, `npx vitest run`, `npm run build` (prefix `DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder` — nothing connects, PROGRESS D22c). Three agents share one `.next/`: hold `.claude/build.lock` (`mkdir .claude/build.lock`; if it exists, wait 30 s and retry), build, then measure bundles, then `rmdir` it. Retry once on a PostCSS-worker crash / exit 139.
- **Every rule gets a mutation-proven test**: break the rule, see exactly that case fail, restore byte-exactly (`git diff` shows only your intended changes), record "mutation: X → case Y failed" in your recording. Mutate in-tree only with a `cp` backup restored at once, or on a scratchpad copy; never leave a mutation in the shared tree.
- **Tests**: Vitest, `src/**/*.test.ts` (no `.tsx`), node env; components via `createElement` + `renderToStaticMarkup`; prefer pure helpers for rules; mock `server-only`, `@/lib/auth`, `next/cache`, `@/lib/db`, `next/navigation`, `next/headers` as neighbours do. New reads get a case in the scoping gate (`src/features/transactions/scoping.test.ts`, append only). No new dependency.
- **UI**: RTL logical utilities only (`ms-/me-/ps-/pe-/start-/end-/text-start`, never `ml-/mr-/left-/right-` for direction-dependent layout); Western digits; every string via `t.*`; `prefers-reduced-motion` honoured (`motion-safe:` or a media query); every input labelled; icon buttons carry text or `aria-label`; tap targets ≥ 44 px; `no-print` on chrome; every page stays dynamic; no nested `<form>`.
- **Server**: `requireOwner()` / `requireUser()` first; scope every read by `establishmentId`; no amount reaches an admin path; `redirect()` outside try/catch.
- **Print** is unchanged unless the spec says so, and always light (C3).
- **Bundle**: after your final build, `node progress/v13/measure-bundles.mjs progress/v15/bundles-<you>.json` and compare to `progress/v15/bundle-baseline.json`; no route may grow more than 40 KB gz. Client leaves import types and small constants only — never the `@/lib/validation` barrel, never a `server-only` module.
- **Files**: under ~250 lines; new modules rather than growth. Boring, readable code that matches its neighbours (comment density, naming).
- **Reporting**: short plain English. When done return: tasks done, tests added (with their mutations), gate output (counts), bundle deltas, requests to the lead, open questions. The reviewer reviews every completed task; a task is complete only when its review is closed.
