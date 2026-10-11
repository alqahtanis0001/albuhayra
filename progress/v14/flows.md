# progress/v14/flows.md — `flows` (v1.4 part 3: components and pages)

Only `flows` writes here. Brief: `progress/v14/brief-p3-flows.md`; spec D29–D31.

## Files I own
D30 › «`flows` owns»: `src/components/Toast.tsx`, new `src/components/{SavedNotice,DateField}.tsx`, `src/features/transactions/components/{TransactionForm,LedgerFilters,PaymentBanner,LinkFields}.tsx`, the four entry pages, the two ledger pages, `src/features/plans/{dues,types}.ts`, plan detail page + `plans/components/{OpenPlanDetail,PaymentRecorded,PlanForm,OpenPlanForm,ScheduleBuilder,PlanActions}.tsx` + new `planPrefill.ts`, `owner/staff/[id]/(detail)/page.tsx`, `staff/page.tsx`, `settings/components/{StaffRowActions,ResetStaffPasswordForm,LockCell}.tsx`, `reports/components/*` + the two report pages, `dues/components/WeekRibbon.tsx`, `owner/page.tsx` + new `dashboard/components/PendingJoinNotice.tsx`, `establishments/queries.ts` (`listPendingStaffNames`) + its `scoping.test.ts` driver, `chrome/{navSlots.ts,AddSheet.tsx}` + the `hint` pin in `nav.test.ts`, every other `type="date"` call site, and their tests.

