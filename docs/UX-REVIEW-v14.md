# UX-REVIEW-v14.md — زخم owner flows against similar products (paper audit, 2026-10-10)

Written by `ux-scout` (read-only research agent) for the lead. Scope: the owner and staff flows as the code stands before v1.4 (`src/components/chrome/nav.ts` etc.) and as `docs/V14-SPEC.md` edits A/B/C + D1–D15 describe them. No live site was used; every claim about زخم points at a file:line or a spec section. Product cells not confirmed from a listed source are marked `n/v`. Judged against the product's priorities: simple → secure → Arabic UI → correct numbers. Nothing here proposes invoicing, VAT, ZATCA, attachments, bank feeds, inventory, dark mode, English UI, native apps or removing a function.

## (a) Comparison table

Sources per product are in (e). "Add" = how a new record is started. "n/v" = not verifiable from public pages reached.

| Product | Main nav (groups · item count) | Home screen shows first | How "add" works (one button / several) | Category management (where, inline or settings) | Client balance, instalments, open debt display | Staff / attendance (if any) | Mobile pattern (bottom bar? FAB?) |
|---|---|---|---|---|---|---|---|
| Wafeq (وافق) | Side menu by module; Cost Centers and Projects are "distinct sections within the app's main side menu" · count n/v | n/v | Per module: «المشتريات» → «مصروفات نقدية» → «تسجيل» | Expense type is a chart-of-accounts «حساب» set up in settings; project / branch / cost centre have inline «أضف …» buttons on the expense form; new account inline n/v | Customer and vendor opening balances "to keep track of the amount you still owe them, or they still owe you"; instalments n/v | Payroll setup (employees, salaries, expense claims); attendance n/v | n/v |
| Qoyod (قيود) | Module menus («المبيعات», «المشتريات», «التقارير», «الإعدادات») · count n/v | Web n/v; mobile app: P&L, cash flow, "من قام بالسداد؟ من تأخر؟", sales/stock | Per module: customer from «المبيعات → العملاء», supplier from «المشتريات → الموردين» | n/v (chart of accounts) | Balance per customer via «عرض» in the customer list, «التقارير → كشف الحساب», «تقارير أعمار ديون العملاء»; a party with history can be deactivated, not deleted; instalments n/v | n/v | iOS / Android / AppGallery app; layout n/v |
| Daftra (دفترة) | Top-level modules «المبيعات · العملاء · المخزون · الحسابات · الموارد البشرية · التشغيل» · 6 groups, ~40 items in the marketing menu | n/v | Per module; expenses as «سند صرف» with «نوع المصروف» | Custom expense categories: «إنشاء فئات مخصصة … وخصصها بسهولة أثناء التسجيل» (chosen during entry; creation place n/v) | «الأقساط» module exists; balance display n/v | HR module: «الحضور والانصراف», «إدارة المرتبات», «شؤون الموظفين»; separate ESS app (QR check-in, offline) | Separate apps per job (ERP, POS, ESS, AI expenses); bar/FAB n/v |
| Mezan (ميزان) | n/v | n/v | n/v | n/v | AR / AP, project accounting (feature list) | n/v | Web + Android + iPhone/iPad; layout n/v |
| Zoho Books (Arabic edition exists) | Web: Dashboard + sidebar modules + Quick Create + Settings · count n/v | Dashboard: total receivables, payables, top projects; mobile: cash-flow trend, AR, AP, overdue invoices and bills "on a single screen" | One "Quick Create: Create transactions with a single click"; mobile Quick Create section, user-customisable | Chart of accounts / settings (Zoho Expense docs: Settings → Categories); inline n/v | Receivables, payables, overdue invoices/bills; instalments n/v | n/v (separate HR product) | Mobile dashboard + "More" menu (community post); bottom bar n/v |
| Khatabook | n/v | "All-in-One Accounting Dashboard"; details n/v | Credit / debit entry per customer; "Track who paid and who didn't"; details n/v | Cashbook; categories n/v | Per-customer khata with running balance, SMS/WhatsApp reminders, QR collection; instalments n/v | Separate product (Pagarkhata; search summary only) | Mobile-first; "Easy access for both staff and business owners"; bar/FAB n/v |
| OkCredit | n/v | Customer page: "Balance Due", "↓ Received ↑ Given", "Due Date · Call · Remind"; "1 Record 2 Remind 3 Collect" | Two actions per customer: "Credit given or payment received: enter the amount and you're done" | None (ledger per party, no categories) | "money that you will receive from your customers and the money that you need to pay to your suppliers"; "EMI-style instalments tracked on a single customer page"; due date per entry | Separate OkStaff app: full/half day, overtime, absent; salary; staff get SMS only | Mobile-first, "WhatsApp-like simple interface" (user review); bar/FAB n/v |
| Vyapar | Left (hamburger) menu, flat: Business Dashboard, Reports, Sale, Purchase, Expense, Other Income, Cash & bank, My Online Store, Settings, Backup/Restore, Utilities, Rewards, Help & Support · 13 items | "Cash-in-hand, Stock value, Expenses, Bank Account balances" | "+Add Sale" / "+Add Purchase" buttons on the home screen (two buttons) | Inside the Expense section: "create different expense categories. Add and manage business expenses here" | Party dues payable/receivable (All Parties Report), party statement, "Show party's Current Balance" by SMS, self payment reminders | n/v | Hamburger menu + home buttons; bottom bar n/v |
| Wave | Web: flat left menu of 10 (Create new, Dashboard, Sales & Payments, Purchases, Receipts, Accounting, Banking, Payroll, Reports, Wave Advisors); mobile: 4 tabs + More | Dashboard "your business at a glance" | One "Create new" (transaction, estimate, invoice, recurring invoice, bill, customer, vendor, product) — web top of menu, mobile top of page | Inline from the transaction: "To create a new account, click Add a new category"; mobile "tap the + icon at the top right" of the category picker | n/v (invoice-based) | Payroll menu item; attendance n/v | Bottom bar: Dashboard · Sales · Accounting · Payments; "Create new" top; no FAB |
| BNB Dafatery (دفاتري, Arabic) | n/v | "ملخص فوري: اللي عليك، اللي ليك، والصافي في شاشة واحدة" | "سجل الديون (ليك أو عليك) في ثواني" | Daily expenses; categories n/v | Debts «ليك / عليك»; instalments with "تذكير تلقائي قبل ميعاد الدفع" | None | Mobile-first + web version; bar/FAB n/v |
| مصاريف – دفتر الحسابات و الدخل (Arabic, iOS) | n/v | Statistics / spending trends | Add expense or income | "تنظيم السجلات ضمن تصنيفات وتصنيفات فرعية"; users add their own categories (review) | None | None | Mobile; bar/FAB n/v |

