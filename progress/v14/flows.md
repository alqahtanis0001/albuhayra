# progress/v14/flows.md — `flows` (v1.4 part 3: components and pages)

Only `flows` writes here. Brief: `progress/v14/brief-p3-flows.md`; spec D29–D31.

## Files I own
D30 › «`flows` owns»: `src/components/Toast.tsx`, new `src/components/{SavedNotice,DateField}.tsx`, `src/features/transactions/components/{TransactionForm,LedgerFilters,PaymentBanner,LinkFields}.tsx`, the four entry pages, the two ledger pages, `src/features/plans/{dues,types}.ts`, plan detail page + `plans/components/{OpenPlanDetail,PaymentRecorded,PlanForm,OpenPlanForm,ScheduleBuilder,PlanActions}.tsx` + new `planPrefill.ts`, `owner/staff/[id]/(detail)/page.tsx`, `staff/page.tsx`, `settings/components/{StaffRowActions,ResetStaffPasswordForm,LockCell}.tsx`, `reports/components/*` + the two report pages, `dues/components/WeekRibbon.tsx`, `owner/page.tsx` + new `dashboard/components/PendingJoinNotice.tsx`, `establishments/queries.ts` (`listPendingStaffNames`) + its `scoping.test.ts` driver, `chrome/{navSlots.ts,AddSheet.tsx}` + the `hint` pin in `nav.test.ts`, every other `type="date"` call site, and their tests.

## Tasks completed
| Task | Files touched | Build/tests pass | Notes for others |
|---|---|---|---|
| F1 R3 Toast | `src/components/Toast.tsx`, new `Toast.test.ts` | tsc 0, 6 tests | `startAutoDismiss(tone, onDismiss)` exported (the timer rule, fake-timer tested); `onDismiss` read through a ref so a parent re-render never restarts the 3 s. Layout `fixed inset-x-4 top-20 … md:top-auto md:bottom-6`, `pointer-events-none`, ✕ `pointer-events-auto`. |
| F2 R12 LockCell | `settings/components/LockCell.tsx`, `settingsPages.test.ts` (c19 block only) | 9 tests | `pressTarget()` always "confirm"; new pure `dialogText(locked, label)`; lock dialog = `settings.lock: label` + `lockConfirm` with `{month}`→label, accent tone. |
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

## In progress
- Task: F4
- Where I am: reading the entry pages
- Next action: SavedNotice.tsx

## Gotchas I found
-

## Questions / requests sent to lead
-
