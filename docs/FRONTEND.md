# FRONTEND.md

Read `CLAUDE.md` and `PROGRESS.md` first. Owner of this doc: lead. Implementer: `frontend`. Data comes only from `queries.ts` functions and server actions defined in `docs/BACKEND.md`. Until the matching backend task lands, build against their signatures with local stub data behind a **single swap-point module** per feature — one module the screens import from, whose last line re-exports either the stubs or the real actions. The "wire up" task then repoints that one line and deletes the stub file. (A `USE_STUBS` boolean was the original plan; a swap point is better, because a flag and a re-export can disagree while a single re-export cannot.)

## Language and direction
- Arabic only. `<html lang="ar" dir="rtl">`.
- All strings in `src/i18n/ar.ts` as one object `t`; no hard-coded Arabic in components. Adding a new key → tell `backend` by message (error keys must match).
- Font: IBM Plex Sans Arabic via `next/font/google` (bundled at build, no runtime CDN). Fallback `system-ui`. **Reem Kufi 700** (`font-brand`) only where the name زخم is rendered as text.
- Western digits everywhere. Money via `<MoneyText halalas direction?>` → `1,234.50 ر.س`. Dates via `<DateText date>` → Gregorian with Hijri beneath in smaller text.
- Tailwind logical utilities only: `ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`, `text-end`, `rounded-s-`, `rounded-e-`. Never `ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`, `text-right`. Directional lucide icons get `rtl:-scale-x-100`.

## Look and feel
- Mobile-first; owners and staff will mostly use phones. Tap targets ≥ 44px. `max-w-3xl` centered on desktop.
- Calm, high contrast, no decorative animation — the only motion is in *Loading, not found, errors, transitions* below. Formal governmental look (v1.1a): accent Saudi green `#006c35`, hover `#004d26`, neutral greys, squared corners (2px). Text contrast ≥ 4.5:1 everywhere. **Never** the Saudi emblem, a ministry logo, or a gov.sa look-alike header; the brand is the زخم logo set in `public/brand/zakham-brand/`, used unmodified: white wordmark on the green top bar, green wordmark with tagline on the auth screens and `/pending`, the outline icon (greyscale) on the report print header. A green top-bar band carrying our own wordmark is not a gov.sa look-alike; the emblem, ministry logos and a copy of the gov.sa header are what is banned. IN amounts green with `+`, OUT amounts red `#b91c1c` with `−` — never color alone.
- **Every chart carries a server-rendered text equivalent.** recharts' `ResponsiveContainer` needs a measured DOM, so the served HTML contains the container and **zero `<svg>` elements** — the bars exist only after hydration. The numbers are therefore absent with JS off and before hydration, not merely hard to read without colour vision. An `sr-only` table of the same figures satisfies both cases at once, and is the chart equivalent of the `+`/`−` rule.
- Layout per role area: full-width green top bar — white wordmark + establishment name (ADMIN: `t.app.adminArea`) on the right, user link (icon-only below `sm`, name kept as its accessible text) + logout on the left — then side nav on ≥ md / bottom tab bar on mobile, and a footer with version and contact line (hidden in print).
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
- `/pending`: "بانتظار اعتماد الطلب" with who approves (المدير for an owner, صاحب المنشأة for staff) and a logout button. The role comes from the `?as=owner|staff` parameter that `login` / `signupOwner` / `signupStaff` redirect with, falling back to the session role for an ACTIVE visitor who lands here; when neither is known, **omit** the who-approves line rather than guess. There is **no** auto-redirect when the account becomes ACTIVE: a PENDING account deliberately has no session, so the page cannot identify the visitor. The user signs in again to discover they are approved.

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
  - The التصنيف select lists **active** categories **plus the entry's own category when editing**, even if it has since been deactivated — filtering to active rows alone would silently reassign the entry on save.
  - Locked month → blocking notice, submit disabled. Two cases, and they differ: when the **chosen date** falls in a closed month, leave the fields editable so the user can move the date to an open one; when the **entry's current** month is closed, disable the fields too, because no edit can rescue it and live fields invite a form that fails on submit.
