V14-SPEC.md — زخم v1.4: simpler owner flows
Authoritative specification for v1.4, written by the product owner (the user) on 2026-10-10 and recorded here verbatim by the lead. It outranks `docs/BACKEND.md` / `docs/FRONTEND.md` and, for the owner navigation, `docs/V12-SPEC.md` §1 (see Decisions). Code, docs or a brief that disagree with it are changed to match, with a Decision logged in `PROGRESS.md`. Agents: `cats`, `add`, `plans`, `reviewer`; recordings in `progress/v14/`.

Goal of v1.4: make the owner (صاحب المنشأة) side simpler to use **without removing any function**. Three edits, one agent each, plus a reviewer. Nothing else changes.

## Team

| Agent | Owns (may edit) | Reads |
|---|---|---|
| `cats` | `src/features/transactions/components/**` (new `CategoryQuickActions.tsx`, `CategoryChips.tsx`), `src/features/settings/components/Categories*.tsx`, `src/features/settings/actions.ts` **only** the category actions, `src/app/(owner)/owner/settings/page.tsx`, `src/app/(owner)/owner/settings/categories/**` | everything |
| `add` | `src/components/chrome/**` (incl. `nav.ts`, `nav.test.ts`, `MoreSheet.tsx`, `RoleNav.tsx`, new `AddSheet.tsx`), `src/app/(owner)/owner/transactions/(list)/**`, `src/app/(owner)/owner/projects/page.tsx` (redirect only), `src/app/(staff)/staff/**/layout.tsx`, `src/features/dashboard/components/QuickActions*.tsx`, `src/i18n/ar.v12a.ts` **values only** for the «الإضافات → الأنشطة» rename | everything |
| `plans` | `src/features/plans/**`, `src/app/(owner)/owner/plans/**`, `src/lib/validation.ts` (only the new open-plan schemas, announced to lead), `src/features/transactions/actions.ts` **only** the new `recordOpenPlanPayment` path; **added at CP-A (user):** `src/features/parties/statement.ts` and the one `totalHalalas` line in `src/features/transactions/payments.ts` — first task is the compile pass | everything |
| `reviewer` | nothing | every brief and every diff |
| lead | `docs/*`, `PROGRESS.md`, `progress/v14/lead.md`, `prisma/**`, `src/i18n/ar.v14.ts` keys, `package.json` | everything |

Rules carried from v1.3: reviewer reads all three briefs **before** any code is written and posts concerns to the lead; one commit per checkpoint; **no push, no amend, no `.git/info/exclude`**; every rule in the spec gets a mutation-proven test (break the rule, see the test fail, restore); RTL logical utilities only; Western digits; all copy via `src/i18n/*`; `prefers-reduced-motion` respected; print output unchanged unless stated; scoping gate test must still pass for every new action; routes' gzipped JS may not grow more than 40 KB (`progress/v13/measure-bundles.mjs`).

## Spec

### A. Categories managed from the transaction form — agent `cats`

A1. The category `<select>` in `TransactionForm` is **not changed** (same element, same options, same behaviour). Nothing is added inside it.
A2. Directly under the select, **owner only** (staff see nothing new), two small text links in one row: «+ إضافة تصنيف» and «تعديل التصنيفات». Rendered by `CategoryQuickActions` (client component). It is not a nested `<form>`; it calls the existing category server actions directly.
A3. «+ إضافة تصنيف» reveals an inline one-line box: name input (same zod rules as the settings page) + «حفظ» + «إلغاء». On success the new category is appended to the select's options **for the current direction** and becomes the selected value; the box closes; a toast «تمت إضافة التصنيف». Errors show under the box.
A4. «تعديل التصنيفات» toggles edit mode: the active categories of the current direction appear as chips under the select (`CategoryChips`), gently wiggling (CSS keyframes, ±1.5°, 0.3 s; static under reduced-motion), each with a ✕. Tapping ✕ opens `ConfirmDialog` «إخفاء التصنيف «X»؟ الحركات القديمة تحتفظ به.» → calls the existing deactivate action. The chip leaves with a 200 ms fade, the option disappears from the select; if it was selected, the select resets to its placeholder. Last row of edit mode: a «تم» button and a small link «المزيد (إعادة ترتيب، إعادة تسمية، إظهار)» → `/owner/settings/categories`. Edit mode never submits the transaction form.
A5. `/owner/settings/categories` keeps every current function (list, add, rename, activate/deactivate, move up/down). It is removed from the settings **menu** and from the settings index page cards; the route stays. It gets a back link «← الإعدادات» and a one-line hint at the top «يمكنك أيضًا إضافة التصنيفات وإخفاؤها مباشرة من نموذج الحركة.».
A6. Tests: staff render of `TransactionForm` contains no quick-action links (mutation: flip the role check); adding returns the category selected; hidden category disappears from options while existing transactions still show its name (existing behaviour, pin it); the settings route still renders for owner.

