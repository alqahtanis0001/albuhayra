# OWNER-TEST-v14.md — owner usability test of زخم v1.4 (2026-10-11)

Run by the lead on `main` `9b17632` (v1.4 complete) in a throwaway container: local PostgreSQL 16, local `.env`, no Brevo key, `npm run build && npm start`. Neon was never touched. One agent, `owner-tester`, played two personas through a persistent Playwright browser that counted one tap per command (`progress/v14/owner-test/journal.txt`). Raw notes: `progress/v14/owner-test/abu-fahd.md`, `progress/v14/owner-test/um-rayan.md`; 78 screenshots `progress/v14/owner-test/*.jpg` (numbers below refer to them).

Setup notes: owner and staff sign-ups went through the real forms; because no mail can be sent here, `emailVerifiedAt` was set directly in the local DB for both accounts (the admin's «قبول» button is disabled until then — correct behaviour). The owner was approved from `/admin`; the staff login was created with the join code and left as a **pending request** so task 13 included the real approval. «طباعة» could not be verified in headless Chromium (no print dialog); everything else ran in the browser.

**Persona 1 — أبو فهد**, 52, car-parts shop in Dammam, 3 employees, WhatsApp and a calculator, never used accounting software, Arabic only, iPhone (390 px). First time on the site. He only sees the screen and acts in his own words (زبون, مورد, دفعة, راتب, كم باقي عليه).
**Persona 2 — أم ريان**, 24, his daughter, tech-comfortable, desktop (1280 px), tasks 2, 4, 7, 11, 13 only.

---

## (a) Per-task log — أبو فهد

Taps = navigation + form taps until done; "to form" = taps until the right screen was in front of him.

| # | Task (his words) | Path | Taps | Outcome / sure? |
|---|---|---|---|---|
| 1 | أول مرة أفتح، وش أسوي؟ | login → home (002). Reads the three tiles, the «ابدأ هنا» checklist, the money cards, the tab bar. Curiosity tap on «المزيد» because of the red «1» (003). | 5 | Knows where to "record something" (the green «حركة جديدة» tile and step 1 of «ابدأ هنا»). Does not know what «المستحقات», «اتفاقية», «الجهات», «حسابات الدخول», «إقفال الأشهر» are. The «1» badge sits on «حسابات الدخول», which means nothing to him. |
| 2 | زبون دفع لي 500 كاش | Home «تسجيل دفعة» → empty «المستحقات» page, no amount field (004/005) — dead end. Back → «حركة جديدة» → «وارد» → 500 → «دفعة من عميل» (hesitated vs «مبيعات») → «حفظ» → lands on «السجل» with the filter panel on top (008); scrolls to see +500 (009). | 7 (to form 3, 1 wrong turn) | Done. Sure only after scrolling: no «تم الحفظ». |
| 3 | اشتريت من المورد ابو خالد بـ 1,200 بالتحويل | «إضافة» tab → «حركة جديدة». The form still says «وارد» from task 2, so «مشتريات» is missing from the list (011) — he notices only because of that. «صادر» → «مشتريات» → «تحويل بنكي» → «تفاصيل أكثر» → «أخرى (اكتب الاسم)» → ابو خالد (013) → «حفظ». | 11 (to form 2) | Done, sure after scrolling. ابو خالد was typed as a one-off name, so he is never saved as a supplier. «الصافي −700» in red shocks him ("أنا خسران؟"). |
| 4 | محمد بيدفع 6,000 على 3 دفعات | «إضافة» → guesses «اتفاقية جديدة» → «نوع الاتفاقية» cards (015) explain the choice in his words → «دفعات محددة» → «+ جهة جديدة» محمد (017/018; direction becomes «محمد سيدفع لنا») → invents a required «عنوان», picks a required «التصنيف», changes «عدد الأقساط» 12→3 → «توليد الجدول» (020). **Bug:** the «تمت إضافة الجهة» toast sits on top of «حفظ» at phone width (021); he must close it first. | 13 (to form 3) | Done, sure: «المتبقي 6,000» and 3 instalments (022). Worried by the big red «إلغاء الاتفاقية» beside «تعديل». |
| 5 | محمد دفع الدفعة الأولى | On the agreement page → «تسجيل دفعة» under «القسط 1» → everything prefilled (023) → «حفظ» → «تم تسجيل الدفعة», «المدفوع 2,000 (سُدّد 1 من 3)» (024). | 2 | Done, sure. Best flow in the test. |
| 6 | كم باقي على محمد؟ | «المستحقات» tab → «لا شيء» everywhere although محمد owes 4,000 (026) → the one link «اختر من الاتفاقيات» → plans list card «المتبقي 4,000.00» (027). | 3 | Answer found, sure. Never discovered «الجهات» (the per-customer page with «لنا: 4,000»). |
| 7 | زبون يدفع متى ما يتيسر، أبي أتابع كم دفع | «اتفاقية جديدة» → «اتفاقية مفتوحة» (the card text is exactly his sentence) → «+ جهة جديدة» خالد الدوسري (toast over «حفظ» again) → required title and category again → «حفظ» → page with the inline «تسجيل دفعة» box (030) → 300 → «المستلم حتى الآن 300.00» (031). | 11 (to form 2) | Done, sure. |
| 8 | أضيف موظفي سعد، راتبه 4,000، يوم الصرف 27 | «إضافة» → «موظف جديد» → long form (032); fills name, salary, pay day only. Skims the dense «الراتب» paragraph. «حساب الدخول المرتبط» offers only «بدون حساب دخول» although سعد's request is waiting under «حسابات الدخول». | 6 (to form 2) | Done, sure (034: 4,000 and 27 on screen, green «صرف راتب» button). |
| 9 | سعد تأخر اليوم | Home «تسجيل حضور» → «متأخر» → «حفظ الحضور» → «تم حفظ الحضور» (036). | 4 | Done, sure. Badge «محسوب» unclear. |
| 10 | أبي أصرف راتب سعد | «المزيد» → «الموظفون» → سعد → «صرف راتب» → page titled «تسجيل دفعة» with «المتبقي على الاتفاقية 8,000» and «قسط» (038) → «حفظ» → lands on «راتب شهري — سعد» agreement page, «المتبقي 4,000» (039). | 5 (to form 4) | Done, sure of the payment; confused that a salary is an «اتفاقية» he never made, that 8,000 is "remaining", and that «المتبقي 4,000» reads as "I still owe سعد 4,000". A first-timer who had not seen «صرف راتب» would tap home «تسجيل دفعة» and find nothing (the 27th is outside "this week"). |
| 11 | وش صرفت هذا الشهر؟ أبي أطبعه | Home card «صادر هذا الشهر −5,200» answers the first half (040). No print anywhere on home or السجل. «المزيد» → «التقارير» (041): three «تطبيق» buttons above the fold, taps the big green one for nothing, scrolls to «طباعة» (042). | 5 (to report 3, 1 wasted) | Partly: the report is totals by category, not the list of purchases he had in mind; «طباعة» not verifiable headless. |
| 12 | غلطت في مبلغ حركة الشهر الماضي | Records the forgotten 350 dated 20 Sept (date field shows mm/dd/yyyy, 044/045). «المزيد» → «إقفال الأشهر» (guessed from the word) → clear sentence on the page (046) → «إقفال» on سبتمبر: locked instantly, **no confirmation** (047). «السجل» → the Sept row shows «🔒 شهر مقفل» + link «إقفال الأشهر», pencil gone (048); taps the badge (nothing), then the link → «إلغاء الإقفال» → dialog (050) → «تأكيد» → «العودة إلى السجل» → pencil → 380 → «حفظ» (052) → re-locks (053). | 21 (setup 6, lock 3, fix 9, re-lock 3) | Done, sure at every step. Understood the lock because he had just set it; a staff member would see «شهر مقفل» with no sentence. |
| 13 | أعطي سعد دخول عشان يسجل الحركات | «المزيد» → «حسابات الدخول» (the red «1» + the word «دخول») → request «سعد العتيبي · قيد المراجعة · مُوثّق» (054) → «قبول» → «معتمد» (055) → taps «السماح بالتعديل» "to be safe": button turns solid green, no label changes (056). Leaves «كلمة مرور جديدة للموظف *». | 4 (to screen 2) | Half-sure: «معتمد» yes; whether green means "allowed now" or "tap to allow" no. Never links the login to the employee record from task 8; «الموظفون — لا يوجد موظفون بعد» on this page contradicts the سعد he created. |
| 14 | أخفي تصنيف ما أستخدمه | Scans «المزيد» for «التصنيفات» (absent), remembers the form: «حركة جديدة» → «تعديل التصنيفات» → wiggling chips with × (057; × reads as delete) → × on «مواصلات» → dialog «إخفاء التصنيف «مواصلات»؟ الحركات القديمة تحتفظ به.» (058) → «تأكيد» → «التصنيفات المخفية: مواصلات [إظهار]» (059) → «تم». | 6 (to editor 3) | Done, sure (undo visible). Did not realise «وارد» has its own list. |
| 15 | وش معنى «المستحقات»؟ وش الفرق بينها وبين «الاتفاقيات»؟ | Reads «المستحقات» (060), «الاتفاقيات» (061), «الجهات» (062), «التذكيرات» (063). | 7 (reading) | No definition anywhere he meets the words (tab bar, «المزيد» sheet, empty states). After reading the cards he guesses "الاتفاقيات = كل الناس اللي بيني وبينهم دفعات، والمستحقات = اللي حان وقته" — roughly right, after 15 tasks. The best one-line definition in the app is the «التذكيرات» paragraph in settings. |

**أم ريان (desktop) in one line each:** task 2 — 9 taps, straight to «حركة جديدة», also paused on «مبيعات» vs «دفعة من عميل», also missed a save message; task 4 — 12 taps, no hesitation on «اتفاقية», also disliked the required title/category, **toast does not cover «حفظ» on desktop**; task 7 — 11 taps, open-agreement card instantly clear; task 11 — 2 taps, «التقارير» in the sidebar, did not tap «تطبيق», still found three «تطبيق» buttons odd and the report totals-only; task 13 — 8 taps, understood join code → request → «قبول» → optional «السماح بالتعديل» → link on the employee form in half a minute, but also guessed at the unlabelled toggle, the «*» on the password field and «مُوثّق».

---

## (b) Confusion list, ranked by how much it would stop a real owner

Severity: **blocks** = he cannot finish or finishes wrong without help · **slows** = extra taps / doubt, finishes · **cosmetic**. "Both" = أم ريان hit it too.

| # | Sev | Where | What confused him | What he expected | Proposed fix (wording / helper / order / default / confirm only) |
|---|---|---|---|---|---|
| 1 | blocks | Home tile «تسجيل دفعة» → `/owner/dues` (004/005) | For "زبون دفع لي كاش" he tapped «تسجيل دفعة» and got an empty page with no amount field and a link about an «اتفاقية». Dead end for the most common task on day one. | A form with an amount. | Keep the tile and its destination (D3) but let the empty dues page say what it is and where cash goes: «هنا تظهر أقساط الاتفاقيات ورواتب الموظفين عندما يحين موعدها. دفعة نقدية من زبون بدون اتفاقية؟ سجّلها كحركة جديدة ←» (link to `/owner/transactions/new`). Also rename the tile «تسجيل دفعة» → «دفعة على اتفاقية» or «دفعة قسط». |
| 2 | blocks | «حركة جديدة» form, the remembered direction (011) | The form opened on «وارد» (remembered from the last entry); «مشتريات» was absent and a 1,200 purchase would have been saved as income had he picked «أخرى». He only noticed because the word was missing. | The form to open neutral, or to show both lists. | Do not remember the direction across visits on the phone, or show the remembered state loudly: a one-line banner above the category «النوع الحالي: وارد — دخل لك مال» with the toggle right there; and name the toggle in his words: «وارد (دخل لي)» / «صادر (طلع مني)». |
| 3 | blocks (phone) | `Toast` «تمت إضافة الجهة» over «حفظ» on `PlanForm` / `OpenPlanForm` at 390 px (021) | The sticky toast (`fixed bottom-24`) sits exactly on the form's «حفظ» button; «حفظ» does not respond until the toast is closed. Not on desktop (007 of أم ريان). | «حفظ» to work. | Make the quick-add toast auto-dismiss (2–3 s) or render it above the sheet/form header rather than `bottom-24`; at minimum add bottom padding to forms equal to the toast height while a toast is shown. (A `qa-visual` miss: the capture ran without a toast.) |
| 4 | blocks | «المستحقات» page and tab when nothing is due this week (026); «الجهات» undiscovered | محمد owes 4,000 and the page says «لا شيء»/«لا توجد مستحقات» four times. He never found «الجهات», the one screen that answers "كم باقي على محمد" per customer («لنا: 4,000»). | A list of who owes him what. | (i) Empty-state sentence as in #1 plus «لعرض ما لك وما عليك لكل جهة: الجهات ←». (ii) Rename the «المزيد» tile «الجهات» → «العملاء والموردون» (keep the route and key). (iii) On the home «مستحقات هذا الأسبوع» block keep «عرض كل المستحقات» but add «الجهات» beside it. |
| 5 | blocks | `/owner/staff/logins` (054–056), both | «السماح بالتعديل» is a pressed button with no state text: green = allowed now, or tap to allow? He turned edit on "to be safe". «كلمة مرور جديدة للموظف *» looks like a required field he forgot. «الموظفون» heading on this page («لا يوجد موظفون بعد») contradicts the employee he just created. The login and the employee record are never linked unless the owner finds «حساب الدخول المرتبط» on the staff form. | A switch that says مسموح / غير مسموح; a hint that the employee can always add entries. | Toggle text: «التعديل: مسموح» / «التعديل: غير مسموح» with the helper «يستطيع الموظف إضافة الحركات دائمًا؛ هذا يحدد إن كان يستطيع تعديلها.» Drop the «*» from the reset field (it is required only for its own button) and put the field behind the «إعادة تعيين كلمة المرور» button. Heading «الموظفون» → «حسابات الموظفين». After «قبول», one line: «لربط الحساب بملف الموظف: الموظفون ← سعد ← تعديل ← حساب الدخول المرتبط» (or link straight there). |
| 6 | slows | After «حفظ» on «حركة جديدة» (008), both | No «تم الحفظ»; the ledger opens with the filter panel (five fields and «تطبيق») on top; on the phone the new row and totals are below the fold. "انحفظت ولا لا؟" | A green confirmation and the new row. | Toast «تم حفظ الحركة: +500.00 ر.س» on landing (the agreement page already does this for payments); collapse the ledger filter into one «تصفية» button on the phone so totals and the latest row are first. |
| 7 | slows | Salary payment page «تسجيل دفعة» (038/039) | «المتبقي على الاتفاقية 8,000», «قسط», and landing on an agreement «راتب شهري — سعد» he never created; «المتبقي 4,000» reads as money he owes now (it is November). | A page called «صرف راتب سعد — أكتوبر» with 4,000. | For SALARY plans: page title «صرف راتب — {name} — {month}», hide «المتبقي على الاتفاقية» or label it «الرواتب القادمة المنشأة: 4,000 (نوفمبر)», and after save return to the employee page (ملف الموظف) with the toast «تم صرف راتب أكتوبر», not the plan page. |
| 8 | slows | «وارد» categories: «مبيعات» vs «دفعة من عميل», both | Both fit "زبون دفع لي"; he chose by the word دفعة. أم ريان paused too. | One obvious choice. | Helper under the category select when «وارد»: «مبيعات: بيع اليوم · دفعة من عميل: سداد دين أو اتفاقية». Seeds: rename «دفعة من عميل» → «سداد من عميل» to separate it from a sale. |
| 9 | slows | Agreement forms: «عنوان الاتفاقية *», «التصنيف *» (016/028), both | He invents a title (types the customer's name again) and picks a category for nothing he needs. | Only the customer, the amount and the schedule. | Default the title to «{party} — {n} أقساط» / «{party} — دفعات مفتوحة» (editable, so still required under the hood); default the category to «دفعة من عميل» / «مشتريات» by direction (as the salary plan defaults to «رواتب»); move both under the «تفاصيل أكثر» disclosure the entry form already has. |
| 10 | slows | «المزيد» badge «1» on «حسابات الدخول» (003) | A red number on a tile he cannot read ("حسابات؟ دخول؟ فلوس دخلت؟"); he postpones it. | The badge to say what waits. | Badge text «طلب انضمام» beside the number on the tile (the a11y text already says it), and a one-line home notice «سعد العتيبي يطلب الانضمام — قبول / رفض» until handled. |
| 11 | slows | «تفاصيل أكثر» → «الجهة»: «أخرى (اكتب الاسم)» vs «+ جهة جديدة» (012/013) | He chose «أخرى» because it says "write the name"; ابو خالد is therefore a one-off text and never a saved supplier. | Typing the name once to save him. | Order and wording: «+ عميل أو مورد جديد (يُحفظ للمرات القادمة)» first, «اسم مرة واحدة (لا يُحفظ)» second. The «اسم الجهة» helper «اسم العميل أو المورد» is good; keep it. |
| 12 | slows | Reports page (041), both | Three «تطبيق» buttons above the fold, the report itself below; he taps the big green one and nothing changes. «أعمار المستحقات» tab opaque. Report is totals by category; he wanted "what did I buy" (the itemised ledger has no print). | The month's report with a print button at the top. | Order: report first, filters behind «تغيير الفترة»; one «تطبيق» per form at most, secondary style when the shown month is already the selected one; add «طباعة» to «السجل» (the print CSS exists); rename tab «أعمار المستحقات» → «المتأخرات حسب المدة». |
| 13 | slows | «إقفال الأشهر» (047) | Locking is one tap with no confirmation; a mis-tap locks the wrong month silently (unlock asks). | Same confirm as unlock. | Keep lock one tap (user's D17/c19 ruling) but show a 5-second undo toast «أُقفل سبتمبر 2026 — تراجع»; or, if the ruling is revisited, confirm with the month name. |
| 14 | slows | Date fields everywhere (044, 021) | Native date input renders mm/dd/yyyy in this browser; he thinks in يوم/شهر/سنة. | Day first, or the Hijri/Gregorian text shown. | Show the formatted Gregorian date and Hijri as the field's visible text (the Hijri line already exists under the field); set `lang="ar-SA"` on the input so WebKit renders day-first. Verify on a real iPhone (locale-dependent). |
| 15 | slows | Agreement schedule defaults (020), both | «عدد الأقساط» 12 and the first instalment dated today; he expected next month. | 3 and next month. | Default «عدد الأقساط» to 3 and the first due date to one month after the start (editable). |
| 16 | cosmetic | Agreement page (022) | Big red «إلغاء الاتفاقية» next to «تعديل»; «أرشفة» unknown. | Destructive action out of the way. | Move «إلغاء» and «أرشفة» under «المزيد ▾» on the page; «أرشفة الاتفاقية» → «إنهاء وحفظ في الأرشيف». |
| 17 | cosmetic | Ledger locked row (048) | «🔒 شهر مقفل» badge looks tappable; the sentence of why/who is missing on the row. | A sentence. | Row text «شهر مقفل — لتعديلها افتح الشهر من إقفال الأشهر» (owner only; staff see «أقفله صاحب المنشأة»). |
| 18 | cosmetic | Attendance (036) | «محسوب» badge after saving; «عن بُعد» for a shop. | «تم» / «متأخر». | Badge «مسجّل: متأخر» (status word, not «محسوب»); keep «عن بُعد». |
| 19 | cosmetic | Home after first entries (040) | «الصافي −700» and «نقد −1,200» in red on day one: he has no opening balance and nothing invited him to enter one. | A hint. | When `netHalalas < 0` and no «رصيد افتتاحي» entry exists: «الأرقام بالسالب لأن الرصيد الافتتاحي لم يُسجَّل بعد — سجّل رصيد الصندوق كحركة وارد بتصنيف «رصيد افتتاحي»». |
| 20 | cosmetic | «تعديل التصنيفات» chips (057) | × reads as delete; the dialog rescues it. Chips wiggle for as long as the editor is open. | «إخفاء». | Chip text «مواصلات · إخفاء» instead of a bare ×; stop the wiggle after the first second. |
| 21 | cosmetic | «المستحقات» day strip (026) | The third day card is clipped at 390 px («26-10-12»). | Readable dates. | Let the strip scroll with a visible edge, or show weekday + day only. |

Not changed on purpose (worked, or ruled): «تسجيل دفعة» on the home tile going to المستحقات is D3; the c2 link «دفعة على اتفاقية غير مستحقة بعد؟» saved task 6; «الجهات» as the code name stays, only the tile wording changes.

---

## (c) Words that need a plain-Arabic rename or a one-line explanation on screen

Renames are values in `src/i18n/*` only; keys and routes unchanged. Where a rename is risky, a one-liner beside the word is enough.

| Word on screen | Where he met it | His reading | Suggestion |
|---|---|---|---|
| الجهات | «المزيد», «العملاء والالتزامات» | "جهة؟ حكومية؟" | Tile and page title «العملاء والموردون»; in the entry form keep «الجهة» but with the existing helper «اسم العميل أو المورد» visible before the drop-down, not only after choosing «أخرى». The home checklist's «أضف جهة: عميلًا أو موردًا» is the model. |
| الاتفاقيات | «المزيد», plans list | "عقد؟" | Keep the word (the «نوع الاتفاقية» cards explain it well) and add under the list title: «ما اتفقت عليه مع عميل أو مورد ويُدفع على دفعات، وكذلك رواتب الموظفين.» In the «المزيد» tile: «الاتفاقيات (دفعات متفق عليها)». |
| المستحقات | Tab bar, «المزيد», home block | "اللي لي أو اللي عليّ؟" — no direction | Tab label stays (space); page subtitle «ما حان موعده هذا الأسبوع: لنا من العملاء وعلينا للموردين والموظفين.» The empty state must carry it (today it says only «لا توجد مستحقات»). |
| تسجيل دفعة (home tile) | Home | "زبون دفع لي" | «دفعة على اتفاقية» or «سداد قسط». |
| حركة / حركة جديدة | Home, «+», ledger | He says قبض / صرف / دفعة | Keep «حركة» (it is everywhere) but subtitle the tile «قبض أو صرف»; in the form, direction buttons «وارد (دخل لي)» / «صادر (طلع مني)». |
| الأنشطة / نشاط جديد | Ledger tab, «+» sheet | "نشاط؟" | «+» row «نشاط جديد (مشروع أو مناسبة لها تكاليفها)»; ledger tab «الأنشطة» keeps the existing empty-state sentence, which is good. |
| قسط / الأقساط | Agreement pages, salary payment | "الراتب مو قسط" | Fine for customer agreements. For SALARY plans show «راتب {month}» instead of «القسط n»; «المتبقي على الاتفاقية» → «الرواتب القادمة». |
| إقفال الأشهر | «المزيد» › الإعدادات | Guessed right ("قفل") | Tile «إقفال الأشهر (منع التعديل على شهر منتهٍ)»; the page sentence already explains it. |
| حسابات الدخول | «المزيد» with badge | "حسابات؟ دخول؟ فلوس دخلت؟" | «دخول الموظفين للبرنامج»; badge text «طلب انضمام». |
| رمز الانضمام | الإعدادات | Unknown until opened | «رمز انضمام الموظفين»; on «حسابات الدخول» when there is no request: «ليدخل موظف جديد أعطه رمز الانضمام ←». |
| السماح بالتعديل | «حسابات الدخول» | On or off? | «التعديل: مسموح / غير مسموح» + helper (see b-5). |
| مُوثّق | «حسابات الدخول» | "موثق وش؟" | «البريد مؤكَّد». |
| أرشفة الاتفاقية | Agreement page | Unknown | «إنهاء وحفظ في الأرشيف». |
| محسوب | Attendance | "محسوب عليه؟" | «مسجّل». |
| أعمار المستحقات | Reports tab | "أعمار؟" | «المتأخرات حسب المدة». |
| تطبيق | Ledger and reports filters | "الزر الرئيسي" | «عرض» (and demote when nothing changed). |
| مبيعات vs دفعة من عميل | «وارد» categories | Both fit | «سداد من عميل» + the helper in b-8. |
| رصيد افتتاحي / رأس مال | «وارد» categories | Meaningless | «رصيد البداية (ما في الصندوق عند بدء الاستخدام)». |
| الصافي | Home | Roughly understood | Fine; add «(الوارد − الصادر)» once on the card. |

---

## (d) What worked well without help (do not touch)

- **Login page** — a familiar pattern; no hesitation.
- **«ابدأ هنا» first-run card** with «0 من 4» → «3 من 4» and ticks — the only thing on the home page that told him the order; «أضف جهة: عميلًا أو موردًا» is the model for every other helper.
- **Home tile «حركة جديدة»** (big, green, «+») — understood as "record something" even though «حركة» is not his word.
- **«نوع الاتفاقية» cards** — «دفعات محددة» / «اتفاقية مفتوحة» with their one-line descriptions; both personas chose instantly. Best copy in the app.
- **Inline «+ جهة جديدة»** inside the agreement form, and the direction buttons that take the name: «محمد سيدفع لنا» / «محمد سندفع له». Removed all doubt about direction.
- **Instalment payment** (task 5) — two taps, everything prefilled, «تم تسجيل الدفعة» with the numbers changing.
- **Open agreement page** — the payment box on the page itself; «المستلم حتى الآن» answers "كم دفع" directly.
- **Schedule generator** — «مجموع الأقساط … ✓ المجموع يطابق الإجمالي».
- **Employee form** — long, but every field he needed had a plain label; the «لا تُحفظ أرقام الهوية…» note was noticed and welcomed.
- **Attendance** — «متأخر» is his exact word; «تم حفظ الحضور».
- **«إقفال الأشهر» page sentence** («بعد إقفال الشهر لا يمكن إضافة أو تعديل أو حذف حركاته.»), the «شهر مقفل» badge with its link, the unlock dialog, and «العودة إلى السجل» — the c4/c19 fixes carried the whole of task 12.
- **Hide-category dialog** «إخفاء التصنيف «مواصلات»؟ الحركات القديمة تحتفظ به.» and the «إظهار» undo (c5).
- **«+» sheet** — found on the second task and used for everything after; the six rows were read correctly except «نشاط جديد».
- **«لنا / علينا»** wherever it appears (home block, «الجهات» rows) — understood at once.
- **Hijri beside every date**, Western digits, «+ / −» on every amount — never questioned.

---

## (e) The 5 fixes that would help a first-time owner most

1. **Make the empty «المستحقات» page explain itself and hand cash over to «حركة جديدة»** (b-1, b-4): one sentence of what shows here (أقساط الاتفاقيات ورواتب الموظفين عندما يحين موعدها, لنا وعلينا), a link «دفعة نقدية بدون اتفاقية؟ سجّلها كحركة جديدة», and a link «ما لك وما عليك لكل عميل: العملاء والموردون». This turns the day-one dead end into a signpost.
2. **Never let the remembered direction hide the right category** (b-2): on the phone open the entry form neutral, or show «النوع الحالي: وارد (دخل لي)» right above the category with the toggle beside it; rename the toggle «وارد (دخل لي)» / «صادر (طلع مني)».
3. **Fix the toast over «حفظ» on phone forms and confirm every save** (b-3, b-6): auto-dismiss the quick-add toast or lift it off the form's button; add «تم حفظ الحركة» after an entry and collapse the ledger filter behind one button so the saved row is the first thing seen.
4. **Label the staff-access controls in words** (b-5, and the «حسابات الدخول» / «رمز الانضمام» wording in (c)): «التعديل: مسموح / غير مسموح» with the helper that staff can always add; drop the «*» on the reset-password field; «حسابات الدخول» → «دخول الموظفين للبرنامج»; after «قبول», say how to link the login to the employee's file.
5. **Rename the four opaque tiles and default the agreement paperwork** (c, b-9): «الجهات» → «العملاء والموردون», home tile «تسجيل دفعة» → «دفعة على اتفاقية», «حسابات الدخول» → «دخول الموظفين», «رمز الانضمام» → «رمز انضمام الموظفين»; prefill the agreement title «{party} — {n} أقساط» and the category by direction so the form asks only for the customer, the amount and the schedule.

Everything above changes wording, helper text, order, defaults, confirmations and empty states only. No function is removed; nothing about invoicing, VAT or receipts is proposed.

---

## (f) Re-run after v1.4 part 3 (2026-10-11, branch `claude/zakhm-v14-part3-wording-z53lw5`)

The lead replayed tasks 2, 4, 6, 10 and 13 as أبو فهد at 390 px against the part-3 build (`progress/v14/owner-test/driver/tasks-p3.sh` through the rebuilt driver `driver/server.mjs`; journal `journal-p3.txt`; screenshots `abu-fahd-p3-*.jpg`), in a fresh throwaway establishment seeded through the real forms (owner approved from `/admin`, سعد's join request left pending, employee سعد with a 4,000 salary on the 27th). Same tap rule as (a): goto / tap / fill / select count one each. Task 5 (the first instalment payment) was run between 4 and 6 as in the original (2 taps, unchanged).

| # | Task | Taps before → after | What changed on the path |
|---|---|---|---|
| 2 | زبون دفع لي 500 كاش | 7 → **5** | The home tile now reads «دفعة على اتفاقية», so he goes straight to «حركة جديدة» (no wrong turn); «سداد من عميل» with the helper under the list; «تم حفظ الحركة» on landing, the filters behind «تصفية», the new row at the top of the screen (022). |
| 4 | محمد بيدفع 6,000 على 3 دفعات | 13 → **10** | «اتفاقية مع محمد» and the category are prefilled once محمد is added; the «تمت إضافة الجهة» toast sits under the top bar (y = 93 px) and «حفظ» at y = 1530 px — no overlap (007); «عدد الأقساط» above «توليد» with the hint. |
| 6 | كم باقي على محمد؟ | 3 → **2** | The empty week card says what it is and links «كم باقي على عميل؟ افتح الجهات» → «محمد · لنا 4,000.00» (013, 014). |
| 10 | أبي أصرف راتب سعد | 5 → **5** | Same path, no confusion left: «صرف راتب», «راتب شهر أكتوبر 2026 — سعد العتيبي», «المتبقي من راتب الشهر», «الرواتب القادمة 4,000», «فتح ملف الموظف»; after «حفظ» he is back on سعد's page with «تم حفظ الحركة» (015, 016). |
| 13 | أعطي سعد دخول | 4 → **3** | The home shows «طلب انضمام جديد من سعد العتيبي» (017); «المزيد» → «دخول الموظفين» → «قبول»; the row reads «التعديل: غير مسموح» with the helper, the link-to-employee hint sits above it, the reset field is «(اختياري)» without an asterisk — nothing left to tap "to be safe" (020). |

Measured on the same run: the toast box never intersects «حفظ» at 390 px (R3); the ledger's newest row top is 413 px of 844 after a save (R4); every date field shows its caption «الأحد 11-10-2026» (R13); the dues strip is a two-column grid, page `scrollWidth` = 390 (R15); «إقفال» asks «سيُقفل سبتمبر 2026: …» (R12); the report renders above its one «عرض» form and the tab reads «المتأخرات حسب المدة» (R11). One note for the live deploy: an establishment created before part 3 keeps «دفعة من عميل» until the data migration runs — on this local stack it was applied by hand after the fact, which is exactly what `migrate deploy` does on Render.