### Patterns

- **One add door, named in words.** Wave and Zoho put one "Create new / Quick Create" at the top; Vyapar puts two "+Add" buttons on the home screen; OkCredit puts "Given / Received" on the customer page. زخم today has five add entries spread over menus (`nav.ts:35,46,…`); v1.4's AddSheet (B1) moves to the Wave/Zoho pattern and the home tiles keep the Vyapar pattern (D3).
- **Balance in the owner's words.** "you will receive / need to pay" (OkCredit), "owe them / they owe you" (Wafeq), «ليك / عليك» (BNB), payable/receivable (Vyapar). زخم's «لنا / علينا» (`PartyBits.tsx:38,44`, `DueList.tsx:115-116`) matches.
- **Home = balances + what is due, short.** Zoho mobile: cash flow, AR, AP, overdue "on a single screen"; BNB: عليك/ليك/الصافي "في شاشة واحدة"; Vyapar: cash in hand first. زخم has the same top (tiles, four cards, dues) but then seven more blocks (`owner/page.tsx:41-65`).
- **The party page is the hub.** OkCredit's customer page carries balance, due date, call, remind and the two entry buttons; Qoyod shows the balance from the customer row. زخم's party page shows contact, balance, statement and the reminder opt-in but starts nothing (`PartyActions.tsx:43-66`).
- **Categories: settings for accountants, inline for shopkeepers.** Wafeq/Zoho/Qoyod keep a chart of accounts in settings; Wave adds a category inline from the transaction; Daftra lets you pick a custom category "أثناء التسجيل". v1.4 A puts زخم with Wave.
- **Reminders one tap from the due item** (OkCredit "Remind", Khatabook, Vyapar, BNB). زخم's «تذكير» on dues rows matches, behind an explicit opt-in (`DueList.tsx:61-67`).
- **Staff and attendance live in a separate app** (OkStaff, Pagarkhata, Daftra ESS) and never inside the cash ledger. زخم integrates them (linked login, «حضوري»), which saves an app but costs menu width.
- **Phone chrome: 4–5 bottom tabs plus More** (Wave) or a hamburger (Vyapar). زخم's 5 tabs + «المزيد» sheet (`nav.ts:87-92`, `MoreSheet.tsx`) matches Wave.
- **Instalments are tracked on the customer page or as a module** (OkCredit, BNB, Daftra «الأقساط»). زخم's agreements are a separate section with a schedule that must sum exactly to the total before saving (`PlanForm.tsx` header comment) — stricter than any listed product shows.
- **Month locks and audit are absent from the simple apps** (n/v everywhere); they are an accounting-grade feature in زخم and should stay quiet in the UI, not in the way.