### B. One «+» for everything, and «الإضافات» becomes «الأنشطة» — agent `add`

B1. New `AddSheet` (bottom sheet on mobile, popover on desktop, same visual language as `MoreSheet`). Owner rows, in this order, first row visually larger:
   1. «حركة جديدة» → `/owner/transactions/new`
   2. «تسجيل دفعة» → `/owner/plans?pick=payment` (the plans list shows a top banner «اختر الاتفاقية لتسجيل الدفعة»; `plans` agent handles the banner, `add` only links)
   3. «نشاط جديد» → `/owner/projects/new`
   4. «جهة جديدة» → `/owner/parties/new`
   5. «موظف جديد» → `/owner/staff/new`
   Staff rows: «حركة جديدة» → `/staff/transactions/new`; «تسجيل حضوري» → `/staff/me` only when `linked` (same flag `staffNav` uses). Admin: no «+».
B2. `nav.ts` — new owner structure, exactly:
   - الرئيسية
   - **«+ إضافة»** (a primary-styled item that opens `AddSheet`, not a link)
   - المالية: السجل, التقارير
   - العملاء والالتزامات: الجهات, الاتفاقيات, المستحقات (unchanged)
   - الموظفون: الموظفون, الحضور, حسابات الدخول (unchanged)
   - الإعدادات: رمز الانضمام, إقفال الأشهر, التذكيرات, حسابي
   Removed from menus: «حركة جديدة», the whole «إضافة» group, «التصنيفات». `OWNER_TAB_HREFS` becomes `الرئيسية | + | السجل | المستحقات | المزيد` (the + is the centre tab). Staff bar: `الرئيسية | + | السجل | [حضوري] | حسابي`. Update `nav.test.ts`; `activeHref` must never highlight the «+».
