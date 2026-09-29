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
- Calm, high contrast, no decorative animation — the only motion is what *Motion (v1.1d)* below describes, all of it feedback for an action the user took. Formal governmental look (v1.1a): accent Saudi green `#006c35`, hover `#004d26`, neutral greys, squared corners (2px). Text contrast ≥ 4.5:1 everywhere. **Never** the Saudi emblem, a ministry logo, or a gov.sa look-alike header; the brand is the زخم logo set in `public/brand/zakham-brand/`, used unmodified: white wordmark on the green top bar, green wordmark with tagline on the auth screens and `/pending`, the outline icon (greyscale) on the report print header. A green top-bar band carrying our own wordmark is not a gov.sa look-alike; the emblem, ministry logos and a copy of the gov.sa header are what is banned. IN amounts green with `+`, OUT amounts red `#b91c1c` with `−` — never color alone.
- **Every chart carries a server-rendered text equivalent.** recharts' `ResponsiveContainer` needs a measured DOM, so the served HTML contains the container and **zero `<svg>` elements** — the bars exist only after hydration. The numbers are therefore absent with JS off and before hydration, not merely hard to read without colour vision. An `sr-only` table of the same figures satisfies both cases at once, and is the chart equivalent of the `+`/`−` rule.
- Layout per role area: full-width green top bar — white wordmark + establishment name (ADMIN: `t.app.adminArea`) on the right, user link (icon-only below `sm`, name kept as its accessible text) + logout on the left — then side nav on ≥ md / bottom tab bar on mobile, and a footer with version and contact line (hidden in print).
  - Owner tabs: ~~الرئيسية · إضافة · السجل · التقارير · الإعدادات~~ — **superseded in v1.2a** by grouped navigation, see *Owner navigation (CP1)* at the end.
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
- **`/owner/settings`** tabs (**v1.2a: split into pages; الموظفون moved to `/owner/staff/logins`** — see the v1.2a section):
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
- No dark mode, animations (beyond *Motion (v1.1d)*), English toggle, UI kit, client-side data fetching, or localStorage beyond the last-used direction toggle and (v1.2a) the nav's used-groups set.
- Never render an amount in the admin area, even if a query accidentally returns one.

## Loading, not found, errors, transitions (v1.1a)
- **Loading:** a `loading.tsx` beside each page (17), with a skeleton shaped like that page (stat cards, table rows, form fields) from `src/components/skeletons/`, in `gray-200` on white and `gray-300` straight on the `gray-50` body, 2px corners. One `role="status"` per loading file (no `aria-busy`) with `t.common.loading` as screen-reader text; the skeleton pieces are `aria-hidden`. A `loading.tsx` wraps its whole subtree, so the two ledger pages live in a `transactions/(list)/` route group (URL unchanged) — otherwise the ledger skeleton would flash on the way to إضافة. No `loading.tsx` at a group root: it would wrap the group layout and stream its `requireX()` redirects. Pulse only via `motion-safe:`, no gradient shimmer (a physical gradient runs the wrong way in RTL). No bare spinners.
- **Accepted consequences:** inside a loading boundary a page-level `notFound()` answers 200 + `noindex` instead of 404, and a page-level `requireX()` redirect (e.g. `requireCanEdit()` on `[id]/edit`) is streamed (200 + client redirect) instead of a 307. Same body, same destination, nothing rendered; the layout-level gates keep their 307s.
- **Not found:** `src/app/not-found.tsx` (+ optional per-group ones so the chrome stays): "الصفحة غير موجودة" and one link — the role home via `homePathFor(session.role)` when the cookie has `userId` and `role`, else `/login`. It reads the cookie only to pick a link; it never calls `requireX()` and authorises nothing. Reading the cookie keeps it dynamic, so it gets the CSP nonce.
- **Errors:** `error.tsx` per role area plus `src/app/error.tsx` (for errors thrown in a group layout): "حدث خطأ غير متوقع" and a retry button calling Next 16.3's `retry` (it refreshes server data; `reset` alone would not). Text in `role="alert"`. Never show `error.message`, a stack or the digest.
- **Transitions:** superseded by *Motion (v1.1d)* below. (v1.1c had a 220 ms fade with a 4px rise; the user found it too subtle.)


