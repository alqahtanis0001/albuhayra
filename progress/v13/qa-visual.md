# progress/v13/qa-visual.md — v1.3 recording for `qa-visual`

## My five items (docs/V13-SPEC.md, Step 4)
1. Run the migration-free production build locally (`npm run build && npm start`; no `prisma migrate`), sign in with the three test accounts
2. Open every screen changed in v1.3 (items 1–15, the page backgrounds and auth card) at desktop (1400×900) and phone (390×844) width
3. Repeat with `prefers-reduced-motion: reduce` emulated: nothing animates, the end state shows, the clock still ticks
4. Print preview each printable changed screen (report, aging, statement, payslip, plan, project, attendance month): tints plain, visuals hidden, text equivalents present
5. Record findings with the exact file and screen; create nothing without the «اختبار» prefix; never touch reminder or client-email settings

Your own running notes. Only you write here. The lead merges it into PROGRESS.md at checkpoints. Keep entries short; newest at the bottom.

## Files I own
(copy from the ownership map in CLAUDE.md)

## Status (lead, 2026-09-30)
**Not run.** The test logins were never supplied (the message carried `<email> / <password>` placeholders); the user then approved the v1.3 visuals from their side, so the lead did not spawn `qa-visual`. No data was created, no settings touched. What remains unverified by an agent: every changed screen at 1400×900 and 390×844, under reduced motion, and in print preview — covered only by the user's own review and by the reviewer's code-level checks.

## Tasks completed
| Task | Files touched | Build/tests pass | Notes for others |
|---|---|---|---|

## In progress
- Task:
- Where I am:
- Next action:

## Gotchas I found
- 

## Questions / requests sent to lead
- 
