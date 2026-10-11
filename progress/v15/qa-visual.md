# progress/v15/qa-visual.md

> Lead, 2026-10-11: the 371 PNG captures `qa-visual` made were converted to JPEG (≤ 900 px wide, quality 60) before commit to keep the repository small — same base names with `.jpg`; the builders' own `home-*`, `nav-*`, `theme-*` PNGs (committed at CP-F) are unchanged.

Your own running notes. Only you write here. The lead merges it into PROGRESS.md at checkpoints. Keep entries short; newest at the bottom.

## Files I own
`progress/v15/qa-visual.md`, `progress/v15/qa/**` (screenshots, print captures, owner-test journal). Read-only on code and docs; no git writes.

## Run (2026-10-11, 20:45–21:50 UTC = 23:45–00:50 Riyadh, so "today" moved from 11 to 12 Oct mid-run)
- Build: `npm run build` exit 0 on the working tree at `e2131b9` (the lead's uncommitted release-prep edits to CHANGELOG/README/skeleton comments were in the tree), `npm start` on :3000, local PostgreSQL 16 db `ledger`, local `.env` (never Neon). Stopped at the end.
- Baseline for print/light comparisons: `git archive 3369686` (main) extracted to the scratchpad, built and run on :3001 against the same local DB (no schema change in v1.5). No git writes; stopped at the end.
- Browser: Playwright from `/opt/node-tools`, preinstalled Chromium; owner test through `progress/v14/owner-test/driver/server.mjs` (unchanged) with `--shots progress/v15/qa/owner-test --journal progress/v15/qa/owner-test/journal.txt`.

### Data (all through the real forms unless listed under SQL)
- `rich@qa.test` «مؤسسة الحربي للتجارة» (approved from /admin): 28 entries May–Oct both directions (6 months for the chart), 5 parties (2 customers, 2 suppliers, 1 other), fixed plans: محمد 6,000 ×3 from 2026-09-05 (2 overdue), النور 4,500 ×3 from 10-14 (this week), البناء 9,000 ×3 weekly from 10-16, إيجار 18,000 ×6 from 10-31 (~20 days); open plan مصنع الخليج 7,000 with a 2,500 payment; project «معرض الرياض للسيارات» budget 5,000 + one entry; employees سعد (4,000, pay day 18, linked to the **approved** login saad@qa.test) and ماجد (3,500, pay day 20); attendance on 7 days; staff login noura@qa.test left **pending**; سعد (staff) added 2 entries. Later (for the cluster checks) two more plans: محمد 3,000 ×2 from 10-16 (same day as البناء) and النور 2,000 ×2 from 09-20 (3rd overdue, and 10-20 same day as ماجد's salary).
- `empty@qa.test` «منشأة فارغة للاختبار»: approved, nothing else (empty states).
- `abufahd@zakham-test.sa` «قطع غيار أبو فهد»: approved, untouched until the owner test; سعد العتيبي (saad@zakham-test.sa) join request left pending before task 1.
- SQL writes (local DB only — no mail can be sent):
  - SQL1 20:54Z `update "User" set "emailVerifiedAt"=now() where email in ('rich@qa.test','empty@qa.test','abufahd@zakham-test.sa')`
  - SQL2 20:57Z same for `noura@qa.test`, `saad@qa.test`
  - SQL3 21:26Z same for `saad@zakham-test.sa`
  - Reads only otherwise (ids, join codes).

## What was captured (`progress/v15/qa/`)
- Every owner (37 routes), empty-establishment (8), staff (9), admin (3) and auth/404 (7) screen at 390 and 1280, light and dark (`theme=dark` cookie, i.e. the toggle's persisted state): `<screen>-<width>-<light|dark>.png` (256 files). Each run also measured `scrollWidth` (horizontal scroll), Eastern-Arabic digits in the text, console/page errors and HTTP status: **no horizontal scroll, no Eastern digits, no errors** anywhere (only the expected 404s).
- System dark (`colorScheme: dark`, no cookie) and reduced motion: `owner-home|ledger-reports|dues|plan-fixed|employee-month|attendance-{390,1280}-{sysdark,reduced}`, `login|signup-390-sysdark`, `staff-home|staff-me-month-390-{sysdark,reduced}`; sysdark = cookie dark pixel-for-pixel except the toggle icon (202 px).
- Dark text-contrast scan (every text node vs its effective background, WCAG thresholds) on all 64 screens at 390: **0 failures**, lowest 6.04:1 (tab labels); no light surfaces left in dark. Wheel SVG text in dark ≥ 6.87:1.
- Light mode vs main below the top bar: parties, party, plan-fixed, employee-month, settings-locks pixel-identical (0 px).
- Print (`emulateMedia print`, dark cookie on v15 vs light main): `print/<screen>-1280-print.png` for all 37 owner routes + `print/{home,reports,aging}-{390,1280}-print.png` (+ PDFs at 1280). All prints light. 33 routes identical to main (0 px, or a 2-px scrollbar column / per-origin localStorage state of «تفاصيل أكثر»); salary-pick differs as expected (new mode); home differs as specified (wheel, attention card, details printed open); reports/aging identical content but 16 px lower (N1).
- Wheel: `wheel-anim-*ms-390-light.png` (draw order 1→2→3→dial, rows lit in step), `wheel-390|360-light.png`, `wheel-390-{light,dark}.png`, `wheel-focus-{segment,dot}-390-light.png`, `wheel-keyboard-halo-390-light.png`, `wheel-150ms-390-reduced.png` (complete at 150 ms), `wheel-390-nojs.png` (+ `owner-home-390-nojs*.png`), `wheel-clusters-390-light.png`.
- «+» sheet: `addsheet-{390,1280,1280x720,1366x768}-{light,dark}.png`, `addsheet-1280x560-light.png`, `addsheet-1280x610-scrolled-light.png`, `addsheet-staff-390-light.png`; salary pick → form `salary-pick-form-390-light.png`; details `home-details-opened-390-light.png`; theme `theme-cycle-{1,2,3}-390.png`, `theme-reload-at-commit-390-dark.png`, `theme-system-osdark-390.png`; top bar `topbar-{360,375,390}-light.png`.
- Owner test: `owner-test/abu-fahd-v15-*.jpg`, `owner-test/qa-dark-checks-*.jpg`, `owner-test/journal.txt`.

## Verified OK
- Wheel: CSS-only draw 1→2→3→dial, rows light as their ring finishes; static and complete under reduced motion (150 ms) and with JS off; print complete with every row lit and no «إعادة العرض»/«إظهار الكل». Every mark is a hit (21/21 on the real arc point); every D4/D23 target right: ring 1 IN/OUT with this month's from/to, ring 2 each category (`categoryId`) and «أخرى» (OUT, no category), ring 3 `?type=CUSTOMER` / `?type=SUPPLIER` / `/owner/staff`, plan dots → plan, salary dots → employee, same-day merge on day 4 → `/owner/dues`, mixed-plan merge on day 8 → `/owner/plans`, 3 overdue → hollow cluster «3» → `/owner/dues`. First tap focuses (ring kept at 1, others 0.18; a dot keeps the dial lit — D16/D19), second tap on the same id navigates, rows focus their ring and never navigate, «إظهار الكل» clears, Escape clears from the SVG. One Tab stop (9th Tab), arrows rove (RTL: ←/↓ next, →/↑ previous, wrap), Home/End, Enter activates, halo drawn; next Tab leaves to the rows. Hit circles 22.8 px at 360 (SVG 326 px) and 24.9 px at 390 (356 px); nearest dot centres 28.1 / 30.7 px. Ring 3 = 15,000 / 22,500 / 7,500 matches the plans and salaries by hand. Empty establishment: grey track rings, «لا توجد بيانات بعد», no animation.
- «يحتاج انتباهك»: badge 4; rows «قسطان متأخران · لنا 4,000» → /owner/dues, «أقساط هذا الأسبوع · لنا 3,000 · علينا 1,500» (salary excluded, D34) → /owner/dues, «طلب انضمام من نورة السبيعي» → /owner/staff/logins, «الرواتب بعد 6 أيام» → /owner/staff?pick=salary; only non-zero sides shown; hidden on the empty establishment.
- «التفاصيل والرسوم»: closed at 390, open at 1280 (body visible already at DOMContentLoaded — no flash), remembered per device both ways across reloads; after opening on a phone the six-month chart draws (12 bars) and the donut renders — the R1-N5/home open question is answered: it redraws. Prints open on phone and desktop.
- آخر الحركات: 5 rows + «عرض الكل» → /owner/transactions. Logo link «الرئيسية» → /owner, /staff, /admin (132×44 at 390).
- السجل: tabs الحركات | الأنشطة | التقارير, sub-tabs حسب التصنيف | المتأخرات حسب المدة; the report filter GET keeps `tab=reports`; «تصدير Excel» → `/api/export?from&to` (200, valid xlsx); «طباعة» calls `window.print`. Redirects: `/owner/reports`, `?from&to`, `/aging`, `/aging?tab=entries&x=1` all land on the right tab with the query kept and the stray `tab` replaced. No التقارير in the side nav or المزيد.
- «+»: seven rows in spec order with captions, 56 px (58 primary, 72 for the two-line «اتفاقية جديدة»), fits at 390×844, 1280×720 and 1366×768 viewports; staff: 2 captioned rows; «صرف راتب» → pick list (banner, no tabs, no «موظف جديد») → `/owner/transactions/new?instalmentId=…` «راتب شهر أكتوبر 2026 — ماجد الشهري»; hidden on the empty establishment.
- Theme: toggle cycles system → light → dark → system (attr, `color-scheme`, localStorage `ui:theme`, cookie all in step); SSR `<html data-theme="dark">` from the cookie, dark at the first commit (no flash); system follows `emulateMedia` both ways; auth pages and 404 swap to the white wordmark; toasts (6.8:1), delete dialog, aging tints, badges readable in dark.
- RTL: chevrons, sheet, tabs, wheel direction and centre sub-line (`↓99% · +45 الصافي`) read correctly; Western digits everywhere.

## Findings
(BLOCKER none.)

**SHOULD**
- **QV-S1 — the desktop «+» dialog runs off short screens (R1-N5).** `src/components/chrome/AddSheet.tsx:143` (side variant) has `mt-24` and only the UA `max-height: calc(100% - 38px)`, so the dialog's bottom 58 px is always below the viewport once it is taller than the room. Fits at 1280×720 / 1366×768 *viewports* (bottom 656), but a 1280×720 laptop screen gives a ~610 px viewport: «نشاط جديد» sits at 583–639, cut, and the dialog does not scroll (scrollTop 0; the wheel scrolls the page behind) — `addsheet-1280x610-scrolled-light.png`; at 560 px it scrolls but the last row still ends at 601 — `addsheet-1280x560-light.png`. Fix: e.g. `max-h-[calc(100dvh-7rem)] overflow-y-auto` on the side variant.
- **QV-S2 — Escape does not clear a focus set from a row.** `src/components/Wheel*`: the Escape case lives only in the marks' `onKeyDown` (`WheelCard.tsx:62–68`); the explanation-row buttons have none. Tap/Enter on row 2, press Escape → still dimmed to 0.18 (D5/D27 "Escape clears"). Fix: handle Escape on the rows (or the card).
- **QV-S3 — a sighted owner is never told that a second tap opens.** «اضغط مرة أخرى للفتح» is only in the sr-only live line (`WheelCard.tsx:102`); the visible card says «اضغط أي جزء من الدائرة أو أي صف تحتها». In the owner test أبو فهد tapped row 3 (it only dims — D4), then had to find the arc and tap it twice: task 6 took 4 taps on the new home vs 2 by the v1.4 route (`owner-test/abu-fahd-v15-014…018`). Suggest showing `t.wheel.openHint` visibly under the wheel after a first activation (copy exists). Lead's call — not a spec requirement.

**NOTE**
- QV-N1 — reports print 16 px lower than main's `/owner/reports`: on the reports tab the ledger header row (`h1` no-print + add button no-print) is empty but still takes the column's `gap-4` (`print/reports-1280-print.png`, `print/aging-1280-print.png` vs main). Put `no-print` on the row itself on the reports tab (D24 "print output unchanged").
- QV-N2 — the `/owner/reports*` redirects arrive as HTTP 200 + a streamed client redirect (the parent `owner/loading.tsx` boundary), not a 307; correct with JS (all four cases), stuck on «جارٍ التحميل…» without JS.
- QV-N3 — with JS off every owner page shows only the loading skeleton (pre-existing: `owner/loading.tsx` streaming, same on main). The wheel's server HTML itself is complete (`wheel-390-nojs.png`, made by unhiding the streamed segment).
- QV-N4 — theme toggle from "system" on a light phone: the first tap goes to «فاتح» and nothing visibly changes; dark needs a second tap (C2's cycle). The icon is a monitor shape with no text; أبو فهد did not connect it with "غامق" (`owner-test/abu-fahd-v15-027…029`). For the user to rule: e.g. step from system to the opposite of the current OS scheme, or label it on ≥ md.
- QV-N5 — empty establishment: the wheel takes a full phone screen («لا توجد بيانات بعد», four theory rows, «0 موعد», plus «إعادة العرض» / «إظهار الكل» that do nothing there); the day-one action («طلب انضمام من …» in «يحتاج انتباهك») sits ~1,300 px down (`empty-home-390-light.png`, `owner-test/abu-fahd-v15-002/003`). Hide the two buttons when D28's empty state applies; consider collapsing the rows.
- QV-N6 — the live line joins the ring name and the hint with a bare space: «… — الحلقة الداخلية اضغط مرة أخرى للفتح» (`WheelCard.tsx:102`); add «. ».
- QV-N7 — dial aria-labels: overdue dots read «قسط محمد القحطاني — متأخر 7 أيام» without the «لنا من / علينا لـ» the others carry; «لـشركة النور» is written with a tatweel.
- QV-N8 — ring 2 and the donut colour the same categories differently on one page (مشتريات green in the wheel, red in the donut) once «التفاصيل والرسوم» is open.
- QV-N9 — before hydration the details button says `aria-expanded="false"` while the body is visible on desktop (D20 server render); flips to true after mount.
- QV-N10 — establishment name at 390 went from «مؤسسة الحر…» (main) to «مؤس…» (`topbar-390-light.png`), at 375 «مؤ…»; D37 only covers < 375.
- QV-N11 — the ledger add button reads «إضافة حركة» on الحركات and «حركة جديدة» on التقارير (D24), one tab apart.
- QV-N12 — «عرض الكل» on «آخر الحركات» shows with no entries (`empty-home-390-light.png`).

## Could not verify
- The real print dialog / paper output (headless): checked through `window.print` being called, print-media screenshots and PDFs instead.
- Safari/iOS specifics: the SVG focus halo on Safari, WebKit date inputs, VoiceOver reading the live line and the LRI/PDI isolates; animation smoothness on a device (frames only).

## Owner-test replay (أبو فهد, 390 px, driver)
Journal: `progress/v15/qa/owner-test/journal.txt`. Setup through the driver (counted, for reference only): task 2 = 5, task 3 = 7, task 4 = 10, task 5 = 2, task 8 = 6 — unchanged from (f). In task 6 the two taps on the outer arc were made by a DOM click through the driver's `eval` (its text tap clicks the arc's bounding-box centre, which is the centre disc); the two `ERROR … لنا من العملاء` lines in the journal stand for those two taps — the count of 4 is right.

## (g) Re-run after v1.5 (2026-10-11, branch `claude/v15-wheel-nav-theme` at `e2131b9`)

`qa-visual` replayed tasks 1, 6 and 10 and two new tasks as أبو فهد at 390 px through the same driver (`progress/v14/owner-test/driver/server.mjs`; journal `progress/v15/qa/owner-test/journal.txt`; screenshots `progress/v15/qa/owner-test/abu-fahd-v15-*.jpg`), in a fresh establishment created through the real forms (owner approved from `/admin`, سعد's join request pending before task 1; tasks 2–5 and 8 run as setup with the same counts as (f)). Same tap rule: goto / tap / fill / select count one each.

| # | Task | Taps before → after | What changed on the path |
|---|---|---|---|
| 1 | أول مرة أفتح، وش أسوي؟ | 5 → **5** | Login (4), then the curiosity tap now lands on something he can read: «يحتاج انتباهك ① طلب انضمام من سعد العتيبي» → «دخول الموظفين» with «قبول / رفض» (004) instead of the unexplained «1» on «المزيد». Hesitation: on day one the empty wheel fills a screen («لا توجد بيانات بعد», four rows about حلقات and إطار, «إعادة العرض» that does nothing) before he reaches that card (002, 003) — "وش هالدائرة؟ ما فيها شي". |
| 6 | كم باقي على محمد؟ | 2 → **4** (2 by the old route) | On the home, row 3 of the wheel already reads «لنا من العملاء 4,000.00» after one tap (الرئيسية) — "هذا محمد، ما عندي غيره". To see محمد by name he taps the row (it only dims the wheel: "ضغطت وما فتح شي"), then the green outer arc twice → «محمد · عميل · لنا: 4,000.00» (014–018). Nothing on screen says the second tap opens. The (f) route «المستحقات» → «كم باقي على عميل؟ افتح الجهات» still takes 2 (019). |
| 10 | أبي أصرف راتب سعد | 5 → **4** | «إضافة» → «صرف راتب — دفع راتب موظف عن هذا الشهر» → «اختر الموظف لصرف راتبه: سعد العتيبي · 4,000.00» → «راتب شهر أكتوبر 2026 — سعد العتيبي» prefilled → «حفظ» → سعد's page with «تم حفظ الحركة» (020–023). No hesitation; the «الموظفون» detour through «المزيد» is gone. |
| 11 | وين التقارير؟ أبي أطبع مصروف الشهر | 5 → **5** (3 once in «السجل») | He opened «المزيد» first, where «التقارير» used to be, found nothing and closed it (2 wasted, 024). «السجل» → «التقارير» → «طباعة» (report first, one «عرض» form under it; 025, 026). Shorter for what he wanted in (a): «السجل» already shows «طباعة» above this month's list (2 taps). |
| new | الشاشة قوية بالليل، أبيها غامقة | — → **4** (2 direct) | Looked for a setting in «المزيد» (2 wasted), then tried the small screen icon in the top bar: the first tap changed it to a sun and nothing else ("ما تغير شي"), the second turned everything dark (027–029); it stayed dark on the next page. |

Measured on the same run: no horizontal scroll at 390 on any screen; the «+» sheet's seven rows are 56–72 px and fit at 390×844; the salary pick lists only payable employees; every date and amount in Western digits; the dark ledger toast «تم حفظ الحركة» and the delete dialog stay readable (`qa-dark-checks-*.jpg`).