## (b) Patterns we match / don't match

Match:
- «لنا / علينا» wording on parties and dues; amounts never coloured alone.
- Home opens with quick actions, four money cards and this week's dues (`owner/page.tsx:41-53`), like Zoho mobile and BNB.
- Five-tab phone bar with a «المزيد» sheet; v1.4's single «+» sheet mirrors Wave's "Create new".
- Reminders one tap from the overdue row; print/export on every report; a statement per party.
- v1.4 A: a category can be added without leaving the entry, as in Wave.
- Deactivate-not-delete for parties with history, as in Qoyod.

Don't match:
- The party page starts nothing (no «اتفاقية جديدة» / «حركة جديدة» for this party); competitors' customer page is where entries begin.
- Ten home blocks on first run, two of them empty states for concepts the owner has not met yet.
- The daily entry form has 8 controls; cash-book apps take an amount and a note.
- Instalment vocabulary mixes «دفعة» (scheduled) and «دفعة» (paid); competitors separate "due" from "received".
- Employees are three different «الموظفون» screens (group, item, parties tab), where competitors keep one staff area.
- An agreement cannot be started from the v1.4 «+» sheet although it is the product's distinctive object.

## (c) Flow problems

Format: `#` · severity · where · what goes wrong · does v1.4 already fix it · proposed fix (one line).

