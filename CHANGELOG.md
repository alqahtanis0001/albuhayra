# Changelog — زخم

Started at v1.3. Earlier releases (v1.0 – v1.2c) are recorded in `PROGRESS.md` (*Done*, *Decisions*, *Session log*).

## v1.5 follow-up (2026-10-12)
The product owner's four rulings after the v1.5 release (`docs/V15-SPEC.md › v1.5 follow-up`, D45–D51). No schema change.
- **The theme button is a simple light ↔ dark switch.** It follows the phone or computer until you tap it once; then it remembers your choice. Its icon and its label say what a tap will do (a moon: «التبديل إلى المظهر الداكن»). The «حسب الجهاز» step is gone.
- **On phones narrower than 480 px the theme button moves out of the top bar** into the first row of «المزيد» — «المظهر» with فاتح / داكن (staff and admin find it at the top of «حسابي»). The establishment name gets the whole top bar again.
- **One colour per category:** the wheel's middle ring now uses the expense donut's colours, so a category looks the same everywhere on the home page.
- **«عرض» on each of the wheel's four explanation rows** opens its page directly: this month's السجل, التقارير, الجهات and المستحقات. «كم باقي على محمد؟» takes 2 taps again.

## v1.5 — home overview wheel, nav tidy-up, dark theme (2026-10-11)
Spec: `docs/V15-SPEC.md` (A–C from the product owner, Decisions D1–D41). No schema change, no migration, no new environment variable. Light mode looks exactly as before (checked pixel for pixel); nothing an owner or staff member could do before was removed.

### Added
- **«نظرة شاملة على المنشأة» on the owner home**, under the money cards: a wheel drawn ring by ring — this month's وارد / صادر, the صادر by category (top five + «أخرى»), commitments (لنا من العملاء · علينا للموردين · رواتب الشهر), and around it the next 30 days with one dot per instalment or salary day (overdue as hollow red dots just before «اليوم»). Tap a part to see its name and amount in the centre, tap again to open it (the ledger filtered to that month or category, الجهات, الموظفون, the agreement or the employee). Four numbered rows underneath explain each ring with live amounts; they are also what screen readers and the printout use. Keyboard: one Tab stop, arrows move between parts. Still under reduced motion and in print.
- **«يحتاج انتباهك»**: one card for overdue instalments, this week's instalments (لنا / علينا), pending join requests and «الرواتب بعد N يومًا» (within 10 days), each row a link, with a count in the heading. It replaces the red overdue strip, the «مستحقات هذا الأسبوع» card and the join-request notice.
- **«التفاصيل والرسوم»**: the six-month chart, the expense donut, balance by method and الأنشطة الجارية fold into one section — closed on phones, open on larger screens, remembered per device, always open in print. «آخر الحركات» shows 5 entries + «عرض الكل».
- **Dark mode:** a sun/moon button in the top bar (every role) cycles فاتح → داكن → حسب الجهاز (default). The choice is kept on the device and in a cookie, so pages open in the right theme without a flash. Every colour, chart, badge, dialog and the background art follow it; buttons in dark are light green with dark labels for contrast; printing is always light.
- **«صرف راتب»** in the «+» sheet opens the employees list in pick mode («اختر الموظف لصرف راتبه») and goes straight to this month's salary payment.

### Changed
- **التقارير moved inside السجل** as a third tab, with sub-tabs «حسب التصنيف» and «المتأخرات حسب المدة»; old links redirect there and keep their dates. Print and Excel are unchanged. It is no longer a separate menu item.
- **The «+» sheet** has seven rows, each with a one-line caption under its name.
- **The زخم logo** in the top bar links to the role's home.
- On phones narrower than 375 px the establishment name in the top bar is visually hidden (still read by screen readers) to make room for the theme button.

