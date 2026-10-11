# v1.5 — brief for `nav` (spec §B, D11, D14, D15)

Ready for go: yes (after the reviewer's pre-code pass)

Read `progress/v15/brief-common.md` first.

## You own
`src/components/chrome/**` except `ThemeToggle*` (incl. `TopBar.tsx`, `nav.ts`, `navSlots.ts`, `nav.test.ts`, `AddSheet.tsx`, `MoreSheet.tsx`, `RoleNav.tsx`, `AppShell.tsx`); `src/app/(owner)/layout.tsx` (D15 flag); the staff/admin layouts only if B1 needs a prop; `src/app/(owner)/owner/transactions/(list)/**`; `src/app/(owner)/owner/reports/**` (redirects); `src/app/(owner)/owner/staff/(home)/page.tsx` (pick mode) and new `src/features/employees/components/SalaryPick*.tsx` if useful; `src/features/reports/components/**` only to move the report bodies into the tab (no behaviour change); values of `t.addHints`, `t.reportsTabs`, `t.salaryPick`; an append-only scoping-gate case for the D15 read. Hex → token edits `theme` lists for chrome files are yours to apply.

## Before the token layer lands (D13)
Everything in this brief is structure and logic; use existing token classes only. When the layer lands, apply `theme`'s list for chrome files and mount the toggle.

## N1 — logo goes home (B1)
The wordmark `<img>` in `TopBar.tsx` becomes the content of a `<Link>` to the role's home (`/owner`, `/staff`, `/admin`) with `aria-label={t.nav.home}` (the img's alt then empty or kept — one accessible name, not two). `TopBar` needs a `homeHref` prop from `AppShell` (derive it from the role/`accountHref` caller — your choice, pinned by a test). 44 px target, the white focus ring the header already sets. Test: each role's TopBar links its home with the label.

## N2 — التقارير inside السجل (B2, D14)
- `/owner/transactions` tabs become «الحركات | الأنشطة | التقارير» (`t.ledgerTabs.entries`, `t.ledgerTabs.activities`, `t.reportsTabs.tab`), `?tab=reports`. Inside, sub-tabs «حسب التصنيف | المتأخرات حسب المدة» (`t.reportsTabs.byCategory`, `t.reportsTabs.aging`, strip label `t.reportsTabs.label`) with `&report=aging`. Use the existing `Tabs` component (instant tabs, v1.3).
- Move the bodies of `reports/(summary)/page.tsx` and `reports/aging/page.tsx` into components rendered by the tab (e.g. `ReportsTab.tsx` beside `ActivitiesTab.tsx`), **unchanged** in content, filters, print header/footer, «طباعة» and «تصدير Excel» (the export route and its query are untouched). Keep `ledgerTab.ts` the single parser of `tab` (add `"reports"`) and add a parser for `report`. Metadata title per tab.
- `/owner/reports` and `/owner/reports/aging` become server redirects that keep the query (D14). Their `loading.tsx` files go.
- Nav: remove the التقارير item from `OWNER_NAV_GROUPS` (side nav and المزيد); السجل gains `also: ["/owner/projects", "/owner/reports"]`. Update `nav.test.ts` (it pins the old structure) and every other test that pins `/owner/reports` (grep `src/**/*.test.ts`); the README nav block is the lead's.
- Tests (mutation each): nav has no `/owner/reports` entry; `ledgerTab("reports")`; `report` parser; both redirects keep the query; the reports tab renders the category report by default and aging with `report=aging`; print and Excel buttons still present on the reports tab.

## N3 — the «+» sheet, seven rows with captions (B3, D15)
- `addRows("OWNER", …)` returns, in this order: حركة جديدة (`t.addSheet.newEntry`, hint `t.addHints.newEntry`) → `/owner/transactions/new`; دفعة على اتفاقية (`t.addSheet.recordPayment`, `t.addHints.recordPayment`) → `/owner/plans?pick=payment`; **صرف راتب** (`t.employees.paySalary`, `t.addHints.paySalary`) → `/owner/staff?pick=salary` — **only when `hasActiveEmployees`**; اتفاقية جديدة (`t.plans.add`, `t.addHints.newPlan`) → `/owner/plans/new`; جهة جديدة (`t.addSheet.newParty`, `t.addHints.newParty`) → `/owner/parties/new`; موظف جديد (`t.addSheet.newEmployee`, `t.addHints.newEmployee`) → `/owner/staff/new`; نشاط جديد (`t.addSheet.newProject`, `t.addHints.newProject`) → `/owner/projects/new`. Staff: حركة جديدة + hint; تسجيل حضوري (`t.addSheet.myCheckIn`, `t.addHints.myCheckIn`) only when linked.
- The sheet's layout: every row shows the caption as a second muted line and is **≥ 56 px tall**; seven rows in a 2-column grid with long captions will be cramped at 390 px — a single-column list (icon, label, caption) is the sensible reading of "a second muted line"; keep the first row visually primary (V14 B1). Record what you chose.
- D15: the owner layout reads `hasActiveEmployees` (one scoped `count` > 0 of ACTIVE employees — find the employee status field in `prisma/schema.prisma`) and passes it into the nav model. Because `OWNER_NAV_GROUPS` is a constant today, make it a function `ownerNavGroups({ hasActiveEmployees })` (keep a constant export for tests if useful) — the shell receives groups from the layout already. Scoping-gate case for the new read.
- Tests (mutation each): owner row order and hrefs; «صرف راتب» present iff `hasActiveEmployees`; every row has a hint; staff rows; the row class carries the 56 px minimum; `activeHref` still never returns the «+».