| # | Sev | Where | What goes wrong | v1.4 fixes? | Proposed fix |
|---|---|---|---|---|---|
| 1 | high | `src/features/parties/components/PartyActions.tsx:43-66`; `src/app/(owner)/owner/plans/new/page.tsx:24-27` | After creating a جهة the page offers only تعديل / إيقاف / حذف, so the next step (an agreement or an entry for this party) is المزيد → الاتفاقيات → اتفاقية جديدة and re-picking the party, while the `?partyId=` preset on plans/new is wired but linked from no page (grep finds no caller). | no | Add «اتفاقية جديدة» → `/owner/plans/new?partyId=…` (and later «حركة جديدة» with a `?partyId=` preset) to the party page. |
| 2 | high | `docs/V14-SPEC.md` B1 lines 31-37 + D3; `QuickActions.tsx:46` | «تسجيل دفعة» opens المستحقات from the home tile but the plans pick-list from the «+» sheet: 3 taps to the form against 5 (+, row, card, instalment row), and only the pick-list path can pay an instalment that is not due within 7 days. | no (ruled A11/D3) | Add one link on `/owner/dues` «دفعة على اتفاقية أخرى» → `/owner/plans?pick=payment`, so المستحقات can be the single destination and the rare case is one tap further. |
| 3 | high | `docs/V14-SPEC.md` B1 rows 1-5; C2 | The "one + for everything" sheet lists «موظف جديد» but no «اتفاقية جديدة»; in v1.4 an agreement costs المزيد → الاتفاقيات → اتفاقية جديدة → kind card (4 taps), one more than today. | no (regression) | Add row «اتفاقية جديدة» → `/owner/plans/new` to `addRows("OWNER")`. |
| 4 | medium | `LedgerRowActions.tsx:32`; `LockedNotice.tsx:5-19`; `settings/locks/page.tsx` | Fixing a mistake inside a locked month is two round trips (السجل → المزيد → الإعدادات › إقفال الأشهر → unlock → back → edit → locks → re-lock, about 9 taps) and neither «شهر مقفل» nor the form notice says where to unlock. | no | Owner-side `LockedNotice`/`LockBadge` link to `/owner/settings/locks`; the locks page gets a «العودة إلى السجل» link. |
| 5 | medium | `docs/V14-SPEC.md` A4, A5, D11; `settingsPaths.ts:16` | Re-showing (إظهار), renaming or reordering a category is reachable only through the entry form → «تعديل التصنيفات» → «المزيد (…)» (3 taps inside a form) or an old bookmark; «الإعدادات» now lands on رمز الانضمام with no overview naming التصنيفات. | creates it | Show hidden categories as grey chips with «إظهار» in edit mode (v1.5+); for now place the «المزيد (…)» link beside the two quick links, not only inside edit mode. |
| 6 | medium | D10; `PartyBits.tsx:31-33`; `PartyList.tsx:38-42` | A client with an open agreement with a ceiling reads «لا رصيد» on الجهات and in the contact card while the plan page shows «المتبقي»; only the statement gets the informational line. | partly (statement line) | Show the same «اتفاقيات مفتوحة: المتبقي X» line on the party row and the contact card (read-only, no schema). |
| 7 | medium | `ar.v12a.ts:236-238, 41-47, 270-272` vs `ar.v13.ts:65` | «دفعة» names both a scheduled instalment («الدفعات», «الدفعة القادمة», «دفعة متأخرة») and a recorded payment («تسجيل دفعة», «السدادات»); v1.3 already calls instalments «الأقساط» («حالة الأقساط»). | no | Use «قسط / الأقساط» for scheduled rows everywhere and keep «دفعة» for money recorded (values only). |
| 8 | medium | `ar.v12a.ts:15` (navGroup.staff), `:29` (navItem.staffList), `:72` (partyTypeTab.EMPLOYEE); `parties/[id]/(detail)/page.tsx:95-102` | «الموظفون» is a group heading, the first item under it, and a tab on الجهات whose rows cannot be edited there (the page sends you to the profile). | no | Group heading «الموظفون والحضور»; parties tab «جهات الموظفين» or hide the EMPLOYEE tab. |
| 9 | medium | `owner/page.tsx:52-53`; `WeekDues.tsx:61-84`; `RecentTransactions.tsx:27` | First login shows an empty «مستحقات هذا الأسبوع» card (a concept the owner has not met) as block 3 while the only onboarding hint «ابدأ بإضافة أول حركة» sits in block 10. | no | Hide `WeekDues` when the establishment has no plans (as `ActiveProjects` already does) and show a first-run checklist card. |
| 10 | medium | `src/app/(owner)/layout.tsx:20`; `staff/logins/page.tsx` | A pending staff join request is invisible until the owner opens المزيد → حسابات الدخول; the badge mechanism exists only for `/owner/dues`. | no | Pass `badges["/owner/staff/logins"] = pending count` from the layout (one query, same `NavBadge`). |
| 11 | medium | `docs/V14-SPEC.md` B1 staff rows; A10; `nav.ts:102` today | An unlinked staff login's «+» opens a sheet with exactly one row, adding a tap to the staff member's only daily action. | creates it | When `addRows` yields one row, the «+» navigates directly; the home «إضافة حركة» button (`staff/page.tsx:29-35`) stays the 1-tap path. |
| 12 | medium | D15 P4; `LedgerRowActions.tsx:40-49` | canEdit staff will see the edit pencil on an open-plan payment row, tap it and be bounced to `/staff/transactions` with no message. | creates it | Hide the pencil when `row.planId` is set (P6 adds the field) and show a plain badge «سداد اتفاقية». |
| 13 | medium | `PlanForm.tsx` (party `Select`, no inline add) | Starting an agreement for a client who is not yet a جهة means leaving the form (المزيد → الجهات → إضافة جهة → back) and re-entering everything. | no | v1.5+: inline quick-add party like A3; now, problem 1's button makes "party first, then agreement" the natural order. |
| 14 | low | `docs/V14-SPEC.md` B3; `ActiveProjects.tsx:20`; `ProjectActions.tsx:93`; `ProjectForm.tsx:63` | «الأنشطة» has no nav or المزيد entry in v1.4 (only a tab inside السجل), and three links still go through the `/owner/projects` redirect. | by design / partly | Point the three links at `/owner/transactions?tab=activities` (A12, 3 lines); keep «الأنشطة الجارية» on home as the discoverable door. |
| 15 | low | `DueList.tsx:39-44` | On المستحقات the tappable text is the party's name but it opens the agreement, not the party. | no | Make the plan title the link, or link both. |
| 16 | low | `src/app/(auth)/pending/page.tsx:48-53`; FRONTEND "no auto-redirect" | The pending page's only button is «تسجيل الخروج»; an approved owner discovers approval by logging in again, which nothing says. | no | Keep the action, word it as a sign-in: «تسجيل الدخول للتحقق من حالة الطلب». |
| 17 | low | `staff/attendance/page.tsx:99,131` | «لا يوجد موظفون نشطون» on الحضور (also the home tile «تسجيل حضور») has no link to add one. | no | `EmptyState` hint + link «إضافة موظف» → `/owner/staff/new`. |
| 18 | low | C3; `ar.v14.ts:84-87` vs `ar.v12a.ts:179`; plans status filter | «إنهاء الاتفاقية» and «أرشفة الاتفاقية» both reach `ARCHIVED` with two badges («منتهية» / «مؤرشفة»); the filter «مؤرشفة» will also return «منتهية» open plans. | creates it | Filter option reads «مؤرشفة / منتهية», or use «منتهية» for both kinds. |
| 19 | low | `LockCell.tsx:24-26` | Locking or unlocking a month is one tap with no confirmation, while regenerating a join code asks (`JoinCodeTab.tsx:59`). | no | Keep lock instant; a `ConfirmDialog` on unlock only (it re-opens edits for everyone). |
| 20 | low | `TransactionForm.tsx:150-225` | The daily entry form carries 8 controls (direction, amount, date, category, الجهة, ضمن نشاط, method, note); cash-book apps take an amount and a note. | no (A adds two links under category) | v1.5+: fold الجهة / ضمن نشاط / ملاحظة behind a «تفاصيل أكثر» disclosure that remembers its state. |

