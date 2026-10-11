# progress/v14/qa-visual.md — v1.4 CP-C visual QA (`qa-visual`)

Read-only pass over every owner and staff screen v1.4 touched, rendered statically (no DB, no server) and screenshotted at 390×844 and 1280×800, each with and without `prefers-reduced-motion: reduce`, plus print emulation for the printable ones. Only this file was written inside the repo; everything else lives in the scratchpad.

## Files I own
`progress/v14/qa-visual.md` only. Harness and PNGs: `/tmp/claude-0/-home-user-albuhayra/27328927-6b40-50bc-bd0a-16ed28d94890/scratchpad/qa-visual/` (not in git).

## Harness and how to rerun it
Scratch dir `S = /tmp/claude-0/-home-user-albuhayra/27328927-6b40-50bc-bd0a-16ed28d94890/scratchpad/qa-visual`.
- `S/render.test.ts` — vitest file: mocks `next/navigation`, `@/lib/auth`, `@/lib/db`, every query/action module the pages import, then renders each screen with `createElement` + `renderToStaticMarkup` (the repo's component-test precedent) using Arabic fixtures, wraps it in `<html lang="ar" dir="rtl">` + the production CSS, writes `S/html/*.html` + `index.json`. Page-level screens call the real async page components (`OwnerLedgerPage`, `DuesPage`, `PlansPage`, `PlanPage`, `EditPlanPage`, `NewPlanPage`, `CategoriesSettingsPage`, `LocksSettingsPage`, `PendingPage`, `AttendancePage`) inside `AppShell`, so the chrome is the real one.
- `S/run-render.mjs` — runs it with `startVitest` from `/home/user/albuhayra/node_modules/vitest/dist/node.js`, `root` = repo, `alias` `@/` → `src/` **and** `next/navigation`, `next/cache` → the repo's `node_modules` copies (a test file outside the root otherwise registers `vi.mock("next/navigation")` under an id the components never resolve to — the mocks silently do not attach; `server-only` is not installed, so its virtual mock matches by raw id). Copies `.next/static/chunks/*.css` → `S/static/chunks/app.css` and `.next/static/media` (next/font files) → `S/static/media`.
- `S/shoot.mjs [name-filter]` — serves `S/html`, `S/static` and the repo's `public/` over HTTP (playwright from `/opt/node-tools`), opens dialogs with `showModal()` (AddSheet / المزيد / ConfirmDialog), takes `S/shots/<name>.<phone|desktop>.<no-preference|reduce>.png` (+ `.closed.png` before opening, `.mid.png` 40 ms after opening, `.print.png` under `emulateMedia({ media: "print" })`), and measures per capture: page `scrollWidth` vs viewport, elements outside the viewport, every visible `a/button/input/select` under 44 px, Eastern digits in `innerText`, computed text/background contrast, computed `animation-name / rotate / scale / translate / opacity` of `.v14-wiggle`, `.v14-fade-out`, `.v13-grow-inline`, `.v13-paid`, `dialog[open]`, and in print the counts of visible progressbars / forms / navs / `.no-print` / tables. Output `S/report.json` (164 captures; `report.<filter>.json` for re-shoots).
- `S/sweep.mjs` — static sweep over `git diff --name-only 78a93f8..HEAD -- src` (+ added files): physical utilities, Eastern digits, Arabic literals in UI `.tsx`, unlabelled `<input>/<select>`, icon-only buttons, and whether every animation class used in the changed files is defined inside a `prefers-reduced-motion: no-preference` block of `globals.css`.
```
cd /home/user/albuhayra
node $S/run-render.mjs          # 8 render cases → 41 html files
node $S/shoot.mjs               # all; or: node $S/shoot.mjs 06-plans
node $S/sweep.mjs | less
```
Screenshots: `S/shots/` — 201 PNGs, 49 MB (the full list is `ls S/shots`). Key ones are named per finding below.

## Verdict table (P = phone 390, D = desktop 1280; each cell covers both motion settings; "print" = print emulation)
| # | Screen (html name) | P | D | print | Verdict / refs |
|---|---|---|---|---|---|
| 1 | `01-owner-chrome` — bars closed, «+» sheet open (tab + side) | ok | ok | — | PASS; S4 (last tile flush with sheet edge) |
| 1 | `01-owner-more` — المزيد open, summed badge | ok | n/a (phone-only) | — | PASS; trigger shows «1», tile «1» on حسابات الدخول; N5 |
| 1 | `01-staff-linked` — five tabs, two-row sheet | ok | ok | — | PASS |
| 1 | `01-staff-unlinked` — «+» is a link | ok | ok | — | PASS (plus disc + «إضافة», السجل highlighted on the form) |
| 1 | `01-admin` — no «+» | ok | ok | — | PASS |
| 2 | `02-owner-ledger` — tabs, locked badge + link, planId row | ok | ok | ok | PASS; N2 (desktop column squeeze), S5 (lock link prints) |
| 2 | `02-owner-activities` — الأنشطة tab | ok | ok | — | PASS (status tabs, 3 cards, budget meters) |
| 2 | `02-staff-ledger` — «سداد اتفاقية», no pencil | ok | ok | — | PASS (no `/owner/settings/locks` anywhere) |
| 3 | `03-form-owner` / `03-form-staff` | ok | ok | — | PASS (two links owner only) |
| 3 | `03-form-addbox` / `-error` | wrap | ok | — | S3 («إلغاء» wraps under the input at 390) |
| 3 | `03-form-chips` / `-lastactive` / `-hide-confirm` | ok | ok | — | PASS; N1 («تم» 39 px wide), N3 (dialog in corner) |
| 3 | `03-form-locked-owner` / `-locked-staff` | ok | ok | — | PASS (link owner only) |
| 4 | `04-settings-categories` | ok | ok | — | PASS; N4 (arrow direction) |
| 4 | `04-settings-locks` / `-unlock` | ok | ok | — | PASS (back link 44 px, confirm text); N3 |
| 5 | `05-dues` — pickOther link, row links | ok | ok | ok | S1 (link 20 px tall) |
| 5 | `05-home-noplans` / `-empty` / `-dues` | ok | ok | — | PASS (nothing / empty state / rows); N5 |
| 6 | `06-plans-list` / `-pick` / `-filters-archived` | ok | ok | — | PASS (tag «مفتوحة», 40 % green, 100 % «منتهية», no-ceiling line, banner, archived hidden in pick mode, «مؤرشفة / منتهية») |
| 6 | `06-plans-new-kinds` / `-new-open` | ok | ok | — | PASS |
| 6 | `06-plans-edit-open-locked` / `-free` | ok | ok | — | PASS (notice + disabled party/direction/start/category) |
| 6 | `06-plans-detail-40/85/100/noceil/nopayments` | ok | ok | ok | PASS (green / gold / full, «إعادة فتح», paid row wash, bar+forms hidden in print); S6 (phone payments table), N6 |
| 7 | `07-parties-list` / `07-party-statement` | ok | ok | ok | PASS (line with/without, under «لا رصيد», under the closing balance; hidden in print) |
| 8 | `08-pending` | ok | ok | — | PASS (button «تسجيل الدخول للتحقق من حالة الطلب») |
| 8 | `08-attendance-empty` / `-monthly` | ok | ok | — | S2 (link 21 px tall) |

Measured on every capture: **no horizontal page scroll** (`scrollWidth == 390/1280` on all 164); **zero Eastern digits**; amounts via `MoneyText`, percentages in `<bdi dir="ltr">`; reduced motion ⇒ `.v14-wiggle` `rotate: none` (vs ±1.3° measured mid-rock), `.v13-grow-inline` `scale: none` (vs `0.34 1` at 40 ms), `.nav-sheet[open]` `route-fade-in` only (vs `sheet-up`, translate `0 37%` at 40 ms — the D13 "fade only" ruling), desktop AddSheet `animation: none` (vs `route-fade-in` 200 ms), `.v13-paid` static green row; print ⇒ 0 progressbars, 0 forms, 0 navs, 0 visible `.no-print`, tables and facts present, statement line and dues link gone. Tap targets ≥ 44 px confirmed for: chip ✕ (44×44), «إظهار», the two quick-action links, lock links (badge and notice), «العودة إلى السجل», «← الإعدادات», dues row party/plan links, «+» triggers, sheet rows (56 / 72 px), hidden-chip and add-box buttons. Static sweep: 86 files, 0 physical utilities, 0 Eastern digits, 0 Arabic literals (3 regex false positives, each checked: `RoleNav.tsx:184` has `{group.label}` text; `CategoryQuickActions.tsx:142` input has `<label htmlFor>`; `ar.ts:427` is a comment); every motion class (`v14-wiggle`, `v14-fade-out`, `v13-grow-inline`, `v13-paid`, `nav-sheet`) is inside a `no-preference` block, the AddSheet desktop fade is `motion-safe:`.

## Findings
**BLOCKER — none.**

**SHOULD**
- S1 (`add`) `src/app/(owner)/owner/dues/page.tsx:39` — the c2 link «دفعة على اتفاقية غير مستحقة بعد؟ …» is 278×20 px at both widths (FRONTEND "tap targets ≥ 44px"; the dues rows' own links got `min-h-11` under R2-1). Fix: add `inline-flex min-h-11 items-center` to its className. `shots/05-dues.phone.reduce.png`.
- S2 (`lead`) `src/app/(owner)/owner/staff/attendance/page.tsx:45` — «إضافة موظف» in `NoEmployees` is 71×21 px (both tabs, both widths). Fix: same classes as S1. `shots/08-attendance-empty.phone.reduce.png`.
- S3 (`cats`) `src/features/transactions/components/CategoryQuickActions.tsx:164` — at 390 px the inline add box (`flex-wrap items-end`, input `min-w-48 flex-1`) fits the input + «حفظ» on one row and drops «إلغاء» alone onto a second row, left-aligned under the input. Fix: put the two buttons in one `<div className="flex gap-2">` so they wrap together (or `basis-full` on the input wrapper below `sm`). `shots/03-form-addbox.phone.reduce.png`.
- S4 (`add`) `src/components/chrome/AddSheet.tsx:139` — `safe-bottom` is an unlayered rule (`padding-bottom: env(safe-area-inset-bottom, 0px)`) and beats the layered `p-4`, so whenever the inset is 0 — every desktop popover (side variant) and any phone without a home indicator — the last tile («موظف جديد», staff «تسجيل حضوري») sits flush with the dialog's bottom border. Fix: replace `safe-bottom … p-4` with `p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]` (or drop `safe-bottom` on the side variant). Same pattern pre-exists in `MoreSheet.tsx:86` (v1.2a) — N5. `shots/01-owner-chrome.desktop.reduce.png`, `shots/01-owner-chrome.phone.reduce.png`.
- S5 (`cats`, low) `src/components/LockBadge.tsx:25` — the owner ledger's new «إقفال الأشهر» link prints as underlined text beside «شهر مقفل» (spec: print output unchanged unless stated; the row actions تعديل/حذف already printed before v1.4, so this is low). Fix: add `no-print` to the link className. `shots/02-owner-ledger.desktop.print.png`.
- S6 (`plans`, low) `src/features/plans/components/OpenPlanDetail.tsx:157` — the payments table at 390 px squeezes five columns into 358 px: the ISO date breaks «2026-10-» / «09» across lines and «تعديل الحركة» wraps. Fix: `<Td className="whitespace-nowrap">` on the date cell and `hidden md:table-cell` on «سجّلها» (header + cell), or the ledger's card layout below md. `shots/06-plans-detail-40.phone.reduce.png`.

**NOTE**
- N1 (`cats`) `src/features/transactions/components/CategoryChips.tsx` — the «تم» `Button size="sm"` measures 39×44 (`SIZES.sm = min-h-11 px-3`); height passes, width is under 44. Fix: `className="min-w-11"` on that button. `shots/03-form-chips.phone.reduce.png`.
- N2 (`cats`) `src/features/transactions/components/LedgerRowActions.tsx:51` — on the owner desktop table (content column 768 px) the «سداد اتفاقية» badge + تعديل + حذف widen the actions column; the badge wraps to two lines and the date cell pushes «هـ» onto a third line (`shots/02-owner-ledger.desktop.reduce.png`; the staff table and print are fine). Fix: `<span className="whitespace-nowrap">` around the badge, or `md:` hide the badge text behind the pencil's title on the owner table.
- N3 (`lead`, pre-existing since v1.0 — not v1.4) `src/components/ConfirmDialog.tsx:58` — Tailwind v4 preflight resets `margin: 0` on every element and the modal `<dialog>` sets no margin, so every ConfirmDialog opens in the top-start corner flush with the viewport edge instead of centred (`shots/04-settings-locks-unlock.desktop.reduce.png`, `shots/03-form-hide-confirm.phone.reduce.png`). v1.4 adds three new confirms (unlock, hide chip, end agreement), so it is seen more often. Fix: add `m-auto` to the dialog className (AddSheet/MoreSheet set their own margins and are unaffected); 16 call sites benefit. Needs the user's eye since it changes every delete confirm too.
- N4 (`lead`/`cats`, wording) `src/i18n/ar.v14.ts:34` «← الإعدادات» — U+2190 is not bidi-mirrored, so in RTL the arrow points left, toward the content («forward»); a back arrow in RTL points right. Spec A5 says the text verbatim, so this is the product owner's call: «→ الإعدادات» (one character) or an icon with `rtl:-scale-x-100`. `shots/crop-back-arrow.png`.
- N5 (pre-existing, v1.2a) `src/components/chrome/MoreSheet.tsx:86` same `safe-bottom` as S4; `src/features/dashboard/components/WeekDues.tsx` «عرض كل المستحقات» 111×20 (fix as S1). Pre-existing pattern also in `OpenPlanDetail`'s party link (91×21), copied from the fixed plan detail; the parties table's name links and the statement's description links (21 px) — N6.
- N6 (`plans`, pattern) see N5 — the open detail's party link mirrors the fixed detail; left as is unless both change together.
- N7 (pre-existing, not v1.4) `Tabs` link «جارٍ» 41 px wide; ledger pencil 34×44 on phones (sr-only label); `ProjectChip` 18 px tall. Listed for completeness only.
- N8 harness artefacts, not findings: the contrast pass cannot parse Tailwind's `lab()` colours (amber-900/-800 on amber-50 and accent-dark on amber-50 reported at 1.1–1.4; the real ratios are ≈ 8–10:1); the WeekRibbon's snap tiles are reported "outside the viewport" because they scroll inside their own `overflow-x-auto` strip (page `scrollWidth` stays 390). No other contrast hit anywhere — every gray-500/600 text passed.

## What could not be verified statically (and why)
- Anything after hydration: the chip fade timer/unmount, add-category → option appended and selected, «إظهار» → option returns, toasts, the ConfirmDialog focus trap / Escape, the nav pending pulse, `samePath` closing the sheet, the lock/unlock round trip, the auto-close notice. The render is `renderToStaticMarkup`; dialogs were opened by calling `showModal()` on the static DOM.
- The owner home page as assembled (`owner/page.tsx` needs the dashboard queries); only `WeekDues` / `OverdueStrip` were rendered inside the shell for the three `hasPlans` states.
- Real-device fonts and iOS `env(safe-area-inset-bottom)` (here the inset is 0, which is what exposes S4), real print dialogs and page breaks (print was CSS media emulation at 1280 / 390), the PWA, and any Next runtime behaviour (CSP nonce, streaming) — no `.env`, no DB, no `next start` on this machine (binding constraint).

## Tasks completed
| Task | Files touched | Build/tests pass | Notes for others |
|---|---|---|---|
| Static render harness (41 screens), 201 screenshots, measurements, static sweep, this recording | `progress/v14/qa-visual.md` (+ scratchpad only) | n/a (no build run; vitest harness 8/8 green) | 0 BLOCKER / 6 SHOULD / 8 NOTE — owners: `add` S1 S4, `cats` S3 S5 N1 N2, `plans` S6, `lead` S2 N3 N4 |

## In progress
- Nothing; handed back to the lead.

## Gotchas I found
- A vitest file outside the repo root: `vi.mock("next/navigation")` does not attach unless the bare id is aliased to the repo's `node_modules` path (the components resolve `next/navigation` to `/home/user/albuhayra/node_modules/next/navigation.js`; the test file, with no `node_modules` of its own, registers the mock under the raw id). `server-only` is not installed anywhere, so its virtual mock matches by raw id — that is why the repo's own tests never hit this. `vitest/node` itself must be imported by absolute path from the runner script.
- `renderToStaticMarkup` never emits `open` on a `<dialog>` (it is set by `showModal()` in an effect); open states are produced in the browser by calling `showModal()` on the chosen dialog. A dialog inside a `display:none` ancestor (the phone sheet at 1280 px) shows nothing, so the shooter picks the first dialog whose ancestors are all displayed.
- Tailwind v4 preflight's `margin: 0` on `*` applies to `<dialog>` too — a modal dialog without its own margin classes lands in the top-start corner (N3). `.safe-bottom` is unlayered and overrides any `p-*` utility's bottom padding (S4).
- `grep "[٠-٩]"` under a non-UTF-8 locale matches individual bytes of every Arabic letter (59k false hits); use a JS/Python Unicode regex (`[٠-٩]`) for the Eastern-digit check.

## Questions / requests sent to lead
- N3 and N4 are judgement calls outside v1.4's owners (shared `ConfirmDialog`; the spec's verbatim «← الإعدادات») — flagged, not ruled.

## qa-visual fixes (`ui-fix`, 2026-10-10)
Applied the lead's brief for S1–S6, N1, N2 as class-string-only edits, then re-rendered and re-shot with the harness above (`node run-render.mjs`, `node shoot.mjs <name>` per screen → `report.<name>.json`; measurements via `S/../ui-fix/measure.mjs`, playwright `getBoundingClientRect`). No `npm run build` was run: the harness serves the pre-existing `.next` CSS, so the two utilities that build does not contain (`md:table-cell`, `pb-[calc(1rem+env(safe-area-inset-bottom,0px))]`) were compiled with the repo's own Tailwind 4.3.3 (`@tailwindcss/node`) into `S/../ui-fix/extra.css` and appended to the harness copy `S/static/chunks/app.css` only — nothing under `.next/` was touched. The real build will emit the same rules.

| # | File | Change | Measured after |
|---|---|---|---|
| S1 | `src/app/(owner)/owner/dues/page.tsx` | pickOther link `+ inline-flex min-h-11 items-center` | 278×44 at 390 and 1280 (was 278×20) — `shots/05-dues.phone.reduce.png` |
| S2 | `src/app/(owner)/owner/staff/attendance/page.tsx` (`NoEmployees`) | same classes | 71×44 both tabs, both widths (was 71×21) — `shots/08-attendance-empty.phone.reduce.png` |
| S3 | `src/features/transactions/components/CategoryQuickActions.tsx` (`CategoryAddBox`) | «حفظ»/«إلغاء» wrapped in one `<div className="flex gap-2">`; both still `type="button"`, no `<form>` | at 390 the pair wraps together under the input, start-aligned, 53×44 + 50×44; at 1280 one row — `shots/03-form-addbox.phone.reduce.png` |
| S4 | `src/components/chrome/AddSheet.tsx`, `src/components/chrome/MoreSheet.tsx` | `safe-bottom … p-4` → `p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]` | computed `padding-bottom: 16px` with inset 0; last tile → dialog edge 16 px (tab), 17 px (side), 16 px (المزيد, staff sheet) — `shots/01-owner-chrome.{phone,desktop}.reduce.png`, `shots/01-owner-more.phone.reduce.png` |
| S5 | `src/components/LockBadge.tsx` | `no-print` on «إقفال الأشهر» | print: 0 visible `a[href="/owner/settings/locks"]`, «شهر مقفل» badge still shown, links 6 → 5 — `shots/02-owner-ledger.desktop.print.png` |
| S6 | `src/features/plans/components/OpenPlanDetail.tsx` | date `<Td className="whitespace-nowrap">`; «سجّلها» `Th`/`Td` `hidden md:table-cell` | 390: date on one line, «سجّلها» `display:none`, table 356 px = wrapper (no inner scroll); 1280: column back. **Residual:** «تعديل الحركة» still breaks onto two lines at 390 (link 51×44, so the tap target is fine). Harness-only experiment (runtime class, not in src): `whitespace-nowrap` on that last cell too → one line, columns 102/96/65/93, table still 356 px, no overflow. Not applied — outside the class strings the brief named; one line for `plans`/lead if wanted — `shots/06-plans-detail-40.phone.reduce.png` |
| N1 | `src/features/transactions/components/CategoryChips.tsx` | «تم» `className="min-w-11"` | 44×44 (was 39×44) — `shots/03-form-chips.phone.reduce.png` |
| N2 | `src/features/transactions/components/LedgerRowActions.tsx` | **applied, measured, reverted** | `whitespace-nowrap` around the badge makes it one line (75×22) but widens the owner desktop table from 734 to 747 px inside its 734 px `overflow-x-auto` wrapper → a 13 px inner horizontal scroll at 1280, 1366 and 1440 alike (content column is capped at 768). The staff table is unaffected either way. The date cell's line count is 5 before and after, so the ISO-date break on the owner desktop table is pre-existing and not the badge's doing. File left exactly as it was; alternative from the brief (hide the badge text on `md:` behind the pencil's title) or a card layout is the lead's call — `shots/02-owner-ledger.desktop.reduce.png` |

Checks: `npx tsc --noEmit` 0 errors; `npx vitest run` 85 files / 1414 tests green, no class-string pin needed updating (the `categoryQuick.test.ts` no-form / `type="button"` cases, `settingsPages.test.ts` LockBadge `min-h-11` pin and `ledgerRows.test.ts` all pass unchanged). Re-shot screens: `01-owner-chrome`, `01-owner-more`, `02-owner-ledger` (incl. print), `02-staff-ledger`, `03-form-addbox(-error)`, `03-form-chips(-lastactive)`, `05-dues` (incl. print), `06-plans-detail-40` (incl. print), `08-attendance-empty(-monthly)` — every capture `scrollWidth` = viewport, `dir="rtl"`, 0 Eastern digits, and the previous `small` entries for S1/S2/N1/S6's links are gone (05-dues still reports the WeekRibbon snap tiles as "outside the viewport", the N8 artefact, 8 before and after). `sweep.mjs`: 86 files, same 3 known false positives + the deleted `projects/(list)/loading.tsx`, 0 physical utilities, every motion class inside a `no-preference` block.

## Part 2 (2026-10-11)
Static pass over the v1.4 part-2 screens at HEAD `3e00d7b` (D23 quick-add party, D24 compact entry form, D25 first-run card, D26a/b). Same harness, extended, not rebuilt; same constraints (no DB, no server, no build — the fresh `.next` CSS was copied again and `css-check.mjs` found **0** class tokens of the 22 new pages missing from it, so no `extra.css` recompile was needed this time). Only this file was written inside the repo.

### Harness additions (all under `S`)
- `render.test.ts` — a second `describe` ("render v1.4 part 2 screens", 4 cases) and seven new imports; 22 pages named `p2-*`. States the browser would only reach after hydration are produced by markup surgery on the static render: `injectPartyBox` inserts a standalone `PartyAddBox` render after the hidden `partyId` input (where `PartyQuickAdd` mounts), `selectSentinel` moves `selected` to the «+ جهة جديدة» option, `replaceEntryDetails` swaps the form's `EntryDetails` block for one rendered with `fieldErrors` (B1). The owner home is `QuickActions` + `FirstRunCardView`/`FirstRunCard` + `OwnerStatCards` with a 30-day fixture (the real page needs the dashboard reads).
- `shoot.mjs` — per capture `probe` (rects + attributes of the disclosure, its panel, the party selects' selected/last option and `name`, the box's input/select/buttons/error, the first-run card/links/ticks/«إخفاء»/progress, the back link, `dialog[open]` with its offset from the viewport centre, quick actions / stat cards `y`), a `clip` crop and a `content` capture of `<main>` with fixed bars hidden (full-page captures paint the fixed tab bar mid-page). `sweep.mjs` takes the commit range as `argv[2]`. New helpers: `order.mjs` (field order, posted `name`s and box contents of the form inside `<main>`), `crop.mjs` (one selector at 2×), `summarize.cjs`, `css-check.mjs`.
```
cd /home/user/albuhayra
node $S/run-render.mjs            # 12 cases → 41 + 22 html
node $S/shoot.mjs p2-             # 88 captures → report.p2-.json, 148 PNGs
node $S/order.mjs; node $S/summarize.cjs $S/report.p2-.json; node $S/sweep.mjs 5abaf5a..HEAD
```
Screenshots: `S/shots/p2-*.png` (148) + `crop-back-arrow-p2.{phone,desktop}.png`, `crop-edit-amount.png`, `crop-payment-amount.png`, `crop-firstrun-2.phone.png`; `S/shots` is now 77 MB.

### Verdict table (P = 390, D = 1280; each cell covers both motion settings)
| # | Screen (`p2-…`) | P | D | print | Verdict / measured |
|---|---|---|---|---|---|
| 1 | `form-collapsed` — owner, default | ok | ok | — | PASS. Order النوع → المبلغ → التاريخ → التصنيف (+ quick actions) → طريقة الدفع → «+ تفاصيل أكثر»; button 75×44, `aria-expanded="false"`, `aria-controls` resolves, panel `hidden` + `display:none`; `name="partyId"/"projectId"/"note"` still posted (`order.mjs`) |
| 1 | `form-open` — `?partyId=` preset | ok | ok | — | PASS. «− تفاصيل أقل» 76×44, `aria-expanded="true"`, panel 324/702×290; party preselected; select has no `name`, last option «+ جهة جديدة», hidden `partyId=p_noor` |
| 1 | `form-open-newparty` / `-dup` | ok | ok | — | PASS. Box under the select: labelled nameless input 298/332×44, type select عميل/مورد/أخرى (no موظف), «حفظ» 53×44 + «إلغاء» 50×44 both `type="button"`, nothing inside carries a `name`, one `<form>`; the dup refusal 16 px `role="alert"` under the buttons; at 390 the grid stacks, at 1280 two columns |
| 1 | `form-note-error` (B1) | ok | ok | — | PASS. Disclosure open, «تحقق من البيانات المدخلة» under the note |
| 1 | `form-edit-open` — counterparty + project | ok | ok | — | PASS. Opens, «أخرى (اكتب الاسم)» selected with its name input, `counterparty` posted |
| 1 | `form-staff` / `form-staff-open` | ok | ok | — | PASS. Disclosure present (75×44); last option «أخرى (اكتب الاسم)» — no sentinel |
| 1 | `form-payment` | ok | ok | — | PASS (D28). No disclosure; المبلغ → التاريخ → التصنيف → طريقة الدفع → ضمن نشاط → ملاحظة; banner posts `direction/partyId/instalmentId`. See S-P2-1 for the prefilled amount |
| 2 | `plan-new-fixed` / `-box`, `plan-new-open` / `-box` | ok | ok | — | PASS. Sentinel last after the موظف group; select `name`-less, hidden `partyId=""`; box 332/349×44 fields, same buttons, «الاسم يجب أن يكون حرفين…» shown |
| 2 | `plan-edit-open-locked`, `plan-edit-fixed-locked` | ok | ok | — | PASS. Disabled select, last option «أحمد العمري» (no sentinel), hidden `partyId` carries the plan's party |
| 3 | `home-firstrun-0` / `-2` | ok | ok | ok | PASS. Card y=209 between quick actions (y=129) and money cards (y=538/540); links 356/734×44 to `/owner/transactions/new`, `/owner/parties/new`, `/owner/plans/new`, `/owner/staff/new`; two ticks + sr «تم»; «2 من 4» / «0 من 4» Western; «إخفاء» 54×44 `type="button"`; print: card `shown:false`, 0 navs/forms |
| 3 | `home-firstrun-premount` / `-alldone` | ok | ok | — | PASS. Server render `no-print hidden` (0×0, money cards at y=209); all done → nothing rendered |
| 4 | `confirm-delete` (danger), `confirm-unlock` (accent) | ok | ok | — | PASS (D26a). 352×162 at 19,341 on the phone and 448×162 at 416,319 on the desktop — `dx=0 dy=0` from the viewport centre, computed margin `341px 19px` / `319px 416px`; `animation: none` in both motion settings |
| 5 | `settings-categories` | ok | ok | — | PASS (D26b). «→ الإعدادات» 68×44, the arrow points right (`crop-back-arrow-p2.*.png`) |

Across all 88 captures: `scrollWidth == viewport` (0 exceptions), 0 Eastern digits, no element of part 2 outside the viewport, no new animation class anywhere in the diff (`sweep` motion map empty; the only `dialog[open]` is static), so reduced-motion parity holds by construction. Sweep over `5abaf5a..HEAD` (20 files): 0 physical utilities, 0 Eastern digits, 2 regex false positives (`screens.tsx:109` is the second line of a JSX comment; `PartyQuickAdd.tsx:90` is the doc comment "A plain labelled `<input>`" — the real input at 123–134 has `id` + `<label htmlFor>`).

### Findings
**BLOCKER — none.**

**SHOULD**
- S-P2-1 (pre-existing since v1.2a `792a601`, **not** part-2 code; component owned by `p2-forms`, call for the lead) `src/features/transactions/components/AmountField.tsx:59-72` — in every *prefilled* amount input the «ر.س» badge is drawn over the first digits: the badge's `end-3` resolves in the RTL page to the **left**, while the `dir="ltr"` input's `pe-14` reserves the **right**, so the digits start under the badge. Seen on the edit form (`crop-edit-amount.png`: «4800.50»), the payment prefill (`crop-payment-amount.png`: «7500.00»), the plan edit total and every schedule row (`p2-plan-edit-fixed-locked.phone.content.png`); an empty field hides it because the placeholder sits elsewhere. Part 1 did not catch it (its prefilled forms were judged at 1×). Fix (one attribute): `dir="ltr"` on the `<div className="relative">` wrapper so `end-3` and `pe-14` agree; or `start-3` on the span + `ps-14 pe-3` on the input.

**NOTE**
- N-P2-1 (`p2-home`, low) `src/features/dashboard/components/FirstRunCard.tsx:73-76` — the link rows hover `bg-gray-200/60` inside a `rounded-xl` Card with no `overflow-hidden`, so hovering the **last** row paints square corners over the card's rounded bottom (desktop hover only; not capturable statically). Fix: `overflow-hidden` in the Card `className`, or `last:rounded-b-xl` on the row.
- N-P2-2 (`p2-home`, accepted by D25, recorded) — the server renders the card `hidden`; after hydration an un-dismissed card pushes the money cards from y=209 to y=538 (≈330 px shift at both widths). The dismissed card never flashes, as specified.
- N-P2-3 (pre-existing v1.2a, pattern of S1/N5) `src/features/transactions/components/PaymentBanner.tsx` — the owner's plan link «توريد مواد البناء — عرض الاتفاقية» is 171×20. Fix: `inline-flex min-h-11 items-center`.
- N-P2-4 (`lead`, cosmetic, already on the CP-D list) `src/components/skeletons/screens.tsx:108-113` — the owner's `EntryFormSkeleton` shows 4 fields + the disclosure bone; the real owner form has the category quick-action row between التصنيف and طريقة الدفع (staff matches exactly).
- N-P2-5 harness artefacts, not findings: `CountUp`'s aria-hidden moving-digit `<bdi>` reports a rect left of the viewport on the phone money cards while the visible amount sits inside its card and the page does not scroll (v1.3, same on every home render); the amber `lab()` notices again report 1.2:1 (N8); the desktop `content` captures paint the sticky header mid-image; and the injected «+ جهة جديدة» pages keep the hidden `partyId` of the preselected party (the browser would post `""` while the sentinel is chosen — that is `postedPartyId`'s pin in `partyQuick.test.ts`, not something a static render can show).

### What could not be verified statically (and why)
- Everything behind an event: choosing the sentinel actually mounting the box (and `autoFocus` landing in it), «إلغاء» restoring the previous party/direction, the upsert + selection + toast after `createParty`, Enter being swallowed, the disclosure toggle writing `ledger:detailsOpen` only on a user click (S7), the B1 effect opening on a *later* refused submit, «إخفاء» writing `home:firstRunHidden`, the ConfirmDialog focus trap. The renders are `renderToStaticMarkup`; the open states above are markup surgery, the dialogs `showModal()` on the static DOM.
- The owner home as the server assembles it (`getOwnerDashboard` + `firstRunReads`): only the three components were composed; the rest of the page (dues, projects, charts) was not re-rendered.
- Real fonts/devices, iOS `env(safe-area-inset-bottom)`, real print dialogs, the PWA and any Next runtime behaviour — same binding constraint as part 1.

### Tasks completed (part 2)
| Task | Files touched | Build/tests pass | Notes for others |
|---|---|---|---|
| 22 part-2 screens rendered, 88 captures / 148 PNGs + 5 crops, probes, static sweep, this recording | `progress/v14/qa-visual.md` (+ scratchpad only) | n/a (no build run; render harness 12/12 green) | 0 BLOCKER / 1 SHOULD (pre-existing AmountField) / 5 NOTE — owners: `p2-forms`/lead S-P2-1 N-P2-3, `p2-home` N-P2-1 N-P2-2, `lead` N-P2-4 |

### Gotchas (part 2)
- `document.querySelector("form")` on a shell page is the header's logout form — scope form probes to `main form` (the first probe pass reported an empty field order for that reason; `order.mjs` is the corrected measure).
- `page.locator(sel).boundingBox()` after an element screenshot of `<main>` is viewport-relative on a scrolled page, while `screenshot({ clip })` wants page coordinates: scroll to the top before clipping (or use `crop.mjs`).
- The first `button[aria-expanded]` inside the entry form is the category «تعديل التصنيفات» toggle; the D24 disclosure is the one with `aria-controls` and `no-print`.

### Part 2 re-shoot (2026-10-11, after the lead's S-P2-1 / N-P2-3 / N-P2-1 edits)
Re-rendered (12/12) and re-shot `p2-form-edit-open`, `p2-form-payment`, `p2-plan-edit-fixed-locked`, `p2-home-firstrun-2` (standard captures → `report.<name>.json`; geometry, hover and 2× crops → `S/reshoot.mjs`, `S/shots/reshoot-*.png`). The built CSS already had every class.
- **S-P2-1 fixed** on all three `AmountField` sites, at 390 and 1280: wrapper `dir="ltr"`, badge 23 px wide at `inputRight − 12 … − 35`, inside the 56 px `pe-14` reserve, digits end 215 px (phone) / 593 px (desktop) short of it (`clear: true`; edit «4800.50», payment prefill «7500.00», plan total «30000.00»). `reshoot-p2-form-edit-open.{phone,desktop}.amount.png`, `reshoot-p2-form-payment.*.amount.png`, `reshoot-p2-plan-edit-fixed-locked.*.amount.png`.
- **Residual, same bug, different component (`lead`, pre-existing v1.2a):** the schedule rows do not use `AmountField` — `src/features/plans/components/ScheduleRows.tsx:73-83` renders the shared `Input` with `suffix` + `dir="ltr"`, and `src/components/Input.tsx:54` wraps it in a `<div className="relative">` with the suffix at `end-3` (line 75) and `pe-14` on the input (line 64): badge left = text start (62 px on the phone, 206 on the desktop, `clear: false` on all four rows), so «7500.00» is still overdrawn (`reshoot-p2-plan-edit-fixed-locked.phone.row1.png`). Same one-attribute fix: `dir={dir}` (or `dir="ltr"` when `suffix` is set) on `Input.tsx:54`'s wrapper; every other `Input` user without a suffix is unaffected.
- **N-P2-3 fixed:** the PaymentBanner link «توريد مواد البناء — عرض الاتفاقية» is 171×44 at both widths (was ×20), `display: flex`; no `small` entry left on the payment captures. `reshoot-p2-form-payment.phone.banner.png`.
- **N-P2-1 verified with a real hover** (`locator.hover()`, `:hover` matched): the last row paints `bg-gray-200/60` with `border-radius: 2px`, equal to the card's — the theme sets every radius token to `0.125rem` (`globals.css:55-59`), so the corner question was moot in this theme; nothing pokes out. `reshoot-p2-home-firstrun-2.{phone,desktop}.hover.png`.
- Unchanged elsewhere: `scrollWidth` = viewport on all 16 new captures, 0 Eastern digits, first-run print still hides the card, the N-P2-5 CountUp-bdi artefact still reported on the phone home.