B3. `/owner/transactions` gets two tabs via the existing `Tabs`: «الحركات» (today's page, default) and «الأنشطة» (renders the existing projects list component unchanged, with its own filters, inside the tab). URL `?tab=activities`. Tabs are instant (v1.3 decision). `/owner/projects` becomes a server redirect to `/owner/transactions?tab=activities`; `/owner/projects/new`, `/owner/projects/[id]`, `/owner/projects/[id]/edit` stay as they are.
B4. Rename, values only in `ar.v12a.ts` (keys unchanged): every user-visible «الإضافة/الإضافات/إضافة جديدة» that means a project becomes «النشاط/الأنشطة/نشاط جديد» (`projectsList` → «الأنشطة», `projectNew` → «نشاط جديد», `title` → «الأنشطة», `activeOnHome` → «الأنشطة الجارية», `viewAll` → «عرض كل الأنشطة», `emptyHint` → «النشاط بند تسميه أنت وله تكاليفه الخاصة، مثل فرع جديد أو مناسبة.», etc.). Do not touch `ar.ts:181 createdAt "تاريخ الإضافة"` (that means "date added"). `QuickActions` on the home page keeps its three buttons **unchanged**: «حركة جديدة», «تسجيل دفعة», «تسجيل حضور» (user's ruling at CP-A, replacing the draft's «نشاط جديد» — that row lives only in the `AddSheet`).
B5. Tests: nav has no `/owner/transactions/new`, `/owner/projects*`, `/owner/settings/categories` entries (mutation-proven); staff sheet shows «تسجيل حضوري» only when linked; `/owner/projects` redirects; no string in `src/i18n/*` still says «قائمة الإضافات» or «إضافة جديدة» for projects.

### C. Open agreements (اتفاقية مفتوحة) — agent `plans`, lead for schema

C1. Schema (expand-only): `enum PlanKind` gains `OPEN_ENDED`; `Plan.totalHalalas Int` becomes `Int?` (unknown ceiling); new `Plan.expectedEndDate DateTime? @db.Date`; new `Transaction.planId String?` with relation to `Plan` (`onDelete: Restrict`) and `@@index([planId])`. Existing rows untouched. Instalment payments keep using `instalmentId` only; open-plan payments use `planId` only; a transaction never has both (zod + DB check in the action, tested).
C2. «اتفاقية جديدة» opens with two choice cards (same component style as `PlanDirectionCards`): «دفعات محددة» → today's form unchanged; «اتفاقية مفتوحة» → `?kind=open` form: الجهة, الاتجاه (لنا / علينا), العنوان, التصنيف, **إجمالي المبلغ (اختياري)**, **تاريخ الانتهاء المتوقع (اختياري)**, ملاحظة. No schedule builder. Helper text under total: «اتركه فارغًا إذا كان المبلغ غير محدد.»
C3. Open plan detail page: header with «المستلم حتى الآن» (or «المدفوع حتى الآن» for payable) large; if total set: a plain progress bar (green → gold ≥ 80 % → full at 100 %) + «المتبقي»; else only the running total. Primary button «تسجيل دفعة» → inline form: المبلغ, التاريخ (default today, max today), طريقة الدفع, ملاحظة. Saves a normal `Transaction` with `planId`, `partyId = plan.partyId`, `categoryId = plan.categoryId`, `direction` derived like instalment payments (receivable → IN, payable → OUT), through the same `assertUnlocked`, 20M cap, audit log. Below: payments list (date, amount, method, by whom, edit link to the transaction's existing edit page). Secondary actions: «إنهاء الاتفاقية» (ConfirmDialog → state `ARCHIVED`, `closedAt` set, label shown «منتهية»), and «إعادة فتح» when archived (open-ended plans only).
C4. Auto-close: after a successful payment, if `totalHalalas` is set and received **≥** total, the plan becomes `ARCHIVED` in the same transaction, guarded by `revision`. Received total is always computed from non-deleted transactions with this `planId` (no cache). Editing/deleting such a payment never changes state automatically.
C5. Exclusions, each with a test that fails if the kind check is removed: open-ended plans never produce rows in `getDues`, the aging report, or reminder digests; they are not SALARY and cannot have `employeeId`. They **do** appear in: the plans list (tag «مفتوحة»; progress bar or «المستلم: X ر.س» instead of the segmented bar), the party statement (via `partyId`), the ledger and reports (normal transactions).
C6. Plans list with `?pick=payment`: top banner «اختر الاتفاقية لتسجيل الدفعة» and every card links straight to the place where a payment is recorded (open plan → its detail; fixed plan → its detail, instalment list). Edit page for open plans: title, total, expected end date, notes editable; party and direction locked once a payment exists (same rule as fixed plans).
C7. Tests: zod schema (total optional, ≥ 1 halala when set, expected date ≥ start); payment inherits party/category/direction; both-link rejection; auto-close at exactly total (mutation: change ≥ to >); scoping gate for every new action; locked month blocks the payment; staff cannot record open-plan payments (owner only, same as instalment payments today).

## Checkpoints

**CP-A (lead alone):** spec file, strings file, schema + migration SQL (not applied), updated `PROGRESS.md`. Report: the migration SQL, the final nav structure as a list, and any decision made. Then **wait for "apply"**; after Neon is migrated and `npx prisma generate` passes, spawn the team.

**Build:** `cats`, `add`, `plans` work in parallel; `reviewer` reads briefs first, then reviews each completed task against `docs/BACKEND.md` security, `docs/FRONTEND.md` RTL rules, and this spec, messaging findings. Agents message the lead when they need a change in a file they don't own. The lead does not implement agent tasks.

**CP-B:** all tasks done, reviewer findings closed, `npm run build` + `npm test` pass, bundle check passes. One commit: `v1.4: simpler owner flows`. Merge `progress/v14/*.md` into `PROGRESS.md` (anchored edits), add the v1.4 Decisions, report with a click-list for local testing (`npm run build && npm start`, `http://localhost:3000`). No push.

**CP-C (after the user's OK):** `qa-visual` (every owner and staff screen at 390 px and 1280 px, RTL and reduced-motion) and `qa-tests` (reads every new test and tries to break each rule). Fix, one commit `v1.4: release prep`, update `README.md` if the nav screenshots/wording changed, final PROGRESS.md session log. Then ready to push.

If anything in this spec conflicts with `docs/V12-SPEC.md` or existing tests, stop and ask the user before coding.

## Decisions (lead, CP-A — each also logged in `PROGRESS.md › Decisions`)

D1. **This spec supersedes `docs/V12-SPEC.md` §1 "Navigation (final)"** for the owner side nav, the owner mobile bar, the staff bar and the home quick actions. Same author; V12-SPEC is left as written (it is the product owner's file) and §1 is read as the v1.2 state.
D2. **Migration generated with `migrate diff`, not `migrate dev --create-only`.** `migrate dev` connects to the dev database — Neon, shared with live — needs a shadow database, and offers a reset on drift. `npx prisma migrate diff --from-schema <HEAD schema> --to-schema prisma/schema.prisma --script` needs no database and is how every migration since v1.1e was made (PROGRESS Gotcha). Directory `prisma/migrations/20261010000000_v14_open_plans`, the date-zero naming of the earlier ones. The drift test applies every migration directory, so the new one is checked without registering it.
D3. **Home `QuickActions` is not touched** (user's ruling at CP-A, reversing the lead's draft): the three tiles stay «حركة جديدة» → `/owner/transactions/new`, «تسجيل دفعة» → `/owner/dues`, «تسجيل حضور» → `/owner/staff/attendance`, as V12-SPEC §1 says. «نشاط جديد» exists only as row 3 of the `AddSheet`. `add` therefore edits `QuickActions.tsx` only if the rename in B4 requires it (it does not — the component uses `t.quickActions.*`, none of which names a project).
D4. **C5's "test that fails if the kind check is removed" must not be vacuous.** An OPEN_ENDED plan has no instalments, so `getDues`, the aging report and the digest already skip it structurally; a test that only creates an open plan would keep passing with the kind check deleted. Each exclusion test therefore seeds an OPEN_ENDED plan **with** an instalment row (directly in the fixture — the UI can never create one) and asserts it still yields nothing. Removing `kind !== "OPEN_ENDED"` then fails exactly that case.
D5. **`planId` joins the scoping gate's V1 reference-probe key set** (`{ establishmentId, partyId, projectId, instalmentId }` → `+ planId`), so "does this open plan have a payment" can be asked without reading an amount. Per the v1.2a rule, widening an encoded exception needs this Decision **and** a pinning case: a probe on `planId` with an amount `select` must fail, and one with `planId` plus any other key must fail. `plans` adds both cases in `scoping.test.ts`.
D6. **`Plan.totalHalalas` is `Int?` for every kind at the type level, but STANDARD/SALARY code may not start treating it as optional.** `PlanInputSchema` keeps `totalHalalas` required; the typecheck fallout in `plans/*` is resolved by narrowing at the read boundary (a STANDARD/SALARY row with a null total is data corruption → fail loud), never by `?? 0`.
D7. **Open-plan payments are OWNER-only and live in their own module** (`src/features/transactions/openPlanPayments.ts`, server-only, in the static sweep), called from `actions.ts` by the new `recordOpenPlanPayment`; `actions.ts` (240 lines) must not grow, `TransactionForm.tsx` (frozen) is not touched by `plans`.
