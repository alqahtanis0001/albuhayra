# V12-CONFORMANCE.md — `docs/V12-SPEC.md` §1–§4 against the tree at `f6914de`

Paths are relative to `src/` unless they start with a repo-root file. Tests are `file › test title`.

| # | Requirement (spec) | Status | Where in the code | Test that pins it | Note |
|---|---|---|---|---|---|
| 1.1 | Owner side nav, headed groups: الرئيسية · المالية · إضافة · العملاء والالتزامات · الموظفون · الإعدادات (incl. التذكيرات, حسابي) | implemented | `components/chrome/nav.ts`, `components/chrome/RoleNav.tsx` | `nav.test.ts › has the six groups in order, the three new ones collapsible`; `› routes every item to its documented path, once` | |
| 1.2 | New sections collapsed until first used (§0, applied in §1 nav) | implemented | `components/chrome/usedGroups.ts`, `RoleNav.tsx` | `nav.test.ts › used nav groups (localStorage)` | |
| 1.3 | «إضافة» = named-items section only; the transaction form is «حركة جديدة» | implemented | `nav.ts`, `i18n/ar.v12a.ts` (`navItem.newEntry`) | `nav.test.ts › gives staff the spec §1 items, the new-entry one relabelled` | owner label not pinned by a test |
| 1.4 | Badge on المستحقات = overdue instalments, both directions | implemented | `features/plans/dues.ts` `getOverdueCount`, `app/(owner)/layout.tsx` | `moneyPath.test.ts › createPlan numbers the rows by due date and the badge counts the overdue one`; `nav.test.ts › badgeText` | no count test with an overdue علينا (OUT) row |
| 1.5 | Mobile bar الرئيسية \| حركة جديدة \| السجل \| المستحقات \| المزيد (tile sheet) | implemented | `nav.ts` `OWNER_TAB_HREFS`, `components/chrome/MoreSheet.tsx` | `nav.test.ts › puts exactly four item tabs before المزيد, each a real item` | |
| 1.6 | Staff nav الرئيسية \| حركة جديدة \| السجل \| حضوري \| حسابي; حضوري only for a linked login | implemented | `nav.ts` `staffNav`, `app/(staff)/layout.tsx` | `nav.test.ts › adds حضوري before حسابي only for a linked login (spec §1 order)` | |
| 1.7 | Owner home order: quick actions → four money cards → «مستحقات هذا الأسبوع» with red متأخرات strip → «الإضافات الجارية» → balance by method, chart, top expenses, last entries | implemented | `app/(owner)/owner/page.tsx` | none | |
| 1.8 | Quick actions حركة جديدة · تسجيل دفعة · تسجيل حضور (opens today's daily sheet) | implemented | `features/dashboard/components/QuickActions.tsx` | none | تسجيل دفعة → `/owner/dues` |
| 1.9 | «الإضافات الجارية» top 3 by spending, spent vs budget | implemented | `features/projects/queries.ts` `topActiveProjects`, `dashboard/components/ActiveProjects.tsx` | `scoping.test.ts › topActiveProjects and getPartyStatement` | scope only; ordering by spend not asserted |
| 1.10 | No employee widget on home | implemented | `app/(owner)/owner/page.tsx` | none | |
| 2.1a | Party: name, type عميل/مورد/موظف/أخرى, phone, email, notes, active | implemented | `features/parties/actions.ts`, `lib/validation/parties.ts` | `validation.v12a.test.ts › PartyInputSchema`; `parties.test.ts › every party mutation is OWNER-only` | |
| 2.1b | Type tabs | implemented | `app/(owner)/owner/parties/(list)/page.tsx`, `parties/components/PartyList.tsx` | `scoping.test.ts › listParties, populated and filtered` | scope/filter only; UI untested |
| 2.1c | Balances لنا/علينا count agreements only | implemented | `features/parties/queries.ts` `listParties` | `scoping.test.ts › balance numbers: OPEN IN counts due − paid, ARCHIVED counts 0, a plan alone is history` | |
| 2.1d | Deactivate when it has history; delete only when unreferenced | implemented | `features/parties/actions.ts`, `parties/rules.ts` | `parties.test.ts › deleteParty refuses a party with history` (4 cases) | |
| 2.2a | إضافة: name, description, optional budget, start/end, status جارٍ/مكتمل/ملغى | implemented | `features/projects/actions.ts`, `lib/validation/parties.ts` | `validation.v12a.test.ts › ProjectInputSchema`; `projects.test.ts › fields` | |
| 2.2b | List with spent / remaining / status | implemented | `features/projects/queries.ts` `listProjects`, `projects/components/ProjectList.tsx` | `scoping.test.ts › listProjects, populated and filtered — totals and the reference probe run` | amounts not asserted by value |
| 2.2c | Detail: own ledger, totals by category, budget bar | implemented | `app/(owner)/owner/projects/[id]/(detail)/page.tsx`, `getProject` | `scoping.test.ts › listProjectOptions and getProject with categories to name` | scope only; budget bar untested |
| 2.2d | «تسجيل تكلفة» opens the form as صادر with the item pre-attached | implemented | `app/(owner)/owner/transactions/new/page.tsx` (`?projectId=`), `TransactionForm.tsx` | none | |
| 2.2e | Printable summary | implemented | `projects/components/ProjectSummary.tsx`, `app/globals.css` print block | none | |
| 2.3a | Transaction gains optional partyId, projectId, instalmentId | implemented | `prisma/schema.prisma`, `features/transactions/links.ts` | `links.test.ts`; `validation.v12a.test.ts › TransactionInputSchema — v1.2a links`; `migration.v12a.test.ts` | |
| 2.3b | Party dropdown («أخرى» keeps free text); optional «ضمن إضافة» | implemented | `transactions/components/LinkFields.tsx`, `links.ts` | `links.test.ts › with a party the free text is not stored; without one it is`; `› إضافة (project)` | |
| 2.3c | Ledger shows party and إضافة chip | implemented | `transactions/components/LedgerList.tsx`, `transactions/queries.ts` | `export.test.ts › v1.2a: the counterparty column shows the party's name, else the free text` | on-screen chip untested |
| 2.4a | Plan: party, direction worded by type, title, total, category, start, reminderDays default 3, status قادمة/جارية/مكتملة/مؤرشفة/ملغاة, notes | implemented | `prisma/schema.prisma` `Plan`, `features/plans/actions.ts`, `plans/components/PlanForm.tsx`, `lib/instalments.ts` `planStatus` | `plans.test.ts › createPlan`; `instalments.test.ts › planStatus` | |
| 2.4b | Schedule: N at أسبوعي/شهري/كل N يوم or custom rows; live preview | implemented | `lib/schedule.ts`, `plans/components/ScheduleBuilder.tsx`, `ScheduleRows.tsx` | `schedule.test.ts` (amounts, dates) | preview UI untested |
| 2.4c | Rows must sum to total | implemented | `lib/validation/plans.ts` `PlanInputSchema` (server), `ScheduleBuilder.tsx` (client) | none | `PlanInputSchema` sum and start-date refinements have no test |
| 2.4d | Instalment dueDate/amountDue/amountPaid; status قادمة→مستحقة→متأخرة / مدفوعة جزئياً / مدفوعة; countdown text | implemented | `prisma/schema.prisma` `Instalment`, `lib/instalments.ts`, `lib/plural.ts` | `instalments.test.ts › instalmentStatus — precedence`; `› the day boundary is Riyadh midnight` | `plural()` (countdown wording) has no test |
| 2.5a | «تسجيل دفعة» pre-fills and links | implemented | `plans/dues.ts` `getInstalmentForPayment`, `transactions/payments.ts`, `PaymentBanner.tsx` | `payments.test.ts › writes the link and the plan's party, inside bump → create → reallocate` | |
| 2.5b | Partial → جزئياً; overpayment rolls forward | implemented | `lib/allocation.ts`, `plans/allocate.ts` | `allocation.test.ts`; `moneyPath.test.ts › an overpayment rolls forward` | |
| 2.5c | Excess beyond total shows an amber warning | implemented | `plans/allocate.ts` (residue), plan detail strip | `allocation.test.ts › whatever is left after every instalment is overpaid residue` | strip UI untested |
| 2.5d | Edit re-allocates, delete un-pays | implemented | `transactions/payments.ts`, `plans/allocate.ts` | `moneyPath.test.ts › editing a payment re-allocates from scratch`; `› deleting a payment un-pays` | |
| 2.5e | Month locks apply | implemented | `transactions/payments.ts`, `locks/assertUnlocked.ts` | `payments.test.ts › create, edit and delete of a payment in a closed month are refused before any write` | |
| 2.5f | Cancel only if nothing paid, else archive (writes off remainder) | implemented | `features/plans/actions.ts` | `plans.test.ts › cancel vs archive`; `moneyPath.test.ts › archiving writes the remainder off` | |
| 2.5g | Edits touch unpaid instalments only | implemented | `features/plans/scheduleEdit.ts` | `plans.test.ts › a fixed row changed, or omitted, is err.schedulePaidRowChanged` | |
| 2.5h | Owners manage plans and parties; staff with canEdit may only record payments | implemented | `plans/actions.ts`, `parties/actions.ts` (`requireOwner`), `transactions/payments.ts` | `plans.test.ts › guards`; `parties.test.ts › every party mutation is OWNER-only`; `payments.test.ts › the canEdit matrix` | read as "staff manage no plans or parties"; canEdit staff still edit entries, payments included (existing canEdit rule, §0) |
| 2.6a | الاتفاقيات list with filters; plan detail | implemented | `app/(owner)/owner/plans/(list)`, `plans/[id]/(detail)`, `plans/queries.ts` | `scoping.test.ts` plans drivers; `privacy.test.ts › lists it as «راتب شهري — name»` | filter UI untested |
| 2.6b | المستحقات: today + 6 days and overdue, both directions, totals, quick pay | implemented | `app/(owner)/owner/dues/page.tsx`, `plans/dues.ts` `getDues` | `scoping.test.ts › getDues, getOverdueCount, getStaffDues`; `moneyPath.test.ts` | the +6 / +7 day edge is not pinned |
| 2.6c | Party page = printable كشف حساب with running balance | implemented | `features/parties/statement.ts`, `parties/components/PartyStatementView.tsx` | `moneyPath.test.ts › archiving … the statement closes at the party balance`; `statement.test.ts › every row, running balance and the closing balance equal getPartyStatement` | |
| 2.6d | Staff home «المستحقات» card, canEdit only (overdue + 7 days, max 20, party / unsigned amount / date / pay button) | implemented | `plans/dues.ts` `getStaffDues`, `dues/components/StaffDuesCard.tsx`, `app/(staff)/staff/page.tsx` | `scoping.test.ts › … the staff prefill has exactly six fields` (asserts the dues row's four keys); `privacy.test.ts › the owner's dues list the salary month; the staff card does not` | max 20 and the canEdit gate on the page are not pinned |
| 2.6e | Staff payment form shows only party, remaining, rollover note | implemented | `plans/dues.ts` `getStaffPaymentPrefill`, `app/(staff)/staff/transactions/new/page.tsx`, `PaymentBanner.tsx` | `scoping.test.ts › the payment-form reads; the staff prefill has exactly six fields (W2)` | |
| 2.6f | Staff without canEdit get the form plus a not-allowed message | implemented | `app/(staff)/staff/transactions/new/page.tsx`, `transactions/payments.ts` | `payments.test.ts › STAFF without canEdit ✗ err.forbidden — before any instalment is looked up` | action pinned; page behaviour untested |
| 2.7a | 20M SAR per entry | implemented | `lib/money.ts` `MAX_AMOUNT_HALALAS` | `money.test.ts › rejects amounts above the 20M SAR ceiling` | |
| 2.7b | Badge updates on navigation (confirmed limit) | implemented | `app/(owner)/layout.tsx` | none | |
| 2.7c | Statement ordering quirk after archive (confirmed limit) | implemented | `features/parties/statement.ts` | none | |
| 3.1a | Every employee is a Party of type موظف | implemented | `features/employees/actions.ts`, `employees/form.ts` | `scoping.test.ts › createEmployee: party, employee, …`; `employees.test.ts › adopting needs an active موظف party here that no employee holds` | |
| 3.1b | Fields: job title, hire date, optional end, basic, allowances سكن/نقل/أخرى, pay day, schedule (days default Sun–Thu, start/end, grace), notes | implemented | `prisma/schema.prisma` `Employee`, `lib/validation/employees.ts` | `validation.v12b.test.ts › EmployeeInputSchema` | |
| 3.1c | Optional link to one STAFF login of the same establishment | implemented | `features/employees/actions.ts` | `employees.test.ts › a login that is not an ACTIVE STAFF here is err.loginInvalid`; `› … err.loginAlreadyLinked` | |
| 3.1d | Link grants exactly: self check-in/out, own month, own payslips, own salary instalments | implemented | `features/attendance/own.ts`, `self.ts`, `mine.ts`, `app/(staff)/staff/me/**` | `selfService.test.ts › month, payslips and salary months are the session's own — never the other employee's` | |
| 3.1e | Not stored: ID/iqama, IBAN, DOB, photos, documents | implemented | `prisma/schema.prisma`, `lib/validation/employees.ts` | `validation.v12b.test.ts › stores no identity, iqama, IBAN, birth date or document field`; `migration.v12b.test.ts` (no sensitive columns) | |
| 3.2a | Saving a profile creates «راتب شهري» via the v1.2a mechanism: one instalment per month on the pay day, basic + allowances, category رواتب | implemented | `employees/salaryPlan.ts`, `payroll/core.ts`, `payroll/generate.ts`, `lib/payroll.ts` | `salaryPath.test.ts › starts the plan today, generates this month and next, reactivates «رواتب»`; `payroll.test.ts` | |
| 3.2b | Appears in المستحقات علينا; paid with «تسجيل دفعة» | implemented | `plans/dues.ts`, `transactions/payments.ts` | `privacy.test.ts › the owner's dues list the salary month` | |
| 3.2c | «صرف راتب» opens the current month's instalment | implemented | `app/(owner)/owner/staff/[id]/(detail)/page.tsx`, `employees/queries.ts` | `salaryPath.test.ts › the detail read reports this month and offers «صرف راتب» only while something is left` | |
| 3.2d | Salary changes affect future months only | implemented | `features/payroll/resnapshot.ts` | `salaryPath.test.ts › salary changes affect unpaid future months only (D5)` | |
| 3.2e | End date in the past stops generation and archives the plan | implemented | `features/employees/lifecycle.ts`, `payroll/core.ts` | `salaryPath.test.ts › a past end date deletes unfixed months after it, archives the plan and ends the employee` | |
| 3.2f | Salary payments are transactions: month locks apply | implemented | `transactions/payments.ts` | `payments.test.ts › create, edit and delete of a payment in a closed month are refused` | generic payment case; no salary-plan-specific lock test |
| 3.3a | Monthly grid (employees × days) and a daily sheet saved in one action | implemented | `features/attendance/queries.ts`, `month.ts`, `actions.ts`, `app/(owner)/owner/staff/attendance/page.tsx` | `attendance.test.ts › the day sheet and its save`; `› the monthly grid and the monthly sheet` | |
| 3.3b | Statuses حاضر/متأخر/غائب/إجازة/عن بُعد/عطلة; عطلة pre-filled from the schedule; non-work days never absent | implemented | `lib/attendance.ts`, `prisma/schema.prisma` | `attendance.test.ts` (lib) `› expectedStatus is derived with a check-in, عطلة on a non-work day, else none`; `› work days (R5 bitmask)` | |
| 3.3c | Times optional; check-in + grace → «متأخر» computed, owner-overridable; both times → hours | implemented | `lib/attendance.ts` | `attendance.test.ts` (lib) `› derivedStatus`, `› settleStatus`, `› minutesBetween` | |
| 3.3d | Edited by the owner only; staff canEdit does not apply | implemented | `features/attendance/actions.ts` | `attendance.test.ts › spec §3.3: STAFF with canEdit cannot save attendance`; `guards.test.ts` | |
| 3.3e | Linked staff self check-in/out: times only, own row, server clock; status derived; cannot set غائب/إجازة/عن بُعد | implemented | `features/attendance/self.ts` | `selfService.test.ts › times only, own row, server clock; late derived past start + grace; a posted employeeId is ignored` | |
| 3.3f | Month locks do not apply to attendance | implemented | `features/attendance/*` (no lock check) | none | |
| 3.4a | Monthly sheet per employee: totals per status, hours, manual deduction with reason reducing that month's instalment | implemented | `features/attendance/month.ts`, `payroll/deductions.ts`, `app/(owner)/owner/staff/[id]/month/[ym]/page.tsx` | `deductions.test.ts › reduce the month's instalment; the total follows by aggregate; the payslip lists them`; `attendance.test.ts › counts statuses and hours per employee` | |
| 3.4b | Payslip per employee per month: basic, allowances, deductions with reasons, net, payment date/method | implemented | `features/employees/payslip.ts`, `employees/components/PayslipView.tsx` | `salaryPath.test.ts › prints the month's snapshot, what paid it and when` | |
| 3.4c | Payslip establishment header and footer «هذه القسيمة ليست مستنداً رسمياً لحساب الأجور» | implemented | `employees/components/PayslipView.tsx`, `i18n/ar.v12b.ts` `payslip.notLegal` | none | |
| 3.4d | Printable monthly attendance grid | implemented | `attendance/components/MonthGrid.tsx`, `app/globals.css` print block | none | |
| 3.5a | Salary-linked entries hidden from every staff view: ledger, search, staff المستحقات card, staff lists | implemented | `lib/payroll.ts` `salaryLinkedWhere` / `salaryLinkedPlanWhere`, `transactions/queries.ts`, `plans/dues.ts`, `payroll/privacy.ts` | `privacy.test.ts › spec §3.5: the staff ledger`; `› spec §3.5: staff dues, prefill and writes`; `staffViews.test.ts` | |
| 3.5b | … and any staff-reachable export | implemented | `app/api/export/route.ts`, `api/export/statement/route.ts` (`requireOwner`) | `export.test.ts › requires an owner before doing anything`; `statement.test.ts › requires an owner` | staff have no export route |
| 3.5c | Exception: the employee's own payslips and own salary instalments on «حضوري» | implemented | `features/attendance/mine.ts` | `selfService.test.ts › month, payslips and salary months are the session's own` | |
| 3.5d | Aggregate totals on the staff dashboard may include them | implemented | `features/dashboard/queries.ts` `getStaffDashboard` | none | |
| 3.5e | A test asserts a staff session never receives another employee's salary-linked row | implemented | — | `privacy.test.ts` (ledger, search, totals, edit read, dues, prefill, writes); `selfService.test.ts › the isolation test` | |
| 3.5f | ADMIN sees nothing | implemented | `features/admin/**` (unchanged) | `admin.test.ts` static cases (v1.2a/b/c models and features) | |
| 3.6 | Out of scope: payroll calculation, GOSI, WPS, end-of-service, leave balances, location check-in, notifications | implemented (not built) | — | none | |
| 4.1a | Daily owner digest to the owner's login email via Brevo: overdue, within each plan's reminderDays, due today or tomorrow; both directions | implemented | `features/reminders/select.ts`, `digest.ts`, `run.ts`, `lib/mail/templates.ts` | `digestRun.test.ts › buildDigest (C6)`; `› mails each due owner once, their own rows only`; `reminders.test.ts › digestGroupOf` | |
| 4.1b | Settings › التذكيرات with hour and on/off | implemented | `app/(owner)/owner/settings/reminders/page.tsx`, `reminders/settings.ts`, `reminders/actions.ts` | `reminders.test.ts › updateDigestSettings (C1)`; `› getDigestSettings` | |
| 4.1c | Triggered by `GET /api/reminders/run`, protected by `CRON_SECRET` | implemented | `app/api/reminders/run/route.ts`, `proxy.ts` `OPEN_PATHS` | `route.test.ts › the secret check (E5)`; `proxy.test.ts` (open path, no session read) | |
| 4.1d | `CRON_SECRET` in `.env.example` and `render.yaml` as `sync: false` | implemented | `.env.example`, `render.yaml` | none | |
| 4.1e | Secret absent → 503; nothing else breaks | implemented | `app/api/reminders/run/route.ts` | `route.test.ts › without CRON_SECRET the endpoint is off` | |
| 4.1f | At most one digest per owner per day, however often the endpoint is called | implemented | `prisma/schema.prisma` `ReminderDigest @@unique([establishmentId, date])`, `reminders/run.ts` | `digestRun.test.ts › two concurrent runs claim each day once and send one email per owner`; `› sends nothing more the same day` | |
| 4.1g | README note for a free external daily ping | deviated | `README.md` › *Daily reminder email (v1.2c)* | none | README requires an **hourly** free ping: a once-daily ping at hour H reaches only owners whose hour ≤ H |
| 4.2a | Client reminders: explicit per-party opt-in | implemented | `features/reminders/client.ts` `setPartyRemindersOptIn`, `reminders/components/RemindersOptIn.tsx` | `client.test.ts › setPartyRemindersOptIn (C9)` | |
| 4.2b | Email via Brevo or copy-ready WhatsApp text | implemented | `reminders/client.ts`, `reminders/clientRules.ts`, `reminders/components/RemindButton.tsx` | `client.test.ts › sendClientReminder (C11, E8, E9, E13)`; `› prepareWhatsAppReminder (C12)` | |
| 4.2c | Every send is an explicit owner action and audited; never automatic | implemented | `reminders/client.ts` | `client.test.ts › owner only — never staff, never automatic`; `› sends one email … and audits it` | email audit written after the send, outside a transaction (known issue) |
| 4.3a | Aging ٠–٣٠/٣١–٦٠/٦١–٩٠/أكثر, both directions, لنا first | implemented | `features/reports/aging.ts`, `app/(owner)/owner/reports/aging/page.tsx` | `aging.test.ts › buckets by days past due at 30/31, 60/61, 90/91; one row per party per direction; لنا first` | labels in Western digits (§0); the «0–30» bucket holds days 1–30 (a due day is not yet overdue) |
| 4.3b | Party statement to Excel in the existing style | implemented | `app/api/export/statement/route.ts`, `api/export/statementSheet.ts`, `statementFilename.ts` | `statement.test.ts` (10 cases) | |
| 4.3c | Party statement to PDF in the existing style | deviated | `parties/components/PartyStatementView.tsx` («حفظ PDF» → `window.print()` on the existing print sheet) | none | no server-generated PDF: browser Save-as-PDF of the print style; no PDF library in the frozen stack |
| 4.3d | «بحسب الجهة» filter on existing reports | implemented | `features/reports/queries.ts` `getReport`, `reports/components/ReportPartyFilter.tsx`, `app/api/export/route.ts` | `export.test.ts › GET /api/export with a party`; `scoping.test.ts › getReport by party` | |

## Spec bullets with no test

| # | Requirement |
|---|---|
| 1.7 | Owner home order |
| 1.8 | Quick actions (targets) |
| 1.10 | No employee widget on home |
| 2.2d | «تسجيل تكلفة» opens صادر with the item pre-attached |
| 2.2e | Printable إضافة summary |
| 2.4c | Schedule rows must sum to the total (`PlanInputSchema` refinements) |
| 2.7b | Badge updates on navigation |
| 2.7c | Statement ordering quirk after archive |
| 3.3f | Month locks do not apply to attendance |
| 3.4c | Payslip establishment header and exact footer text |
| 3.4d | Printable monthly attendance grid |
| 3.5d | Staff dashboard aggregates may include salary |
| 3.6 | Out-of-scope items not built |
| 4.1d | `CRON_SECRET` in `.env.example` / `render.yaml` |
| 4.1g | README scheduler note |
| 4.3c | Statement to PDF |

## Partially pinned (implemented, test covers part)

| # | Not pinned |
|---|---|
| 1.3 | owner nav label «حركة جديدة» |
| 1.4 | an overdue علينا (OUT) row in the badge count |
| 1.9 | ordering by spend |
| 2.1b | type tabs UI |
| 2.2b | spent / remaining values |
| 2.2c | budget bar |
| 2.3c | on-screen party name / إضافة chip |
| 2.4b | live preview UI |
| 2.4d | `plural()` countdown wording |
| 2.5c | amber warning UI |
| 2.6a | filter UI |
| 2.6b | the today + 6 window edge |
| 2.6d | max 20 rows; canEdit gate on the staff page |
| 2.6f | the not-allowed message on the staff page |
| 3.2f | a salary-plan-specific month-lock case |
