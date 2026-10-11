# أبو فهد — owner usability test (iPhone 390px) — 2026-10-11

Persona: 52, car-parts shop in Dammam, 3 employees, WhatsApp + calculator only, never used accounting software. Acts only on what the screen shows.
Driver: scratchpad/pw/do.mjs (one command = one tap). Screenshots: progress/v14/owner-test/abu-fahd-NNN-*.jpg

---
## Task 1 — "أول مرة أفتح البرنامج، وش أسوي؟"
Path:
- goto localhost:3000 → lands on «تسجيل الدخول للنظام» (shot 001-login). Logo, two fields «البريد الإلكتروني» / «كلمة المرور», link «نسيت كلمة المرور؟», button «تسجيل الدخول», link «ليس لديك حساب؟ تقديم طلب تسجيل». Clear — he knows this pattern from WhatsApp Web / bank apps.
- fill email, fill password, tap «تسجيل الدخول» → /owner «الرئيسية» (shot 002-home-first). 4 taps.
What he sees above the fold (390px): green header with logo «زخم», shop name «قطع غيار أبو ...» (truncated), person icon, logout icon. Title «الرئيسية». Three big cards: «حركة جديدة» (green, +), «تسجيل دفعة», «تسجيل حضور». Then a box «ابدأ هنا» with «إخفاء», text «أربع خطوات تجعل زخم مفيدًا من أول يوم. 0 من 4» and 4 rows: «سجّل أول حركة», «أضف جهة: عميلًا أو موردًا», «سجّل اتفاقية», «أضف موظفًا». Then cards «الرصيد الإجمالي 0.00 ر.س», «الصافي 0.00 ر.س — لا يمكن المقارنة بالشهر الماضي», «وارد هذا الشهر +0.00», «صادر هذا الشهر −0.00».
Bottom bar: «الرئيسية» · «إضافة» (green +) · «السجل» · «المستحقات» · «المزيد» (with a red badge «1»).
Understanding / hesitations:
- «حركة» — HESITATION. He does not say "حركة"; he says "قبض / صرف / دفعة / بيع / شراء". He guesses «حركة جديدة» = "أسجل شيء" because of the + and the green colour, and because «سجّل أول حركة» is step 1 of «ابدأ هنا».
- «تسجيل دفعة» — he thinks "دفعة" = payment from a customer (دفعة من زبون) — THIS is the word in his head for task 2. Ambiguity: is "زبون دفع لي كاش" a «حركة جديدة» or a «تسجيل دفعة»? He would honestly tap «تسجيل دفعة» first for a customer payment.
- «تسجيل حضور» — understood (موظف حضر).
- «أضف جهة: عميلًا أو موردًا» — «جهة» unknown word, but the suffix «عميلًا أو موردًا» explains it. He says «زبون» not «عميل», but عميل is understood. Good helper text.
- «سجّل اتفاقية» — unknown; he guesses "عقد؟" — no explanation next to it.
- «الصافي» / «الرصيد الإجمالي» — understood roughly. «لا يمكن المقارنة بالشهر الماضي» — fine.
- «المستحقات» in the tab bar — unknown word; he guesses "اللي لي أو اللي عليّ؟" Not sure which direction.
- «المزيد» with red «1» badge — he wonders "فيه شي ينتظرني؟" (this is سعد's join request, he does not know). He would tap it out of curiosity.
- «الوارد / الصادر» — understood (دخل / طلع).
- The «ابدأ هنا» checklist is the most helpful thing on the screen: it tells him order (حركة → جهة → اتفاقية → موظف). He would tap «سجّل أول حركة» first.
- Many charts/tables of zeros below — noise on first open but harmless.
What he would tap first: «حركة جديدة» (biggest green card) — or «المزيد» because of the red 1.
Sure what to do? Partly. He knows where to "record something". He does not know what «المستحقات» or «اتفاقية» are.
Taps: 4 (login). Screens: 001-login, 002-home-first.
- Curiosity tap on «المزيد» (red 1) → sheet «كل الأقسام» (shot 003-more-menu): «التقارير»; heading «العملاء والالتزامات»: «الجهات», «الاتفاقيات»; heading «الموظفون والحضور»: «الموظفون», «الحضور», «حسابات الدخول» (red badge 1 sits here); heading «الإعدادات»: «رمز الانضمام», «إقفال الأشهر», «التذكيرات», «حسابي».
  - HESITATION: the red «1» is on «حسابات الدخول» — he does not know what that is ("حسابات؟ دخول؟ يعني فلوس دخلت؟"). He would not open it now; nothing says "طلب انضمام" visibly (the a11y label says «طلب انضمام واحد» but the visible tile only shows the number). He thinks "أرجع له بعدين".
  - «الجهات» alone (without the helper «عميلًا أو موردًا» that the home checklist had) is opaque. «العملاء والالتزامات» heading helps a little: الجهات ≈ العملاء.
  - «الاتفاقيات», «إقفال الأشهر», «رمز الانضمام» — unknown words, he would leave them.
  - Closes sheet with ×.
Task 1 total taps: 5 (4 login + 1 المزيد). Outcome: knows where to record, does not know the vocabulary of the rest.

---
## Task 2 — "زبون دفع لي 500 ريال كاش اليوم."
Path:
1. Home → tap «تسجيل دفعة» (his word is «دفعة») → page «المستحقات» (shots 004/005-t2-dues). WRONG TURN. Screen: link «دفعة على اتفاقية غير مستحقة بعد؟ اختر من الاتفاقيات», day strip «متأخرة لا شيء / اليوم 2026-10-11 لا شيء / الاثنين…», red box «متأخرات — لا توجد متأخرات.», «مستحقات هذا الأسبوع — لا توجد مستحقات هذا الأسبوع.»
   - HESITATION: no field to type 500, no «زبون», nothing to tap except the link about «اتفاقية». He says: "وين أكتب المبلغ؟". The word «مستحقات» tells him nothing. He understands «متأخرات» (late payments) vaguely but it is empty.
   - The only link, «دفعة على اتفاقية غير مستحقة بعد؟», does not match "زبون دفع كاش" — he does not have an اتفاقية. Dead end.
   - Finding: the home card «تسجيل دفعة» leads to a list page with no way to record a simple payment. For a first-time user this card is a trap for the most common task.
2. tap «الرئيسية» → home. tap «حركة جديدة».
3. «حركة جديدة» form (shot 006-t2-new-tx): «النوع» two big buttons «صادر» (red, pre-selected) / «وارد»; «المبلغ *» (placeholder ر.س); «التاريخ *» today; «التصنيف *» drop-down; links «+ إضافة تصنيف» «تعديل التصنيفات»; «طريقة الدفع *» (نقد default); «+ تفاصيل أكثر»; buttons «حفظ» (green) and «حفظ وإضافة أخرى».
   - Hesitation (small): «صادر» is pre-selected in red. He must notice and switch to «وارد». "صادر/وارد" — he gets it (طلع/دخل) after a second. He would rather see «قبض / صرف» or «دخل لي / طلع مني».
   - tap «وارد» → category list changes to: «مبيعات», «دفعة من عميل», «رصيد افتتاحي / رأس مال», «أخرى». HESITATION: مبيعات or دفعة من عميل? Both fit "زبون دفع لي". He picks «دفعة من عميل» because it has the word دفعة. (If this were a direct sale he would not know which is "right".) «رصيد افتتاحي / رأس مال» means nothing to him.
   - fill «المبلغ» 500; select «دفعة من عميل»; نقد already selected (good — matches "كاش"). Did not open «تفاصيل أكثر» (he does not know what الجهة/النشاط are and the task did not need a name).
   - tap «حفظ» → lands on «السجل» (shot 008-t2-after-save). NO success message visible. Above the fold: title «السجل», button «+ إضافة حركة», tabs «الحركات» / «الأنشطة», then a big filter form («من تاريخ», «إلى تاريخ», «النوع», «التصنيف», «طريقة الدفع», «بحث», «تطبيق»). He has to scroll past the whole filter (shot 009) to see «إجمالي الوارد +500.00 ر.س» and the row «وارد · دفعة من عميل · نقد · أضافه: فهد القحطاني · +500.00 ر.س · 2026-10-11 1448/04/30 هـ».
   - HESITATION: "انحفظت ولا لا؟" — the first thing he sees after saving is a form with empty date fields and a «تطبيق» button; he fears it is asking him to fill something again. Only after scrolling does he see the +500 and feel sure.
   - «الأنشطة» tab — unknown word (نشاط؟).
Taps: time-to-form 3 (1 wrong turn: «تسجيل دفعة» → المستحقات, then الرئيسية, then حركة جديدة). Total ≈ 7 taps (incl. وارد, مبلغ, تصنيف, حفظ) — real count; the driver counter was reset by a driver restart in the middle of this task (see "Driver notes").
Sure he succeeded? Yes, but only after scrolling: the green +500.00 row and «عدد السجلات 1». Nothing said «تم الحفظ».
Shots: 004/005-t2-dues, 006-t2-new-tx, 007-t2-filled, 008-t2-after-save, 009-t2-list-scrolled.

---
## Task 3 — "اشتريت بضاعة من المورد ابو خالد بـ 1,200 ريال بالتحويل."
Path:
1. From السجل, taps the green «إضافة» tab in the bottom bar (he now knows "+ = أسجل") → sheet «إضافة» (shot 010-t3-add-sheet): big green «+ حركة جديدة», then tiles «تسجيل دفعة», «اتفاقية جديدة», «جهة جديدة», «نشاط جديد», «موظف جديد».
   - HESITATION: «نشاط جديد» — "نشاط؟ وش يعني؟" Unknown. «جهة جديدة» — he half-remembers "جهة = عميل أو مورد" from the home checklist, thinks "ممكن أسجل أبو خالد هنا؟" but he wants to record the purchase, so «حركة جديدة».
2. tap «حركة جديدة» → form. Types «المبلغ» 1200. Opens «التصنيف» looking for «مشتريات» → NOT THERE: list shows «مبيعات / دفعة من عميل / رصيد افتتاحي / أخرى». (shot 011-t3-sticky-type)
   - WRONG STATE: the form remembered «وارد» from the previous entry (the type is sticky), so a purchase would have been saved as income if he had just picked «أخرى». He only noticed because «مشتريات» was missing. Real risk: he picks «أخرى» and the 1,200 goes in as وارد.
3. tap «صادر» → list now has «مشتريات». select «مشتريات»; select «طريقة الدفع» = «تحويل بنكي» (matches "بالتحويل" — good).
4. Wants to write «ابو خالد». Only place: «+ تفاصيل أكثر (الجهة، النشاط، الملاحظة)». HESITATION: «الجهة» is not his word for المورد, but the three words in brackets give him a hint that "the name" is in there. tap → fields «الجهة (اختياري)» drop-down [«بدون جهة», «أخرى (اكتب الاسم)», «+ جهة جديدة»], «ضمن نشاط (اختياري)» [«بدون نشاط»], «ملاحظة (اختياري)» (shot 012).
   - He picks «أخرى (اكتب الاسم)» (says "write the name" — simplest). A field «اسم الجهة» appears with helper «اسم العميل أو المورد» (shot 013) — GOOD helper, now he is sure الجهة = العميل/المورد. He does not understand that «+ جهة جديدة» would have saved أبو خالد for next time; «أخرى» is a one-off name. Consequence: أبو خالد is not a saved supplier (will matter later if he wants "كم اشتريت من أبو خالد").
   - «ضمن نشاط» — meaningless to him, skipped.
5. fill «اسم الجهة» ابو خالد, «ملاحظة» بضاعة, tap «حفظ» → السجل again (shot 014-t3-after-save): «إجمالي الصادر −1,200.00 ر.س», «الصافي −700.00 ر.س», row «صادر · مشتريات · تحويل بنكي · ابو خالد · −1,200.00».
   - Again no «تم الحفظ» message; the filter form is on top; he scrolls to confirm.
   - He notices «الصافي −700.00 ر.س» in red and thinks "أنا خسران؟" — correct arithmetic but a shock on day one (he has no opening balance; «رصيد افتتاحي» exists as a category but nothing invited him to use it).
Taps: time-to-form 2 (إضافة → حركة جديدة). Total 11 (incl. the sticky-type detour: 1 extra tap on صادر that should have been the default).
Sure he succeeded? Yes after scrolling — row shows ابو خالد and −1,200.
Shots: 010-t3-add-sheet, 011-t3-sticky-type, 012-t3-more-details, 013-t3-party-other, 014-t3-after-save.

---
## Task 4 — "أبي أسجل أن الزبون محمد بيدفع لي 6,000 على 3 دفعات، كل شهر 2,000."
Path:
1. tap «إضافة» (bottom bar) → sheet. HESITATION: his words are «زبون» and «دفعات». Tiles: «تسجيل دفعة» (burned him in task 2), «اتفاقية جديدة», «جهة جديدة», «نشاط جديد», «موظف جديد». He thinks "اتفقت مع محمد على دفعات → اتفاقية؟" and guesses «اتفاقية جديدة». (If he had not guessed, nothing on the sheet says "دفعات/أقساط".)
2. tap «اتفاقية جديدة» → «نوع الاتفاقية» (shot 015): «دفعات محددة — مبلغ إجمالي مقسّم على جدول دفعات بتواريخ معلومة.» / «اتفاقية مفتوحة — تسجّل الدفعات كما تصل، بلا جدول، والإجمالي اختياري.» — VERY GOOD: the two sentences explain the choice in his words (دفعات, جدول). He is now sure he is in the right place. tap «دفعات محددة».
3. Form (shot 016): «الجهة *» [«اختر الجهة», «+ جهة جديدة»], «الاتجاه *» «سيدفع لنا» / «سندفع له», «عنوان الاتفاقية *» (helper «مثل: عقد توريد، أقساط سيارة، إيجار المستودع»), «المبلغ الإجمالي *», «التصنيف *» (helper «تُسجَّل كل دفعة تحت هذا التصنيف، ويمكن تغييره عند التسجيل»), «تاريخ البدء *», «التذكير قبل الاستحقاق (أيام)» 3 (helper «يظهر القسط «مستحقًا» قبل موعده بهذا العدد من الأيام»), «ملاحظات», «جدول الأقساط»: «أقساط متساوية» / «تواريخ ومبالغ مخصصة», «عدد الأقساط» 12, «التكرار» شهري, «توليد الجدول», «إضافة قسط», «مجموع الأقساط: 0.00», «حفظ» (disabled).
   - «الجهة» again — he now knows it means the customer. select «+ جهة جديدة» → inline fields «اسم الجهة الجديدة», «نوع الجهة» (عميل/مورد/أخرى, عميل default), «حفظ»/«إلغاء» (shot 017). fill محمد, tap «حفظ» → toast «تمت إضافة الجهة»; dropdown shows «محمد»; «الاتجاه» becomes «محمد سيدفع لنا» (auto-selected) / «محمد سندفع له» (shot 018). EXCELLENT — the name in the label removes all doubt about direction.
   - HESITATION: «عنوان الاتفاقية *» — he has to invent a title; the examples (عقد توريد، أقساط سيارة) are not his case. He types «محمد ٣ دفعات». Required field for nothing he needs.
   - HESITATION: «التصنيف *» required again (he picks «دفعة من عميل»). He does not see why an agreement needs a تصنيف.
   - «التذكير قبل الاستحقاق (أيام)» — understood thanks to the helper, left at 3.
   - «عدد الأقساط» defaults to 12 — he changes to 3. «قسط» — he says "دفعة"; قسط sounds like a bank loan to him but he gets it.
   - tap «توليد الجدول» → 3 rows «القسط 1/2/3», «تاريخ الاستحقاق» 2026-10-11 / 11-11 / 12-11 with Hijri, «المبلغ» 2000.00 each, «مجموع الأقساط: 6,000.00 ر.س ✓ المجموع يطابق الإجمالي» (shot 020). Clear. Note: first instalment dated TODAY — he expected next month, but accepts.
4. BUG: the green toast «تمت إضافة الجهة» stays on screen (sticky, with ×) and sits exactly over the «حفظ» button at the bottom of the form (shot 021-t4-bottom: the green button edge is visible behind the toast). The driver could not tap «حفظ» until the toast was closed. A real user would tap the toast's × or be stuck wondering why حفظ does not respond. 1 extra tap.
5. tap «إغلاق» (toast ×), tap «حفظ» → agreement page «محمد ٣ دفعات» badge «جارية» (shot 022): «الجهة محمد · سيدفع لنا», «المبلغ الإجمالي 6,000.00», «المدفوع 0.00 ر.س (سُدّد 0 من 3)», «المتبقي 6,000.00 ر.س», progress bar with legend «مدفوع / مدفوع جزئياً / مستحق / متأخر / قادم», buttons «تعديل», «أرشفة الاتفاقية», «إلغاء الاتفاقية» (big red), then «الأقساط»: «القسط 1 — مستحق اليوم — مستحق — المبلغ 2,000 — المدفوع 0 — المتبقي 2,000 — [تسجيل دفعة]», «القسط 2 بعد 31 يوماً قادم», «القسط 3 بعد 61 يوماً قادم».
   - He is SURE: «المتبقي 6,000.00» and 3 أقساط with dates. «جارية» understood. The red «إلغاء الاتفاقية» right next to «تعديل» worries him ("لا ألمسه").
   - «أرشفة» — unknown word.
Taps: time-to-form 3 (إضافة → اتفاقية جديدة → دفعات محددة). Total 13 (incl. 1 toast-close tap forced by the overlay bug).
Shots: 015-t4-plan-new, 016-t4-fixed-form, 017-t4-new-party, 018-t4-party-added, 019-t4-schedule-before, 020-t4-schedule-generated, 021-t4-bottom, 022-t4-after-save.

---
## Task 5 — "محمد دفع الدفعة الأولى."
Path (he is still on the agreement page from task 4):
1. tap «تسجيل دفعة» under «القسط 1» → page «تسجيل دفعة» (shot 023): «القسط 1 من «محمد ٣ دفعات»», «الجهة محمد», «النوع وارد», «المتبقي على هذا القسط 2,000.00», «المتبقي على الاتفاقية 6,000.00», «ما يزيد عن هذا القسط يُحتسب للأقساط التالية.», link «محمد ٣ دفعات — عرض الاتفاقية», «المبلغ» prefilled 2000.00, «التاريخ» today, «التصنيف» = دفعة من عميل (prefilled), «طريقة الدفع» نقد, «ضمن نشاط», «ملاحظة», «حفظ».
   - Everything prefilled. No hesitation. He checks the amount and taps «حفظ».
2. tap «حفظ» → back on the agreement page with green «تم تسجيل الدفعة» (shot 024). «المدفوع 2,000.00 ر.س (سُدّد 1 من 3)», «المتبقي 4,000.00 ر.س», bar: القسط 1 مدفوع (green), القسط 1 row shows «مدفوع», «السدادات: 2026-10-11 2,000.00 ر.س أضافه: فهد القحطاني». «إلغاء الاتفاقية» button disappeared, replaced by «لا يمكن إلغاء اتفاقية عليها دفعات، ويمكن أرشفتها.»
   - SURE he succeeded: yes — explicit message + numbers changed.
Taps: 2 total (1 to form, 1 save). Best flow in the whole test.
Shots: 023-t5-pay-form, 024-t5-after-save.

---
## Task 6 — "كم باقي على محمد؟"
Path (starting from home, shot 025-t6-home; «ابدأ هنا» now says «3 من 4» with ✓ on three steps — nice feedback):
1. tap «المستحقات» (guess: "باقي عليه" ≈ "مستحق لي") → page (shot 026): same empty page as task 2 — «متأخرة لا شيء», «اليوم … لا شيء», «لا توجد متأخرات.», «لا توجد مستحقات هذا الأسبوع.»
   - HESITATION / CONFUSION: "محمد عليه 4,000 وهنا يقول لا شيء؟" The page only shows this week; محمد's next instalment is in 31 days, so his name is nowhere. Nothing on the page says "لعرض كل الجهات / الاتفاقيات اذهب إلى…" except the one link about «دفعة على اتفاقية غير مستحقة بعد؟».
2. tap that link «اختر من الاتفاقيات» → page «الاتفاقيات» with status «اختر الاتفاقية لتسجيل الدفعة» (shot 027): filters «الاتجاه», «الحالة» (قادمة/جارية/مكتملة/مؤرشفة ⁄ منتهية/ملغاة), «الجهة» (محمد), «تطبيق», then a card «محمد ٣ دفعات · جارية · محمد · سيدفع لنا · المبلغ الإجمالي 6,000.00 · المدفوع 2,000.00 · المتبقي 4,000.00 ر.س · سُدّد 1 من 3 · القسط القادم: 2026-11-11 1448/06/01 هـ 2,000.00 ر.س بعد 31 يوماً».
   - ANSWER FOUND: «المتبقي 4,000.00 ر.س». He is sure.
   - Note: he arrived via a link meant for "recording a payment" (status bar says «اختر الاتفاقية لتسجيل الدفعة») — slightly confusing but harmless.
   - He never found «الجهات → محمد» (a per-customer page); he does not know that exists. If محمد had two agreements, he would have to add them up himself.
Taps: time-to-answer 3. Total 3. One wrong-ish turn (المستحقات was empty for a debt that exists).
Shots: 025-t6-home, 026-t6-dues, 027-t6-plans-list.

---
## Task 7 — "واحد من زبائني (خالد الدوسري) يدفع متى ما يتيسر له، ما فيه مواعيد. أبي أتابع كم دفع." (paid 300 so far)
Path (he is on the «الاتفاقيات» list from task 6):
1. tap «اتفاقية جديدة» → «نوع الاتفاقية». The second card «اتفاقية مفتوحة — تسجّل الدفعات كما تصل، بلا جدول، والإجمالي اختياري.» is exactly his sentence ("متى ما يتيسر، ما فيه مواعيد"). No hesitation. tap it.
2. Form (shot 028): «الجهة *», «الاتجاه», «عنوان الاتفاقية *», «التصنيف *», «تاريخ البدء», «تاريخ الانتهاء المتوقع (اختياري)», «إجمالي المبلغ (اختياري)» with helper «اتركه فارغًا إذا كان المبلغ غير محدد.» (good), «ملاحظات», «حفظ».
   - «+ جهة جديدة» → fill «خالد الدوسري» → «حفظ» → toast «تمت إضافة الجهة» (closed it again with × — same overlay problem as task 4), direction auto «خالد الدوسري سيدفع لنا».
   - HESITATION again: «عنوان الاتفاقية *» required — he just types the customer's name again. «التصنيف *» — picks «دفعة من عميل» again. Both feel like paperwork to him.
3. tap «حفظ» → page «خالد الدوسري» badges «مفتوحة» «جارية» (shot 030): «المستلم حتى الآن 0.00 ر.س», an inline box «تسجيل دفعة» («المبلغ», «التاريخ», «طريقة الدفع», «ملاحظة», button «تسجيل دفعة»), «تعديل», «إنهاء الاتفاقية», «الدفعات — لا توجد دفعات بعد.»
   - VERY GOOD: the payment form is right on the page; no hunting.
4. fill «المبلغ» 300 → tap «تسجيل دفعة» → «تم تسجيل الدفعة», «المستلم حتى الآن 300.00 ر.س», table «الدفعات»: «2026-10-11 1448/04/30 هـ · +300.00 ر.س · نقد · تعديل الحركة» (shot 031).
   - SURE: yes. «المستلم حتى الآن 300.00» answers "كم دفع" directly.
   - Minor: «تعديل الحركة» — the word «حركة» again for what he calls a دفعة.
Taps: time-to-form 2. Total 11 (incl. 1 toast-close).
Shots: 028-t7-open-form, 029-t7-filled, 030-t7-open-plan, 031-t7-after-pay.

---
## Task 8 — "أبي أضيف موظفي سعد، راتبه 4,000، يوم الصرف 27."
Path:
1. tap «إضافة» → tap «موظف جديد» (word matches) → form «موظف جديد» (shot 032). Sections «البيانات» («اسم الموظف» helper «كما سيظهر في قسيمة الراتب وكشف الحساب», «المسمى الوظيفي», «تاريخ المباشرة» today, «رقم الجوال», «البريد الإلكتروني», «ملاحظات»), «الدوام» («أيام العمل» Sun–Thu checked, «بداية الدوام», «نهاية الدوام», «مهلة التأخير (دقائق)» helper «يُحتسب «متأخر» تلقائيًا إذا سُجّل الحضور بعد بداية الدوام بأكثر من هذه المهلة»), «الراتب» (long paragraph «عند الحفظ تُنشأ مستحقات الراتب الشهرية تحت تصنيف «رواتب» وتظهر في المستحقات «علينا»، بدءًا من أول موعد صرف قادم، ولا تُنشأ لأشهر سابقة…», «الراتب الأساسي (اختياري)», «البدلات», «يوم صرف الراتب» helper «من 1 إلى 31؛ في الأشهر الأقصر يُصرف في آخر يوم من الشهر»), «حساب الدخول» («حساب الدخول المرتبط» = «بدون حساب دخول» only option; helper «يتيح للموظف تسجيل حضوره وانصرافه والاطلاع على بياناته فقط»), note «لا تُحفظ أرقام الهوية أو الإقامة أو الحساب البنكي في زخم.», «حفظ».
   - Long form but every field he needs has a plain label. He fills only «اسم الموظف» سعد, «الراتب الأساسي» 4000, «يوم صرف الراتب» 27.
   - HESITATION: the «الراتب» paragraph is dense ("مستحقات الراتب الشهرية… تظهر في المستحقات «علينا»") — he skims it; he catches "رواتب" and "موعد صرف". It is the first time the screen tells him what «المستحقات» means («علينا») — but only here.
   - «حساب الدخول المرتبط» — he reads the helper and thinks "هذا عشان سعد يدخل البرنامج؟ بس ما فيه إلا بدون حساب". He does not know سعد's request is waiting under «المزيد» → «حساب الدخول» badge 1. Missed link between the two screens.
   - «مهلة التأخير» — understood from the helper, but skipped (no start time set — he will discover in task 9 what that means).
2. tap «حفظ» → page «سعد» (shot 034): buttons «صرف راتب» (green), «تعديل», «كشف الشهر», «كشف الحساب», «إنهاء الخدمة»; «البيانات»; «الراتب الأساسي 4,000.00 · إجمالي الراتب 4,000.00 · يوم صرف الراتب 27»; «الحضور خلال آخر 12 شهرًا» (all «قبل تاريخ التعيين»); «هذا الشهر — أكتوبر 2026»: «صافي الراتب 4,000 · المدفوع 0 · المتبقي 4,000 · تاريخ الاستحقاق 2026-10-27 1448/05/16 هـ»; «قسيمة الراتب» list: نوفمبر 2026, أكتوبر 2026.
   - SURE: yes — name, 4,000 and 27 are on screen; «صرف راتب» button is where he expects to come back for task 10. No «تم الحفظ» message, but the page itself is proof.
   - «كشف الحساب» vs «كشف الشهر» — he does not know the difference.
Taps: time-to-form 2. Total 6.
Shots: 032-t8-staff-new, 033-t8-filled-salary, 034-t8-after-save.

---
## Task 9 — "سعد تأخر اليوم."
Path:
1. tap «الرئيسية» → tap «تسجيل حضور» (home card, word matches) → page «الحضور» (shot 035): tabs «يومي» / «شهري», «التاريخ» today + «تطبيق», card «سعد — غير مسجل» with six big choices «حاضر / متأخر / غائب / إجازة / عن بُعد / عطلة», «الحضور» (time), «الانصراف» (time), «ملاحظة», «حفظ الحضور» (disabled until a choice).
   - No hesitation: «متأخر» is his exact word.
2. tap «متأخر» → tap «حفظ الحضور» → toast «تم حفظ الحضور», badge on سعد changes «غير مسجل» → «محسوب» (shot 036).
   - HESITATION (small): «محسوب» — "محسوب وش يعني؟ محسوب عليه؟" He expected «تم» or «متأخر». Also «عن بُعد» is odd for a parts shop but harmless.
   - He did not enter a time; nothing asked him to.
   - SURE: yes, «تم حفظ الحضور».
Taps: time-to-form 2. Total 4.
Shots: 035-t9-attendance, 036-t9-after-save.

---
## Task 10 — "أبي أصرف راتب سعد."
Path:
1. tap «المزيد» → tap «الموظفون» → list (shot 037): «إضافة موظف», tabs «نشطون» / «سابقون», row «سعد · تاريخ المباشرة: 2026-10-11 · إجمالي الراتب 4,000.00 ر.س». (He did not try «تسجيل دفعة»/«المستحقات» on home — he remembered the green «صرف راتب» button from task 8. A first-timer who had not seen it would likely tap home «تسجيل دفعة» → المستحقات and find NOTHING, because the salary is due on the 27th, outside "this week".)
2. tap «سعد» → tap «صرف راتب» → page titled «تسجيل دفعة» (shot 038): «راتب شهري — سعد · أكتوبر 2026», «الجهة سعد», «النوع صادر», «المتبقي على هذا القسط 4,000.00», «المتبقي على الاتفاقية 8,000.00 ر.س», «ما يزيد عن هذا القسط يُحتسب للأقساط التالية.», link «راتب شهري — سعد — عرض الاتفاقية», «المبلغ» 4000.00 prefilled, «التصنيف» رواتب prefilled, «طريقة الدفع» نقد, «حفظ».
   - HESITATION: "اتفاقية؟ أنا ما سويت اتفاقية مع سعد" and "المتبقي على الاتفاقية 8,000 — ليش 8,000؟ راتبه 4,000!" (it is Oct + Nov). The title says «تسجيل دفعة» not «صرف راتب». The word «قسط» for a salary is wrong in his head ("الراتب مو قسط"). He is briefly worried he is paying the wrong thing, but «راتب شهري — سعد · أكتوبر 2026» and 4,000 reassure him.
3. tap «حفظ» → page «راتب شهري — سعد» «جارية» (shot 039): «تم تسجيل الدفعة», «المبلغ الإجمالي 8,000.00», «المدفوع 4,000.00 (سُدّد 1 من 2)», «المتبقي 4,000.00», bar «أكتوبر 2026 مدفوع / نوفمبر 2026 قادم», «تُدار هذه الاتفاقية من ملف الموظف — فتح ملف الموظف».
   - SURE: yes (green message + «أكتوبر 2026 مدفوع»). But he landed on an "agreement" page he never asked for, with «المتبقي 4,000» — he reads that as "باقي عليّ 4,000 لسعد" (it is November's salary, not yet due). Misleading for a non-technical owner.
Taps: time-to-form 4. Total 5.
Shots: 037-t10-staff-list, 038-t10-salary-form, 039-t10-after-save.

---
## Task 11 — "وش صرفت هذا الشهر؟ أبي أطبعه."
Path:
1. tap «الرئيسية», scroll (shot 040): «صادر هذا الشهر −5,200.00 ر.س» answers the first half immediately. Below: new block «مستحقات هذا الأسبوع — عرض كل المستحقات — من اليوم حتى 2026-10-17 لنا: 0.00 ر.س علينا: 0.00 ر.س» (first time «لنا / علينا» appears next to المستحقات — this is the explanation he needed in task 6, but it only appears once data exists), «الرصيد حسب طريقة الدفع: نقد −1,200.00 / تحويل بنكي −1,200.00» (he pauses: "نقد بالسالب؟" — because no opening balance), «آخر 6 أشهر» table, «المصروفات حسب الفئة هذا الشهر: رواتب −4,000.00 76.9% / مشتريات −1,200.00 23.1%».
   - No «طباعة» anywhere on home. He looks for the word "طباعة" / a printer icon — none.
2. tap «المزيد» → tap «التقارير» (guess: "التقرير يعني ورقة أطبعها") → page «التقارير» (shot 041): tabs «حسب التصنيف» / «أعمار المستحقات»; «الشهر» = أكتوبر 2026 + big green «تطبيق»; «فترة مخصصة» من/إلى + «تطبيق»; «بحسب الجهة» + «تطبيق». Three «تطبيق» buttons above the fold and NO report visible without scrolling.
   - HESITATION: he taps the big green «تطبيق» (1 wasted tap) because it looks like "the button". Nothing changes (URL gets ?month=2026-10).
   - «أعمار المستحقات» — meaningless ("أعمار؟").
3. scroll (shot 042): «تصدير Excel», «طباعة», «الوارد حسب التصنيف: دفعة من عميل +2,800.00», «الصادر حسب التصنيف: رواتب −4,000.00 / مشتريات −1,200.00 / إجمالي الصادر −5,200.00», «الصافي −2,400.00 ر.س».
4. tap «طباعة» → nothing visible happened in the test browser (headless: the print dialog cannot be seen; shot 043 identical to 042). On a real iPhone this would open the share/print sheet. NOT VERIFIED — lead should check manually that the printed page is readable.
   - He is only partly sure: the report shows the month and the totals, but it is a summary by category, not the list of purchases he had in mind ("وش صرفت" = which items). The itemised list lives in «السجل», which has no «طباعة» button that he saw.
Taps: time-to-report 3 (الرئيسية, المزيد, التقارير). Total 5 (incl. 1 wasted تطبيق).
Shots: 040-t11-home-scrolled, 041-t11-reports, 042-t11-reports-scrolled, 043-t11-after-print.

---
## Task 12 — "غلطت في مبلغ حركة الشهر الماضي، أبي أعدلها." (setup: 350 on 20 Sept → lock Sept → fix to 380)
Path:
A. Record the forgotten 350 (20 Sept):
1. tap «إضافة» → «حركة جديدة». Type is «صادر» (sticky from the salary — correct by luck this time). fill «المبلغ» 350, «التاريخ» 2026-09-20 (the date field is a native date picker shown as mm/dd/yyyy — American order; he has to think "شهر/يوم/سنة" — HESITATION, he is used to يوم/شهر/سنة), select «مشتريات», tap «حفظ» → السجل: «إجمالي الصادر −5,550.00», «عدد السجلات 6»; the Sept row is last: «صادر مشتريات · نقد · −350.00 ر.س · 2026-09-20 1448/04/09 هـ» (shot 045). 6 taps.
B. "Close" September:
2. He wants "أقفل الشهر عشان ما أحد يغير". tap «المزيد» → he scans «الإعدادات»: «رمز الانضمام», «إقفال الأشهر», «التذكيرات», «حسابي». «إقفال» ≈ "قفل" — he guesses right. tap «إقفال الأشهر» → page (shot 046): «بعد إقفال الشهر لا يمكن إضافة أو تعديل أو حذف حركاته.», cards per month: «أكتوبر 2026 مفتوح — لا يمكن إقفال الشهر الحالي أو شهر قادم.», «سبتمبر 2026 مفتوح [إقفال]», «أغسطس 2026 مفتوح [إقفال]», … back to نوفمبر 2024. Clear sentence; he understands.
3. tap «إقفال» (سبتمبر) → instantly «سبتمبر 2026 مقفل أقفله: فهد القحطاني» + button «إلغاء الإقفال» (shot 047). NO confirmation before locking (but there IS one before unlocking — asymmetric; a mis-tap on the wrong month locks it silently). He is sure: «مقفل».
C. Fix 350 → 380:
4. tap «السجل», scroll to the Sept row (shot 048): the pencil/trash icons are GONE; instead a grey badge «🔒 شهر مقفل» and a link «إقفال الأشهر». No sentence says "لتعديلها افتح الشهر أولاً" — but the lock badge + the link next to it are enough of a hint.
   - He taps «شهر مقفل» (the badge) — nothing happens (1 wasted tap). Then taps the link «إقفال الأشهر».
   - UNDERSTOOD? Yes: "الشهر مقفل، لازم أفتحه". He connects the badge to what he just did. A user who had NOT just locked the month himself (e.g. a staff member) would see «شهر مقفل» with no explanation of who/why.
5. → locks page, tap «إلغاء الإقفال» → dialog «إلغاء الإقفال: سبتمبر 2026 — سيُفتح الشهر للإضافة والتعديل من جديد لكل المستخدمين. هل تريد المتابعة؟» [تأكيد] [إلغاء] (shot 050). Understood. tap «تأكيد» → «سبتمبر 2026 مفتوح».
6. tap «العودة إلى السجل» (helpful link at top of the locks page) → scroll → tap pencil «تعديل» on the Sept row → «تعديل حركة» form (shot 051), prefilled 350.00 / 2026-09-20 / مشتريات / نقد. fill «المبلغ» 380, tap «حفظ» → السجل: «إجمالي الصادر −5,580.00», row «−380.00 ر.س 2026-09-20» (shot 052). No «تم التعديل» message, but the number changed.
   - Observation (corrected after the second pass): the «الجهة (اختياري)» list DOES offer the saved parties (خالد الدوسري, محمد, سعد) in a grouped list — the test driver's outline hid optgroup children. What is genuinely absent is «ابو خالد» from task 3, because he was typed via «أخرى (اكتب الاسم)», so he can never be picked again and has no page under «الجهات».
7. He re-locks: «المزيد» → «إقفال الأشهر» → «إقفال» → «سبتمبر 2026 مقفل» (shot 053). 3 taps.
Error messages seen: none as text; the lock state is shown as a badge, not a message. He never saw a sentence like "لا يمكن تعديل حركة في شهر مقفل" because the app hides the edit button instead.
Taps: setup 6; lock 3; fix: 1 (السجل) + 1 wasted (badge) + 1 (link) + 2 (إلغاء الإقفال + تأكيد) + 1 (العودة) + 1 (تعديل) + 2 (380 + حفظ) = 9; re-lock 3. Total 21.
Sure? Yes at each step (مقفل / مفتوح / −380.00).
Shots: 044-t12-sept-entry, 045-t12-list-sept-row, 046-t12-locks, 047-t12-lock-tapped, 048-t12-locked-row, 049/050-t12-unlock-dialog, 051-t12-edit-form, 052-t12-after-edit, 053-t12-relocked.

---
## Task 13 — "أبي أعطي موظفي سعد دخول للبرنامج عشان يسجل الحركات."
Path:
1. tap «المزيد» → he remembers the red «1» on «حسابات الدخول» and the word «دخول» matches "دخول للبرنامج". tap it → page «حسابات الدخول» (shot 054): «طلبات الانضمام»: «سعد العتيبي · saad@zakham-test.sa · قيد المراجعة · مُوثّق · 2026-10-11 [قبول] [رفض]»; «الموظفون — لا يوجد موظفون بعد.»
   - He understands at once: "سعد مرسل طلب" (surprise — he did not know سعد had done that from his phone). «قيد المراجعة», «مُوثّق» — he gets قيد المراجعة; «مُوثّق» is unclear ("موثق وش؟ الإيميل؟").
   - CONFUSION: «الموظفون — لا يوجد موظفون بعد.» — "أنا سجلت سعد قبل شوي!" The word «الموظفون» here means login accounts, while «الموظفون» under «المزيد» means the HR record he created in task 8. Same word, two lists.
2. tap «قبول» → request disappears («لا توجد طلبات انضمام.»), سعد moves to «الموظفون»: «معتمد · مُوثّق», buttons «السماح بالتعديل», «تعطيل», field «كلمة مرور جديدة للموظف *», «إعادة تعيين كلمة المرور» (shot 055). No «تم القبول» toast; the status badge «معتمد» is the only confirmation.
   - HESITATION: "عشان يسجل الحركات" — does he need «السماح بالتعديل»? Nothing says "الموظف يستطيع الإضافة دائمًا؛ هذا الزر للتعديل فقط". He taps it to be safe (shot 056): the button turns solid green, no text changes, no «مسموح/غير مسموح» label. He is NOT sure whether green = allowed or = "tap to allow". (Real owners may not want staff to edit — the default-on-tap is risky.)
   - HESITATION: «كلمة مرور جديدة للموظف *» with a red asterisk looks like a required field he forgot — he wonders "لازم أحط له كلمة مرور؟". He leaves it.
   - MISSED LINK: nothing connects this login to the employee record «سعد» from task 8 («حساب الدخول المرتبط» on the staff form). He does not know the two سعد's are separate and will remain unlinked. The screen never suggests "اربطه بملف الموظف".
   - He never saw / needed «رمز الانضمام» because سعد already had the code; a first-time owner whose staff had NOT yet signed up would have to discover «رمز الانضمام» under الإعدادات with no hint on this page.
Taps: time-to-screen 2. Total 4 (incl. the uncertain «السماح بالتعديل»).
Sure? Half — «معتمد» yes; whether سعد can "يسجل" now: he assumes so.
Shots: 054-t13-logins, 055-t13-after-accept, 056-t13-after-allow-edit.

---
## Task 14 — "أبي أخفي تصنيف ما أستخدمه." (hid «مواصلات»)
Path:
1. tap «إضافة» → «حركة جديدة» (he remembers seeing «تعديل التصنيفات» inside the form; there is no «التصنيفات» entry under «المزيد» → الإعدادات — HESITATION: he first scanned المزيد for the word تصنيفات and did not find it, then recalled the form).
2. tap «تعديل التصنيفات» → the form expands in place (shot 057): chips «إيجار ×», «رواتب ×», «مشتريات ×», … «أخرى ×» jiggling (iOS-style), button «تم», link «المزيد (إعادة ترتيب، إعادة تسمية، إظهار)».
   - HESITATION: the × looks like DELETE. "هذا يحذف التصنيف؟ وحركاتي القديمة؟" Nothing on the chip says إخفاء (only the a11y label does).
3. tap × on «مواصلات» → dialog «إخفاء التصنيف مواصلات — إخفاء التصنيف «مواصلات»؟ الحركات القديمة تحتفظ به.» [تأكيد] [إلغاء] (shot 058). GOOD: the sentence answers exactly his fear (إخفاء, not حذف; old entries keep it).
4. tap «تأكيد» → «مواصلات» leaves the drop-down and the active chips; a new list «التصنيفات المخفية: مواصلات [إظهار]» appears (shot 059). tap «تم» to close.
   - SURE: yes — it is gone from the list and sits under «المخفية» with an «إظهار» button to undo.
   - He noticed that the chips are only the «صادر» categories (type is صادر); he did not realise وارد has its own list.
Taps: time-to-editor 3. Total 5 (إضافة, حركة جديدة, تعديل التصنيفات, × [via eval — see Driver notes], تأكيد) + 1 «تم».
Shots: 057-t14-categories, 058-t14-after-hide, 059-t14-after-confirm.

---
## Task 15 — "وش معنى «المستحقات»؟ وش الفرق بينها وبين «الاتفاقيات»؟"
What he did: tapped «المستحقات» (bottom bar), then «المزيد» → «الاتفاقيات», then «الجهات», then «التذكيرات», reading every sentence.
What the screens say:
- «المستحقات» page (shot 060): title, link «دفعة على اتفاقية غير مستحقة بعد؟ اختر من الاتفاقيات», day strip, «متأخرات — لا توجد متأخرات.», «مستحقات هذا الأسبوع — من اليوم حتى 2026-10-17 — لا توجد مستحقات هذا الأسبوع.» NO sentence defines the word. No "لنا/علينا" here when empty. The empty state does not say "هنا تظهر الأقساط والرواتب التي يحين موعدها" — so the page looks useless to him ("فاضية دايم").
  - His guess after reading: "المستحقات = الأشياء اللي لها موعد هالأسبوع — متأخرة أو قريبة". He only reached that because the days are listed. He still cannot tell whether it is money owed TO him or BY him.
- Home (shot 040, once data exists): «مستحقات هذا الأسبوع … لنا: 0.00 ر.س علينا: 0.00 ر.س» — the ONLY place that hints at the meaning (لنا/علينا). It is a summary line, not an explanation.
- «الاتفاقيات» page (shot 061): title, «اتفاقية جديدة», filters «الاتجاه» (سيدفع لنا / سندفع له), «الحالة», «الجهة», then 3 cards: «راتب شهري — سعد · جارية · سندفع له · المتبقي 4,000 · القسط القادم 2026-11-27 بعد 47 يوماً», «خالد الدوسري · مفتوحة · جارية · المستلم: 300.00», «محمد ٣ دفعات · جارية · المتبقي 4,000 · القسط القادم 2026-11-11 بعد 31 يوماً». No definition sentence. But the cards themselves explain by example: each agreement = a person + total + paid + remaining + next instalment.
  - His guess: "الاتفاقيات = كل الناس اللي بيني وبينهم دفعات (لي أو عليّ)، والمستحقات = اللي حان وقته". That is roughly right, but it took him 15 tasks to get there. The salary showing up as an «اتفاقية» strengthens the idea that اتفاقية = "any payment plan", which is confusing ("ما اتفقت مع سعد على شي").
- «الجهات» page (shot 062): tabs «الكل / العملاء / الموردون / الموظفون / أخرى»; rows «خالد الدوسري عميل لا رصيد», «سعد موظف علينا: 4,000.00 ر.س», «محمد عميل لنا: 4,000.00 ر.س», footnote «المتبقي من الاتفاقيات القائمة». — This is the clearest screen for his question "كم باقي على محمد" (task 6) and he never found it then. «لنا / علينا» are good words. «لا رصيد» for خالد is wrong in his head (خالد paid 300 — "له رصيد عندي 300"), because the open agreement has no total.
- «التذكيرات» (shot 063): «ملخص يومي بالبريد — رسالة يومية إلى بريدك فيها الأقساط المتأخرة والمستحقة قريبًا، لنا وعلينا.» + status «لم يُفعَّل الإرسال التلقائي على الخادم بعد…» — this sentence is actually the best one-line definition of المستحقات in the app, buried in settings.
Conclusion: the app never explains «المستحقات» or «الاتفاقيات» where he meets them (tab bar, المزيد sheet, empty states). The only explanatory texts are: the two «نوع الاتفاقية» cards (excellent), the «الراتب» paragraph on the staff form, the home «لنا/علينا» line, and the reminders paragraph. No tooltips, no "?" icons.
Taps: 7 (reading only).
Shots: 060-t15-dues, 061-t15-plans, 062-t15-parties, 063-t15-reminders.

---
## Driver notes (for the lead)
- Driver restarted twice (12:13 and ~12:40 container time) to patch `tap` in scratchpad/pw/driver.mjs: (1) hidden radio inputs (النوع صادر/وارد, الاتجاه) matched first and the click timed out before the visible label was tried — added fall-through to the next candidate; (2) surfaced the real click error. Each restart lost the session; I logged in again out of persona (4 taps, not counted in any task). Shot numbering continues from existing files, so no screenshots were overwritten.
- `tap "حركة جديدة"` on the HOME page with the «إضافة» sheet open resolves first to the home card behind the overlay; use nth=1 for the sheet's button.
- Category chips in «تعديل التصنيفات» run a continuous CSS animation (`v14-wiggle`), so Playwright never considers them stable and refuses to click; I used `eval` once to click the × for «مواصلات» (journal has a NOTE line). A human finger is not affected. Lead may want to know the chips jiggle permanently while the editor is open.
- «طباعة» could not be verified in headless Chromium (no print dialog visible).
- No screen crashed. No emailed code was ever requested.
