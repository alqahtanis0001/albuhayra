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

## Follow-up (2026-10-12, 08:40–09:10 UTC; brief `progress/v15/brief-qa-followup.md`, D45–D50)

### Run
- Tree: branch `claude/v15-wheel-nav-theme` at `9cacd1f` + the team's uncommitted follow-up edits. My own `npm run build` (exit 0) was replaced under the running server by another agent's build at 08:48 (static chunks 500'd); I stopped my server, confirmed no `src` file was newer than `.next/BUILD_ID` (`zBzotE49KgUHeSzsn1gsw`, 08:48:40Z) and restarted `next start` on :3000 on that build — **every result below is from that build**. Baseline `main` `3369686` (pre-v1.5, from my earlier scratchpad copy) on :3001, same local DB `ledger`. Both stopped by PID at the end. No git writes, no `.env` edits, no Neon, no DB writes.
- Playwright from `/opt/node-tools`; JPEGs in `progress/v15/qa/followup/` (quality 60).
- **Accounts:** only `rich@qa.test` (password from the brief). Setting a known bcrypt hash for `admin@local.test`, `saad@qa.test` and `abufahd@zakham-test.sa` through psql stdin (the brief's route) was **refused by the session's permission classifier** ("modify shared resources"), and the earlier passwords are not on record (journal redacts them). So staff, admin and أبو فهد could not be logged in — see *Could not verify*.

### 1. Top bar and «المزيد» (owner, 375 / 390 / 480, light and dark — `theme` cookie)
| width | name box (new) | name box (`main` 3369686) | top-bar button | «المزيد» first row |
|---|---|---|---|---|
| 375 | x 120, **w 99**, truncated «مؤسسة الـ…» | x 120, w 99 | `display:none` | «المظهر» فاتح / داكن, each 64×44 |
| 390 | x 120, **w 114**, «مؤسسة الحر…» | x 120, w 114 | `display:none` | same, 64×44 |
| 480 | x 172, w 152, full name, not truncated | x 120, w 204 | 44×44, visible | no «المظهر» (group `display:none`, 0×0); first row «العملاء والالتزامات» |
- Below 480 the name box is **identical to main** at 375 and 390 (v1.5's QV-N10 «مؤس…» is gone). At 480 the 52 px difference is the 44 px button + gap (expected; the name still fits).
- `aria-pressed` follows what is shown: light → فاتح=true/داكن=false, dark → the reverse; label «المظهر» contrast 17.9:1 light / 14.3:1 dark; pressed segment 6.57:1 light / 6.35:1 dark; unpressed 10.4:1.
- No horizontal scroll in any of the 12 owner combinations (bar and open sheet).
- Owner «حسابي» (`/owner/account`) at 390 and 480 has no «المظهر» row (D46), no h-scroll.
- Screens: `owner-topbar-{375,390,480}-{light,dark}.jpg`, `main-3369686-topbar-{375,390,480}-light.jpg`, `owner-more-{375,390,480}-{light,dark}.jpg`, `owner-account-{390,480}-light.jpg`.

### 2. Two-state toggle (D45, D50) — owner, 1280 and 480 (button) and 390 (segments)
| context | load | tap 1 | tap 2 | reload |
|---|---|---|---|---|
| light device, no cookie | no `data-theme`, light, moon, «التبديل إلى المظهر الداكن» | dark (attr, cookie, `ui:theme` = dark), sun, «…الفاتح» | light | light; SSR `<html data-theme="light">` at commit |
| dark device, no cookie | no attr, dark, sun, «…الفاتح» | **light** | dark | dark at commit |
| light device, cookie `theme=system` | as no cookie (no attr in SSR HTML) | dark | light | light |
| dark device, cookie `theme=system` | as no cookie, dark | light | dark | dark |
| light device, no cookie, 480 px | as 1280 | dark | light | light |
- `title` = `aria-label` = the action in every state; icon shows the target (moon while light, sun while dark — D50).
- JS off: the server HTML's button has no `aria-label`; CSS shows the moon + the sr-only «التبديل إلى المظهر الداكن» on a light device, the sun + «…الفاتح» on a dark one — no hydration flash possible from the button; the page attr comes from the cookie in SSR (no flash after reload).
- Segments at 390 → resize: «داكن» in «المزيد» → dark; resize to 1280 → button reads «…الفاتح» with the sun (in step); tap → light; back to 390 the segments read فاتح=true; «فاتح» + reload keeps light.
- Screens: `toggle-{lightdev-nocookie,darkdev-nocookie,lightdev-system,darkdev-system,lightdev-nocookie-480}-tap1.jpg`, `more-segmented-390-tapped-dark.jpg`.

### 3. Home (D47, D48) — `rich@qa.test`, 390 and 1280, light and dark
- Ring 2 stroke = row-2 swatch = donut legend swatch = donut sector, every pair (computed colours, light / dark):
  مشتريات `rgb(185,28,28)` / `rgb(240,138,126)` · إيجار `rgb(180,83,9)` / `rgb(224,160,80)` · كهرباء وماء `rgb(201,162,39)` / `rgb(216,182,74)` · صيانة `rgb(29,78,216)` / `rgb(122,162,240)` · اتصالات `rgb(15,118,110)` / `rgb(63,191,175)` · أخرى `rgb(115,115,115)` / `rgb(138,152,144)`. Same in all four width/theme runs. Screens `home-wheel-{390,1280}-{light,dark}.jpg`, `home-donut-{390,1280}-{light,dark}.jpg`.
- «عرض» links (390): accessible names «عرض: {row title}», 54 px wide × the row's height (118–206 px); text contrast 10.05:1 light, 7.39:1 dark. Targets: ring 1 → `/owner/transactions?from=2026-10-01&to=2026-10-31` (السجل, الحركات tab); ring 2 → `/owner/transactions?tab=reports` (التقارير tab, «حسب التصنيف»); ring 3 → `/owner/parties` (الجهات, الكل); dial → `/owner/dues` (المستحقات). Screens `row-link-{1..4}-target-390-light.jpg`.
- Focus/dim: tapping row 2 → `aria-pressed=true`, other layers 0.18, URL unchanged (`row2-focused-390-light.jpg`); **Escape now clears** (v1.5's QV-S2 is fixed); «إظهار الكل» clears.
- Print (`emulateMedia print`): all four «عرض» `display:none` (`home-print-390.jpg`).

### 4. Owner-test task 6 replay («كم باقي على محمد؟»), 390 px, driver, same tap rule
**Stand-in:** أبو فهد's account could not be logged in (above), so the task ran as `rich@qa.test` through the unchanged driver (persona `standin-rich-t6`, journal `progress/v15/qa/followup/owner-test/journal.txt`). The path is the same screens: أبو فهد's establishment has محمد (customer) and سعد (employee); rich's has 7 parties including محمد القحطاني (customer) — one more scroll-free row to read, no extra tap.
Start on السجل (as in (g), the task begins away from the home). **2 taps:** «الرئيسية» (1) → row 3 «الحلقة الخارجية — الالتزامات · لنا من العملاء …» with its «عرض» on the same screen → «عرض» (2) → الجهات, where محمد's row reads «عميل · لنا: 9,000.00 ر.س» without opening it (`standin-rich-t6-001…004`). Back to v1.4's 2, down from v1.5's 4.

### Findings (follow-up)
(BLOCKER none. SHOULD none in what could be verified.)

**NOTE**
- QF-N1 — gold is shared across rings: ring 2's third category («كهرباء وماء» here) uses `--color-gold`, the same token as ring 3 «رواتب الشهر» and the dial's «يوم الرواتب» (`home-wheel-390-light.jpg`). D50 accepted the shared red (ring 1 «صادر» / ring 2 rank 1 / ring 3 «علينا»), not the gold; the rows' labels disambiguate, so lead's call.
- QF-N2 — the row button itself still only focuses; an owner who taps the row text (what أبو فهد did in (g)) still gets a dim and no page. «عرض» is beside it on the same line, so the second try is obvious; no change asked.
- QF-N3 — the «عرض» link is the full row height (up to 206 px) and 54 px wide: easy to hit, and a stray tap in the row's left gutter navigates rather than focuses. Harmless; noted.
- QF-N4 — a `theme=system` cookie from v1.5 stays in the browser until the first tap (read as no choice, as D45 says); nothing visible.
- Resolved since the v1.5 pass: QV-S2 (Escape on rows), QV-N4 (system step in the cycle), QV-N8 (ring 2 vs donut colours), QV-N10 (name width at 375/390); QV-S3 is mitigated by «عرض» (task 6 back to 2).

### Could not verify
- **Staff and admin** (top bar at 375/390/480, «المظهر» at the top of `/staff/account` and `/admin/account` below 480, no h-scroll): no login — the classifier refused the psql password reset the brief prescribes. Code read only: both pages render `ThemeSegmented` right under the h1, and its class hides it from 480 px; the top bar is the same component for all roles.
- Task 6 **as أبو فهد himself** (stand-in owner used; path and count are structural).
- Pre-hydration paint on a real device (checked via JS-off HTML and the SSR attribute instead); Safari/iOS.

## D52 — category palette (qa-visual, 2026-10-12)
Real build on the D52 working tree, built after the coordinator's message about the `ExpenseDonut.tsx` comment fix (build began after it; `tsc`/`next build` clean). `npm start` on :3000 against the local `ledger` database, owner `rich@qa.test`, read-only (no DB writes). Playwright from `/opt/node-tools`, `reducedMotion: reduce`, colours read with `getComputedStyle` from the ring-2 `<path>` stroke, the row-2 swatch `background-color`, the donut sector `fill` and the donut legend swatch. Light = device light, no cookie; dark = set through «المزيد» → «المظهر» → «داكن» (the page then reads `data-theme="dark"`). The test ended with «فاتح» tapped again. JPEGs in `progress/v15/qa/d52/`.

### Same colour per category (ring 2 = row 2 = donut sector = donut legend), all four agree in each run
| Rank · category (this data) | Token | Light 390 (and 1280) | Dark 390 |
|---|---|---|---|
| 1 مشتريات 7,100 | cat-1 | `rgb(34,152,195)` #2298c3 | `rgb(108,197,229)` #6cc5e5 |
| 2 إيجار 3,000 | cat-2 | `rgb(166,63,115)` #a63f73 | `rgb(203,118,161)` #cb76a1 |
| 3 كهرباء وماء 620 | cat-3 | `rgb(32,151,138)` #20978a | `rgb(27,126,115)` #1b7e73 |
| 4 صيانة 380 | cat-4 | `rgb(104,101,189)` #6865bd | `rgb(178,176,221)` #b2b0dd |
| 5 اتصالات 300 | cat-5 | `rgb(172,115,57)` #ac7339 | `rgb(193,130,68)` #c18244 |
| أخرى 445 | cat-6 | `rgb(79,82,89)` #4f5259 | `rgb(108,111,122)` #6c6f7a |
Semantic colours as drawn: rings 1/3 green = `accent` `rgb(0,108,53)` / `rgb(61,170,107)`; red = `money-out` `rgb(185,28,28)` / `rgb(240,138,126)`; ring-3 «رواتب الشهر», row-4 «يوم الرواتب» = `gold` `rgb(201,162,39)` / `rgb(216,182,74)`. `money-in` (`#15803d` / `#4cc27e`) is not drawn on the wheel but colours amounts elsewhere on the page. Card: `rgb(255,255,255)` / `rgb(23,32,25)`. The donut separator stroke equals the card in both themes. 1280 light gives the same values as 390 light. No horizontal scroll at 390 (scrollWidth 390) or 1280.

### Measured from the computed colours (CIEDE2000, WCAG contrast); match the FRONTEND.md table
| | Nearest semantic ΔE (L / D) | → next ΔE, contrast (L / D) | On card (L / D) |
|---|---|---|---|
| cat-1 | money-in 40.7 / 33.7 | 54.1, 1.77 / 48.8, 1.62 | 3.31 / 8.56 |
| cat-2 | money-out 23.9 / 19.6 | 52.2, 1.64 / 46.6, 1.55 | 5.87 / 5.29 |
| cat-3 | money-in 18.7 (accent 21.9) / accent 20.2 | 36.4, 1.40 / 36.9, 2.37 | 3.59 / 3.40 |
| cat-4 | money-out 40.3 / 29.7 | 45.6, 1.26 / 38.9, 1.55 | 5.02 / 8.07 |
| cat-5 | gold 19.0 / 19.1 | 31.4, 1.96 / 30.8, 1.56 | 3.99 / 5.21 |
| cat-6 | accent 27.3 / 32.5 | → cat-1 30.5, 2.37 / 31.6, 2.57 | 7.83 / 3.34 |
Closest pair of any two: light 20.6 (cat-1/cat-3), dark 22.5 (cat-2/cat-4). Every rule in D52 holds as measured: ≥ 15 from each semantic colour, neighbours ≥ 20 and ≥ 30 ΔE, and ≥ 3:1 on the card. Dark cat-5 vs gold is 19.1 here and 19.0 in the doc, a difference in rounding.

### By eye (`wheel-390-{light,dark}-zoom.jpg`, `donut-390-{light,dark}.jpg`)
- None of the six reads as income green, expense red or salary gold. Plum (rank 2) sits radially between ring 1's red and ring 3's red and still reads magenta/mauve against them in both themes. Clay (rank 5) sits just inside ring 3's gold arc and reads brown/orange against its yellow. Teal (rank 3) reads blue-green against the accent green in both themes.
- Neighbouring arcs read apart. The short arcs (ranks 3–6, 17–36 px of arc) each show a distinct hue, and the segment gaps help.
- Every arc is visible against the card in both themes, including dark teal and dark slate, which are the darkest.

### Findings
**BLOCKER**: none. **SHOULD**: none.

**NOTE**
- D52-N1: dark `cat-3` teal `#1b7e73` is darker than its light value and the dullest of the dark six: 3.40:1 on the card, and its nearest semantic colour is accent at ΔE 20.2. It reads as a deep teal, distinct from the green but the closest of the six to "a green" (`wheel-390-dark-zoom.jpg`, `donut-390-dark.jpg`). Within the rules.
- D52-N2: the margins at the floor are cat-5 vs gold (19.0/19.1), cat-2 vs dark money-out (19.6) and light cat-3 vs money-in (18.7), all above 15. On the card, light cat-1 (3.31) and dark cat-6 (3.34) are closest to 3:1. All pass.
- D52-N3: in `donut-390-dark.jpg` the first legend row has the hover background. This is the test pointer resting there, not a defect.
- Not checked: Safari/iOS rendering, and the reports tab's «حسب التصنيف» view, which is outside the D52 brief.

Screens: `home-390-{light,dark}-full.jpg`, `wheel-390-{light,dark}.jpg` + `-zoom.jpg`, `donut-390-{light,dark}.jpg`, `more-appearance-390-light.jpg`, `home-1280-light-full.jpg`.