## v1.4 — simpler owner flows (unreleased)
Spec: `docs/V14-SPEC.md` (A–C, D1–D31). Shipped in three parts (part 1: A/B/C and the UX rulings; part 2: forms and first run; part 3: wording and first day, after the owner usability test). One expand-only migration (`20261010000000_v14_open_plans`: `PlanKind.OPEN_ENDED`, `Plan.totalHalalas` nullable, `Plan.expectedEndDate`, `Transaction.planId`), already applied to the live database; no new route group, no new environment variable. Nothing an owner could do before was removed.

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

### Added in part 3 (wording and first day)
Spec: `docs/V14-SPEC.md` D29–D31, from the owner usability test (`docs/OWNER-TEST-v14.md`). Wording, helper lines, subtitles, empty states, toasts, defaults and ordering only; one data migration renames the seeded category «دفعة من عميل» → «سداد من عميل» where the owner has not made one by hand. No function was added or removed.
- **The empty «المستحقات» page explains itself** («هنا تظهر الأقساط التي حان موعدها هذا الأسبوع…») and hands cash over: «قبضت مبلغًا بدون اتفاقية؟ سجّله كحركة جديدة» and «كم باقي على عميل؟ افتح الجهات». The home tile and the «+» row read «دفعة على اتفاقية».
- **«تم حفظ الحركة» after every save** — new, edit, instalment, open-agreement and salary payments, and «حفظ وإضافة أخرى». The ledger's filters sit behind one «تصفية» button on phones so the saved row is the first thing seen; the filter and report buttons read «عرض».
- **Toasts never cover a button:** on phones they sit under the top bar, success toasts leave after 3 seconds, and the strip no longer blocks taps.
- **Helper lines:** «وارد = دخل لي · صادر = طلع مني» under the direction toggle; «البيع المباشر = مبيعات · دفعة على اتفاقية = سداد من عميل» under the category list for incoming money; «الوارد − الصادر هذا الشهر» on the «الصافي» card; «يمكنك تعديل أي صف بعد التوليد» in the schedule builder, whose «عدد الأقساط» and new «تاريخ أول قسط» sit above «توليد».
- **Agreement forms prefill** «عنوان الاتفاقية» as «اتفاقية مع {الجهة}» and the category from the direction; both stay editable. «+ جهة جديدة (تُحفظ للمرات القادمة)» now comes before «أخرى — اسم لمرة واحدة (لا يُحفظ)».
- **Staff access in words:** a switch «التعديل: مسموح / غير مسموح» with «الموظف يضيف الحركات دائمًا؛ هذا الخيار يسمح له بتعديلها.»; the reset field «تعيين كلمة مرور جديدة (اختياري)» without an asterisk; after «قبول» a line saying how to link the login to the employee file; the empty card reads «لا توجد حسابات دخول بعد». The owner home shows «طلب انضمام جديد من {name}» while a request waits.
- **Salary payment** screens say «صرف راتب», «راتب شهر {month}» and «الرواتب القادمة» instead of «قسط» and «المتبقي على الاتفاقية», and return to the employee page.
- **Reports:** the report renders above its filters on phones; one form, one «عرض»; the tab reads «المتأخرات حسب المدة»; السجل has a «طباعة» button.
- **Dates:** every date field shows the chosen day under it, e.g. «الأحد 11-10-2026». «إقفال» asks for confirmation like «إلغاء الإقفال». «شهر مقفل» says «لا يمكن التعديل — افتح الشهر من إقفال الأشهر».
- **Renames:** «حسابات الدخول» → «دخول الموظفين», «رمز الانضمام» → «رمز انضمام الموظفين» (owner side), «مُوثّق» → «البريد مؤكَّد», «أرشفة الاتفاقية» → «إنهاء وأرشفة», «محسوب» → «مسجّل»; subtitles under الاتفاقيات, المستحقات, حركة جديدة and إقفال الأشهر; «نشاط جديد» in the «+» sheet carries «مشروع أو مناسبة لها تكاليفها»; «إلغاء الاتفاقية» is no longer a red primary button; the dues day strip no longer clips on phones.

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
