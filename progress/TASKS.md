# TASKS.md — Phase 1 shared task list (lead owns this file)

Order follows "Phase 1 — parallel" in `CLAUDE.md`. Teammates do **not** edit this file;
the lead updates status. Teammates record their own detail in `progress/<name>.md`.

Status values: `todo` · `assigned` · `blocked` · `done` · `reviewed`

Rules that apply to every task:
- Only touch the files listed for the task, and only files you own in the `CLAUDE.md` ownership map.
- `npm run build` and `npm test` must pass before a task is complete.
- Append what you did and any gotchas to `progress/<your-name>.md`.
- **Do not `git commit`.** The lead commits at checkpoints.

---

## Backend track (`backend`)

| ID | Task | Files | Status |
|---|---|---|---|
| B1 | Auth actions + proxy routing: `login`, `logout`, `signupOwner`, `signupStaff`. Rate-limit login/signup/join-code via `src/lib/rateLimit.ts`. Add session/role routing to `src/proxy.ts` around the existing CSP block (do not touch the CSP). | `src/features/auth/actions.ts`, `src/proxy.ts` | done |
| B2 | Establishment / join / approval actions: `approveStaff`, `rejectStaff`, `setCanEdit`, `setStaffActive`, `resetStaffPassword`, `regenerateJoinCode`, `changeOwnPassword`; `listStaff`, `listCategories`. Default categories created in `approveOwner` (B5). | `src/features/establishments/{actions,queries}.ts`, `src/features/settings/{actions,queries}.ts` | done |
| B3 | Transaction actions + queries. **Actions:** `createTransaction` (month unlocked; amount > 0; date ≤ today; category **active, same establishment, same direction** — `err.categoryInvalid` / `err.categoryDirectionMismatch`), `updateTransaction` (`requireCanEdit()`; **both** old and new month unlocked; STAFF with canEdit may edit **any** entry of the establishment), `deleteTransaction` (OWNER only, **soft delete**). **Queries:** `listTransactions` → `{ rows, total, pageTotals { in, out, net } }` at `PAGE_SIZE` 50; `getTransaction`; `getOwnerDashboard`; `getStaffDashboard` (**must return `canEdit`** — F6 needs it); `getReport`. **No `$queryRaw`/`$queryRawUnsafe` in any of the four files** — raw SQL is invisible to the scoping gate. **Acceptance criterion (user-set): `src/features/transactions/scoping.test.ts` must capture every Prisma call made by `transactions/{actions,queries}.ts`, `dashboard/queries.ts` and `reports/queries.ts` through a mocked client and, for each, assert (a) a `where` object is present — a call with no `where` fails, (b) `where.establishmentId` read at the **top level** of the argument object, never a stringified form, equals the fixture's own establishment id **by value**, with a second foreign establishment in the fixture so a wrong-but-present id fails, and (c) for every Transaction read, `where.deletedAt === null`. B3 is not complete until it passes.** | `src/features/transactions/{actions,queries}.ts`, `src/features/dashboard/queries.ts`, `src/features/reports/queries.ts`, `src/features/transactions/scoping.test.ts` | done |
| B4 | Month lock + audit wiring. `assertUnlocked` called by every transaction mutation; `updateTransaction` asserts **both** the old and the new month (`docs/BACKEND.md:162`). `lockMonth` / `unlockMonth` **must refuse the current month and any future month** (`err.cannotLockCurrentMonth`). `listLocks` = **last 24 months with state** (`:171`). `writeAudit` on every mutation. Use `currentMonthKey()` from `src/lib/dates.ts` as the **only** way to decide "now" — never `new Date()` local getters on a stored date. Per reviewer item 13b, the `$transaction` wrappers this task adds are what can capture a trailing `redirect()`. | `src/features/locks/{actions,queries,assertUnlocked}.ts`, `src/features/locks/locks.test.ts` | done |
| B5 | Admin actions: `approveOwner` (**creates the 4 IN + 9 OUT default categories per `docs/BACKEND.md`**), `rejectOwner` (status DISABLED + establishment inactive), `setEstablishmentActive`, `resetOwnerPassword`; `getAdminOverview()` → `{ pendingOwners[], establishments[] {id, name, ownerName, ownerEmail, status, staffCount, transactionCount, lastActivityAt} }`. **Security rule 10 is the whole task: no `select` may include `amountHalalas`, no return shape may carry a transaction row.** Counts and timestamps only. | `src/features/admin/{actions,queries}.ts` | done |
| B6 | **After B11.** Export route `GET /api/export?from=&to=`: OWNER only via `requireOwner()`, `ReportRangeSchema` on the params, exceljs, sheet 1 transactions and sheet 2 totals by category, filename `ledger_<from>_<to>.xlsx`, `Cache-Control: private, no-store`. Scoped by the session's `establishmentId`, never a param. | `src/app/api/export/route.ts` | done |
| B10 | `signupStaff` returns the same generic `err.joinFailed` for **all four** failure paths: bad join code, inactive establishment, owner not ACTIVE, already-taken email. **Issue both the join-code and the email lookups unconditionally with a single branch at the end** — otherwise the key is uniform but the latency is not. Test the four paths, and assert indistinguishability **structurally** (both queries always issued), never by wall clock. | `src/features/auth/actions.ts`, `src/features/auth/auth.test.ts` | done |
| B8 | `setCategoryOrder(id, "UP"\|"DOWN")` — swaps `sortOrder` with the adjacent **active** category of the same direction, skipping inactive rows. At the ends (first UP, last DOWN) a **silent no-op returning `ok: true`** — no error key; F8 disables the arrow. Audit `CATEGORY_UPDATE`. `docs/BACKEND.md:165` amended to match. | `src/features/settings/actions.ts` | done |
| B9 | **Follow-up on B1/B2 review.** Restore `\.` in the proxy matcher; `active`-only duplicate check plus reactivate-on-create and the `setCategoryActive` name guard; `x-forwarded-for` last element; `src/lib/sessionConfig.ts` shared constants; wrap `signupStaff` in a `$transaction`; make `clearAttempts` consistent across both sign-ups; stop `regenerateJoinCode` throwing out of the action. | `src/proxy.ts`, `src/features/settings/actions.ts`, `src/features/auth/actions.ts`, `src/features/establishments/actions.ts`, `src/lib/sessionConfig.ts`, `src/lib/session.ts` | done |
| B11 | **Scheduled after B5.** Migrate `establishments/actions.ts` and `settings/actions.ts` from `update({ where: { id } })` to `updateMany({ where: { id, establishmentId } })` per Security rule 2b, then **add both files to the static sweep in `scoping.test.ts`** and remove the exclusion comment. Correct today, but the boundary lives in the read; the risk is a future author copying the old shape into a file the gate does not watch, so the cheapest moment is before anyone adds a new write. | `src/features/establishments/actions.ts`, `src/features/settings/actions.ts`, `src/features/transactions/scoping.test.ts` | done |
| T1 | **Security headers + nonce test.** Assert the five constant headers from `next.config.mjs` (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, `Strict-Transport-Security`) and that a **dynamic page** carries a CSP with a `nonce-` that appears on its script tags. This pins the Phase 0 finding that a flat `script-src 'self'` breaks hydration — currently held by nothing but a comment. | `src/proxy.test.ts` (new) | done |
| B7 | Remaining tests: `locks.test.ts` extensions and `auth.test.ts`'s `requireCanEdit` matrix — OWNER / STAFF canEdit true / STAFF canEdit false / PENDING. Both already exist in part; complete them against `docs/BACKEND.md`'s Tests section and close any gap. | `src/features/locks/locks.test.ts`, `src/lib/auth.test.ts` | done |

## Frontend track (`frontend`)

Build against the contract in `src/lib/validation.ts` + the `queries.ts` signatures in
`docs/BACKEND.md`, using local stub data behind a `USE_STUBS` flag until the matching
backend task lands. Stubs are removed in the wire-up task.