- **`/owner/transactions`**: filters as URL search params (from, to, direction, category, method, q); table on desktop / stacked cards on mobile; footer totals for the current filter; 50/page; per-row edit + delete (delete via ConfirmDialog); LockBadge on locked months hides actions. Shows "أضافه: <name>" on each row.
- **`/owner/reports`**: month picker (default current) or custom range; two tables (وارد by category, صادر by category) each with a total row, then الصافي; buttons تصدير Excel (`/api/export?from=&to=`) and طباعة (`window.print()`). Print (v1.1c) is a **designed colour sheet**: header with the outline icon, زخم, establishment name, period and print date; tables with a green header row, IN amounts green and OUT red, zebra rows, a highlighted net box; a footer line `t.print.generatedBy` and page numbers via `@page` margin boxes where the browser supports them; `print-color-adjust: exact` so fills print with "Background graphics" off; fits A4 and Letter; nav, buttons, footer, progress bar all hidden. **How it is built:** one unlayered `@media print` block in `globals.css` (no `print:` utilities mixed in), `print-color-adjust: exact` once on `html`; page numbers in an `@page` `@bottom-center` margin box with `direction: ltr` and digits only (no Arabic in CSS `content`); the `t.print.generatedBy` footer is an ordinary element at the end (`PrintFooter`), never `position: fixed`, which Chrome would repeat over the last lines of every page; print zebra `#fafafa`; the print date shows Gregorian with Hijri beneath. `tfoot` is a plain row group in print, so a category total prints once, last — Chrome repeats a footer group on every page, where it would read as a page subtotal — which is why `TFoot` must stay after `TBody` in the DOM. `break-inside: avoid` sits on each report card and row, not on whole tables. **Colour is never the only signal:** a greyscale printer, a colour-blind reader or a photocopy still loses it, so the `+`/`−` sign stays on every amount. `<MoneyText>` emits a sign only when `direction` is passed, so every amount in the two report tables must pass it explicitly — print is the case the "never colour alone" rule was written for, not an edge case. **The net (الصافي) is the exception: it uses `signed`, not `direction`** — a negative prints `−`, a positive prints bare. The `+`/`−` rule exists to disambiguate two categories a bare number cannot distinguish; a net has one category and a sign, so the absence of `−` is itself unambiguous, and that is the ordinary accounting reading. Same in `LedgerTotals`.
- **`/owner/settings`** tabs:
  - التصنيفات: list by type, add, rename, activate/deactivate, move up/down.
  - الموظفون: pending requests (قبول / رفض); active staff with a `canEdit` toggle labelled "السماح بالتعديل", تعطيل / تفعيل, إعادة تعيين كلمة المرور.
  - رمز الانضمام: show current code large with copy button; إعادة توليد (ConfirmDialog — old code stops working).
  - إقفال الأشهر: last 24 months grid with lock state; current/future disabled.
  - حسابي: change password.

### Staff area (`/staff`)
- **`/staff` Dashboard**: StatCards وارد هذا الشهر / صادر هذا الشهر (establishment-wide) — **with `t.dashboard.establishmentWideHint` beneath them saying so outright**, because the card titles are neutral and only the contrast with an explicitly possessive حركاتي الأخيرة would otherwise carry the distinction; that is an inference a reader will not make, and a staff member reading establishment-wide totals as their own is a wrong number. Then حركاتي الأخيرة (10). Small notice if `canEdit` is off: "التعديل يتطلب إذن صاحب المنشأة". Primary button + إضافة حركة.
- **`/staff/transactions/new`**: same `TransactionForm`.
- **`/staff/transactions`**: same list as owner but: no delete; edit button only if `canEdit` (server re-checks); no export.
- **`/staff/transactions/[id]/edit`**: only reachable when `canEdit`.
- **`/staff/account`**: change password.

### Admin area (`/admin`) — no financial amounts anywhere
- **`/admin` الطلبات**: pending owner sign-ups: name, email, establishment name, date; قبول / رفض with ConfirmDialog.
- **`/admin/establishments`**: table: establishment, owner, status, staff count, transaction count, last activity; actions تعطيل / تفعيل, إعادة تعيين كلمة مرور المالك. Search box.
- **`/admin/account`**: change password.

## Forms and errors
- Server actions with `useActionState`; field errors under inputs from `fieldErrors`; generic Toast for `ok: false` without fieldErrors. **Exception — the two sign-up forms use an inline `<FormError>` banner, not a Toast.** A toast can be dismissed or missed, and the "already have an account?" link lives in that banner: it is the only route out for someone whose email is already registered, who by design is told only that sign-up failed. The banner sits with the submit button, carries `role="alert"`, and stays silent when `fieldErrors` is populated. `/login` keeps the Toast — the link would be pointless there.
- **Two submit buttons need a named submit field.** `useActionState` hands the reducer `(prevState, formData)` with no submitter, so a `<Button type="submit" name="intent" value="…">` is how the reducer tells حفظ from حفظ وإضافة أخرى. It reaches the server only as a side effect of being a real form field and is stripped by the `z.object()` — behaviour pinned by `validation.test.ts`. Do not remove it as a stray field.
- Client-side validation imports the same zod schemas from `src/lib/validation.ts`.
- Disable submit while pending; never double-submit.