Totals: 3 high, 10 medium, 7 low. Created or worsened by v1.4 edits: 2 (ruled), 3, 5, 11, 12, 18; fixed by v1.4: category round trip (A), «إضافة» the noun vs the verb (B4), five add doors (B1).

## (d) Suggestions (ranked by value to an owner)

1. **Party page starts things** — «اتفاقية جديدة» (→ `/owner/plans/new?partyId=`) and, when the form takes a `?partyId=` preset, «حركة جديدة» on `/owner/parties/[id]`. *fits v1.4 now* (one link; the preset already exists, problem 1). Reasoning: every competitor's customer page is the hub; today it is a dead end.
2. **«اتفاقية جديدة» row in the AddSheet** after «تسجيل دفعة». *fits v1.4 now* (one row in `addRows`, problem 3). Reasoning: the sheet promises "one + for everything" and omits the object the product is built around.
3. **One door for payments** — on `/owner/dues` a line «دفعة على اتفاقية غير مستحقة بعد؟ اختر من الاتفاقيات» → `/owner/plans?pick=payment`. *fits v1.4 now* (one link; D3 untouched). Reasoning: removes the need to know which «تسجيل دفعة» to use (problem 2).
4. **Pending staff badge** on «حسابات الدخول» via the existing `badges` map. *fits v1.4 now* (one count query in `(owner)/layout.tsx`). Reasoning: approvals are the one thing a new employee waits on and the owner has no signal (problem 10).
5. **Lock notice links to the locks page and back.** *fits v1.4 now* (two links, problem 4). Reasoning: the only correction path in a closed month is a blind round trip.
6. **Open-plan remaining line on الجهات rows and the contact card**, same text as the statement line. *fits v1.4 now* (read-only query field; no rule change, D10's balance stays untouched). Reasoning: «لا رصيد» beside an open agreement with money outstanding is a wrong number to a reader (problem 6).
7. **Instalment wording «قسط»** for scheduled rows, «دفعة» for recorded money, across `ar.v12a.ts`. *fits v1.4 now* (values only, problem 7). Reasoning: one word for two things is the kind of ambiguity a shopkeeper trips on daily.
8. **First-run home** — hide the empty dues card until a plan exists and show a checklist card (حركة → جهة → اتفاقية → موظف) that disappears when done. *v1.5+* (new component, problem 9). Reasoning: Wafeq and Zoho both open with "getting started" steps; our first screen opens with an empty concept.
9. **Inline quick-add party** in `PlanForm` and `TransactionForm` (the «أخرى (اكتب الاسم)» path could offer «حفظ كجهة»). *v1.5+* (new action path, problem 13). Reasoning: the same round trip v1.4 A removes for categories still exists for parties.
10. **Compact entry form** — الجهة / ضمن نشاط / ملاحظة behind a remembered «تفاصيل أكثر» disclosure. *v1.5+* (`TransactionForm.tsx` is frozen in v1.4, problem 20). Reasoning: the daily action should look like a cash book, not a voucher.

"fits v1.4 now": 7 (1–7). "v1.5+": 3 (8–10).

## (e) Sources

Khatabook
- https://play.google.com/store/apps/details?id=com.vaibhavkalpe.android.khatabook&hl=en
- https://khatabook.com/

OkCredit
- https://okcredit.in/en/
- https://play.google.com/store/apps/details?id=in.okcredit.merchant&hl=en
- https://okcredit.in/blog/okstaff-attendance-and-staff-management (OkStaff; via search summary only)

Vyapar
- https://vyaparapp.in/blog/vyapar-app-features/
- https://play.google.com/store/apps/details?id=in.android.vyapar&hl=en
- https://vyaparapp.in/guides/how-to-manage-stock-inventory-in-vyapar (home-screen "+Add Sale"; via search summary only)

Wave
- https://support.waveapps.com/hc/en-us/articles/32453204338324
- https://support.waveapps.com/hc/en-us/articles/5528552885652

Wafeq
- https://help.wafeq.com/hc/ar-sa/articles/21178292120220 (تسجيل المصروفات النقدية)
- https://www.wafeq.com/en/wafeq-help/getting-started/getting-started-with-wafeq
- https://www.wafeq.com/en/wafeq-help/product-updates/new-product-features-october-2023 (side-menu sections; via search summary only)

Qoyod
- https://www.qoyod.com/knowledge-base/نبذة-عن-قيود/
- https://www.qoyod.com/knowledge-base/إضافة-العملاء-أو-الموردين-في-ش/
- https://www.qoyod.com/blog/qoyod/track-financial-reports-mobile/

Daftra
- https://www.daftra.com/تطبيق-إدارة-الأعمال/
- https://www.daftra.com/features/sub_feature/11

Mezan
- https://www.capterra.com/p/10032050/Mezan/
- https://mezan.sa/

Zoho Books
- https://www.zoho.com/books/help/getting-started/navigating-zoho-books.html
- https://help.zoho.com/portal/en/community/topic/accounting-on-the-go-series-41-zoho-books-mobile-app-revamp
- https://www.zoho.com/om/books/accounting-mobile-apps
- https://www.zoho.com/expense/help/settings/categories.html (categories in settings; via search summary only)

Arabic ledger / expense apps
- https://play.google.com/store/apps/details?id=apps.bnb&hl=ar (BNB Dafatery)
- https://apps.apple.com/us/app/id1249537911 (مصاريف – دفتر الحسابات و الدخل)

Not used: the App Store result returned by search as "Khatabook" (apps.apple.com/us/app/id6633420817) is a different app ("Udhar Book" by another developer) and was discarded.

## Appendix — tap counts per step (phone, from الرئيسية; navigation taps only, form filling excluded)

Owner — today vs v1.4 where they differ; "same" = no difference.

| Step | Today | v1.4 | Lands on / notes |
|---|---|---|---|
| Sign up → approval | choose «صاحب منشأة» (1) → form → /verify → /pending | same | Approval is discovered by signing in again (`pending/page.tsx`); no link says so. |
| First login | 0 | 0 | 10 blocks; blocks 3 and 10 are empty states (`owner/page.tsx:41-65`). |
| Add first entry | tile or tab «حركة جديدة» (1) → form → حفظ → السجل | tile (1) or «+» (1) → «حركة جديدة» (2) | Category missing: today round trip via الإعدادات › التصنيفات (+4 taps, form lost); v1.4 inline (A3). |
| Add a جهة | المزيد (1) → الجهات (2) → «إضافة جهة» (3) → form → party page | «+» (1) → «جهة جديدة» (2) | Party page then offers no next action (problem 1). |
| Create fixed agreement | المزيد (1) → الاتفاقيات (2) → «اتفاقية جديدة» (3) → form (schedule must sum to total) | + kind card «دفعات محددة» (4) | Not in the «+» sheet (problem 3); party must exist first (problem 13). |
| Record instalment payment | tile «تسجيل دفعة» (1) → row (2) → form → حفظ → plan with `?paid=` | tile path same; sheet path «+» (1) → «تسجيل دفعة» (2) → card (3) → row (4) | Two destinations for one label (problem 2). |
| See what is owed this week | 0 (home card) / tab المستحقات (1) | same | Matches competitors. |
| Create open agreement | — | المزيد (1) → الاتفاقيات (2) → «اتفاقية جديدة» (3) → «اتفاقية مفتوحة» (4) → form | Outside party balance (problem 6). |
| Record a random payment | — | plan page (3) → inline «تسجيل دفعة» → حفظ | A second payment form shape, owner-only (P4). |
| Add an employee | المزيد (1) → الموظفون (2) → «إضافة موظف» (3) → 4-section form | «+» (1) → «موظف جديد» (2) | Salary plan appears on the profile (`ThisMonthCard`) and in الاتفاقيات / المستحقات علينا. |
| Mark attendance | tile «تسجيل حضور» (1) → day sheet → «حفظ الحضور» (2) | same | Empty state has no «إضافة موظف» link (problem 17). |
| Lock the month | المزيد (1) → إقفال الأشهر (2) → month cell (3), no confirm | same | |
| Report / Excel / print | المزيد (1) → التقارير (2) → «تصدير Excel» or «طباعة» (3) | same | |
| Fix a mistake in a locked month | السجل shows «شهر مقفل» only; unlock round trip ≈ 9 taps | same | Problem 4. |
| Hide a category | المزيد (1) → التصنيفات (2) → row «تعطيل» (3) | form (1) → «تعديل التصنيفات» (2) → ✕ (3) → confirm (4) | Re-show only via the «المزيد (…)» link inside edit mode (problem 5). |
| Regenerate join code | المزيد (1) → رمز الانضمام (2) → «إعادة توليد الرمز» (3) → confirm (4) | «الإعدادات» lands here directly (D11) | |

Staff

| Step | Today | v1.4 | Notes |
|---|---|---|---|
| Join with code | «موظف» card (1) → form with «رمز الانضمام» → /verify → /pending | same | Owner sees the request only under حسابات الدخول (problem 10). |
| Add an entry | tab «حركة جديدة» (1) or home «إضافة حركة» (1) → form → حفظ → /staff/transactions | «+» (1) → «حركة جديدة» (2); home button still (1) | One-row sheet when unlinked (problem 11). |
| Check in («حضوري») | tab (1) → «تسجيل الحضور» (2) | «+» → «تسجيل حضوري» also leads to /staff/me | Linked logins only; unlinked staff get no hint why the tab is absent. |
| Edit without permission | no pencil (`LedgerRowActions.tsx:36`); notice on home; direct URL → /staff | same | Open-plan payment rows: pencil shown to canEdit staff, then bounced (problem 12). |