| ID | Task | Files | Status |
|---|---|---|---|
| F1 | Layout, nav, shared components: `Button, Input, Select, Textarea, Card, StatCard, Table, EmptyState, MoneyText, DateText, DirectionBadge, StatusBadge, LockBadge, ConfirmDialog, Toast, Tabs, Pagination`. Role layouts + bottom tab bar / side nav. | `src/components/**`, `src/app/(owner)/layout.tsx`, `src/app/(staff)/layout.tsx`, `src/app/(admin)/layout.tsx`, `src/app/globals.css`, `src/app/layout.tsx` | done |
| F2 | Auth pages: `/login`, `/signup` (two choice cards, then owner/staff form), `/pending`. | `src/app/(auth)/login/page.tsx`, `src/app/(auth)/signup/page.tsx`, `src/app/(auth)/pending/page.tsx`, `src/features/auth/components/**` | done |
| F3 | Owner dashboard: 4 StatCards, balance-by-payment-method table, 6-month IN/OUT bar chart (recharts), top-5 OUT categories with amount and **% of month OUT — guard the divide-by-zero**, a month with no OUT entries is the normal first-month state and `0/0` renders `NaN%`; the percentage needs Western digits and `MoneyText` will not cover it because it is not money. Last 10 movements. recharts is a **client** component: no `server-only` import may cross the boundary, and chart props must be plain serialisable numbers (a `Date` or Prisma `Decimal` reaching a client prop is the usual failure). | `src/app/(owner)/owner/page.tsx`, `src/features/dashboard/components/**` | done |
| F4 | Add / edit entry — shared `TransactionForm`. Direction segmented toggle, **default = last used from localStorage, else صادر** (the *one* sanctioned localStorage use in the app). المبلغ `inputMode="decimal"` + ر.س suffix; `parseSAR` returns `null` rather than throwing and rejects zero, so empty/zero is a field error. التاريخ **defaults to today** and is capped `max` today. التصنيف filtered by direction; طريقة الدفع; الجهة, ملاحظة optional. حفظ · حفظ وإضافة أخرى (new only). Locked month → blocking notice, submit disabled. **`redirect()` throws: *حفظ وإضافة أخرى* deliberately stays on the form, so do not wrap both paths in one `try` — that swallows the save-and-leave navigation** (reviewer item 13b). | `src/app/(owner)/owner/transactions/new/page.tsx`, `src/app/(owner)/owner/transactions/[id]/edit/page.tsx`, `src/features/transactions/components/**` | done |
| F5 | Ledger list. Filters as URL search params (from, to, direction, category, method, q) parsed through `TransactionFilterSchema` — **they are attacker-controlled**. Table on desktop / stacked cards on mobile; 50/page; `LockBadge` on locked months. **Acceptance criteria: (a) `pageTotals` are the totals of the whole filtered set, not the current page, with a test proving it on a filter spanning more than one page; (b) row edit/delete visibility derives from the server-provided role, `canEdit` and lock state — never computed client-side alone.** Shows "أضافه: <name>" per row. | `src/app/(owner)/owner/transactions/page.tsx`, `src/features/transactions/components/**` | done |
| F7 | **Owner settings shell + staff tab.** `Tabs` chrome for the five tabs (التصنيفات · الموظفون · رمز الانضمام · إقفال الأشهر · حسابي) with the active tab in the URL so a reload keeps it. الموظفون tab: pending join requests with قبول / رفض, active staff with the `canEdit` toggle labelled "السماح بالتعديل", تعطيل / تفعيل, and إعادة تعيين كلمة المرور. حسابي tab: change password. `resetStaffPassword(userId, prev, formData)` is form-backed with a **bound id**; the rest are button actions. | `src/app/(owner)/owner/settings/page.tsx`, `src/features/settings/components/**` | done |
| F6 | **Renumbered, runs parallel with F5.** Reports page against `getReport(estId, from, to)`: month picker (default current) or custom range, two by-category tables each with a total row, then الصافي. تصدير Excel button pointing at `/api/export?from=&to=` (B6 lands later — the button is a plain link, so it needs no wiring task). طباعة via `window.print()`, with a print stylesheet that hides nav and buttons, black on white, header carrying establishment name + range. Import `monthNameAr` from `src/lib/dates.ts`; no month keys in `ar.ts`. | `src/app/(owner)/owner/reports/page.tsx`, `src/features/reports/components/**`, `src/app/globals.css` | done |
| F8 | **Settings tabs: categories, join code, month locks.** التصنيفات: list by direction, add, rename, activate/deactivate, move up/down — **no reorder arrows on inactive rows**, since `setCategoryOrder` refuses them with `err.notFound` and that key should be unreachable rather than merely unlikely. رمز الانضمام: current code shown large with a copy button, إعادة توليد behind `ConfirmDialog` warning the old code stops working. إقفال الأشهر: 24-month grid from `listLocks`, using its server-decided `lockable` so the client never decides what "now" is; current and future disabled. | `src/features/settings/components/**` | done |
| F9 | **Staff area.** `/staff` dashboard (StatCards وارد/صادر هذا الشهر establishment-wide, حركاتي الأخيرة 10, notice when `canEdit` is off); `/staff/transactions` list — **no delete ever, edit gated by the server-provided `canEdit`**; `/staff/transactions/new`; `/staff/account` change password. `LedgerList`/`LedgerRowActions`/`LedgerTotals` are already role-agnostic (they take `permissions` + `basePath`), so pass `{ canEdit: user.canEdit, canDelete: false }` and add no new list components. | `src/app/(staff)/staff/**`, `src/features/dashboard/components/**` | done |
| F10 | **Admin pages — no amounts anywhere.** `/admin` requests: pending owner sign-ups (name, email, establishment, date) with قبول / رفض behind `ConfirmDialog` (`approveOwnerConfirm` / `rejectOwnerConfirm`). `/admin/establishments`: table of establishment, owner, status, staff count, transaction count, last activity, with a search box and تعطيل / تفعيل + إعادة تعيين كلمة مرور المالك. `/admin/account`. The rule-10 gate in `admin.test.ts` is the enforcement; `t.admin.noAmountsNotice` exists. | `src/app/(admin)/admin/**`, `src/features/admin/components/**` | done |
| F2b | **done.** "already have an account?" link to `/login` on the sign-up form — the leak-free mitigation for B10 telling an employee with a registered email that the join code is wrong. | `src/features/auth/components/**` | done |
| F4b | One cosmetic from the F4 review: an empty amount reports `err.amountPositive` ("must be greater than zero") rather than `err.required`, because the hidden field submits `""` and `Number("")` is `0`. It lands under the right field by the right mechanism; it just names the wrong problem for an untouched form. | `src/features/transactions/components/**` | done |
| P1 | **PWA shell.** `public/manifest.json` (name سجل المصروفات, `dir: "rtl"`, `lang: "ar"`, `display: "standalone"`, theme `#0f766e`, icons 192/512 — placeholder PNGs acceptable, note it). Minimal service worker caching **only the app shell and static assets — never `/api/*` and never a data page**; no offline writes. Safe-area padding on the bottom tab bar via `env(safe-area-inset-bottom)` (`.safe-bottom` already exists from F1). Print CSS already landed in F6. | `public/manifest.json`, `public/icons/**`, `public/sw.js`, `src/app/layout.tsx` | done |

## Wire-up tasks (`frontend`) — blocked until both sides land

Each removes the `USE_STUBS` path for its screen and calls the real action/query.

| ID | Screen | Depends on | Status |
|---|---|---|---|
| W1 | Auth pages | B1 + F2 | done — one line, as predicted |
| W2 | Owner dashboard | B3 + F3 | done — two type renames, no drift |
| W3 | Add / edit entry — flipped `getTransaction` **and** all three form actions together (`createTransaction` was a stub too) | B3 + B4 + F4 | done — lead, 5b |
| W4 | Ledger list — reads were already real; `deleteTransaction` was the stub | B3 + B4 + F5 | done — lead, 5b |
| W5 | **done.** **Wire reports + export** — point the reports page at the real `getReport`, confirm the تصدير Excel link reaches B6's route and downloads a workbook | B6 + F6 | done |
| W6 | **done (a confirmation, not a swap — every settings component imports the real modules).** **Wire settings** — point the settings tabs at the real queries and actions | B2 + B4 + B8 + F7 + F8 | done |
| W7 | Wire staff — a confirmation, not a swap | B3 + F9 | done |
| W8 | Wire admin — a confirmation, not a swap | B5 + F10 | done |

## Reviewer (`reviewer`) — read-only, no code edits

Reviews each completed task against the **Security** list in `docs/BACKEND.md` and the
**RTL rules** in `docs/FRONTEND.md`; messages findings to the responsible teammate and the lead.

| ID | Reviews | Status |
|---|---|---|
| R-B3 | B3 brief + code | brief sent at assignment |
| R-B4 | B4 brief + code | brief sent at assignment |
| R-B8 | B8 brief + code | brief sent at assignment |
| R-B10 | B10 brief + code | brief sent at assignment |
| R-F3 | F3 brief + code | brief sent at assignment |
| R-F4 | F4 brief + code | brief sent at assignment |
| R-W1 | W1 | blocked on W1 |
| R-B1 | B1 | reviewed |
| R-B2 | B2 | reviewed |
| R-F1 | F1 | reviewed |
| R-F2 | F2 | reviewed |

## Checkpoints
Every 3–4 completed tasks the lead merges `progress/*.md` into `PROGRESS.md`, commits as
`phase 1: checkpoint N`, reports to the user, and **waits for approval** before continuing.

- **Checkpoint 1** covers B1, B2, F1, F2, B9 (+ R-B1/R-B2/R-F1/R-F2). — committed 2026-09-29
- **Checkpoint 2** committed 2026-09-29: W1, B3, B4, B8, B9(→B10), B10, F3, F4, F2b + R-B3/R-B4/R-B8/R-B10/R-F3/R-F4. W2 deferred to Checkpoint 3.
- **Checkpoint 3** committed: W2, B5, B11, B6, F5, F6 + R-B5/R-B11/R-B6/R-F5/R-F6 and all five briefs reviewed pre-code. W4 deferred.
- **Checkpoint 4** committed. B7 (locks half), F7, F8, W5, W6 + five briefs reviewed pre-code and R-F7/R-F8/R-W5/R-W6. **B7's auth half is written but held out of the commit** pending the user's rule decision — see `## Waiting on user` in PROGRESS.md. Stopped here as instructed.
- **Checkpoint 5** committed: F9, F10, P1, W7, W8, T1 + the SW allowlist pin and `worker-src 'self'`, with all six briefs reviewed pre-code. Reviewer: no HIGH findings.
- **Checkpoint 5b** committed: W3 and W4 by the lead with no team running; no stub remains in `src/`. Phase 1 complete. Next: the user's first sign-in test, then Phase 2.

