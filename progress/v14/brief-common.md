# v1.4 — common brief for `cats`, `add`, `plans` (read with your own brief)

Lead: the session's lead agent. Product owner: the user. Spec: `docs/V14-SPEC.md` — it outranks every other doc for v1.4; its Decisions D1–D19 are binding (D16–D19 are the user's rulings on `docs/UX-REVIEW-v14.md`; read them, and your brief's *Amendments after the UX review* block, before anything else).

## Read first, in this order
1. `CLAUDE.md` (roles, conventions, out of scope)
2. `PROGRESS.md` — at least *Current phase*, *Known issues*, *Gotchas* (the Gotchas are hard-won; several apply directly: anchored edits, `redirect()` throws, `"use server"` exports, logical utilities, `.next/` collisions)
3. `docs/V14-SPEC.md` — all of it, then your section again
4. `docs/BACKEND.md` › *Security* (rules 1–11) and the v1.2a sections you touch; `docs/FRONTEND.md` › RTL, components, *Motion*, *v1.3 — visual pass*
5. `progress/v14/<you>.md` (your recording — keep it current) and `progress/v14/brief-<you>.md`
6. The code you own, and the code you will call

## Two phases
**Phase 1 — orientation (now).** Read everything above and the code. Write your plan into `progress/v14/<you>.md › In progress` (files you will create/change, components, action/query names, the test list with the mutation you will apply to each rule). List every question or cross-ownership request under *Questions / requests sent to lead*. **Write no code.** Return a short report (≤ 25 lines): plan summary, questions, anything in the spec you believe conflicts with existing code or tests. The reviewer is reading the three briefs at the same time; the lead folds both into a "go" message.
**Phase 2 — build (after "go").** Implement task by task; after each task update your recording; before marking anything complete run the gates.

## Rules (all binding)
- **Edit only files you own** (your brief lists them; `docs/V14-SPEC.md › Team`). Need a change elsewhere (a new `ar.*` key, a schema field, a lead-owned helper)? Stop at that point, write the request in your recording, and return with it in your report — the lead makes the change and resumes you. Never edit `PROGRESS.md`, `CLAUDE.md`, `docs/*`, `package.json`, `prisma/**`, `src/i18n/ar.ts`, `src/i18n/ar.v14.ts` keys, another agent's files.
- **No git writes**: no `git add`, `commit`, `stash`, `checkout --`, `push`. The lead commits at checkpoints. Reading git is fine.
- **Gates** before a task is "done": `npm run typecheck`, `npx vitest run`, `npm run build`. Three agents share one `.next/`: hold `.claude/build.lock` while building — `mkdir .claude/build.lock` (fails if someone holds it → wait and retry), build, `rmdir .claude/build.lock`. If `npm run build` dies in the PostCSS worker (`0xc0000005`) or with `exit 139`, retry once before suspecting your code (Known issues).
- **Every rule in the spec gets a mutation-proven test**: break the rule in the code, run the test, see exactly that case fail, restore the code **byte-exactly** (verify with `git diff` that your restore left only your intended changes), and record "mutation: <what you broke> → <which case failed>" in your recording. A test you have not seen fail proves nothing (Gotchas).
- **Tests**: Vitest, `src/**/*.test.ts`, node environment, no DOM library — render components with `react-dom/server` (`renderToStaticMarkup`) as existing component tests do (grep for a precedent before inventing one). Mock `server-only`, `@/lib/auth`, `next/cache`, `@/lib/db` the way neighbouring tests do. New server actions/queries must be driven by the scoping gate (`src/features/transactions/scoping.test.ts`) — add drivers and add new server-only modules to its static `FILES` sweep. **Do not** add a dependency.
- **UI**: RTL logical utilities only (`ms-/me-/ps-/pe-/start-/end-/text-start`), never `ml-/mr-/left-/right-`; Western digits; every string via `t.*` (no Arabic literal in a component); `prefers-reduced-motion` honoured (`useReducedMotion` / the CSS blocks in `globals.css`); every input has a `<label>`; icon buttons carry text or `aria-label`; tap targets ≥ 44 px; print output unchanged unless your section says otherwise; every page stays dynamically rendered.
- **Server**: every action starts with `requireOwner()` / `requireUser()` and scopes by the session's `establishmentId`; scoped writes use `updateMany({ where: { id, establishmentId } })` (rule 2b); errors are `err.*` keys via `invalid()` / `ActionResult`; `redirect()` outside any `try/catch`; audit inside the same `$transaction` as the write; no amount ever reaches an admin path.
- **Bundle**: after your final build, `node progress/v13/measure-bundles.mjs progress/v14/bundles-<you>.json` and compare with `progress/v14/bundle-baseline.json`; no route may grow more than 40 KB gzipped. Note the numbers for the routes you touched in your recording.
- **Files**: keep files under ~250 lines; `TransactionForm.tsx` (254) and `transactions/actions.ts` (240) are frozen — mount from them with one line, put bodies in new modules.
- **Reporting**: short plain English; when done with Phase 2, return: tasks done, tests added (with their mutations), gates output (counts), bundle deltas, open questions.
