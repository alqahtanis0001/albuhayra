# v1.5 follow-up — brief for `qa-visual` (read-only on code)

Ready for go: yes

Read `docs/V15-SPEC.md › v1.5 follow-up` (D45–D49), then `progress/v15/qa-visual.md` (your earlier pass: the stack, the accounts, the driver). Write only `progress/v15/qa-visual.md` (a new "Follow-up" section at its end) and files under `progress/v15/qa/followup/` (**save JPEG**, not PNG). No git writes, never edit `.env`, never Neon, never `pkill -f vitest`.

Stack: local PostgreSQL 16 db `ledger` (your earlier establishments are still there: `rich@qa.test`, `empty@qa.test`, `abufahd@zakham-test.sa` + staff `saad@qa.test`). The owner `rich@qa.test` has the password `Smoke-Test-2026!` (set by the lead for the smoke test); for any other account you need, set a known bcrypt hash through **stdin** to `psql` (a hash inside `su -c "…"` is mangled by `$` expansion) and record it. Build and run: `npm run build && npm start` (port 3000); stop it by PID when done.

Checks:
1. **Top bar and «المزيد» at 375, 390 and 480 px, light and dark** (owner, staff, admin): below 480 the bar has no theme button and the establishment name is back to full width (measure the name's box and compare with `main` `3369686`'s values in your earlier notes); at 480 the button is in the bar and «المزيد» has no «المظهر» row; below 480 «المزيد»'s first row is «المظهر» with فاتح / داكن (≥ 44 px, `aria-pressed` right); staff and admin get the control at the top of «حسابي» below 480. No horizontal scroll.
2. **The two-state toggle (D45):** fresh context with no cookie on a light device → the page is light; first tap → dark; second → light; reload keeps it; on a dark device the first tap → light. A context carrying a v1.5 cookie `theme=system` behaves like no choice. The button's title / aria-label names the action. No flash after reload.
3. **Home (D47, D48):** ring 2 and the donut colour each category the same (screenshot both, list the pairs); each row's «عرض» opens ring 1 → السجل this month, ring 2 → the التقارير tab, ring 3 → الجهات, dial → المستحقات; the rows' focus/dim still works; «عرض» is not in print.
4. **Owner-test task 6 replay** («كم باقي على محمد؟») as أبو فهد at 390 px with the driver (`progress/v14/owner-test/driver/`), same tap rule; then a ready-to-paste update line for `docs/OWNER-TEST-v14.md › (g)` (task 6: 2 → 4 → **N**).

Report: findings BLOCKER / SHOULD / NOTE with screenshot names, the task-6 tap count and path, what you could not verify.
