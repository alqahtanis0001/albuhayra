# FRONTEND.md

Read `CLAUDE.md` and `PROGRESS.md` first. Owner of this doc: lead. Implementer: `frontend`. Data comes only from `queries.ts` functions and server actions defined in `docs/BACKEND.md`. Until the matching backend task lands, build against their signatures with local stub data behind a **single swap-point module** per feature — one module the screens import from, whose last line re-exports either the stubs or the real actions. The "wire up" task then repoints that one line and deletes the stub file. (A `USE_STUBS` boolean was the original plan; a swap point is better, because a flag and a re-export can disagree while a single re-export cannot.)

## Language and direction
- Arabic only. `<html lang="ar" dir="rtl">`.
- All strings in `src/i18n/ar.ts` as one object `t`; no hard-coded Arabic in components. Adding a new key → tell `backend` by message (error keys must match).
- Font: IBM Plex Sans Arabic via `next/font/google` (bundled at build, no runtime CDN). Fallback `system-ui`.
- Western digits everywhere. Money via `<MoneyText halalas direction?>` → `1,234.50 ر.س`. Dates via `<DateText date>` → Gregorian with Hijri beneath in smaller text.
- Tailwind logical utilities only: `ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`, `text-end`, `rounded-s-`, `rounded-e-`. Never `ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`, `text-right`. Directional lucide icons get `rtl:-scale-x-100`.

## Look and feel
- Mobile-first; owners and staff will mostly use phones. Tap targets ≥ 44px. `max-w-3xl` centered on desktop.
- Calm, high contrast, no decorative animation. Accent `#0f766e`. IN amounts green with `+`, OUT amounts red `#b91c1c` with `−` — never color alone.
- Layout per role area: top bar (app name, establishment name, user name, logout) + bottom tab bar on mobile / side nav on ≥ md.
  - Owner tabs: الرئيسية · إضافة · السجل · التقارير · الإعدادات
  - Staff tabs: الرئيسية · إضافة · السجل
  - Admin nav: الطلبات · المنشآت · حسابي

## Shared components (`src/components/`)
`Button`, `Input`, `Select`, `Textarea`, `Card`, `StatCard`, `Table`, `EmptyState`, `MoneyText`, `DateText`, `DirectionBadge`, `StatusBadge`, `LockBadge`, `ConfirmDialog`, `Toast`, `Tabs`, `Pagination`. Tiny, Tailwind only, no UI kit.

## Route groups
```
src/app/(auth)/login, signup, pending
src/app/(owner)/owner/…          layout enforces OWNER
src/app/(staff)/staff/…          layout enforces STAFF
src/app/(admin)/admin/…          layout enforces ADMIN
src/app/page.tsx                  redirects to the role's home
```

## Screens

### Auth
- `/login`: email, password, submit; link to sign-up. Generic error on failure.
- `/signup`: two large choice cards first — **صاحب منشأة** / **موظف** — then the form. Owner form: name, email, password, اسم المنشأة. Staff form: name, email, password, رمز الانضمام (8 chars, uppercase, auto-uppercase input). On success → `/pending`.
- `/pending`: "حسابك بانتظار الموافقة" with who approves (المدير for an owner, صاحب المنشأة for staff) and a logout button. The role comes from the `?as=owner|staff` parameter that `login` / `signupOwner` / `signupStaff` redirect with, falling back to the session role for an ACTIVE visitor who lands here; when neither is known, **omit** the who-approves line rather than guess. There is **no** auto-redirect when the account becomes ACTIVE: a PENDING account deliberately has no session, so the page cannot identify the visitor. The user signs in again to discover they are approved.

