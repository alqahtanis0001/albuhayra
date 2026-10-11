# Changelog — زخم

Started at v1.3. Earlier releases (v1.0 – v1.2c) are recorded in `PROGRESS.md` (*Done*, *Decisions*, *Session log*).

## v1.4 — simpler owner flows (unreleased)
Spec: `docs/V14-SPEC.md` (A–C, D1–D27). Shipped in two parts (part 1: A/B/C and the UX rulings; part 2: forms and first run). One expand-only migration (`20261010000000_v14_open_plans`: `PlanKind.OPEN_ENDED`, `Plan.totalHalalas` nullable, `Plan.expectedEndDate`, `Transaction.planId`), already applied to the live database; no new route group, no new environment variable. Nothing an owner could do before was removed.

### Added
- **One «+» for everything:** a primary «+ إضافة» item in the owner side nav and the second tab on phones opens a sheet with حركة جديدة · تسجيل دفعة · اتفاقية جديدة · جهة جديدة · نشاط جديد · موظف جديد. Staff get حركة جديدة (and تسجيل حضوري when linked to an employee record); an unlinked staff login's «+» goes straight to the entry form.
- **Categories from the entry form (owner):** «+ إضافة تصنيف» adds a category inline and selects it; «تعديل التصنيفات» shows the direction's categories as chips to hide, the hidden ones as grey chips to re-show, and a link to the full settings page (reorder, rename).
- **Open agreements (اتفاقية مفتوحة):** an agreement without a schedule — optional ceiling and expected end date — paid by «تسجيل دفعة» on its page; a progress bar when a ceiling is set; closes itself when payments reach the ceiling; «إنهاء» / «إعادة فتح». Its payments are ordinary ledger entries; it never appears in المستحقات, the aging report or reminders; its outstanding amount shows as an informational line on الجهات, the contact card and the statement, outside the balance.
- **Smaller:** a pending-join-requests badge on حسابات الدخول (summed on المزيد); «شهر مقفل» and the locked-month notice link to إقفال الأشهر, which links back to السجل; «إلغاء الإقفال» asks first; المستحقات links both the party and the agreement and offers the agreement pick-list for a payment not yet due; the attendance empty state links to «إضافة موظف»; the pending page's button reads as the next step («تسجيل الدخول للتحقق من حالة الطلب»).

### Added in part 2 (forms and first run)
- **«+ جهة جديدة» inside the party select** of the entry form and both agreement forms (owner only): name and type (عميل / مورد / أخرى) in an inline box; the new party is selected at once.
- **A lighter entry form:** الجهة, ضمن نشاط and ملاحظة sit behind «تفاصيل أكثر»; the device remembers your choice, and the section opens by itself when an entry already has one of them or when you arrive with a preset party or activity.
- **«ابدأ هنا» on the owner home:** four steps (حركة → جهة → اتفاقية → موظف) ticked from real data, each linking to where it is done; the card leaves when all four are done or when you tap «إخفاء».
- Confirm dialogs open centred; the categories page's back link arrow points the right way for Arabic.

### Changed
- **Navigation:** السجل and التقارير are top-level items; the «المالية» heading, «حركة جديدة», the «إضافة» group and «التصنيفات» are gone from the menus (`/owner/settings/categories` stays reachable from the form); the staff group reads «الموظفون والحضور»; `/owner/settings` lands on رمز الانضمام.
- **«الإضافات» → «الأنشطة»:** every project-meaning «إضافة» reads «نشاط»; the list lives as the «الأنشطة» tab of السجل (`/owner/transactions?tab=activities`; `/owner/projects` redirects there). «الأنشطة الجارية» stays on the home page.
- **Wording:** a scheduled instalment is «قسط / الأقساط / القسط القادم / قسط متأخر» (status words and countdowns take masculine agreement); «دفعة» is kept for money recorded.
- The status filter on الاتفاقيات reads «مؤرشفة / منتهية»; staff ledger rows that are open-agreement payments show «سداد اتفاقية» and no edit pencil (owner-only to edit or delete); the empty «مستحقات هذا الأسبوع» card is hidden until the establishment has an agreement.

## v1.3 — visual pass (unreleased)
Spec: `docs/V13-SPEC.md`. No schema change, no migration, no new route, no new environment variable; no rule or stored number changed — queries only gained read-only fields (the dashboard's daily series, opening balances and month-to-date comparison, instalment states on plan rows, aging counts, a 12-month attendance read, the clock's server timestamp and grace).

### Added
- **Page backgrounds:** brand art behind the sign-in screens (the card overlaps the green band; wordmark and links moved inside the card) and behind the owner/staff/admin content column (veiled for text contrast); hidden in print.
- **Home (owner):** stat cards count up from 0; 30-day sparklines (line on الرصيد and الصافي, bars on الوارد and الصادر); momentum on «الصافي» against the same days of last month («—» when there is nothing to compare, capped at ±999%); expense donut (top 5 + «أخرى») whose slices and legend rows open the ledger filtered to that category and month (the table stays as the screen-reader and print version); a «التدفق النقدي» waterfall tab on the six-month card. Staff home: count-up on its two cards.
- **المستحقات:** a week ribbon — «متأخرة» plus one tile per day to the end of the week, each with its count and لنا/علينا totals; tapping a tile scrolls to and highlights that day's rows.
- **الاتفاقيات:** a segmented instalment bar on list cards and the plan header (paid, partial, overdue, due, upcoming); after «تسجيل دفعة» the form returns to the plan with `?paid=`, the paid row is highlighted, its segment fills and its badge fades in, and the parameter is then cleared from the address.
- **الإضافات:** budget meter coloured green → gold (≥ 80%) → red (> 100%) with amounts under the bar; a cost-by-category ring on the project page (hand-drawn SVG, not recharts).
- **Empty states:** six original line illustrations (ledger, parties, dues, projects, employees, agreements).
- **الحضور:** month grid tinted by status (letters kept; prints as letters on white); a 12-month attendance strip with the rate in each cell on the employee page.
- **حضوري:** a live clock card with a ring counting down the grace period, turning amber under 5 minutes and red once a check-in would be late; a check with the server-recorded time after check-in.
- **Payslip:** a hero card — net salary large, gross → deductions → net steps.
- **كشف الحساب:** the balance in words («لنا عنده» / «علينا له» / «متسوٍّ») with a balance-over-time sparkline.
- **أعمار المستحقات:** four bucket tiles (count + total) per side and a stacked bar per party.

### Changed
- The budget line «{spent} من {budget}» is replaced by the new meter's amounts.
- Every animation is ≤ 800 ms, ease-out, and off under reduced motion; only the live clock ticks continuously.
- `.svg` requests skip the proxy like `.png` (no sign-in redirect and no CSP header on the file; the page backgrounds are same-origin CSS images).
- The owner dashboard's loading skeleton reserves the sparkline height.
- Print: the ribbon, instalment bar, sparklines, rings and statement header are hidden; tinted cells print as plain text on white.