---

# v1.1a-2 — rename to زخم, brand assets, loading/404/transitions

Team: lead + `brand` + `ux` + `reviewer` (user-requested shape for this task only). One commit at the end by
the lead: `v1.1a: rename to زخم, brand assets, loading/404/transitions`. Nobody pushes, nobody amends.

## Shared facts (every teammate)
- App renamed **زخم** (Latin **ZAKHAM**), tagline **نظام السجل المالي للمنشآت**.
- Brand assets live in **`public/brand/zakham-brand/`** (one level deeper than `public/brand/`), served at
  `/brand/zakham-brand/<file>`. **Use them as-is**: never redraw, regenerate, resize, re-encode, rename or move a
  logo file. Baseline hashes are in `progress/brand-assets.sha256`; the reviewer re-checks them.
  `.png` paths bypass `src/proxy.ts` (matcher excludes `.*\.png$`), so logos load for signed-out visitors.
- Theme: the v1.1a Saudi-green governmental theme (`--color-accent #006c35`, hover `#004d26`, neutral greys,
  2px corners). Contrast ≥ 4.5:1 for all text, measured. `+`/`−` on amounts unchanged.
- All strings through `src/i18n/ar.ts` (owned by `brand`). No Arabic literals anywhere else — alt text included.
- Every page stays **dynamically rendered** (nonce CSP). No `force-static`, `revalidate`, `generateStaticParams`.
- **Print:** the `@media print` block and `.print-only` / `.no-print` rules in `globals.css` do not change. The only
  print difference allowed is B2's print-header branding (small outline icon + the name زخم).
- RTL: logical utilities only (`ms/me/ps/pe/start/end/text-start/text-end/border-s/border-e`), never `ml/mr/pl/pr/
  left/right/text-left/text-right/border-l/border-r`.
- No logic changes: no action, query, auth, proxy, schema or test behaviour changes.
- Gates before marking any task complete: `npm run build`, `npm test` (274/274 baseline), `npx tsc --noEmit`, all
  exit 0 on the real exit code. **Build lock:** two teammates share one `.next/`. Take the lock with
  `mkdir .claude/build.lock` before `npm run build` and `rmdir .claude/build.lock` right after (also on failure).
  If `mkdir` fails, the other teammate is building — run `npx tsc --noEmit` / `npx vitest run` meanwhile and retry.
- Notes go in `progress/<your-name>.md` (from `progress/_template.md`). Do not `git commit`.

## Ownership for this task (overrides the Phase 1 map for these files only)
| Path | Owner |
|---|---|
| `src/i18n/ar.ts`, `public/manifest.json`, `public/brand/**`, `public/icons/**`, `src/app/layout.tsx`, `src/components/chrome/TopBar.tsx`, `src/components/chrome/Footer.tsx`, `src/components/chrome/BrandMark.tsx` (delete), `src/features/auth/components/AuthCard.tsx`, new `src/features/reports/components/PrintHeader.tsx`, the print-header lines only of `src/app/(owner)/owner/reports/page.tsx`, `README.md` (title only) | `brand` |
| `src/app/globals.css` (not the print block), every `loading.tsx` / `not-found.tsx` / `error.tsx` / `template.tsx` under `src/app/**`, `src/components/chrome/RoleNav.tsx` (SideNav + mobile tab bar; may be split into `SideNav.tsx` / `BottomTabs.tsx`), `src/components/chrome/AppShell.tsx` (imports + transition wrapper only), new `src/components/skeletons/**` | `ux` |
| everything above, read-only | `reviewer` |
| `docs/*`, `CLAUDE.md`, `PROGRESS.md`, `progress/TASKS.md` | lead |

## Contract between brand and ux (fixed now so neither waits)
- **Font token:** `brand` loads Reem Kufi 700 in `layout.tsx` with `variable: "--font-zakham"` on `<html>`; `ux` adds
  `--font-brand: var(--font-zakham), var(--font-arabic), system-ui, sans-serif;` to `@theme`, which yields the
  `font-brand` utility. `brand` uses `font-brand` only where the word زخم is rendered as text.
- **Keys `brand` adds first, then announces to `ux` by message:**
  `t.notFound.{title:"الصفحة غير موجودة", body, backHome, toLogin}`,
  `t.errorPage.{title:"حدث خطأ غير متوقع", body, retry}`,
  `t.brand.{logoAlt:"زخم", logoWithTaglineAlt}`. `ux` may request more by message; `ux` never edits `ar.ts`.
- `ux` renders `<TopBar>` / `<Footer>` inside `AppShell` with their current props; `brand` does not change those props.

## brand
| ID | Task | Status |
|---|---|---|
| B1 | **Rename everywhere.** `t.app.name` → زخم, `t.app.tagline` → نظام السجل المالي للمنشآت. Root metadata gets a title template (`%s — زخم`, default زخم) so every `<title>` carries the name. Manifest `name`/`short_name` زخم, `description` the tagline. Footer and print header show زخم. Owners/staff still see the establishment name beside the logo in the top bar; ADMIN sees `t.app.adminArea`. Staff sign-up title stays "طلب انضمام إلى منشأة" (already `t.auth.staffSignupTitle` — confirm, do not duplicate). `README.md` title only. | done |
| B2 | **Assets.** Top bar → `zakham-wordmark-white.png` ~36px tall, `alt={t.brand.logoAlt}`. A white wordmark needs a **green top bar**: background `bg-accent`, every top-bar text/control ≥ 4.5:1 on `#006c35` (white is 6.57:1), keep `no-print`, keep the RTL order (logo + establishment name right, user + logout left). Auth cards and `/pending` (both via `AuthCard`) → `zakham-wordmark-green-tagline.png` (the image carries the tagline — do not also render the tagline text; the alt carries it). Print header → extract the inline `<header className="print-only">` from `reports/page.tsx` into `PrintHeader.tsx` unchanged, then add `icon-512-outline.png` small (~40px) and the name زخم in `font-brand`; the establishment name and range stay exactly as they are. Manifest icons: `icon-192.png`, `icon-512.png` (`purpose: "any"`), `icon-maskable-192.png`, `icon-maskable-512.png` (`purpose: "maskable"`). `layout.tsx` metadata: `favicon-32.png`, `favicon-64.png`, `apple-touch-icon-180.png`; theme colour stays `#006c35`. Delete `public/icons/` and `src/components/chrome/BrandMark.tsx`. Give every `<img>` explicit `width`/`height` from the real aspect ratio (wordmark 3897×707, with tagline 3907×988) so nothing shifts on load. | done |
| B3 | **Reem Kufi 700** via `next/font/google` (bundled at build — CSP allows `'self'` only), `variable: "--font-zakham"`, `display: "swap"`, subsets `arabic`. Used only where زخم is text (footer, print header; nowhere else). Body stays IBM Plex Sans Arabic. Footer contact stays `support@example.com`. | done |

## ux
| ID | Task | Status |
|---|---|---|
| U1 | **Skeleton loading states.** `loading.tsx` in `(owner)`, `(staff)`, `(admin)`, `(auth)` with skeletons shaped like the real screens — stat cards, table rows, form fields — in theme greys (`gray-100/200`), 2px corners, no bare spinners. Shared pieces in `src/components/skeletons/`. Each skeleton is `role="status"` + `aria-busy="true"` with the existing `t.common.loading` as screen-reader text. Any shimmer/pulse honours `prefers-reduced-motion`. | done |
| U2 | **Designed 404 and error pages.** `src/app/not-found.tsx`: "الصفحة غير موجودة", one link — `homePathFor(session.role)` when the session cookie has a role, else `/login` — exactly the `getSession()` pattern `src/app/page.tsx` already uses. **Never** call `requireX()` (they redirect) and never trust this for authorization: the link target enforces access. Reading the cookie makes the page dynamic, so it gets the nonce — confirm `/_not-found` shows as ƒ in the build table. `error.tsx` (client components) per area `(owner)`/`(staff)`/`(admin)`/`(auth)`, plus `src/app/error.tsx` for errors thrown in a group layout: "حدث خطأ غير متوقع", a retry button calling `reset()`, **no `error.message`, stack or digest shown**. Verify on `npm start`: a wrong URL renders the styled 404 with a CSP nonce on every `<script>` and no CSP violation; `/_global-error` still prerenders and works. | done |
| U3 | **Transitions.** CSS-only fade-in on page content, 150–200 ms, `opacity` only (no sliding, no transform), disabled under `prefers-reduced-motion: reduce`. A layout does not re-mount on navigation, so use a `template.tsx` per area (it does) or an equivalent that replays per page. Immediate active state on the tapped nav item (side nav and tab bar) before the navigation completes — client-side presentation only, e.g. `useLinkStatus` or local pending state cleared when the pathname changes. No animation library. Print unaffected (no animation rules inside `@media print`). | done |