## Tasks completed
| Task | Files touched | Build/tests pass | Notes for others |
|---|---|---|---|
| F1 R3 Toast | `src/components/Toast.tsx`, new `Toast.test.ts` | tsc 0, 6 tests | `startAutoDismiss(tone, onDismiss)` exported (the timer rule, fake-timer tested); `onDismiss` read through a ref so a parent re-render never restarts the 3 s. Layout `fixed inset-x-4 top-20 … md:top-auto md:bottom-6`, `pointer-events-none`, ✕ `pointer-events-auto`. |
| F2 R12 LockCell | `settings/components/LockCell.tsx`, `settingsPages.test.ts` (c19 block only) | 9 tests | `pressTarget()` always "confirm"; new pure `dialogText(locked, label)`; lock dialog = `settings.lock: label` + `lockConfirm` with `{month}`→label, accent tone. |
| F4 R4 save toast | new `src/components/{savedParam.ts,SavedNotice.tsx,SavedNotice.test.ts}`; `TransactionForm` (`withSaved`, `t.transaction.saved`); `PaymentRecorded` (+visible toast) + `paymentRecorded.test.ts`; the four entry pages (`?saved=1`, R16 subtitle) + their tests (2 new, 2 extended); six landing pages: owner/staff ledgers (+`ledgerPages.test.ts`), `staff/page.tsx`, `owner/staff/[id]/(detail)`, `owner/projects/[id]/(detail)` (+ tests) | tsc 0 | `withSaved`/`withoutSaved` live in pure `savedParam.ts` because the **server** pages call `withSaved` (a "use client" module's exports are client references on the server); `SavedNotice.tsx` re-exports `withSaved` for the client form (D32 S2). The plan page mounts no `SavedNotice` (D32 S3a). `TransactionForm` 246 lines. |
| F5 R4 ledger filters | `LedgerFilters.tsx` (client, `panelClass(open)`), new `ledgerFilters.test.ts` | 6 tests | «تصفية» button `md:hidden`, `aria-expanded`/`aria-controls`, 44 px, accent border + semibold when `showing`; form `hidden md:flex` closed / `flex` open; submit `t.common.apply` («عرض»). |
| F6 R11 reports + ledger print | new `reports/components/{reportMonths.ts,ReportFilters.tsx,reportFilters.test.ts}`; `reportRange.ts` re-exports `monthRange`/`monthOptions`; deleted `ReportRangePicker.tsx` + `ReportPartyFilter.tsx`; `reports/(summary)/page.tsx` (one form in `order-last md:order-none`); `AttendancePickers.tsx` repointed to `reportMonths` (reviewer note); owner ledger page (`PrintButton` in the header on the entries tab, `PrintHeader` + `PrintFooter`); `ledgerPages.test.ts` | 11 + 8 tests | D32 B1 pin: neither `ReportFilters.tsx` nor `reportMonths.ts` mentions `@/lib/validation` or `./reportRange`. Pure `afterMonthChoice` / `afterDateTyped` hold the month↔range rule. Aging page untouched (label already via `t`). |
| F7 R5 staff switch | `StaffRowActions.tsx` (`Switch`, `editLabel()`), `ResetStaffPasswordForm.tsx` (no `required`), new `staffRowActions.test.ts` | 3 tests | `ResetStaffPasswordForm` still imports `MIN_PASSWORD_LENGTH` from the validation barrel (pre-existing, not touched — flagged below). |
| F8 R6 salary payment | `plans/types.ts` (`employeeId`), `plans/dues.ts` (same findFirst), `PaymentBanner.tsx` (`isSalaryPayment` derived from `periodYm`, `upcomingHalalas`), owner new page (h1 «صرف راتب», `doneHref` → `/owner/staff/{employeeId}?saved=1`), new `paymentBanner.test.ts`, owner-new page test (+2), scoping driver (employeeId on the one findFirst, staff prefill keys unchanged) | 4 + 2 tests, gate green | Salary mode is derived from `periodYm` (set only on SALARY months) — pinned; a SALARY plan without an employee falls back to the plan page. Staff banner untouched (D31i). |
| F9 R7 helper + R10 order | `TransactionForm.tsx` (`Select` `hint` — D32 S2; 247 lines), `LinkFields.tsx` (`trailingOptions()`), new `entryWording.test.ts`, `partyQuick.test.ts` sentinel pin (D32 S1) | 3 tests | Helper only for `direction === "IN" && !payment`; entry form: sentinel then «أخرى»; plan forms unchanged. |
| F10 R8 prefill | new `plans/components/planPrefill.ts` (`prefillTitle`, `prefillCategory`, `applyPlanPrefill`, `NO_PREFILLS`) + `planPrefill.test.ts`; `PlanForm.tsx`, `OpenPlanForm.tsx` (`prefills` state, `applyAll` on `applyPartyChoice`'s result and on the direction change — D32 S7); `partyQuick.test.ts` S6 static pin updated to the new `chooseParty` line | 6 tests | The two category names («سداد من عميل», «دفعة من عميل») are data matches held as a constant in `planPrefill.ts` — no i18n key exists for category names and `DEFAULT_CATEGORIES` is server-only (see requests). |
| F11 R14 first date | `ScheduleBuilder.tsx` (`effectiveFirstDate`, `DateField` «تاريخ أول قسط» `form="__none"`, min = start, generator fed `first`, hint under «توليد»; 233 lines), new `scheduleBuilder.test.ts` | 3 tests | A first date before a changed start falls back to the start (derived, not an effect). |
| F12 R15 cosmetics | `PlanActions.tsx` (cancel `secondary`), `WeekRibbon.tsx` (`RIBBON_LIST` grid → `sm:flex` strip, tiles `w-full sm:w-36`, `RibbonJump` untouched), new `planActionsRibbon.test.ts` | 3 tests | |
| F13 R9 pending-join notice | `establishments/queries.ts` `listPendingStaffNames` (NAME_SELECT only, `createdAt desc`), new `dashboard/components/PendingJoinNotice.tsx` + test, `owner/page.tsx` (same `Promise.all`, above `QuickActions` — D32 S5, FirstRunCard order pin still green), scoping driver | 3 tests + gate | `role="status"` on the wrapper. |
| F14 R16 sheet hint | `navSlots.ts` (`AddRow.hint`, row 5), `AddSheet.tsx` (second line, readable), `nav.test.ts` (one appended `it`) | 1 test | Subtitles «قبض أو صرف» on both new-entry pages landed with F4. |
| F15 gates | — | tsc 0 · vitest **117 files / 1603 tests** · `npm run build` exit 0 (60 routes, only `/_global-error` prerendered) · bundles `progress/v14/bundles-p3-flows.json`: max **+8.5 KB gz** (`/staff/transactions/new|edit`; owner entry forms +8.2; plan forms +6.6; plan detail +6.7; reports summary **197.4 → 203.9**, barrel-free; owner ledger +6.1; every route +3.3–3.9 from the shared chunk — i18n values + Toast), none over +40 | |
| F3 R13 DateField | new `src/components/DateField.tsx` + test; `AttendancePickers`, `PlanForm`, `ScheduleRows`, `OpenPlanForm`, `OpenPaymentForm`, `ProjectForm`, `TransactionForm`, `LedgerFilters`, `EmployeeFormSections`, `EndEmploymentDialog` | 5 tests, tsc 0 | Every `type="date"` is now `DateField` (same props minus `type`); `ReportRangePicker` left for F6, which deletes it. Caption `<p aria-live="polite">` only when `dateCaption()` is non-null, linked by `aria-describedby`. |

## Mutations (rule → broken how → which case failed)
| Task | Mutation | Failing case |
|---|---|---|
| F1 | timer for errors too (`if (!onDismiss)`) | «an error toast never auto-dismisses» |
| F1 | drop `pointer-events-none` from the strip | «the strip ignores the pointer; only the ✕ takes taps» |
| F2 | `pressTarget` back to `locked ? "confirm" : "toggle"` | «a press on either month state reaches the confirm» |
| F2 | lock dialog message = `unlockConfirm` | «the lock dialog names the month …» |
| F3 | drop `lang="ar-SA"` | «renders a native date input with lang=ar-SA …» |
| F3 | never render the caption | the two caption cases (controlled, uncontrolled) |
| F4 | owner new page: `withSaved(` → `(` (no saved=1) | the three `doneHref` cases in `owner/transactions/new/page.test.ts` (transform error — the arm is unreachable without the helper) |
| F5 | `panelClass` never `hidden` | «closed by default: the form is hidden md:flex» |
| F5 | `useState(false)` ignoring `showing` | «open when a filter is active» + the button case |
| F6 | two submit buttons | «one GET form with exactly one submit» + the page order case |
| F6 | `afterMonthChoice` keeps the dates | «choosing a month sets from/to to that month» |
| F6 | drop `order-last md:order-none` | «renders the filters after the report on phones» |
| F6 | owner ledger without `PrintHeader` | the two owner print cases in `ledgerPages.test.ts` |
| F7 | `editLabel` always «مسموح» | «the label follows canEdit» |
| F7 | `required` back on the reset input | «the password input is not required» |
| F8 | `isSalaryPayment` always false | the salary wording case (+ the derived-mode case) |
| F8 | owner page: salary `doneHref` branch dead | «titles the page «صرف راتب» and returns to /owner/staff/…» |
| F8 | `dues.ts` without `employeeId` in the select / returning null | the scoping driver «the payment-form reads…» |
| F1 (reviewer R1) | delete the `useEffect` in `Toast.tsx` | «the component wires the effect to startAutoDismiss» (static anchor) |
| F9 | trailing order swapped («أخرى» first) | `entryWording` R10 case + the S1 pin in `partyQuick.test.ts` |
| F9 | helper for every direction | «is absent for an OUT entry and in payment mode» |
| F10 | `prefillTitle` always returns the prefill | «keeps the owner's text» + «a typed title … survive a party change» |
| F10 | `prefillCategory` ignores the named IN categories | the matrix + two chain cases |
| F10 | `PlanForm` direction change back to plain `setV` | the static pin «both forms run the prefill …» |
| F11 | `firstDueDate: startDate` | «the generator is fed the chosen first date» (static) |
| F11 | `effectiveFirstDate` always `startDate` | the matrix + the generator case |
| F12 | cancel `variant="danger"` | «the cancel button is secondary» |
| F12 | `RIBBON_LIST` back to the strip | «the list is a two-column grid on phones» |
| F13 | notice renders for `[]` | «renders nothing for an empty list» |
| F13 | the read selects `email` too | scoping driver «listPendingStaffNames» |
| F14 | drop the row's `hint` | the appended R16 `it` in `nav.test.ts` |
| F8 (reviewer R2-S1) | — covered by the new salary-link pins (not separately mutated: the two pins are the same render as F8 mutation A, which fails them) | |
| qa F1 | `SUCCESS_DISMISS_MS = 2000` | «the delay is exactly 3 000 ms and the strip is fixed» |
| qa F2 | drop `fixed` from the strip | same case |
| qa F3 | owner ledger passes `showing={false}` | «with a filter the panel is open and «مسح التصفية» is offered» |
| qa F4 | delete `setSaved(true)` in the saveAndAdd arm | «the saveAndAdd arm calls setSaved(true) …» (static) |
| qa F5 | drop `error={fieldErrors?.newPassword}` | «the server's error still lands under the field» (static) |
| qa F6 | reverse `CUSTOMER_PAYMENT_NAMES`; and `find` by either name (first in list wins) | the matrix case (both names, old one first in the list, «سداد» wins) |
| qa F7 | month `onChange` sets `month` only | «the month select's onChange goes through afterMonthChoice» (static) |
| F4 | `SavedNotice` returns null always | 5 cases across `SavedNotice.test`, `ledgerPages.test`, `staff/page.test`, `owner/staff/[id]` test |

## In progress
- Task: none — F1–F15 done, report handed back
- Where I am: —
- Next action: —

## Gotchas I found
- `ledgerRows.test.ts` «badge + link» (2 cases) is red in the shared tree from `words`' in-progress `LockBadge` R15 work — not mine; everything else green.
- A "use client" module's exports become client references when a server component imports them, so a pure helper a server page calls cannot live in `SavedNotice.tsx`; hence `savedParam.ts` + a re-export.

## Questions / requests sent to lead
- `planPrefill.ts` matches the IN category by its seeded names («سداد من عميل», then «دفعة من عميل») held as a local constant: there is no i18n key for category names and `DEFAULT_CATEGORIES` lives in server-only `admin/actions.ts`. If the lead wants one source of truth, a pure `src/lib/categoryNames.ts` (lead-owned) exporting the two names, imported by both, is the cheap fix — a Decision, not mine to make.
- `settingsPages.test.ts` c19 block: two existing lines had to change in place (`pressTarget(false)` → `"confirm"`, and the source pin `message={t.settings.unlockConfirm}` → `message={dialog.message}`) because R12 contradicts them; `partyQuick.test.ts` likewise (S1 sentinel pin, and the S6 static `chooseParty` line that R8/S7 rewrites). Everything else in shared test files is appended.
- Lead's Playwright pass: R3 toast vs «حفظ» at 390 px, the ledger's newest row after a save at 390×844 (the filter panel is now collapsed; `LedgerTotals` and the «تصفية» button are unchanged in height), R13 captions, R15 ribbon at 390 px.
- (note, no action needed from me) `ResetStaffPasswordForm.tsx` imports `MIN_PASSWORD_LENGTH` from the `@/lib/validation` barrel — pre-existing client-leaf import on the settings route; left as is, bundle check will show whether it matters.
- React's static markup writes an `<input>`'s `name`/`value` **last** (Fizz `pushInput`), after `aria-*` and `class` — assert on the element, not on attribute order (gotcha for the lead's list).
