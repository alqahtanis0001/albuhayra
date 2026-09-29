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
