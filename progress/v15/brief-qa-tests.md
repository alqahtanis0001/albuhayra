# v1.5 — brief for `qa-tests` (read-only on `src/`)

Ready for go: yes

Read `CLAUDE.md`, `docs/V15-SPEC.md` (A–C, D1–D41), `progress/v15/{home,nav,theme,reviewer}.md` (each builder lists its mutations — do **not** repeat those). You write only `progress/v15/qa-tests.md` and scratch files. No git writes, never touch `.env`, never run prisma against a database.

Job: read every test added or changed in v1.5 (`git diff 3369686 --stat -- 'src/**/*.test.ts'` plus new files) and try to break each rule of §A–C and each Decision with **unlisted** mutations — at least 40, spread over home (wheel geometry, focus/dim, hrefs, ring 3 identity, attention rules, details state, recent counts, overview reads' scoping/exclusions), nav (nav model, add rows, salary flag and pick list, reports tab/redirects/filters, logo, D37), theme (token lint, palette/default-palette dark coverage, parse/reconcile/cookie, SSR attrs, print light, light-unchanged pins). Mutate **only a scratch copy of the repo** (e.g. `git worktree add` is a git write — instead `cp -r src` into the scratchpad and run vitest there with `--root`, or copy the whole repo minus `node_modules`/`.next` and symlink `node_modules`). Never leave a change in `/home/user/albuhayra`.

For each mutation: the file:line, what you changed, killed or survived, and which test killed it. Every survivor is a finding: BLOCKER if it lets a security/scoping/money-number rule break silently, SHOULD if a spec rule is unpinned, NOTE if equivalent or cosmetic — with a proposed test. Also flag tests that are vacuous (pass with the feature deleted) or that read source text in a way a refactor would break for the wrong reason. Return the list to the lead.