## reviewer (read-only)
| ID | Reviews | Status |
|---|---|---|
| R-brief | Every brief above against `docs/FRONTEND.md`, before any code | done |
| R-B1..B3, R-U1..U3 | Each completed task: RTL utilities only; contrast ≥ 4.5:1 (measure); no Arabic outside `ar.ts`; no logic changes; CSP compatibility of the 404/error pages (nonce on scripts, no inline styles/scripts added); logo files unmodified (`sha256sum -c ../../../progress/brand-assets.sha256` run inside `public/brand/zakham-brand/`); print output unchanged except B2's header | done — final sweep clean |

## Resolutions after R-brief (lead, binding — these amend the briefs above)
Docs were amended before code: `CLAUDE.md` name fact, `docs/FRONTEND.md` (font, look, layout, PWA, SW note, new
*Loading, not found, errors, transitions* section). Decision logged in `PROGRESS.md`.

- **LIVE DATABASE:** the local `.env` points at the production Neon database. Never sign up, log in to create data,
  approve, add entries, run `npm run seed` or any `prisma migrate`. Test signed-out only. `/login/<anything>` and
  `/pending/<anything>` are public paths, so they reach the app's not-found without a session.
- **R1 overruled:** the top bar becomes a **filled green band** (`bg-accent`) with the white wordmark — the user chose
  that asset. Therefore R4, R9, R10 apply:
  - **Focus ring contract (R4):** `ux` changes the global rule in `globals.css` to
    `outline: 2px solid var(--focus-ring, var(--color-accent))`; `brand` sets `[--focus-ring:#fff]` on the `<header>`.
  - Top-bar text: white (or `accent-soft` for the second line, 5.77:1); user link `text-white hover:bg-accent-dark`.
    Nothing `text-accent-dark` / `text-gray-*` on the green.
  - **Header height (R9):** keep it at exactly 69px (4px top rule may go, but then keep `h-[69px]` total) — or message
    `ux` the new height, because `RoleNav` sticks at `md:top-[69px]`.
  - **Wordmark size (R10):** `h-6` below `sm`, `h-9` from `sm`, `w-auto shrink-0`, with `width`/`height` attributes.
- **R3 (fade):** no `template.tsx`. One CSS rule in `globals.css`:
  `@media (prefers-reduced-motion: no-preference) { #main > * { animation: fade-in 180ms ease-out both } }` plus the
  keyframes. `ux` additionally owns **`src/app/(auth)/layout.tsx`, only to add `id="main"` to its `<main>`** so the
  same selector covers the auth screens.
- **R5:** use the retry function Next 16.3 actually passes to `error.tsx` — verify in
  `node_modules/next/dist/docs/` (the reviewer reads it as `retry()`, which re-fetches; `reset()` does not). Cite it
  in your notes.
- **R6:** accepted — a streamed `notFound()` answers 200 + `noindex`. `ux` may add per-group `not-found.tsx` so the
  chrome stays around it (optional, recommended).
- **R7:** a `loading.tsx` **beside each page** (nearest wins, so `new` and `[id]/edit` need their own, or they show the
  list skeleton). One `role="status"` per loading file, pieces `aria-hidden`. `gray-200` blocks on white cards, never
  `gray-100` on the `gray-50` body. `motion-safe:animate-pulse` only; no gradient shimmer.
- **R8:** build U1 first, then check whether the nav already updates at once. If a pending style is still needed, use
  `useLinkStatus` for a **visual-only** style; `aria-current` stays on the real page; do not touch `nav.ts`
  `activeHref` (tested); no onClick local state.
- **R11 (print header):** the icon+name row goes in an **inner** `div` (the unlayered `.print-only{display:block}`
  would override `flex` on the header itself); the outline icon gets Tailwind `grayscale` (the class lives in
  `PrintHeader.tsx`; the print block in `globals.css` stays unchanged); `alt=""` there, since زخم is the adjacent text.
- **R12:** `brand` also owns **`public/sw.js`, the `CACHE` constant only**: `"ledger-static-v1"` → `"ledger-static-v2"`.
  The allowlist, the fetch handler and `/icons/` stay untouched (pinned by `src/serviceWorker.test.ts`).
- **N1:** confirm `/_not-found` is dynamic from `.next/prerender-manifest.json` (it must no longer be listed), not from
  the route table. Guard with `session.userId && session.role`.
