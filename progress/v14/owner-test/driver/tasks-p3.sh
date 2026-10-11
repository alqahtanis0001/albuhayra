#!/bin/bash
# v1.4 part 3 — أبو فهد replays owner-test tasks 2, 4, 6, 10, 13 (390 px) against a
# running build, through the driver (server.mjs on :4321). One command = one tap
# (goto/tap/fill/select); «resetTaps» starts each task. Setup steps that the
# original test counted under other tasks (login, task 5's payment) are marked.
set -u
D="node progress/v14/owner-test/driver/do.mjs"
say() { echo; echo "##### $*"; }
say "login (not counted)"
$D persona '{"name":"abu-fahd-p3"}'
$D goto '{"url":"http://localhost:3000/login"}'
$D fill '{"label":"البريد الإلكتروني","value":"abufahd@zakham-test.sa"}'
$D fill '{"label":"كلمة المرور","value":"Shop-Dammam-77"}'
$D tap '{"text":"تسجيل الدخول"}'
$D shot '{"name":"home-first"}'
$D see '{}' | sed -n 1,30p

say "TASK 2 — زبون دفع لي 500 كاش"
$D resetTaps '{}'
$D tap '{"text":"حركة جديدة"}'
$D shot '{"name":"t2-form"}'
$D tap '{"text":"وارد"}'
$D fill '{"label":"المبلغ","value":"500"}'
$D options '{"label":"التصنيف"}'
$D shot '{"name":"t2-category-helper"}'
$D select '{"label":"التصنيف","option":"سداد من عميل"}'
$D tap '{"text":"حفظ"}'
$D shot '{"name":"t2-after-save"}'
$D url '{}'
echo "PIN R4 toast box:"; $D box '{"text":"تم حفظ الحركة"}'
echo "PIN R4 first row box (phone list):"; $D boxes '{"selector":"ul.md\\:hidden > li"}' | cut -c1-200
$D taps '{}'

say "TASK 4 — محمد بيدفع 6,000 على 3 دفعات"
$D resetTaps '{}'
$D tap '{"text":"إضافة"}'
$D shot '{"name":"t4-add-sheet"}'
$D tap '{"text":"اتفاقية جديدة"}'
$D tap '{"text":"دفعات محددة"}'
$D shot '{"name":"t4-form"}'
$D select '{"label":"الجهة","option":"+ جهة جديدة (تُحفظ للمرات القادمة)"}'
$D fill '{"label":"اسم الجهة الجديدة","value":"محمد"}'
$D tap '{"text":"حفظ"}'
$D shot '{"name":"t4-party-added"}'
echo "PIN R3 toast box:"; $D box '{"text":"تمت إضافة الجهة"}'
echo "PIN R3 save button box:"; $D box '{"text":"حفظ","role":"button"}'
$D see '{}' | grep -n "اتفاقية مع\|التصنيف\|عنوان" | head -5
$D fill '{"label":"المبلغ الإجمالي","value":"6000"}'
$D fill '{"label":"عدد الأقساط","value":"3"}'
$D shot '{"name":"t4-schedule-before"}'
$D tap '{"text":"توليد الجدول"}'
$D shot '{"name":"t4-schedule-generated"}'
$D tap '{"text":"حفظ"}'
$D shot '{"name":"t4-after-save"}'
$D url '{}'
$D taps '{}'

say "TASK 5 (setup for 6, counted separately) — محمد دفع الدفعة الأولى"
$D resetTaps '{}'
$D tap '{"text":"تسجيل دفعة"}'
$D shot '{"name":"t5-pay-form"}'
$D tap '{"text":"حفظ"}'
$D shot '{"name":"t5-after-save"}'
$D taps '{}'

say "TASK 6 — كم باقي على محمد؟"
$D resetTaps '{}'
$D tap '{"text":"المستحقات"}'
$D shot '{"name":"t6-dues"}'
$D tap '{"text":"كم باقي على عميل؟ افتح الجهات"}'
$D shot '{"name":"t6-parties"}'
$D see '{}' | grep -n "محمد\|لنا" | head -5
$D taps '{}'

say "TASK 10 — أبي أصرف راتب سعد"
$D resetTaps '{}'
$D tap '{"text":"المزيد"}'
$D tap '{"text":"الموظفون"}'
$D tap '{"text":"سعد العتيبي"}'
$D tap '{"text":"صرف راتب"}'
$D shot '{"name":"t10-salary-form"}'
$D see '{}' | sed -n 5,22p
$D tap '{"text":"حفظ"}'
$D shot '{"name":"t10-after-save"}'
$D url '{}'
$D taps '{}'

say "TASK 13 — أعطي سعد دخول"
$D resetTaps '{}'
$D goto '{"url":"http://localhost:3000/owner"}'
$D shot '{"name":"t13-home-notice"}'
$D resetTaps '{}'
$D tap '{"text":"المزيد"}'
$D shot '{"name":"t13-more"}'
$D tap '{"text":"دخول الموظفين"}'
$D shot '{"name":"t13-logins"}'
$D tap '{"text":"قبول"}'
$D shot '{"name":"t13-after-accept"}'
$D see '{}' | sed -n 5,30p
$D taps '{}'