### Owner area (`/owner`)
- **`/owner` Dashboard**: StatCards: الرصيد الإجمالي, وارد هذا الشهر, صادر هذا الشهر, الصافي. Below: الرصيد حسب طريقة الدفع (small table: نقد / بنك / مدى / STC Pay / أخرى). Bar chart last 6 months وارد vs صادر (recharts). أعلى المصروفات هذا الشهر (top 5 OUT categories with amounts and % of month OUT). آخر الحركات (10). Primary button + إضافة حركة.
- **`/owner/transactions/new`** and **`/owner/transactions/[id]/edit`** share `TransactionForm`:
  1. Direction segmented toggle وارد / صادر (default: last used, stored in localStorage; else صادر)
  2. المبلغ: `inputMode="decimal"`, suffix ر.س
  3. التاريخ: default today, max today
  4. التصنيف: select filtered by direction
  5. طريقة الدفع: select
  6. الجهة (optional), ملاحظة (optional)
  7. حفظ · حفظ وإضافة أخرى (new only)
  - Locked month → blocking notice, submit disabled.
- **`/owner/transactions`**: filters as URL search params (from, to, direction, category, method, q); table on desktop / stacked cards on mobile; footer totals for the current filter; 50/page; per-row edit + delete (delete via ConfirmDialog); LockBadge on locked months hides actions. Shows "أضافه: <name>" on each row.
- **`/owner/reports`**: month picker (default current) or custom range; two tables (وارد by category, صادر by category) each with a total row, then الصافي; buttons تصدير Excel (`/api/export?from=&to=`) and طباعة (`window.print()`). Print stylesheet hides nav/buttons, black on white, header with establishment name + range.
- **`/owner/settings`** tabs:
  - التصنيفات: list by type, add, rename, activate/deactivate, move up/down.
  - الموظفون: pending requests (قبول / رفض); active staff with a `canEdit` toggle labelled "السماح بالتعديل", تعطيل / تفعيل, إعادة تعيين كلمة المرور.
  - رمز الانضمام: show current code large with copy button; إعادة توليد (ConfirmDialog — old code stops working).
  - إقفال الأشهر: last 24 months grid with lock state; current/future disabled.
  - حسابي: change password.

### Staff area (`/staff`)
- **`/staff` Dashboard**: StatCards وارد هذا الشهر / صادر هذا الشهر (establishment-wide), then حركاتي الأخيرة (10). Small notice if `canEdit` is off: "التعديل يتطلب إذن صاحب المنشأة". Primary button + إضافة حركة.
- **`/staff/transactions/new`**: same `TransactionForm`.
- **`/staff/transactions`**: same list as owner but: no delete; edit button only if `canEdit` (server re-checks); no export.
- **`/staff/transactions/[id]/edit`**: only reachable when `canEdit`.
- **`/staff/account`**: change password.

### Admin area (`/admin`) — no financial amounts anywhere
- **`/admin` الطلبات**: pending owner sign-ups: name, email, establishment name, date; قبول / رفض with ConfirmDialog.
- **`/admin/establishments`**: table: establishment, owner, status, staff count, transaction count, last activity; actions تعطيل / تفعيل, إعادة تعيين كلمة مرور المالك. Search box.
- **`/admin/account`**: change password.

## Forms and errors
- Server actions with `useActionState`; field errors under inputs from `fieldErrors`; generic Toast for `ok: false` without fieldErrors.
- Client-side validation imports the same zod schemas from `src/lib/validation.ts`.
- Disable submit while pending; never double-submit.

## PWA
- `public/manifest.json`: name سجل المصروفات, `dir: "rtl"`, `lang: "ar"`, `display: "standalone"`, theme `#0f766e`, icons 192/512 (placeholder PNGs acceptable; note in progress file).
- Minimal service worker caching only the app shell and static assets; never `/api/*` or data pages; no offline writes.
- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`; bottom tab bar respects `env(safe-area-inset-bottom)`.

## Accessibility
- Every input has a `<label>`. Icon buttons carry text or `aria-label`. Visible focus rings. Contrast ≥ 4.5:1. `ConfirmDialog` traps focus, closes on Escape.

## Do not
- No dark mode, animations, English toggle, UI kit, client-side data fetching, or localStorage beyond the last-used direction toggle.
- Never render an amount in the admin area, even if a query accidentally returns one.