- **N2:** `error.tsx` is a client component — no `metadata` export; React `<title>` composed from keys if wanted.
- **N3:** Reem Kufi with `preload: false` is acceptable (used in footer and print only).
- **N4:** auth tagline wordmark at least 64px tall (`h-16 w-auto`), so the tagline stays legible.
- **Ownership addendum (lead, on ux's request — later WITHDRAWN by ux, markup inlined instead):** `ux` also owns new `src/components/status/NotFoundPanel.tsx` (server component: title, body, one link via `getSession` + `homePathFor`) and `src/components/status/ErrorPanel.tsx` (client component: title, body, retry), so each `not-found.tsx` / `error.tsx` is a thin wrapper.
- **Ownership addendum (lead, R-U1 S1):** `ux` moves `transactions/page.tsx` + `transactions/loading.tsx` into `transactions/(list)/` in both `(owner)` and `(staff)` — a move only, contents byte-identical, URLs unchanged — so the ledger skeleton stops wrapping `new` and `[id]/edit`. Also: `aria-busy` dropped from the skeleton live region (R-U1 N1).

---

# v1.1c — print layout, Excel structure, navigation feedback

Team: lead + `frontend` + `backend` + `reviewer`. One commit at the end by the lead:
`v1.1c: print layout, Excel structure, navigation feedback`. Nobody pushes, nobody amends.

## Shared facts (every teammate)
- App: **زخم**, Saudi-green governmental theme (`--color-accent #006c35`, hover `#004d26`, neutral greys, 2px corners),
  Reem Kufi (`font-brand`) only for the word زخم. Money colours: IN `#15803d`, OUT `#b91c1c`.
- **Docs already amended for this task** (read them, they are the spec): `docs/FRONTEND.md` `/owner/reports` bullet
  (colour print) and *Transitions (v1.1c)*; `docs/BACKEND.md` API routes + *Export workbook (v1.1c)*. Decision logged.
- **String keys are in `src/i18n/ar.ts` already** (lead-owned this task): `t.export.*` (sheet names, titles, labels),
  `t.print.{printedAt, generatedBy}`, plus existing `t.reports.*`, `t.ledger.*`, `t.transaction.*`, `t.direction.*`,
  `t.paymentMethod.*`, `t.common.currency`, `t.common.total`. Need another key or a different value? Message the
  lead ("main"); never hard-code Arabic — Excel labels, CSS `content:` and number formats included (the currency in
  the number format is built from `t.common.currency`).
- `+`/`−` stays on every amount, on screen and on paper. Colour is never the only signal.
- Every page stays dynamically rendered (nonce CSP). RTL logical utilities only. Contrast ≥ 4.5:1 for all text.
- **LIVE DATABASE:** the local `.env` points at production Neon. Never sign up, sign in to create data, approve, add
  entries, run seed or migrations. Signed-in screens cannot be browser-tested by you; say so rather than claim it.
- No logic changes outside the export route: no action, query-semantics, auth, proxy, schema or scoping-gate change.
- Gates before reporting a task complete: `npm run build`, `npm test` (274 baseline + your new tests), `npx tsc --noEmit`,
  all exit 0 on the real exit code. **Build lock:** `mkdir .claude/build.lock` before `npm run build`,
  `rmdir .claude/build.lock` right after (also on failure); if `mkdir` fails, the other teammate is building — run
  tsc/vitest meanwhile and retry. Never serve on port 3000 (the user's server); use 3071 (frontend) / 3072 (backend).
- If `tsc` fails with TS2307 from `.next/dev/types/validator.ts`, delete `.next/dev/types` (stale generated file).
- Notes in `progress/<your-name>.md` (append a new dated section if the file exists). Do not `git commit`.

## Ownership for this task
| Path | Owner |
|---|---|
| `src/app/api/export/**` (route, new `workbook.ts` or similar, `export.test.ts`), `src/features/reports/queries.ts` (read-only unless a change is unavoidable — prefer none) | `backend` |
| `src/app/globals.css`, `src/features/reports/components/**`, `src/components/chrome/**` (`nav.ts` behaviour frozen — `activeHref` is tested), new `src/components/NavProgress.tsx`, and **presentation-only lines** of `src/app/(owner)/owner/reports/page.tsx` (render the print footer / pass the print date; no data or auth change) | `frontend` |
| everything, read-only | `reviewer` |
| `src/i18n/ar.ts`, `docs/*`, `CLAUDE.md`, `PROGRESS.md`, `progress/TASKS.md` | lead |

## backend
| ID | Task | Status |
|---|---|---|
| X1 | **Excel export redesign** exactly as *Export workbook (v1.1c)* in `docs/BACKEND.md`. Sheet 1 «الحركات»: title block rows 1–3, header row 5 bold white on `006C35`, RTL, frozen at row 5, autofilter, content-sized widths, real Excel dates, signed numeric amounts with `#,##0.00 "<t.common.currency>"`, IN green / OUT red `B91C1C` fonts, zebra light grey, final row `SUMIF >0` / `SUMIF <0` / `SUM` as `{formula, result}`. Sheet 2 «الملخص»: وارد and صادر by category tables with totals rows, a net cell, and «حسب طريقة الدفع» derived in the route from the rows already fetched. Sheet 3 «معلومات»: establishment, period, generated-by, generated-at (Riyadh), app version. Keep `requireOwner()` first, establishment from the session only, data only via `listTransactions`/`getReport`, **no `db.` anywhere under `export/**`**, the 400 key behaviour, filename and `Cache-Control` unchanged. Split into a module beside the route to keep files ≲ 250 lines. **Tests** (`export.test.ts`, keep every existing case): the workbook loads back with exceljs; sheet names are the three `t.export.*` names in order; row 5 of «الحركات» is the header with the expected labels; amount cells are numbers with the sign by direction; date cells are `Date`s; the totals row carries `SUMIF`/`SUM` formulas with correct cached results; «الملخص» payment-method totals match the rows. Mutation-check at least the formula and the sign assertions. | done |

## frontend
| ID | Task | Status |
|---|---|---|
| P1 | **Print redesign** per the `/owner/reports` bullet in `docs/FRONTEND.md`. Replace the black-and-white `@media print` block with a designed colour version: header (outline icon — **no `grayscale` any more**, زخم in `font-brand`, establishment name, period, print date via `todayISO()`/`<DateText>`); report tables with a green header row (white text), IN amounts green / OUT red with the `+`/`−` kept, zebra rows, a highlighted net box; a print-only footer line `t.print.generatedBy` (a real element, not CSS `content:`, because the text must come from `ar.ts`) and page numbers via `@page` margin boxes (`counter(page) " / " counter(pages)` — digits only, no Arabic in CSS; physical margin-box names are unavoidable there and are the one allowed exception to logical-only). `print-color-adjust: exact` (+ `-webkit-`) on the coloured parts. Fit A4 and Letter (no fixed page `size`, margins ~12–15mm, nothing wider than the printable area). Nav, top bar, buttons, footer, range picker, progress bar all hidden. Print text contrast ≥ 4.5:1 on its fills. Verify with Chrome's print preview on a signed-out-reachable proxy if needed, otherwise by code + a static HTML fixture in your scratchpad — never with real data. | done |
| N1 | **Navigation feedback** per *Transitions (v1.1c)*. (a) `src/components/NavProgress.tsx`: a thin (2–3px) green bar fixed at the top edge while a nav link's navigation is pending — `useLinkStatus` inside the nav `Link`s, or a pathname-transition hook; no library; `aria-hidden`; `no-print`; under reduced motion a static bar (no animation). It must sit above the top bar (z-index) without shifting layout. (b) The tapped nav item (side nav and tab bar) takes its active **style** immediately via `useLinkStatus`; `aria-current` stays on the real current page; `nav.ts` untouched; no onClick state. (c) Content fade in `globals.css` becomes ~220ms with a 4px rise (`opacity` + `translateY(4px)` → none), **no fill mode** (keep v1.1a's reason: a filled opacity/transform animation would trap the fixed Toast forever), inside `prefers-reduced-motion: no-preference`, nothing in print. Verify on `npx next start -p 3071` with DevTools Network "Fast 3G" as far as signed-out pages allow (e.g. `/login` ↔ `/signup` links), and state plainly that السجل / التقارير need a session and are left to the user. | done |

## reviewer (read-only)
| ID | Reviews | Status |
|---|---|---|
| R-brief | Every brief above against `docs/FRONTEND.md`, `docs/BACKEND.md`, `CLAUDE.md` and the logged Decisions, before any code | done |
| R-X1, R-P1, R-N1 | Each completed task: RTL rules; contrast (measure, including print fills and Excel header/fonts); no logic changes outside the export route; **scoping gate untouched** (`src/features/transactions/scoping.test.ts` unchanged, no `db.` under `export/**`, export still via `listTransactions`/`getReport`); print hides all chrome; no hard-coded Arabic outside `ar.ts` (Excel labels, CSS `content`, number formats included); every page still dynamic | done — final sweep clean |

## v1.1c — Resolutions after R-brief (lead, binding — these amend X1/P1/N1 above)
Full evidence: `progress/reviewer.md` → "v1.1c R-brief".

**backend / X1**
- **B1:** update the two stale cases in `export.test.ts` **in place** — 3 sheets (was 2, :152); the OUT amount is at row 6 and equals **−1234.5** (was row 2, +1234.5, :166). Delete no case.
- **S1:** leave **one blank row** between the last data row and the totals row; with **0 rows**, write plain `0`s instead of formulas. Test the empty period (no circular reference).
- **S2:** autofilter range `A5:H<lastDataRow>`, totals row outside it. The `SUMIF` totals ignore active filters — accepted and documented (they are always whole-period totals).
- **S3:** generated-at is **text** formatted with `Intl` in `Asia/Riyadh`, `en-US` digits (sheet 1 row 3 and «معلومات»). Ledger dates via `isoToDate(row.date)`, never `new Date("…T00:00")`.
- **S4 (lead decisions):** (a) sheet 1 keeps the **existing 8 columns in the existing order**, incl. the وارد/صادر text column; (b) صادر amounts in «الملخص» are **negative**, matching sheet 1; (c) «حسب طريقة الدفع» columns `طريقة الدفع | وارد | صادر | الصافي`, enum order, **methods with no rows in the period omitted**.
- **S5:** cached results computed from integer halalas, divided by 100 once.
- **S6:** zebra fill `#FAFAFA` (never `#F2F2F2`); totals/net fills neutral (white or `#FAFAFA`), never accent-soft under green text.
- **S7:** widths exclude title rows 1–3 (or merge them A–H); measure formatted text; clamp ~10–50; `wrapText` on the note column.
- **S8:** `workbook.ts` is **pure** (rows, report, meta in → Workbook out; no query, no `@/lib/db`). Add an `export.test.ts` case that reads every non-test file under `src/app/api/export/` and asserts no `@/lib/db` import and no `db.`/`tx.`/`client.` call.
- **S9:** always assign fresh style objects (`cell.font = {...}`); never mutate shared ones.
- **Notes to act on:** test that `t.common.currency` contains no `"`. Accepted as-is: two separate reads (rows vs `getReport`) can disagree by an entry added in between; five frozen rows on a phone.

**frontend / P1**
- **S1:** the print footer (`t.print.generatedBy`) is an **ordinary element at the end of the page**, printed once — **never `position: fixed`** (Chrome repeats it on every page without reserving space).
- **S2:** `@page` margin box for page numbers gets **`direction: ltr`** (else "3 / 1"); check Chrome print preview with "Headers and footers" on and off.
- **S3:** print zebra `#fafafa`; the net box may be accent-soft only because a positive net is `gray-900` via `signed` — never colour a positive net green on it.
- **S4:** delete the unlayered `* { color:#000 !important; background:transparent !important }` and the black th/td borders. Use **one mechanism**: the unlayered print block with element/class selectors (Table, Card, MoneyText are not yours this task — style them from CSS, don't edit them). `.print-only { display:block }` still beats `flex` → inner wrapper. `print-color-adjust: exact` + `-webkit-` **once on `html`** in print (inherited). Table's `overflow-x-auto` wrapper → `overflow: visible` in print.
- **Note:** "تاريخ الطباعة" is the server render time — accepted.

**frontend / N1**
- **B1:** mount **one** `<NavProgress>` at the root of `AppShell`, **outside the nav and outside `#main`**, `z-50`, fed by a small client context. Each nav `Link` gets a child that calls `useLinkStatus()` and writes its pending state into the context from an effect, **clearing it in the effect cleanup** (a link unmounting while pending must not leave the bar on). The "pathname-transition hook" option is **withdrawn** (the App Router has no navigation-start event; it would need onClick state, which is forbidden).
- **S1:** bar colour **`#a7cdb6`** (`accent-line`, 5.77:1 on the dark strip) — the user's "green bar" in the light green of the family; `#006c35` on the `#004d26` strip is 1.53:1, invisible. ≤ 3px tall, inside the top strip.
- **S3:** delay showing the bar ~100 ms to avoid flicker. Never add `prefetch={false}` to make it show.
- **Pending style:** read in the Link's child — `:has()` (e.g. `has-data-[pending]:…`) or the child draws the highlight. Two items may look active for a moment until the navigation commits — accepted.
- **Fade:** `@media screen and (prefers-reduced-motion: no-preference)` so print is literally excluded. The skeleton and then the page both fade+rise (two small jumps) — accepted, will be told to the user.
- **S2 (verification):** only (c) the fade can be checked signed-out. (a) the bar and (b) the pending style are left to the user; say so. Expectation for the user: in production most nav targets are prefetched with a `loading.tsx`, so the bar mostly shows on slow first taps (Fast 3G helps).

---

# v1.1e — email verification, password reset, sign-up quality

Team: lead + `backend` + `frontend` + `reviewer`. One commit at the end by the lead:
`v1.1e: email verification, password reset, sign-up quality`. Nobody pushes, nobody amends.

## Shared facts (every teammate)
- **The spec is in the docs, written before code:** `docs/BACKEND.md` → *Email verification, password reset, sign-up
  quality (v1.1e)* and `docs/FRONTEND.md` → *Sign-up, verification and reset screens (v1.1e)*. Decisions in
  `PROGRESS.md` (scope ruling, Brevo REST, PGlite, expand-only migration, **no enumeration anywhere**, Western digits).
- **Contracts already in the tree (lead):** `prisma/schema.prisma` (User name parts, `emailVerifiedAt`, `legacyName`
  `@map("name")`, `EmailCode`) with the client regenerated; string keys in `src/i18n/ar.ts` (`t.err.*` new rule keys,
  `t.signupForm.*`, `t.verify.*`, `t.forgot.*`, `t.reset.*`, `t.mail.*`, `t.status.verified/unverified`). `tsc` currently
  fails (~25 errors) only because code still reads `.name` — E0 fixes that first.
- **LIVE DATABASE — stricter than before:** the local `.env` points at production Neon, which does **not** have the v1.1e
  columns yet. Never run `prisma migrate deploy`/`dev`/`reset`/`db push`, never sign up, sign in, or create data. The
  migration is tested only on PGlite; the user applies it. Any page that queries users will fail locally until then —
  expected.
- **REAL EMAIL:** `.env` may hold a live `BREVO_API_KEY`. Never trigger a real send: no local server submission of any
  sign-up/verify/forgot/reset form, and every test mocks `fetch`. The user tests delivery with their own Gmail.
- Every string through `src/i18n/ar.ts` (keys are the lead's; `frontend` may polish **values**; need a new key → message
  "main"). Western digits everywhere. RTL logical utilities only. Contrast ≥ 4.5:1. Every page stays dynamic.
- Gates before reporting a task complete: `npm run build`, `npm test`, `npx tsc --noEmit`, real exit codes. Build lock:
  `mkdir .claude/build.lock` / `rmdir .claude/build.lock` around `npm run build`. Never serve on port 3000; use 3091
  (backend) / 3092 (frontend) / 3093 (reviewer). TS2307 from `.next/dev/types` → delete `.next/dev/types`.
- Notes in `progress/<your-name>.md` (append a dated "v1.1e" section). Do not `git commit`.

## Ownership for this task
| Path | Owner |
|---|---|
| `prisma/migrations/**` (new migration only), `src/lib/**` (validation, auth, session, rateLimit, new `names.ts`, `codes.ts`, `mail/**`, `passwords/**`, `emails/**`), `src/features/*/actions.ts`, `src/features/*/queries.ts`, `src/app/api/export/route.ts` (generatedBy only), `src/proxy.ts`, all `*.test.ts` | `backend` |
| `src/app/(auth)/**` (new `verify/`, `forgot/`, `reset/` pages + `loading.tsx`, login link), `src/features/auth/components/**`, `src/features/admin/components/**`, `src/features/settings/components/**`, `src/app/(admin)/admin/page.tsx` (name → fullName, badge), the three role `layout.tsx` (`userName` → display name), `src/components/**` (new shared pieces, e.g. `PasswordStrength`, `FieldHelp`), `src/i18n/ar.ts` **values** | `frontend` |
| read-only everything | `reviewer` |
| `prisma/schema.prisma`, `package.json`, `src/i18n/ar.ts` keys, `docs/*`, `CLAUDE.md`, `PROGRESS.md`, `progress/TASKS.md`, `render.yaml`, `.env.example` | lead |

## backend
| ID | Task | Status |
|---|---|---|
| E0 | **Contract layer first, so the tree compiles and `frontend` builds on real types.** `src/lib/names.ts`; `AuthedUser` without `name`; every `.name` read of a user replaced (queries return `createdByName`/`lockedByName` as display name, lists gain `fullName` + `emailVerified`); `validation.ts` exports — new sign-up schemas, the per-rule functions, `passwordStrength`, `emailTypoSuggestion`, and the client entry for the common list — and the new action signatures (`verifyEmail`, `resendVerification`, `requestPasswordReset`, `resetPassword`, changed `signupOwner`/`signupStaff`). Message `frontend` and "main" the moment `tsc` is green, with the exact exported names. | done |
| E1 | **Migration** per the doc (generated with `migrate diff`, backfill hand-written in the same file, expand-only) + a PGlite test that applies `init` then the new migration to seeded rows and asserts the split and the backfill. | done |
| E2 | **Lists + validators:** `src/lib/passwords/common.txt` (SecLists 10k, MIT) + README credit + the generated client module + the equality test; `src/lib/emails/disposable.txt` (a few hundred, CC0) + README; every name/password/email rule with its exact `err.*` key, tested one by one. | done |
| E3 | **Codes, flow cookie, mail, actions, gates:** `codes.ts`, the `zk_flow` cookie, `mail/**` (Brevo REST via `fetch`, `after()`, no secrets in logs), the actions per the doc (non-enumerating sign-up, verify, resend, forgot, reset, login → `/verify`), `requireUser` gate, approval refusal, proxy paths, rate limits, audits. Tests per the doc's *Tests (v1.1e)* list, mutation-checked where a rule could silently weaken (attempt cap, generic reset key, equal query count). | done |

## frontend
| ID | Task | Status |
|---|---|---|
| G1 | **Sign-up redesign** per `docs/FRONTEND.md` (after E0 lands; build the pieces meanwhile): field order, helper line under every field, exact-rule errors, strength meter (text + segments, `aria-live`, dynamic import of the common list), submit disabled while weak/mismatched, email typo hint, autocomplete attributes. | done |
| G2 | **`/verify`, `/forgot`, `/reset`** + their `loading.tsx` + «نسيت كلمة المرور؟» on login: 6-digit code field, 60 s countdown resend, spam note, the generic `/forgot` sentence. | done |
| G3 | **Names and badges on screen:** display name in the top bar (three role layouts), full name + «مُوثّق»/«غير مُوثّق» badge on the admin pending owners, admin establishments and the owner's staff list; approve disabled for unverified. | done |

## reviewer (read-only)
| ID | Reviews | Status |
|---|---|---|
| R-brief | Every brief above against the two v1.1e doc sections, `CLAUDE.md` and the Decisions, before any code | done |
| R-E0..E3, R-G1..G3 | Security (enumeration on every path incl. timing/query count, code storage, attempt cap races, cookie flags, `after()` send, secrets in logs), the migration on PGlite (re-run it), validators vs the doc, RTL, contrast, no Arabic outside `ar.ts`, dynamic pages | done — nothing open |

## v1.1e — Resolutions after R-brief (lead, binding)
All reviewer findings accepted (5 BLOCKER, 14 SHOULD, 10 NOTE — evidence in `progress/reviewer.md` → "v1.1e"). They are written into `docs/BACKEND.md` → *Amendments after the pre-code review* **A1–A14**, which override the section above them, plus FRONTEND.md tweaks, corrected `ar.ts` values (spam note, 72-byte message, 2–30 name messages) and a corrected Brevo Decision (free-mail senders are rewritten to `@brevosend.com`).
- **Ownership addenda:** `prisma/seed.ts` → `backend` (name parts, `legacyName`, `emailVerifiedAt`); `src/app/(admin)/admin/establishments/page.tsx` → `frontend` (full name + badge).
- **A6 changes E3's shape:** every email-dependent branch of sign-up and `/forgot` runs in `after()`; the flow id is a pre-made `randomUUID()` used as the new user's id.
- **A14:** split `auth/actions.ts` and `validation.ts` by concern, keeping existing import paths.


---

# v1.2a — navigation, الجهات, إضافة, الاتفاقيات, المستحقات

Design: `docs/BACKEND.md` → *v1.2a*, `docs/FRONTEND.md` → *v1.2a*, release plan and Decisions 1–13 in `PROGRESS.md`. **This list covers Checkpoint 1 only** (items 1–4). CP2 briefs are written after the user approves CP1.

## Shared facts (every teammate)
- The contract is already in the tree (lead, before code): `prisma/schema.prisma` (v1.2a models), `src/lib/validation/{primitives,parties,plans}.ts` + the new `TransactionInputSchema`/`TransactionFilterSchema` fields, `src/i18n/ar.v12a.ts` (spread into `t`), `src/lib/audit.ts` actions/entities. Change none of it yourself — ask the lead.
- Local and live share **one Neon database**. Never run `migrate deploy`, `migrate dev`, `db push` or the seed against it, and never start the app against it to "try" a mutation. Tests use mocks and PGlite only.
- Two agents building in one tree collide in `.next/`: wrap every `npm run build` in `mkdir .claude/build.lock` … `rmdir .claude/build.lock` (wait and retry if the mkdir fails).
- A claim a teammate makes about the tree is checked with `grep` on the working tree, not `HEAD` — teammates never commit.
- **Do not `git commit`.** Gates before marking done: `npm run build`, `npm test`, `npx tsc --noEmit` on real exit codes (never through a pipe to `tail`), and a note in `progress/<you>.md`.
- Every mutation: `requireX()` → zod → scoped lookups → `$transaction` { write + `writeAudit` } → `revalidatePath`. Every query takes `establishmentId` from the page's `requireX()`. Money in halalas with a `Halalas` suffix; no `Date` in any exported return shape (dates as ISO strings).

## Ownership for v1.2a CP1
| Path | Owner |
|---|---|
| `prisma/migrations/20261001000000_v1_2a_parties_projects_plans/**`, `src/features/{parties,projects}/{queries,actions}.ts`, `src/features/transactions/{actions,queries}.ts`, `src/app/api/export/**`, every `*.test.ts` except `nav.test.ts` | `backend` |
| `src/components/**` (incl. `chrome/nav.ts` and — addendum — `chrome/nav.test.ts`), `src/app/(owner)/**` pages/layouts/loading, `src/app/(staff)/staff/transactions/**` pages, `src/features/{parties,projects,settings,transactions}/components/**`, `src/app/globals.css`, `ar.ts`/`ar.v12a.ts` **values** | `frontend` |
| read-only everything | `reviewer` |
| `prisma/schema.prisma`, `src/lib/**` (incl. validation), `src/i18n/*` keys, `docs/*`, `CLAUDE.md`, `PROGRESS.md`, `progress/TASKS.md`, `package.json` | lead |

## backend
| ID | Task | Status |
|---|---|---|
| K1 | **Queries and actions skeleton first (≤ 30 min), so `frontend` builds on real types:** create `src/features/parties/{queries,actions}.ts` and `src/features/projects/{queries,actions}.ts` with the exact exported names and types of `docs/BACKEND.md` v1.2a, and extend `LedgerRow` / `TransactionRow` shapes. Real implementations, not stubs, where quick; message `frontend` and the lead with the exported names the moment `tsc` is green. | done |
| K2 | **Migration** `20261001000000_v1_2a_parties_projects_plans` via `migrate diff --from-schema <(git show HEAD:prisma/schema.prisma)> --to-schema prisma/schema.prisma --script` (write HEAD's schema to a temp file), expand-only, LF endings (`.gitattributes`). **PGlite test** `src/lib/migration.v12a.test.ts`: init → v1.1e → v1.2a; an old-shape `Transaction` insert still works; links and FKs; drift check against `--from-empty`. | done |
| K3 | **Parties + projects** per the doc: every rule, every audit, `revalidatePath` list incl. `revalidatePath("/owner", "layout")`. `hasHistory` counts soft-deleted transactions. Balances from OPEN plans' instalments (real query; zero until CP2). | done |
| K4 | **Transaction links:** `partyId` (active unless kept; party set ⇒ `counterparty` null), `projectId` (ACTIVE unless kept → `err.projectClosed`), `instalmentId` refused in CP1 (`fieldErrors.instalmentId = err.instalmentInvalid`), audit snapshots with the links; `ledgerWhere` adds `partyId`/`projectId` and party-name search; `LedgerRow`/`getTransaction` return the link ids and names; export counterparty = `partyName ?? counterparty`. | done |
| K5 | **Gates:** `scoping.test.ts` — harness models `party`, `project`, `plan`, `instalment`; `createMany` checked per element; drivers for every new query/action (empty and populated filters); `parties/*`, `projects/*` in the static-sweep `FILES`; a foreign-establishment id for each transaction link → its field error. `admin.test.ts` — static case: no file under `src/features/admin/**` or `src/app/(admin)/**` references `party`/`project`/`plan`/`instalment` models or imports `features/{parties,projects,plans}`. `validation.test.ts` — Party/Project schemas (phone, email, names, budget "" → undefined, end ≥ start) and the three transaction link fields (`""` → undefined, `intent` still stripped). Guards test — each party/project mutation calls `requireOwner`. Mutation-verify each new case (break the code, see exactly it fail, restore by diff). | done |

## frontend
Start with N1/N2 (no backend dependency). N3–N5 after `backend` reports K1.
| ID | Task | Status |
|---|---|---|
| N1 | **Owner navigation** per `docs/FRONTEND.md` v1.2a: `OWNER_NAV_GROUPS`, grouped side nav with collapsible new groups (`localStorage` `zk_nav_groups`, try/catch, active group always open, `aria-expanded`/`aria-controls`), mobile bar of exactly five with the **المزيد** tile sheet (`<dialog>` + `showModal()`), `badges` prop through `AppShell` (owner layout passes `{}` / 0 in CP1), badge hidden at 0 and `99+`. Staff and admin nav unchanged. Update `nav.test.ts` (addendum: yours) for the groups and `activeHref` over flattened items. v1.1d press/pending states on every item and tile. | done |
| N2 | **Settings split + staff pages:** `/owner/settings/{categories,join-code,locks,account}` (+ `loading.tsx` each), `/owner/settings` redirect honouring `?tab=`, the staff tab moved unchanged to `/owner/staff/logins`, «قريباً» placeholders `/owner/staff` and `/owner/staff/attendance`, top-bar account link → `/owner/settings/account`. | done |
| N3 | **Parties UI** (after K1): `/owner/parties` (type tabs `?type=`, لنا/علينا with words), `/new`, `/[id]` (contact card, تعديل, إيقاف/تفعيل, حذف only without history), `/[id]/edit`; `loading.tsx` each; `notFound()` for unknown ids. | done |
| N4 | **إضافة UI** (after K1): `/owner/projects` (status filter, budget bar with the number in text), `/new`, `/[id]` (totals, حسب التصنيف, `LedgerList` via `listTransactions({ projectId })`, تسجيل تكلفة, status buttons, حذف only without history, printable summary through the existing print block), `/[id]/edit`; `loading.tsx` each. | done |
| N5 | **Form + ledger links** (after K1/K4): الجهة select (optgroups by type, kept inactive, «أخرى» reveals the text field), ضمن إضافة select, `?projectId=` prefill on both roles' new-entry page (validated against the options), ledger rows show party name / project chip. | done |

## reviewer (read-only)
| ID | Reviews | Status |
|---|---|---|
| R-brief | **Before any code:** the whole v1.2a design (both doc sections — CP2 included, since the schema already carries it), the schema, the validation modules, `ar.v12a.ts`, the Decisions, and every CP1 brief above — against `CLAUDE.md`, the Security list (rules 1–11), the RTL rules, and each other. Findings to the lead as BLOCKER / SHOULD / NOTE with file:line evidence. | done |
| R-K*, R-N* | Each task as it lands: tenancy on every new call (rule 11: foreign id ≡ missing id), rule 10 (admin sees nothing new), audits in the same transaction, kept-not-newly-assigned for party/project, migration expand-only (re-run the PGlite test), gate strength (ask what it does *not* assert), RTL/logical utilities, Western digits, `+`/`−`, contrast of the badge, `<dialog>` focus handling, dynamic pages, no Arabic outside `src/i18n/*`. | done |

## v1.2a — Resolutions after R-brief (lead, binding)
All 20 reviewer findings accepted (2 BLOCKER, 10 SHOULD, 8 NOTE — `progress/reviewer.md` → v1.2a). Written into `docs/BACKEND.md` → *v1.2a amendments* **V1–V12** and the FRONTEND amendments; they override the briefs above.
- **Lead already applied:** `onDelete: Restrict` on the three `Transaction` links (V2); `MAX_AMOUNT_HALALAS` = 2 000 000 000 (V3 — `backend` updates `money.test.ts`); `src/lib/plural.ts` + plural-form strings (V10).
- **K3 grows:** V4 (revision read order — CP2, noted now), V8 `hasHistory` on projects, V9 revalidation in `establishments/`, `locks/`, `settings/actions.ts` (ownership addendum → `backend`), P2003 mapping (V2).
- **K2 grows:** Restrict assertions, the drift-check mechanism (V12), and the `_sum`-over-int4 check (V3).
- **K5 grows:** the V1 reference-probe exemption with its bound-pinning cases and the no-nested-`transactions` static rule; the admin static case also covers `src/components/chrome/**` (V12).
- **N1 grows:** staff item label (V11), badge text through `plural()` (V10). **N5 grows:** the direction-preset rule (S6), owner-only project chip (V12).

- **R-N1 ruling (lead):** `/owner/plans` and `/owner/dues` get «قريباً» placeholders in CP1 (`frontend`, with N3–N5) so the المستحقات tab and الاتفاقيات item never 404; CP2 replaces them.
- **Ownership addenda (lead grants during CP1):** `src/features/transactions/links.ts` → `backend` (link checks split out of `actions.ts`, in the static sweep); `src/lib/testing/pgliteClient.ts` → `backend` (Prisma-7-on-PGlite client, test-only, statically guarded against non-test imports). `actions.ts` at 325 lines accepted for CP1 (308 at HEAD); CP2 puts payments in their own module.


---

# v1.2a — Checkpoint 2 (plans, instalments, payments, dues, statements, home cards)

CP1 `792a601` approved by the user. Design: `docs/BACKEND.md` → *v1.2a* (Plans, Payments, Statement, Pure helpers) **as amended by V1–V12 and the CP2 additions** (payments module, `getStaffDues`, staff payment route, the real-client test); `docs/FRONTEND.md` → *v1.2a CP2 screens* + *CP2 additions*; `PROGRESS.md` Decisions 1–13, the staff-payments ruling and its reading. Shared facts and rules from the CP1 section above still hold (one Neon DB — never touch it; build lock — **everyone, the lead included**; no commits; gates on real exit codes; mutation-verify every new gate).

**User defects from the CP1 localhost test** are fixed inside CP2: the lead forwards each one to its owner as a task `D1`, `D2`, … and it goes through the reviewer like any other task.

## Ownership for CP2
| Path | Owner |
|---|---|
| `src/lib/{schedule,instalments,allocation}.ts` (+ tests) — addendum from lead-owned `src/lib`, pure and client-safe, signatures exactly as in the doc | `backend` |
| `src/features/plans/{queries,actions,allocate}.ts`, `src/features/transactions/{payments,actions,links,queries}.ts`, `src/features/parties/queries.ts` (statement), `src/features/projects/queries.ts` (`topActiveProjects`), every `*.test.ts` | `backend` |
| `src/app/(owner)/owner/{plans,dues}/**`, `src/app/(owner)/owner/page.tsx`, `src/app/(owner)/layout.tsx` (badge), `src/app/(owner)/owner/parties/[id]/**` (statement), `src/app/(staff)/staff/page.tsx`, both roles' `transactions/new` + `[id]/edit` pages, `src/features/{plans,dues,parties,projects,dashboard,transactions}/components/**`, `src/components/**`, `globals.css`, string values | `frontend` |
| read-only everything | `reviewer` |
| schema, `src/lib/validation/**`, `src/lib/plural.ts`, string keys, docs, `CLAUDE.md`, `PROGRESS.md`, `TASKS.md` | lead |

## backend
| ID | Task | Status |
|---|---|---|
| P1 | **Pure helpers + their tests:** `buildSchedule` (equal split, remainder on the last row, anchor-day monthly clamping, **V6** `count > total` → `null`), `dayOffset` / `instalmentStatus` / `planStatus` (precedence exactly as the doc; "today" always passed in), `allocate` (own instalment first, roll forward, wrap to earliest unpaid, residue = `overpaidHalalas`; order `(dueDate, seq)` / `(date, createdAt, id)`). Tests: awkward totals, month-end clamping incl. leap year, day boundaries (due today, yesterday, `reminderDays` edge, 23:59 vs 00:00 Riyadh via `todayISO(instant)`), exact/partial/overpay/rollover/wrap/residue. **Export signatures first and message `frontend`** — the schedule builder needs `buildSchedule` and the status helpers client-side. | done |
| P2 | **Plans:** `allocate.ts` `reallocatePlan` (changed rows only, one `PLAN_ALLOCATE` audit), the **revision lock (V4: read `revision` in the same `findFirst` as state/total/direction, before any sum; bumped by payment create/update/delete, `updatePlan`, `cancelPlan`, `archivePlan`)**; `createPlan` (V7: any row `id` → `err.scheduleInvalid`), `updatePlan` (fixed rows, V5 kept-not-newly-assigned for party **and** category, V7 duplicate id / omitted fixed row, P2003 on row delete → `err.schedulePaidRowChanged`), `cancelPlan`, `archivePlan`; queries `listPlans`, `getPlan`, `getDues`, `getOverdueCount` (field reference), `getInstalmentForPayment`, `getStaffDues` (exactly four fields), `topActiveProjects`. | done |
| P3 | **Payments** in `src/features/transactions/payments.ts`, called from the three transaction actions: create with `instalmentId` (canEdit via the DB, `err.forbidden` returned; **V5** party from the plan, no active check), update (link fixed → `err.paymentLinkFixed`; absent `instalmentId` = keep; amount ≤ remaining + own amount), delete (un-pays). Month locks on all three. `actions.ts` must not grow. | done |
| P4 | **Statement** `getPartyStatement` per the doc (PLAN / PAYMENT / WRITE_OFF rows, signed + لنا / − علينا, order, `other` = unlinked entries) with the invariant test closing = `owedToUs − owedByUs`. | done |
| P5 | **Gates:** scoping — `plans/*`, `payments.ts`, `allocate.ts` in `FILES`, drivers for every new query/action, `plan`/`instalment` writes checked, foreign plan/instalment id ≡ missing; admin static case already covers `features/plans`; **canEdit matrix for payments** (OWNER ✓ · STAFF canEdit ✓ · STAFF without ✗ `err.forbidden` · plain entry by STAFF without canEdit still ✓); lock enforcement on payment create/update/delete; revision conflict → `err.concurrentChange`; cancel vs archive; fixed rows; **the real-client PGlite money-path test** (CP2 additions). Mutation-verify each. | done |

## frontend
Q1–Q2 need P1's exports; Q3–Q6 need P2's query signatures (message from `backend`). Build against the real exports, no stubs.
| ID | Task | Status |
|---|---|---|
| Q1 | **الاتفاقيات list + new/edit with the schedule builder:** move the `/owner/plans` placeholder into `(list)/`; filters direction/status/party as URL params; form (party → default direction by type, direction radio cards with `t.planDirection` + party name, title, total, category by direction, start date, reminder days, notes); builder — equal mode (`buildSchedule`; when it returns `null` say why and cap the count) and custom mode; editable preview table with live sum/difference; submit disabled until the sum matches; rows posted as one JSON `instalments` field; fixed rows read-only on edit with the notices. | done |
| Q2 | **Plan detail:** header, instalment table (no., due + Hijri, amount, paid, remaining, status text, countdown through `plural()`, payments under each), «تسجيل دفعة» on unpaid rows of an OPEN plan, تعديل / أرشفة / إلغاء with `ConfirmDialog` and `canCancel`. | done |
| Q3 | **المستحقات + payment form:** move the `/owner/dues` placeholder into `(list)/` if children appear, else replace it; overdue first (red strip) then this week, each split لنا / علينا with totals, rows with quick «تسجيل دفعة»; payment mode of `TransactionForm` on both roles (`?instalmentId=`; banner, locked direction and party, amount prefilled, category from the plan, no «حفظ وإضافة أخرى», return target per role); linked-payment notice on edit; unknown/paid instalment → ordinary form + toast. | done |
| Q4 | **Party كشف حساب** under the contact card on `/owner/parties/[id]` (signed amounts with `signed`, running balance with لنا/علينا words, closing box, «حركات أخرى مع الجهة»), printable with `t.print.statementTitle`. | done |
| Q5 | **Owner home:** «مستحقات هذا الأسبوع» (range line, لنا / علينا totals, up to 5 rows, red متأخرات strip via `plural()`) and «الإضافات الجارية» (top 3, «{spent} من {budget}» + bar); **badge** from `getOverdueCount` in the owner layout. | done |
| Q6 | **Staff home «المستحقات» card**, only when `canEdit`: exactly party · amount due (no sign) · due date + «تسجيل دفعة» per row; empty state. Nothing else. | done |

## reviewer (read-only)
| ID | Reviews | Status |
|---|---|---|
| R-brief-2 | **Before any code:** these briefs against the v1.2a design + V1–V12 + CP2 additions + the staff ruling — money correctness first (allocation, rollover, re-allocation on edit/delete, revision lock order, archive write-off, statement invariant, `paidHalalas` never written outside `reallocatePlan`), then day boundaries, tenancy (rule 11) and rule 10, canEdit on every payment path incl. the staff route, and the staff card's "nothing more". | done |
| R-P*, R-Q*, R-D* | Each task as it lands, as in CP1. | done |

## v1.2a CP2 — Resolutions after R-brief-2 (lead, binding)
All 13 findings accepted (6 SHOULD, 7 NOTE — `progress/reviewer.md`); written as **W1–W13** at the end of `docs/BACKEND.md`, overriding the CP2 text. `backend`'s four readings are ratified in *Confirmed readings*. Task deltas:
- **P2 grows:** `getPaymentLink` (W1), `getStaffPaymentPrefill` (W2), stable orders (W7), `PLAN_CREATE` audit without ids (W12). **P3:** W3 order and refusals. **P4:** `other` capped at 50 (W11). **P5:** W5 static cache gate + exact-keys tests, W6 real-client scope (no concurrency claim), the archived-plan delete case.
- **Q1 grows:** W4 (kept inactive party/category, equal mode disabled once a row is fixed). **Q3:** W1 edit pages, W2 staff-shaped banner, W3(d) locked fields + the S6 skip covering the payment preset, W9, W10 `PaymentBanner.tsx`. **Q4:** W11 cap line + link (new keys `t.statement.otherCapped`, `otherViewAll`). **Q5/Q6:** W8 server "today"; Q6 does not call `getStaffDues` at all without canEdit.