## Motion (v1.1d)
Visible, but only in answer to something the user did. The earlier "no sliding" rule is withdrawn (Decision, v1.1d). Every piece honours `prefers-reduced-motion` and none of it reaches print (`@media screen`).
- **Route transitions — content only.** The top bar, side nav, tab bar and progress bar never move.
  - *Incoming:* a CSS animation on `#main > *` — the page crossfades in and slides 16px from the inline-start side (the right, in RTL) over 280 ms, `cubic-bezier(0.22, 1, 0.36, 1)`. A loading skeleton (`role="status"`) only fades, so the real page's arrival is the one that slides. A search-param change (ledger filters, report range) does not replay it.
  - *Outgoing:* the View Transitions API through React `<ViewTransition>` — `src/components/chrome/RouteTransition.tsx`, keyed on the pathname and mounted inside `#main` (AppShell and the auth layout), because a layout never sees enter/exit on its own. The old content fades out over 160 ms (`route-exit`); the new snapshot has no animation of its own because it is a live picture of the element already sliding in (`route-enter`); the root group is swapped without animation; `::view-transition { pointer-events: none }`. No `next.config` flag is needed in Next 16.3. Works under the nonce CSP (no inline script; `style-src` already allows the inline `view-transition-name`). Browsers without the API still get the incoming slide.
  - *Reduced motion:* fade only, no slide.
  - *No fill modes* on content animations: a filled opacity/translate animation leaves the page root a stacking context and a containing block for fixed children for good, trapping the fixed Toast under the bars.
- **Buttons (`src/components/Button.tsx`, all variants):** `enabled:active:scale-[0.97]` with an 80 ms `scale` transition (Tailwind v4 `scale-*` sets the `scale` property, not `transform` — the transition list must name `scale`); a hover one step darker than rest; the global focus ring. `primary` adds a ripple from the pointer-down point — the pointer's physical x is converted to an `inset-inline-start` offset, so the CSS stays logical; not created at all under reduced motion (a hidden ripple would never fire `animationend`).
- **Pending submit:** an explicit `pending` prop wins; otherwise a `type="submit"` button reads `useFormStatus()`, shows an inline spinner (`motion-safe:animate-spin`) and `pendingLabel` (default `t.common.saving`, «جارٍ الحفظ…»; logout passes `t.common.signingOut`), and is disabled. `useFormStatus` stays false for plain GET forms, which navigate rather than save.
- **Nav items (side nav and tab bar):** pressed on pointer-down (`active:` — `accent-line` background, `accent-dark` text 5.8:1, 0.97 scale); pending while the route loads (`useLinkStatus` → `data-pending` → the active look plus a 1.1 s breathing background, `.nav-item:has([data-pending])`, peak `#d2e7da`, 7.7:1); then the real active state. `aria-current` follows only the committed page. The light-green progress bar (`NavProgress`) is unchanged. On a prefetched route the pending phase can be too short to see; that is correct, not a bug.