## N4 — salary pick mode (B3 row 3, D15)
`/owner/staff?pick=salary`: the employees list in pick mode — a banner «اختر الموظف لصرف راتبه» (`t.salaryPick.banner`) with a cancel link back to `/owner/staff`; only ACTIVE employees with a salary; each row links to `/owner/transactions/new?instalmentId=<this month's instalment id>` when this month is payable (the same URL `EmployeeActions` uses — find how the employee page computes `thisMonth.payable` and reuse that read, do not re-derive), else shows «مدفوع» (`t.salaryPick.paid`) and links to the employee page. Without `?pick` the page is unchanged. `ensureSalaryInstalments` must have run first (the layout already does). Tests: banner only with `pick=salary`; payable → payment URL; paid → employee page; inactive/no-salary employees absent.

## N5 — mount the theme toggle (D11)
When `theme` tells you `ThemeToggle` exists, add it to `TopBar` (all roles) between the establishment name and the user link: one import, one element. Check the bar still fits at 360 px (the name truncates first).

## Done means
N1–N5 green and reviewed, screens checked at 390/1280 in light and dark (static harness screenshots into `progress/v15/qa/nav-*.png`), bundles measured, recording complete.

## Amendments after the pre-code review (lead, binding)
- **Reads (D21, D26, replaces "find a file" in N3/N4):** write them in the existing stub `src/features/employees/salaryPick.ts` (keep `import "server-only";` first): `hasSalaryEmployees(establishmentId)` — ACTIVE employees with an OPEN SALARY plan → boolean (this, not "any active employee", gates the «صرف راتب» row); `listSalaryPick(establishmentId, today)` — one batched read, the employee page's payable rule (OPEN plan, the `periodYm = ymOf(today)` instalment with remaining > 0; see `getEmployee().thisMonth` / `monthSummaries` in `src/features/employees/queries.ts`); employees with no instalment this month are left out; empty → `t.salaryPick.empty`. Pick mode hides the نشطون/سابقون tabs and «موظف جديد», forces ACTIVE; paid-this-month → «مدفوع» → employee page. Gate cases only under the "v1.5 nav" marker at the end of `scoping.test.ts`; use exactly those function names (`staffViews.test.ts` already lists them).
- **Reports tab (D24):** you may edit `src/features/reports/components/ReportFilters.tsx` (hidden `tab=reports` / `report=aging` inputs, test it) and `ReportTabs.tsx` (repoint its hrefs and reuse it as the sub-tab strip — labels `t.reportFilter.byCategoryTab` / `t.aging.tab`). On the reports tab the ledger h1 is `no-print`, exactly one `PrintHeader` prints, and the add button is «حركة جديدة». Redirects use `URLSearchParams.set` (test `/owner/reports?tab=activities&from=…` → the reports tab with `from` kept).
- **Labels:** sections are `t.addHints` and `t.reportsTabs` (only `tab` and `label` remain); «نشاط جديد»'s caption is `t.addSheet.newProjectHint`.
- **Primary row caption (D33):** white-alpha on accent, measured ≥ 4.5:1 in light and dark; record the ratio.
- **Logo (D35):** use `homePathFor(role)` from `src/lib/permissions.ts`; the TopBar test mocks `@/features/auth/components/actions`. At 360 px the wordmark + three 44 px controls (+ the toggle) leave little room for the establishment name — check it truncates, never wraps or pushes the bar wider.
- **Toggle mount (D32):** `ThemeToggle` will be an async server component; mounting stays one import + one element in `TopBar` (a server component today — keep it one).
- Existing pins to update: `reportFilters.test.ts:28` (renders the old reports page), `nav.test.ts` :42, :169, :208, :343, :410–417.
