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
| F4 | `SavedNotice` returns null always | 5 cases across `SavedNotice.test`, `ledgerPages.test`, `staff/page.test`, `owner/staff/[id]` test |

## In progress
- Task: F9
- Where I am: starting
- Next action: LinkFields trailing order + category hint

## Gotchas I found
- `ledgerRows.test.ts` «badge + link» (2 cases) is red in the shared tree from `words`' in-progress `LockBadge` R15 work — not mine; everything else green.
- A "use client" module's exports become client references when a server component imports them, so a pure helper a server page calls cannot live in `SavedNotice.tsx`; hence `savedParam.ts` + a re-export.

## Questions / requests sent to lead
- (note, no action needed from me) `ResetStaffPasswordForm.tsx` imports `MIN_PASSWORD_LENGTH` from the `@/lib/validation` barrel — pre-existing client-leaf import on the settings route; left as is, bundle check will show whether it matters.
- React's static markup writes an `<input>`'s `name`/`value` **last** (Fizz `pushInput`), after `aria-*` and `class` — assert on the element, not on attribute order (gotcha for the lead's list).