## Sign-up, verification and reset screens (v1.1e)
Backend contract: `docs/BACKEND.md` → *Email verification, password reset, sign-up quality (v1.1e)*. Strings: `t.signupForm.*`, `t.verify.*`, `t.forgot.*`, `t.reset.*`, `t.err.*`, `t.status.verified`. **Digits are Western everywhere, helper prose included.**
- **Sign-up** keeps the two-role choice. Owner fields, in order: الاسم الأول · اسم الأب (optional) · اسم العائلة · البريد الإلكتروني · كلمة المرور · تأكيد كلمة المرور · اسم المنشأة. Staff: the same with رمز الانضمام instead of اسم المنشأة.
  - **Every field has a helper line** (`t.signupForm.*Help`) stating what is accepted, written like a bank form. It stays visible; an error appears under it and names the exact rule broken (`t.err.*`), never a generic "invalid".
  - **Password strength meter** under the password: three segments plus the word (ضعيفة / مقبولة / قوية) — never colour alone — `aria-live="polite"`, driven by the shared `passwordStrength()`; the common-password module (≈5.8k entries, ~80 KB) is imported only by `PasswordFields.tsx`, so it ships only with `/signup` and `/reset` (user's constraint); every server action that sets a password enforces it too. **Submit is disabled while the password is weak or the confirmation does not match.**
  - **Email typo hint:** when `emailTypoSuggestion()` returns an address, show «هل تقصد <address>؟» as a button that fills it in. A hint, never an error.
  - Inputs: `autocomplete` (`given-name`, `additional-name`, `family-name`, `email`, `new-password`), email and join code `dir="ltr"`.
- **`/verify`:** the address the code went to (from the flow), a 6-digit code field (`inputMode="numeric"`, `autocomplete="one-time-code"`, `dir="ltr"`, Arabic-Indic digits normalised on input), تأكيد, «لم يصلك الرمز؟ أعد الإرسال» with a visible 60-second countdown (disabled until it ends), and the spam-folder note (no sender domain yet, so some providers may file it as spam). `/verify` reads `getVerifyFlow()`; with no flow it shows `t.err.verifySessionExpired` and a link to `/login`. `t.verify.done` shows on `/pending?verified=1`; `t.reset.done` on `/login?reset=1`.
- **`/forgot`:** email (helper `t.forgot.emailHelp`) → always «إن كان البريد مسجلاً فقد أُرسل رمز التحقق», then a link on to `/reset`. **`/reset`:** code, new password with the same meter, confirmation. The login page gets «نسيت كلمة المرور؟».
- Same visual style as the other auth screens (`AuthCard`, green wordmark), each with its own `loading.tsx` skeleton. All three are dynamic, like every auth page.
- **Names on screen:** the top bar shows the display name (first + last); the admin pending-owner list, the admin establishments table and the owner's staff list show the full name. Those lists show «مُوثّق» / «غير مُوثّق» badges, and the approve button is disabled for an unverified account (the server refuses it too).

## v1.2a — navigation, الجهات, إضافة, الاتفاقيات, المستحقات
Backend contract: `docs/BACKEND.md` → *v1.2a*. Strings: `src/i18n/ar.v12a.ts` (spread into `t`). All earlier rules hold: logical utilities only, Western digits, `+`/`−` on every directional amount, `<MoneyText>`/`<DateText>`, v1.1d motion, a `loading.tsx` skeleton beside every new page, print through the one `@media print` block, every page a dynamic server component starting with `requireX()`. **CP1** = navigation, parties, projects, form links; **CP2** = plans, dues, payments, statements, home widgets.

### Owner navigation (CP1) — replaces the five owner tabs above
`src/components/chrome/nav.ts` exports `OWNER_NAV_GROUPS: NavGroup[]`, `NavGroup = { key, label: string | null, collapsible: boolean, items: NavItem[] }`; `activeHref()` runs over the flattened items (longest match still wins):

| Group (heading) | Items → route |
|---|---|
| — (no heading) | الرئيسية `/owner` |
| المالية | حركة جديدة `/owner/transactions/new` · السجل `/owner/transactions` · التقارير `/owner/reports` |
| إضافة *(collapsible)* | قائمة الإضافات `/owner/projects` · إضافة جديدة `/owner/projects/new` |
| العملاء والالتزامات *(collapsible)* | الجهات `/owner/parties` · الاتفاقيات `/owner/plans` · المستحقات `/owner/dues` |
| الموظفون *(collapsible)* | الموظفون `/owner/staff` · الحضور `/owner/staff/attendance` · حسابات الدخول `/owner/staff/logins` |
| الإعدادات | التصنيفات `/owner/settings/categories` · رمز الانضمام `/owner/settings/join-code` · إقفال الأشهر `/owner/settings/locks` · حسابي `/owner/settings/account` |

- **Side nav (≥ md):** headed groups. The three *collapsible* (new) groups render **collapsed until first used**: "used" = the owner expanded it, or visited any page in it. The set of used group keys is kept in `localStorage` (`zk_nav_groups`, JSON array; every access in `try/catch`, the page works without it). A group holding the current page always renders expanded. The heading of a collapsible group is a `<button aria-expanded aria-controls>` with a chevron (`ChevronDown`, rotated, no `rtl:` variant needed); الرئيسية/المالية/الإعدادات headings are plain text, always open. The server renders collapsed (it cannot read `localStorage`); a remembered group opens after mount — accepted, like the direction toggle.
- **Tab bar (< md):** exactly `الرئيسية | حركة جديدة | السجل | المستحقات | المزيد`. **المزيد** is a button opening a bottom **sheet**: native `<dialog>` + `showModal()` (focus trap and Escape from the platform, like `ConfirmDialog`), a close button, every other nav item as a **large tile** (≥ 72px tall, icon above label, 3 columns at 360px) under its group heading; tapping a tile navigates and closes the sheet. المزيد shows the active look when the current page is one of the sheet's items. The sheet slides up with the v1.1d easing (fade only under reduced motion); never printed.
- **Overdue badge** on المستحقات (side nav and tab bar): the count from `getOverdueCount()`, fetched in the owner layout and passed through `AppShell` as `badges: Record<href, number>`; hidden at 0, `99+` above 99; white on `money-out` (`#b91c1c`, 5.9:1), the number plus `t.navItem.overdueBadge` as accessible text — never colour alone. **CP1 passes 0** (no plans yet); CP2 wires the query.
- **Staff nav: same three items and routes**, but the new-entry item is labelled حركة جديدة (`t.navItem.newEntry`) — amendment V11 / S10, because «إضافة» now means a project. The owner's old «إضافة» (new entry) is likewise «حركة جديدة»; `t.transaction.newTitle` reads حركة جديدة on both roles' form page.

### Settings split (CP1)
- The owner settings tabs become pages: `/owner/settings/categories`, `/owner/settings/join-code`, `/owner/settings/locks`, `/owner/settings/account` — each renders the existing tab component unchanged under its own `<h1>` (the in-page `Tabs` bar is dropped: the nav is the tab bar now).
- The «الموظفون» tab (pending staff requests, `canEdit` toggle «السماح بالتعديل», تعطيل/تفعيل, إعادة تعيين كلمة المرور) moves **unchanged** to `/owner/staff/logins` — «حسابات الدخول».
- `/owner/settings` itself redirects, honouring the old `?tab=` links: `categories`/none → `/owner/settings/categories`, `staff` → `/owner/staff/logins`, `joinCode` → `join-code`, `locks`, `account`. The top bar's account link becomes `/owner/settings/account`.
- `/owner/staff` (الموظفون) and `/owner/staff/attendance` (الحضور) are **«قريباً» placeholders** in the theme: a `Card` with the `t.comingSoon.badge` pill, title and body (`staffBody` / `attendanceBody`); the staff one links to حسابات الدخول. `requireOwner()`, no data.

### Transaction form (CP1)
- After التصنيف: **الجهة** — a `Select` with «بدون جهة», active parties grouped by type (`<optgroup>` per `t.partyType`), the entry's own party even if inactive (labelled `(موقوف)`, kept-not-newly-assigned, like categories), and last «أخرى (اكتب الاسم)», which reveals the free-text `counterparty` input. Editing an old entry with text and no party opens on «أخرى» with its text. With a party chosen, no `counterparty` is submitted.
- **ضمن إضافة** — optional `Select`: «بدون إضافة» + `ACTIVE` projects + the entry's own (even if completed/cancelled, labelled with its status).
- `?projectId=` on `/owner/transactions/new` preselects the project and صادر (from «تسجيل تكلفة»). The page validates it against `listProjectOptions` and ignores anything unknown.
- Staff see the same two selects (they may pick existing parties/projects, never create them).
- Ledger rows show the party name (else the counterparty text) and, when set, a small project chip linking to the إضافة. Party/project filters arrive only via links (`?partyId=` / `?projectId=`); no new filter controls.

### Parties — الجهات (CP1; the statement is CP2)
- `/owner/parties`: type tabs (`?type=` — الكل · العملاء · الموردون · الموظفون · أخرى, `t.partyTypeTab`), «إضافة جهة» primary button; rows (cards on mobile, table on desktop): name, type badge, phone (`dir="ltr"`), **لنا** / **علينا** amounts — each with its word, never colour alone, zero shown as `t.parties.settled`; inactive rows greyed with `(موقوف)`. Row → detail.
- `/owner/parties/new`, `/owner/parties/[id]/edit`: name, type (radio cards), phone (`inputMode="tel"`, `dir="ltr"`), email (`dir="ltr"`), notes — helper line per field, `PartyInputSchema` client-side first.
- `/owner/parties/[id]`: contact card; actions تعديل · إيقاف/تفعيل (ConfirmDialog on إيقاف) · حذف — shown only when `!hasHistory` (ConfirmDialog), else `t.parties.hasHistoryHint`. CP2 adds the كشف حساب below.
- A foreign or unknown id → `notFound()` (same page as nonexistent).

### إضافة — projects (CP1)
- `/owner/projects` («قائمة الإضافات»): status filter (`?status=`), cards: name, status badge (`t.projectStatus`), المصروف, budget bar and المتبقي / تجاوز الميزانية (text always states the number; the bar is decoration with `aria-hidden`), date range.
- `/owner/projects/new` («إضافة جديدة»), `/owner/projects/[id]/edit`: name, description, budget (`AmountField`, optional), start date, end date (optional).
- `/owner/projects/[id]`: header (name, status, dates, description); totals — المصروف, الوارد (only if non-zero), الميزانية, المتبقي with the budget bar; **حسب التصنيف** table (direction-signed amounts); **حركات الإضافة** via `LedgerList` from `listTransactions({ projectId })` with pagination; actions **تسجيل تكلفة** (primary → `/owner/transactions/new?projectId=…`), تعديل, status buttons (تعليم كمكتملة · إلغاء الإضافة · إعادة فتح), حذف only without history. **Printable summary** (طباعة الملخص): `PrintHeader` with `t.print.projectSummaryTitle`, totals, by-category table, the transactions of the current page, `PrintFooter` — through the existing print block.

### CP2 screens
- **Home** (`/owner`), above the stat cards: **«مستحقات هذا الأسبوع»** — `t.dues.weekRange` (today → today + 6), two totals لنا / علينا, up to 5 rows (party, plan, due date, remaining, countdown), link to المستحقات; a **red متأخرات strip** (count + لنا/علينا totals) whenever anything is overdue, linking to `/owner/dues`. **«الإضافات الجارية»**: top 3 from `topActiveProjects`, each name + «{spent} من {budget}» + bar (or المصروف alone without a budget), link to the list.
- **`/owner/plans`** («الاتفاقيات»): filters direction / status / party as URL params (`listPlans`); rows: title, party, direction wording, total, paid/remaining, `t.plans.progress`, status badge, next due with countdown.
- **`/owner/plans/new`, `/owner/plans/[id]/edit`**: party (select; choosing a party defaults the direction by type — عميل → وارد, مورد/موظف → صادر, أخرى → none), direction as two radio cards worded `t.planDirection` with the party name, title, total (`AmountField`), category (filtered by direction), start date, reminder days (default 3), notes; **schedule builder**: mode «دفعات متساوية» (count, frequency أسبوعي/شهري/كل N يوم, N) → «توليد الجدول» runs `buildSchedule` from the start date; or «تواريخ ومبالغ مخصصة». Either way an **editable preview table** (row no., date with Hijri beneath, amount; add/remove row) with a live sum and difference line («المجموع يطابق الإجمالي» or the signed difference); submit disabled until the sum equals the total. Rows are posted as one JSON `instalments` field. On edit, fixed rows (with payments) are read-only with `t.plans.lockedRowHint`, and `t.plans.paidRowsNotice` sits above the table.
- **`/owner/plans/[id]`**: header (party link, direction wording, total, paid, remaining, status, category, reminder days, notes); instalment table — no., due date (+Hijri), amount, paid, remaining, status badge (`t.instalmentStatus`, text not colour), countdown (`t.countdown.*` — «بعد N يوماً» / «مستحقة اليوم» / «متأخرة N أيام», none when paid), payments recorded against it (date, amount, by) linking to the entry, **«تسجيل دفعة»** on every unpaid row of an OPEN plan; actions تعديل · أرشفة (ConfirmDialog) · إلغاء (ConfirmDialog, only when `canCancel`, else `t.plans.cancelBlocked`).
- **`/owner/dues`** («المستحقات»): متأخرات first (red heading strip), then مستحقات هذا الأسبوع; each split into لنا and علينا with totals; each row: party, plan, instalment no., due date, remaining, countdown, quick «تسجيل دفعة».
- **Payment form:** «تسجيل دفعة» → `/owner/transactions/new?instalmentId=…` — the same `TransactionForm` in payment mode from `getInstalmentForPayment`: a banner (`t.payment.forInstalment`, remaining on the instalment and on the plan, `t.payment.rollsOver`), direction and party locked (shown, submitted as hidden fields), amount prefilled with the instalment's remaining, category prefilled with the plan's (changeable within the direction), date today; «حفظ» returns to the plan. Editing a payment shows `t.payment.linkedNotice` with direction and party locked. An unknown/paid instalment → the ordinary form with a toast (`err.instalmentInvalid`).
- **`/owner/parties/[id]` كشف حساب:** table date · البيان (`t.statement.*` with the plan title) · المبلغ (signed: + لنا / − علينا, `signed` like الصافي) · الرصيد (running, with لنا/علينا word), closing balance box; then «حركات أخرى مع الجهة» (`t.statement.otherHint`). **Printable** with `t.print.statementTitle`, party name and print date.

### Rule changes
- *Do not* list: `localStorage` is now allowed for **two** things — the last-used direction and the nav's used-groups set. Nothing else.
- The *Layout per role area* owner tab list above is superseded by *Owner navigation (CP1)*.

### v1.2a amendments after the pre-code review (binding)
Full list in `docs/BACKEND.md` → *v1.2a amendments* (V1–V12). Screen-side:
- **TransactionForm (S6):** `readLastDirection()` runs only when no direction is preset — never with `?projectId=` (صادر) or in payment mode (locked). Payment mode hides «حفظ وإضافة أخرى».
- **Staff nav (S10):** the new-entry item reads حركة جديدة (`t.navItem.newEntry`); items and routes unchanged.
- **Plurals (S9):** counted strings use `plural(forms, n)` from `src/lib/plural.ts` — never a raw `{n}` replace on a `PluralForms` record.
- **Project delete (S7):** shown only when `hasHistory` is false.
- **Notes:** party/project pages take the id from the route, never from `?partyId=`/`?projectId=`; the ledger's project chip links only when `basePath` is the owner's (staff get plain text); the printed project summary labels its entries «صفحة X من N» (from `t.common.page` + `t.common.of`); clearing an optional field submits `""` (the schema turns it into "not given" and the action writes `null`).
- **CP1 placeholders:** until CP2, `/owner/plans` and `/owner/dues` are «قريباً» pages (like الموظفون/الحضور) so no nav item 404s.
