# progress/v14/qa-tests-p3.md — v1.4 part 3 recording for `qa-tests`

Scope: branch `claude/zakhm-v14-part3-wording-z53lw5`, HEAD `938ea5c` (`v1.4 part 3: wording and first day`; the lead's `fe73102` landed mid-run and touches `PROGRESS.md` only — `src` unchanged), the 34 test files in `git diff --name-only 749f9a8..HEAD -- 'src/**/*.test.ts'`, rules R1–R16 of `docs/V14-SPEC.md` D29–D33, and the builders' lists (`progress/v14/words.md` Mutations ×10, `progress/v14/flows.md` Mutations ×33, the reviewer's read-only spot-checks in `progress/v14/reviewer.md › v1.4 part 3`). Every mutation below is one they did not list. Only `qa-tests` writes here.

## Files I own
`progress/v14/qa-tests-p3.md` and `<scratchpad>/qa-tests-p3/`. No source, test, doc or `prisma/` file in the repo was edited; no git write; prisma was never run by me (the suite's own `migration.v12a.test.ts` shells out to `prisma migrate diff --from-empty`, offline, as it does on every gate).

## Method (part 1's, reused)
- Scratch copy `<scratchpad>/qa-tests-p3/tree`: `cp -r src`, `node_modules` symlinked, `vitest.config.mts` + `tsconfig.json` copied. **`prisma/` is a real copy, not a symlink**, so the migration mutation never touched the repo's SQL.
- `mut.sh <old> <new> <file> <tests…>` applies one exact replacement to the copy (refuses unless the pattern occurs exactly once), runs `npx vitest run <tests>` from the copy's root, restores the file from the repo and `cmp`-verifies. Logs: `r3r4.log`, `r4r6.log`, `r6r10.log`, `r11r16.log`, `words-mig.log`.
- The migration mutations were applied with `sed` to the copy's `prisma/migrations/20261011000000_v14_p3_customer_payment_name/migration.sql`, then restored + `cmp`-verified. A throw-away probe test (`migration.v14p3.probe.test.ts`, scratch copy only, deleted afterwards) checked that the pin I propose actually bites.
- After the last run: `diff -rq src <copy>/src` empty, `diff -rq prisma <copy>/prisma` empty.

## Mutations run — 50 (37 killed, 13 survived)
"K" = exactly the named case(s) failed; "S" = **survived** (a finding below). `file:line` is the repo file; the mutation was applied to the scratch copy.

### R3 — toast (5)
| # | Mutation | Tests run | Result |
|---|---|---|---|
| T1 | `SUCCESS_DISMISS_MS = 3000` → `5000` (`src/components/Toast.tsx:26`) | Toast | **S** → F1 |
| T2 | `fixed` → `absolute` on the strip (`Toast.tsx:61`) | Toast, SavedNotice | **S** → F2 |
| T3 | cleanup `clearTimeout(timer)` → no-op (`Toast.tsx:41`) | Toast | K — "the cleanup clears the timer (unmount before 3 s)" |
| T4 | effect deps `[tone, hasDismiss]` → `[tone, onDismiss]` (`Toast.tsx:54`, the ref trick undone: a parent re-render restarts the 3 s) | Toast | **S** → N1 |
| T5 | `role` always `"status"` (`Toast.tsx:59`) | Toast | K — "an error toast is an alert, a success toast a status" |

### R4 — save toast, landing pages, ledger collapse (9)
| # | Mutation | Tests run | Result |
|---|---|---|---|
| S1 | `withSaved`: `params.set` → `params.append` (`src/components/savedParam.ts:14`) | SavedNotice | K — "withSaved is idempotent" (`/a?saved=1&saved=1`) |
| S2 | `withoutSaved` drops the rest of the query (`savedParam.ts:22` `rest = ""`) | SavedNotice | K — "withoutSaved strips only saved and keeps the ledger's filters" |
| S3 | `SavedNotice` imports `useSearchParams` (reads more than the flag) (`SavedNotice.tsx:10`) | SavedNotice | K — the source pin (`not.toMatch(/useSearchParams\|useRouter/)`) |
| S4 | `projects/[id]` drops `<SavedNotice>` (`src/app/(owner)/owner/projects/[id]/(detail)/page.tsx:70`) | its page test | K — "shows «تم حفظ الحركة» with the flag and not without" |
| S5 | staff ledger `saved={false}` (`src/app/(staff)/staff/transactions/(list)/page.tsx:64`) | ledgerPages | K — "the staff ledger shows it with the flag and not without" |
| S6 | employee page `saved={sp.saved !== undefined}` (`src/app/(owner)/owner/staff/[id]/(detail)/page.tsx:52`; `?saved=0` would toast) | its page test | **S** → N2 |
| S7 | owner ledger page `showing={false}` (`src/app/(owner)/owner/transactions/(list)/page.tsx:132` — the panel never opens for an active filter, the clear link never offered) | ledgerPages, ledgerFilters | **S** → F3 |
| S8 | `LedgerFilters` form `className={panelClass(true)}` (ignores state) (`src/features/transactions/components/LedgerFilters.tsx:58`) | ledgerFilters | K — "closed by default: the form is hidden md:flex" |
| S9 | «حفظ وإضافة أخرى» no longer `setSaved(true)` (`src/features/transactions/components/TransactionForm.tsx:125`; D31j) | all 8 suites under `transactions/components` (68 tests) | **S** → F4 |

### R5 — staff access page (2)
| # | Mutation | Tests run | Result |
|---|---|---|---|
| V1 | `editLabel` arms swapped (`src/features/settings/components/StaffRowActions.tsx:30`) | staffRowActions | K — "the label follows canEdit" |
| V2 | reset form `error={undefined}` — the server's refusal no longer under the field (`ResetStaffPasswordForm.tsx:59`) | staffRowActions, settingsPages, StaffTab | **S** → F5 |

### R6 — salary payment (5)
| # | Mutation | Tests run | Result |
|---|---|---|---|
| W1 | `isSalaryPayment`: `Boolean(periodYm)` → `periodYm !== null` (an absent plan — the staff banner — reads as salary) (`src/features/transactions/components/PaymentBanner.tsx:43`) | paymentBanner | K — "the staff banner (no plan) is generic (D31i)…" |
| W2 | `dues.ts` returns `employeeId: null` while still selecting it (`src/features/plans/dues.ts:185`) | scoping | K — "the payment-form reads; the staff prefill has exactly six fields" (`toMatchObject({ employeeId: "emp_1" })` :1716) |
| W3 | owner new page `salary && pay.employeeId` → `salary` (`/owner/staff/null`) (`src/app/(owner)/owner/transactions/new/page.tsx:54`) | owner new page test | K — "…a salary without an employee falls back to the plan" |
| W4 | «القسط n من …» restored for a salary month (`PaymentBanner.tsx:64–66`) | paymentBanner | K — the salary wording case (`not.toContain("القسط")`) |
| W5 | `upcomingHalalas` `> 0` → `>= 0` (`PaymentBanner.tsx:49`) | paymentBanner | K — "«الرواتب القادمة» is omitted when nothing remains beyond this month" |

### R7 / R8 — category rename, agreement prefills (5)
| # | Mutation | Tests run | Result |
|---|---|---|---|
| P1 | `CUSTOMER_PAYMENT_NAMES` order swapped — the legacy «دفعة من عميل» wins over «سداد من عميل» (`src/features/plans/components/planPrefill.ts:15`) | planPrefill, partyQuick | **S** → F6 |
| P2 | `applyPlanPrefill` overwrites a chosen category (`planPrefill.ts:65` → `if (true)`) | planPrefill | K — "a typed title and a chosen category survive a party change" |
| P3 | legacy name dropped from the list (`planPrefill.ts:15`) | planPrefill | K — the `prefillCategory` matrix (`in_old`) |
| P4 | R7 helper shown in payment mode too (`!payment` dropped, `TransactionForm.tsx:190`) | entryWording | K — "is absent for an OUT entry and in payment mode (even an IN payment)" |
| P5 | `CUSTOMER_PAYMENT_CATEGORY` → «سداد من العميل» (`src/lib/categoryNames.ts:8` — a *third* file beside the i18n and the seed) | v14Part3Wording, admin, planPrefill | K — 5 cases (wording :136, admin "creates the 13 default categories", 3 prefill cases) |

### R9 / R10 — pending-join notice, party order (3)
| # | Mutation | Tests run | Result |
|---|---|---|---|
| J1 | `listPendingStaffNames` `where` drops `establishmentId` (`src/features/establishments/queries.ts:82`) | scoping | K — the "listPendingStaffNames" driver (`where` `toEqual`) |
| J2 | `orderBy createdAt` `desc` → `asc` (`queries.ts:84`) | scoping | K — same driver (`orderBy` `toEqual`) |
| O1 | staff get the «+ جهة جديدة» sentinel too (`src/features/transactions/components/LinkFields.tsx:48`) | entryWording, partyQuick | K — 3 cases (R10 order; D23 "staff renders … have no «+ جهة جديدة»"; the locked-month case) |

### R11 — report filters (5)
| # | Mutation | Tests run | Result |
|---|---|---|---|
| F1 | `ReportFilters.tsx` gains `import type { ReportRange } from "@/lib/validation"` (`:10`) | reportFilters | K — the D32 B1 static pin (a type-only import is caught too) |
| F2 | month `onChange` → `setPeriod((s) => ({ ...s, month }))` — the component no longer calls `afterMonthChoice`, so choosing a month leaves from/to alone (`ReportFilters.tsx:53`) | reportFilters | **S** → F7 |
| F3 | `afterDateTyped` keeps the month (`reportMonths.ts:59`) | reportFilters | K — "typing a date clears the month and keeps the other date" |
| F4 | `monthOptions(period.month \|\| range.month)` → `monthOptions()` (`ReportFilters.tsx:54`; an out-of-window `?month=` vanishes from the select) | reportFilters | **S** → N3 |
| F5 | summary page passes `partyId=""` (the refused id no longer echoed) (`src/app/(owner)/owner/reports/(summary)/page.tsx:64`) | reportFilters | **S** → N4 |

### R12 — lock confirm (2)
| # | Mutation | Tests run | Result |
|---|---|---|---|
| L1 | lock message without `.replace("{month}", label)` (`src/features/settings/components/LockCell.tsx:34`) | settingsPages | K — "the lock dialog names the month in its title and sentence…" |
| L2 | `pressTarget(true)` → `"toggle"` (unlock back to one tap) (`LockCell.tsx:26`) | settingsPages | K — "a press on either month state reaches the confirm" |

### R13 — date captions (3)
| # | Mutation | Tests run | Result |
|---|---|---|---|
| D1 | weekday index `+1 % 7` (`src/lib/dates.ts:148`) | dates, DateField | K — 3 cases (dates "reads weekday first…", both DateField caption cases) |
| D2 | `DateField` renders the `<p>` even for `""` (`src/components/DateField.tsx:42–46`) | DateField | K — "shows nothing under an empty field, and no dangling aria-describedby" |
| D3 | caption not joined into `aria-describedby` (`DateField.tsx:40`) | DateField | K — "shows the caption … and links it by aria-describedby" |

### R14 — schedule builder (2)
| # | Mutation | Tests run | Result |
|---|---|---|---|
| G1 | generator fed the **raw** `firstDate` instead of the clamped `first` (`src/features/plans/components/ScheduleBuilder.tsx:88`) | scheduleBuilder | K — the static pin (`/firstDueDate: first,/`) |
| G2 | first-date state starts `""` (`ScheduleBuilder.tsx:63`) | scheduleBuilder | K — "renders the first-date field defaulting to the start date…" |

### R15 / R16 — cosmetics, sheet hint (3)
| # | Mutation | Tests run | Result |
|---|---|---|---|
| H1 | the hint removed from row 5 (`src/components/chrome/navSlots.ts:69`; "hint on the wrong row" = no row has it) | nav | K — the appended R16 `it` |
| H2 | `RIBBON_LIST` `grid-cols-2` → `grid-cols-3` (`src/features/dues/components/WeekRibbon.tsx:24`) | planActionsRibbon | K — "the list is a two-column grid on phones…" |
| H3 | `AddSheet` never renders `row.hint` (`src/components/chrome/AddSheet.tsx:78` — the component, not the data `flows` mutated) | nav | K — the same `it` (the `<span class="text-[11px]…">` regex) |

### Wording sweeps — restored in files the builders did not try (4)
`words` restored `quickActions.recordPayment` in `ar.v12b.ts` only.
| # | Mutation | Tests run | Result |
|---|---|---|---|
| X1 | `navItem.logins` → «حسابات الدخول» (`src/i18n/ar.v12a.ts:33`) | v14Part3Wording, nav | K — R16 `toBe` + the «حسابات الدخول» sweep |
| X3 | `common.apply` → «تطبيق» (`src/i18n/ar.ts:60`) | v14Part3Wording, ledgerFilters | K — R11 `toBe`, the «تطبيق» sweep, ledgerFilters "one submit, labelled «عرض»" |
| X4 | `aging.tab` → «أعمار المستحقات» (`src/i18n/ar.v12c.ts:71`) | v14Part3Wording, aging, reportFilters | K — R11 `toBe`, the sweep, reportFilters "the tabs read «المتأخرات حسب المدة»" |
| X5 | `attendance.computed` → «محسوب» (`src/i18n/ar.v12b.ts:127`) | v14Part3Wording | K — R15 `toBe` + the «محسوب» sweep |

### Data migration (2)
| # | Mutation | Tests run | Result |
|---|---|---|---|
| M1 | `AND NOT EXISTS (` → `AND EXISTS (` (`prisma/migrations/20261011000000_v14_p3_customer_payment_name/migration.sql:10` — inverted guard: only an establishment that already has «سداد من عميل» gets a second one; the seeded row elsewhere stays «دفعة من عميل») | migration.v12c, openExclusions (the two suites that apply every directory without the prisma CLI) | **S** → F8 |
| M2 | `AND c."type" = 'IN'` deleted (`migration.sql:9`) | the same two + my probe | **S** (the two existing suites: 26/26 green) → F8 |

Checked by reading, not run (equivalent or already listed): `md:top-auto`/`inset-x-4`/`top-20` dropped (each pinned :19–22); `pointer-events-auto` off the ✕ (:31); `useState(true)` in `SavedNotice` (the `!saved` guard keeps it null — equivalent); `router.push(withSaved(doneHref))` → `router.push(doneHref)` (unpinned but equivalent today: three pages hard-code `?saved=1` and the owner new page composes it, R-p3-2-N1); `panelClass` never hidden / `useState(false)` (flows); `aria-controls` constant (`<form id="${controls}"` pin); `required` back on the reset input (flows); `isSalaryPayment` always false (flows); `employeeId` out of the select (flows + gate :1719); `prefillTitle` always/`prefillCategory` ignores names (flows); `applyAll` wiring (static, flows); `dateCaption` regex guard dropped (the `dateToISO(date) !== iso` guard still answers null for every fixture — equivalent); `lang` dropped (flows); `min` dropped (:24); `effectiveFirstDate` constant (flows); cancel `danger` (flows); `PendingJoinNotice` for `[]` / page order (flows + static :65–70); `email` selected (flows); `addSheet.recordPayment`, `plans.archive`, `status.verified` restored (same two cases as X1–X5 by construction: `toBe` + sweep).

## Rule → pin table
| Rule | Pinning test(s) | Verdict |
|---|---|---|
| R3 position / pointer / roles | `Toast.test.ts` :17–37 | real for the classes named; **`fixed` and the 3 s value unpinned (F1, F2)**; effect deps a NOTE (N1) |
| R3 timer | `Toast.test.ts` :44–73 (pure) + static anchor :39 | real (T3) |
| R4 `withSaved`/`withoutSaved` | `SavedNotice.test.ts` :12–29 | real (S1, S2) |
| R4 `SavedNotice` | :31–47 | real (S3); the six landing pages each pinned (S4, S5) — `?saved=0` tolerated (N2) |
| R4 «حفظ وإضافة أخرى» in place (D31j) | — | **unpinned (F4)** |
| R4 collapse | `ledgerFilters.test.ts` | component real (S8); **page-level `showing` unpinned (F3)** |
| R4 the ledgers tolerate `?saved=1` (D32 S3c) | `ledgerPages.test.ts` :49–61 | real |
| R5 switch label / helper / `required` | `staffRowActions.test.ts` | real (V1); **the server error under the field unpinned (F5)** |
| R5 hint line / heading / empty text | `StaffTab.test.ts`, `v14Part3Wording.test.ts` | real (words' mutations) |
| R6 wording, link, `upcoming`, derived mode | `paymentBanner.test.ts` | real (W1, W4, W5) |
| R6 `doneHref` + fallback, `employeeId` on the one read | owner new page test :127–145; `scoping.test.ts` :1715–1719 | real (W2, W3) |
| R7 seed + sweep + helper | `v14Part3Wording.test.ts`, `admin.test.ts`, `entryWording.test.ts` | real (P4, P5) |
| R7 data migration | — | **unpinned (F8)**: the drift suites apply the SQL but no suite seeds «دفعة من عميل» first |
| R8 prefills | `planPrefill.test.ts` | real (P2, P3); **the current-name-over-legacy preference unpinned (F6)** |
| R9 | `scoping.test.ts` :1202–1212, `pendingJoinNotice.test.ts` | real (J1, J2) |
| R10 | `entryWording.test.ts` :56–61, `partyQuick.test.ts` | real (O1) |
| R11 one form / one submit / barrel-free / order | `reportFilters.test.ts` | real (F1, F3); **the month→range wiring in the component unpinned (F7)**; out-of-window month and party echo NOTEs (N3, N4) |
| R12 | `settingsPages.test.ts` :120–162 | real (L1, L2) |
| R13 | `dates.test.ts` :108–119, `DateField.test.ts` | real (D1–D3) |
| R14 | `scheduleBuilder.test.ts` | real (G1, G2) |
| R15 ribbon / cancel / badge / net hint | `planActionsRibbon.test.ts`, `LockBadge.test.ts`, `OwnerStatCards.test.ts` | real (H2 + words' mutations) |
| R16 subtitles / renames / hint | `plansListPage`, `duesPage`, `settingsPages` (appended block), `nav.test.ts` :409–418, `v14Part3Wording.test.ts` | real (H1, H3, X1–X5) |

## Findings

### SHOULD
- **F1 — R3's "3 s" is unpinned.** `Toast.test.ts:47–55` advances by `SUCCESS_DISMISS_MS − 1` / `+1`, so `SUCCESS_DISMISS_MS = 5000` (T1) passes. One line, `flows`: `expect(SUCCESS_DISMISS_MS).toBe(3000);`.
- **F2 — the toast's `fixed` is unpinned.** `absolute` (T2) passes `Toast.test.ts:17–24`; an `absolute` strip scrolls with the page and lands over whatever is at 80 px of the document, which is R3's bug restated. Add `expect(box).toMatch(/class="[^"]*\bfixed\b/)` to that case, `flows`.
- **F3 — R4 "open when a filter is active" holds in the component only.** The owner ledger page with `showing={false}` (S7) passes `ledgerPages.test.ts` and `ledgerFilters.test.ts`: the panel then never starts open and «مسح التصفية» is never offered (`LedgerFilters.tsx:101`). `ledgerPages.test.ts` renders the page with `{ from, to }` at :65 for print only. Add to that case (or the "tolerate" block), `flows`: `expect(html).toMatch(/<button [^>]*aria-expanded="true"/); expect(html).toContain(t.common.clearFilters);` — and the staff page likewise with a filter.
- **F4 — D31j («حفظ وإضافة أخرى» shows «تم حفظ الحركة» in place) is unpinned.** Deleting `setSaved(true)` in `TransactionForm.tsx:125` (S9) passes all 68 tests under `transactions/components`; `renderToStaticMarkup` never reaches the action callback. Static anchor in `entryWording.test.ts`, `flows`: `expect(readFileSync("src/features/transactions/components/TransactionForm.tsx","utf8")).toMatch(/intent"\) === "saveAndAdd"\) \{[\s\S]*?setSaved\(true\);[\s\S]*?\} else \{\s*router\.push\(withSaved\(doneHref\)\);/);` — it pins both arms of R4 at once.
- **F5 — R5 "its error shows under the field" is unpinned.** `error={undefined}` on the reset input (V2) passes `staffRowActions.test.ts:50–59`, which renders only the pristine form. Add, `flows`: render `ResetStaffPasswordForm` with a stub action and `useActionState` mocked — simpler: a second render where `action` returns `{ ok: false, fieldErrors: { newPassword: "err.passwordShort" } }` cannot be reached statically either, so pin the source: `expect(source).toContain("error={fieldErrors?.newPassword}")` beside the existing case (same file, one `readFileSync`).
- **F6 — R8's preference for the current name is unpinned.** Swapping the two names in `CUSTOMER_PAYMENT_NAMES` (P1) passes `planPrefill.test.ts`: every fixture carries one name or the other, never both. An establishment that still has the legacy row *and* the renamed one (the migration's own `NOT EXISTS` case: an owner who made «سداد من عميل» by hand) would then prefill the old one. One line in the `prefillCategory` case, `flows`: `expect(prefillCategory([cat("in_old", "دفعة من عميل", "IN"), cat("in_new", "سداد من عميل", "IN")], "IN")).toBe("in_new");`.
- **F7 — R11 "choosing a month clears from/to" is pinned on the pure helper only.** `onChange={(e) => setPeriod((s) => ({ ...s, month: e.target.value }))}` (F2) passes `reportFilters.test.ts` — the exact confusion R11 fixes (two periods posted, the parser silently preferring the month). Static anchor beside the D32 B1 pin, `flows`: `expect(source).toContain("setPeriod((s) => afterMonthChoice(s, e.target.value))"); expect(source.match(/afterDateTyped\(s, "(from|to)", e\.target\.value\)/g)).toHaveLength(2);`.
- **F8 — the R7 data migration is applied by three PGlite suites but asserted by none.** Inverting the guard (`EXISTS`, M1) and dropping the type guard (M2) both pass `migration.v12c.test.ts` + `openExclusions.test.ts` (26/26) — they seed no category named «دفعة من عميل» before the directory loop, and `migration.v12a.test.ts` compares shape only. The probe I ran on the scratch copy (apply every directory `< V14P3`, seed `estA` «دفعة من عميل» IN; `estB` both names; `estC` an OUT «دفعة من عميل» and a hand-renamed «دفعة من العميل»; apply the v14_p3 SQL; `SELECT id, nameAr`) passes on the real SQL and fails on **both** mutations (`a_old` not renamed / `c_out` renamed). So a PGlite test *can* notice; it just does not exist. Add it as `src/lib/migration.v14p3.test.ts` (lead-owned `src/lib/`, or `flows`/`words` by the lead's call) — 30 lines on the `migration.v12c.test.ts` model; expected map `{ a_old: "سداد من عميل", b_old: "دفعة من عميل", b_new: "سداد من عميل", c_out: "دفعة من عميل", c_ren: "دفعة من العميل" }`.

### NOTE
- **N1** `Toast.tsx:54` deps `[tone, onDismiss]` (T4) survives: the pure timer is pinned, the ref trick is not — a parent that re-renders every second (none does today) would never let a success toast dismiss. A static `expect(source).toContain("[tone, hasDismiss]")` if the lead wants it; otherwise acceptable.
- **N2** `?saved=0` / `?saved=` shows the toast on the employee page under S6 (and would on any page with the same edit); the pages' tests check `"1"` and absent only. Harmless — nothing emits another value.
- **N3** `ReportFilters.tsx:54` `monthOptions()` without the selected month (F4) survives: a hand-typed `?month=2010-01` reports correctly but the select shows the first of the 24 (the comment in `reportMonths.ts:28–32` is the rule). One render with `month: "2010-01"` + `toContain('value="2010-01"')`, `flows`.
- **N4** The summary page passing `partyId=""` (F5) survives: a refused `?partyId=` is no longer echoed in the select (`ReportFilters.tsx:36` documents the echo). `reportFilters.test.ts:103` renders the page with a month only; add `partyId: "p_gone"` and `toContain('value="p_gone"')` — or leave it, the parser refuses it anyway.
- **N5** `scoping.test.ts:1716` `toMatchObject({ employeeId: "emp_1" })` plus :1719 on the `select` is a real two-sided pin (W2 proved the return half), unlike part 1's N1 class.
- **N6** `nav.test.ts:417` anchors the hint's `<span class="text-[11px] font-normal text-gray-500">` literally — a restyle of the second line fails a test named for R16; acceptable (same class as part-1 N6).
- **N7** `scheduleBuilder.test.ts:44` `/firstDueDate: first,/` is strict enough to catch the raw-state regression (G1) that R-p3-3-S1 introduced the clamp for — good; worth keeping even though it is a source pin.
- **N8** The static pins I relied on this round (`SavedNotice.test.ts:43`, `planPrefill.test.ts:77`, `scheduleBuilder.test.ts:42`, `Toast.test.ts:39`, `pendingJoinNotice.test.ts:65`, `reportFilters.test.ts:63`) all bit when mutated (S3, G1, F1) or were listed by the builders; none is vacuous.

## Gates (real tree, end of the pass)
- `npx vitest run` → **Test Files 117 passed (117); Tests 1603 passed (1603)** (41.8 s; includes the three PGlite migration suites and `migration.v12a.test.ts`'s own offline `prisma migrate diff`).
- `npx tsc --noEmit` → **0 errors** (exit 0).
- `git status --short` → only `?? progress/v14/qa-tests-p3.md` (this file). Scratch copy: `diff -rq src <copy>/src` and `diff -rq prisma <copy>/prisma` both empty after the last run.
- HEAD during the pass: `938ea5c` → `fe73102` (lead's `PROGRESS.md` record only; `git diff --stat 938ea5c..fe73102` = 1 file). The mutations and gates ran against the same `src`.

## Verdict
**Go, with eight SHOULDs and no BLOCKER.** Every R1–R16 rule has at least one real pin, and the builders' 43 recorded mutations are corroborated by 37 fresh kills here. The eight survivors are all test-side gaps (no code is wrong): two R3 constants (`fixed`, 3 s), the page-level `showing` (R4), the «حفظ وإضافة أخرى» in-place toast (D31j), the R5 error-under-field wiring, the R8 name preference, the R11 month→range wiring in the component, and the R7 data migration's `WHERE` — the last is the one with a real production surface (a wrong guard would ship silently to Render), and the probe shows a 30-line PGlite case closes it.

## Gotchas I found
- The `prisma/` symlink of part 1's method is wrong for a migration mutation: `sed` through the symlink would have rewritten the repo's SQL. Copy `prisma/` into the scratch tree (104 KB) — every migration suite reads `process.cwd()/prisma/migrations`, so the copy is what they apply.
- The two "apply every directory" suites (`migration.v12c`, `openExclusions`) accept any *valid* SQL in a new migration; only a seeded-then-asserted case notices a wrong `WHERE`. A syntax error would fail them, a logic error never does.
- A type-only import (`import type … from "@/lib/validation"`) is caught by the D32 B1 string pin although it costs no bytes — the pin is stricter than the bundle rule; fine, since the rule is "mentions".

## Questions / requests sent to lead
- F1–F8 are all added cases or one-line static anchors; no code change is needed for any of them. F8 is the only one that needs a new file (`src/lib/`, lead-owned). Nothing in the tree was changed by me; `git status --short` shows only this recording.