## PWA
- `public/manifest.json`: name and short_name زخم, `dir: "rtl"`, `lang: "ar"`, `display: "standalone"`, theme `#006c35`, icons from `/brand/zakham-brand/`: `icon-192.png` and `icon-512.png` (`any`), `icon-maskable-192.png` and `icon-maskable-512.png` (`maskable`).
- Service worker: **cache only `/_next/static/*`, `/icons/*` and `/manifest.json`.** (Since v1.1a the icons live under `/brand/`, which is deliberately not added: they load from the network. `/icons/*` stays in the pinned allowlist, now matching nothing. Bump the cache name whenever `manifest.json` changes, because it is served cache-first.) "App shell" has no referent here — every HTML response in this app is server-rendered and session-scoped, so an implementer reaching for "the shell" reaches for a data-bearing page. The load-bearing half is the fetch handler: **it must not call `respondWith` at all unless the URL matches that allowlist**, leaving everything else untouched on the network. A catch-all `respondWith` with any cache strategy is how a data page gets cached by accident, and "never `/api/*`" does not prevent it, because the dangerous responses are HTML pages rather than API routes. Caching one establishment's page would serve it to the next visitor on a shared device. No offline writes means no background sync and no queued POSTs.
- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`; bottom tab bar respects `env(safe-area-inset-bottom)`.

## Accessibility
- Every input has a `<label>`. Icon buttons carry text or `aria-label`. Visible focus rings. Contrast ≥ 4.5:1. `ConfirmDialog` traps focus, closes on Escape.

## Do not
- No dark mode, animations (beyond the two in *Loading, not found, errors, transitions*), English toggle, UI kit, client-side data fetching, or localStorage beyond the last-used direction toggle.
- Never render an amount in the admin area, even if a query accidentally returns one.

## Loading, not found, errors, transitions (v1.1a)
- **Loading:** a `loading.tsx` beside each page (17), with a skeleton shaped like that page (stat cards, table rows, form fields) from `src/components/skeletons/`, in `gray-200` on white and `gray-300` straight on the `gray-50` body, 2px corners. One `role="status"` per loading file (no `aria-busy`) with `t.common.loading` as screen-reader text; the skeleton pieces are `aria-hidden`. A `loading.tsx` wraps its whole subtree, so the two ledger pages live in a `transactions/(list)/` route group (URL unchanged) — otherwise the ledger skeleton would flash on the way to إضافة. No `loading.tsx` at a group root: it would wrap the group layout and stream its `requireX()` redirects. Pulse only via `motion-safe:`, no gradient shimmer (a physical gradient runs the wrong way in RTL). No bare spinners.
- **Accepted consequences:** inside a loading boundary a page-level `notFound()` answers 200 + `noindex` instead of 404, and a page-level `requireX()` redirect (e.g. `requireCanEdit()` on `[id]/edit`) is streamed (200 + client redirect) instead of a 307. Same body, same destination, nothing rendered; the layout-level gates keep their 307s.
- **Not found:** `src/app/not-found.tsx` (+ optional per-group ones so the chrome stays): "الصفحة غير موجودة" and one link — the role home via `homePathFor(session.role)` when the cookie has `userId` and `role`, else `/login`. It reads the cookie only to pick a link; it never calls `requireX()` and authorises nothing. Reading the cookie keeps it dynamic, so it gets the CSP nonce.
- **Errors:** `error.tsx` per role area plus `src/app/error.tsx` (for errors thrown in a group layout): "حدث خطأ غير متوقع" and a retry button calling Next 16.3's `retry` (it refreshes server data; `reset` alone would not). Text in `role="alert"`. Never show `error.message`, a stack or the digest.
- **Transitions (v1.1c):** one CSS rule, `#main > * { animation: fade-in ~220ms ease-out }` inside `@media screen and (prefers-reduced-motion: no-preference)`, opacity plus a 4px rise (`translateY(4px)` → `0`). A transform makes the element a containing block for fixed descendants *while it runs*, so a Toast shown in those ~220 ms is positioned against the page root — acceptable because it cannot outlive the animation. **Progress bar:** a thin green bar fixed at the very top while a route change is pending (`src/components/NavProgress.tsx`, mounted once in `AppShell` outside the nav and `#main`, fed by `useLinkStatus` in the nav links through a small context; no library), `#a7cdb6` (the dark top strip makes `#006c35` invisible), ≤ 3px, shown after ~100 ms, `aria-hidden`, `no-print`, static under reduced motion. Because nav targets are prefetched and have a `loading.tsx`, it mostly shows on slow first taps. Previously (v1.1a): `#main` is on AppShell's `<main>`, on the standalone not-found/error frames, and on the auth layout's inner column (so `/login` → `/signup` fades too). **No `both`/`forwards` fill:** a filling opacity animation keeps the page root a stacking context forever and would trap the fixed `z-50` Toast under the tab bar and top bar. No sideways sliding, no animation library, nothing inside `@media print`. The tapped nav item shows its active style immediately (a visual pending style from `useLinkStatus`); `aria-current` stays on the real current page and `nav.ts` `activeHref` is unchanged.
