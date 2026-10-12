# progress/v15/theme.md

Your own running notes. Only you write here. The lead merges it into PROGRESS.md at checkpoints. Keep entries short; newest at the bottom.

## Files I own
`src/app/globals.css`; `src/app/layout.tsx` (D11); `src/lib/theme.ts` (+ test); `src/components/chrome/ThemeToggle*.tsx` (+ test); `src/components/visualPalette.ts`; `src/lib/tokenLint.test.ts`; `src/lib/themeCss.test.ts` (new, the token-layer pins); `src/features/auth/components/AuthCard.tsx`, `src/app/not-found.tsx` (D33); hex → token replacements in every file not owned by `home` / `nav` (D12).

## Tasks completed
| Task | Files touched | Build/tests pass | Notes for others |
|---|---|---|---|
| T1 token layer (C1) | `src/app/globals.css`, `src/lib/themeCss.test.ts` (new, 91 cases) | tsc 0; vitest 126 files / 1794, 1 failing = `nav`'s in-flight `SalaryPickList.test.ts` (mine all green; 121 / 1734 all green earlier); build exit 0; bundles `progress/v15/bundles-theme.json` max +4.2 KB gz (`/owner`, from `home`'s in-flight code — CSS adds no JS) | token names and lists below |
| T2 toggle + SSR (C2, D11, D32) | `src/lib/theme.ts` (new), `src/app/layout.tsx`, `src/components/chrome/ThemeToggle.tsx` (server wrapper, new), `ThemeToggleButton.tsx` (client, new); tests `src/lib/theme.test.ts` (21), `src/components/chrome/themeToggle.test.ts` (9) | ✓ (final gates below) | `nav` mounted `<ThemeToggle />` in TopBar |
| T3 everything reads tokens (C3, D33) | `visualPalette.ts` (PALETTE → `var(--color-…)`, same keys), `globals.css` (girih in dark, wordmark pair, `--color-on-gold`), `AuthCard.tsx`, `src/app/not-found.tsx` (white wordmark in dark), `text-white` → `text-on-accent` in `Button`, `LinkButton`, the three `not-found`s, `verify`, staff home + ledger, admin establishments, owner dues, `ScheduleBuilder`, `DirectionToggle`, `ForgotForm`; `LedgerArt` `#fff` → `var(--color-white)` | ✓ | recharts props were on `home`'s list |
| T4 tests (C4) | `src/lib/tokenLint.test.ts` (21), `src/lib/themeCss.test.ts` (10), `src/lib/themeContrast.test.ts` (101), helpers `src/lib/themeCss.testkit.ts` + `src/lib/tokenLint.testkit.ts` (test-only, not imported by the app; renamed in D43, below) | ✓ | |

## T1 — the token layer (done)

### Mechanism (D11, D32)
- Light values: the existing `@theme` block, **byte-for-byte unchanged**, plus a new `@theme static` block (static so a token read only from SVG/JS — `var(--color-gold)` in a `.tsx` — is always emitted).
- `:root { color-scheme: light; --page-art-auth/app: url(…) }`.
- Dark values: `@media screen { :root[data-theme="dark"] {…} }` and `@media screen and (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {…} }` — identical declaration lists (pinned), each with `color-scheme: dark`. Print is light by construction; `@media print { :root { color-scheme: light } }`.
- Every raw colour in a screen rule is now a token (`.auth-bg`, `.app-bg`, `dialog::backdrop`, `.btn-ripple`, `nav-pulse`, `.nav-progress`, `v13-paid*`). Print rules and `@page` keep their literals (light only).
- Tailwind default-palette steps in use get dark overrides only; light never restated (pinned): `white`, `amber-50/300/500/700/800/900`, `orange-100/600`, `red-200/300/700/800/900`, `green-200/300`. `black` is not overridden: the only use is the dialog backdrop (`backdrop:bg-black/50`, and the unlayered `dialog::backdrop` rule wins anyway → `--color-backdrop`, 0.5 light / 0.65 dark).
- Page art in dark: `--page-art-*: none` → plain `--color-page` for now; T3 brings the girih back in dark (mask over a token colour).
- Added for `home` (D20, D30): `@keyframes wheel-draw`, `wheel-pop`, `wheel-lit` (inside `@media screen and (prefers-reduced-motion: no-preference)`), and the two `.home-details` / `.home-details-body` screen rules, verbatim from D20.

### Decision request to the lead — `white` and on-accent
- `--color-white` = **the card/input surface**: `#fff` light (Tailwind's own), `#172019` dark. All 79 `bg-white` flip with no edit.
- Text on a saturated fill (accent, money-in/out, red-800 hover) moves to **`text-on-accent`** (`--color-on-accent`: `#ffffff` light, `#0e1411` dark). Reason: a dark accent that reads as text on the dark card (`#3daa6b`, 5.7:1) is too light for white text (2.9:1 — the mock's white-on-green button fails C1's 4.5). So in dark, buttons are light green with deep-ink labels (6.35:1). Until a `text-white` is replaced it already renders dark ink in dark (white = surface), so nothing breaks in between — the swap is for meaning and future tuning.
- **The top bar is the exception**: it stays a deep green band with white — `--color-topbar` `#006c35`/`#14532d`, `--color-topbar-dark` `#004d26`/`#0c3a20` (edge strip, hover), `--color-on-topbar` `#fff` both (9.11:1 / 12.79:1). `nav` applies it (list below).
- `--color-on-accent-muted` (D33, the «+» primary-row caption): `rgb(255 255 255 / 0.85)` light → 5.22:1 on accent; `rgb(14 20 17 / 0.85)` dark → 5.12:1.

### Token table (light → dark)
| Token | Light | Dark | Use |
|---|---|---|---|
| `--color-accent` | #006c35 | #3daa6b | links, fills, focus ring |
| `--color-accent-dark` | #004d26 | #5fbf88 | strong text on soft, hover fill ("dark" = more contrast) |
| `--color-accent-soft` | #e8f3ec | #183324 | selected rows/tabs |
| `--color-accent-line` | #a7cdb6 | #1f4430 | borders, press state |
| `--color-money-in` / `-soft` | #15803d / #f0fdf4 | #4cc27e / #112a1b | |
| `--color-money-out` / `-soft` | #b91c1c / #fef2f2 | #f08a7e / #2e1816 | |
| `--color-gray-50…900` | #fafafa #f4f4f4 #e5e5e5 #d4d4d4 #a3a3a3 #666666 #525252 #404040 #262626 #171717 | #0e1411 #1e2a22 #243129 #34443a #5b6b62 #9aaba1 #afbdb5 #c3cfc8 #d6e0da #e9efea | page = 50, ink = 900 |
| `--color-white` (Tailwind) | #fff | #172019 | **surface** (cards, inputs, sheets) |
| `--color-tint-in/out/amber/blue/teal/grey` | #dcfce7 #fee2e2 #fef3c7 #dbeafe #ccfbf1 #e5e5e5 | #17402a #4a2320 #45370f #1c3150 #133f39 #2f3b34 | tinted cells, gray-900 text |
| `--color-heat-1…4` | #e8f3ec #c9e7d3 #9fd3b1 #6fbb8b | #17301f #1d4630 #245c3e #2d7550 | heat strips |
| `--color-on-accent` | #ffffff | #0e1411 | text on fills |
| `--color-on-accent-muted` | rgb(255 255 255 / .85) | rgb(14 20 17 / .85) | caption on accent |
| `--color-on-gold` (T3, `home`'s D40 request) | #171717 | #0e1411 | count text on a gold dial dot (7.41:1 / 9.50:1) |
| `--color-topbar` / `-dark` / `on-topbar` | #006c35 / #004d26 / #fff | #14532d / #0c3a20 / #fff | the green band |
| `--color-gold` | #c9a227 | #d8b64a | wheel/chart gold |
| `--color-gold-2` | #e3cf7e | #9c8a3f | wheel ring 2 |
| `--color-accent-2` | #2e8b57 | #5fbf88 | wheel green-2 |
| `--color-accent-3` | #8fb5a0 | #5e8e73 | wheel green-3 |
| `--color-chart-muted` | #c9d1cc | #4a5750 | wheel «أخرى» grey |
| `--color-track` | #e8ede9 | #2a362e | empty ring / track |
| `--color-chart-amber/blue/teal/grey` | #b45309 #1d4ed8 #0f766e #737373 | #e0a050 #7aa2f0 #3fbfaf #8a9890 | PALETTE (T3) |
| `--color-chart-grid` | #cccccc | #34443a | recharts grid/cursor/tooltip border (its default #ccc) |
| `--color-page` / `-veil` | #f4f6f5 / rgb(244 246 245 / .5) | #0e1411 / rgb(14 20 17 / .5) | .auth-bg/.app-bg |
| `--color-nav-pulse`, `-paid-wash`, `-paid-static`, `-progress` | #d2e7da #c9e7d3 #dcf3e4 #a7cdb6 | #1f4230 #1d4630 #1a3a27 #5fbf88 | globals.css rules |
| `--color-ripple`, `-backdrop` | rgb(255 255 255 / .35), rgb(0 0 0 / .5) | rgb(14 20 17 / .2), rgb(0 0 0 / .65) | |
| amber/orange/red/green steps | Tailwind's | 50 #3a2e10 · 300 #7a5e1c · 500 #b8862b · 700 #c98a2a · 800 #f2c76b · 900 #f7d58a · orange-100 #4a2e14 · orange-600 #c9672f · red-200 #5a2622 · red-300 #7a3530 · red-700 #d04a3f · red-800 #f5a398 · red-900 #e86b60 · green-200 #1f4a30 · green-300 #2b6342 | dark only |

### Dark contrast (WCAG 2.x, measured; all text pairs pinned in `themeContrast.test.ts`, 84 cases + on-gold light)
Text × surface (gray-50 page · white card · gray-100 · accent-soft · money-in-soft · money-out-soft):
| text | page | card | gray-100 | accent-soft | in-soft | out-soft |
|---|---|---|---|---|---|---|
| gray-500 | 7.73 | 6.93 | 6.18 | 5.67 | 6.36 | 6.92 |
| gray-600 | 9.56 | 8.57 | 7.64 | 7.00 | 7.86 | 8.56 |
| gray-700 | 11.61 | 10.40 | 9.28 | 8.51 | 9.54 | 10.39 |
| gray-800 | 13.79 | 12.36 | 11.02 | 10.10 | 11.33 | 12.34 |
| gray-900 | 15.97 | 14.32 | 12.77 | 11.70 | 13.13 | 14.30 |
| accent | 6.35 | 5.70 | 5.08 | 4.66 | 5.22 | 5.69 |
| accent-dark | 8.25 | 7.39 | 6.59 | 6.04 | 6.78 | 7.39 |
| money-in | 8.28 | 7.42 | 6.62 | 6.06 | 6.80 | 7.41 |
| money-out | 7.67 | 6.87 | 6.13 | 5.62 | 6.30 | 6.87 |

Others: gray-600 / 700 / 900 on gray-200 6.96 / 8.46 / 11.64 · gray-900 on tint-in 9.98, tint-out 11.59, tint-amber 9.96, tint-blue 11.22, tint-teal 10.01, tint-grey 10.02, heat-1 12.17, heat-2 9.13, heat-3 6.73, heat-4 4.77, amber-50 11.41, orange-100 10.64, red-200 10.37, paid-static 10.72 · accent-dark on accent-line 4.82, on nav-pulse 4.94 · amber-800 on amber-50 8.34, on card 10.47 · amber-900 on amber-50 9.40 · on-accent on accent 6.35, accent-dark 8.25, money-in 8.28, money-out 7.67, red-800 9.38 · on-accent-muted on accent 5.12 · on-gold on gold 9.50 (light 7.41) · on-topbar on topbar 9.11, topbar-dark 12.79 · progress bar (#5fbf88) on topbar-dark strip 5.66. Non-text: gold on card 8.52; track on card 1.32 (a track, decorative, as the mock); accent-line border on card 1.53 (light: 1.6).

### Lists for `home` (src/features/dashboard/**, owner `page.tsx`, `Wheel*`) — apply these
- `ExpenseDonut.tsx` `stroke="#fff"` (≈ line 51) → `stroke="var(--color-white)"` (the card surface between slices).
- `SixMonthChart.tsx` — recharts' built-in colours as token props (light values equal recharts' defaults, so light does not move): `<CartesianGrid … stroke="var(--color-chart-grid)" />`; `<XAxis … stroke="var(--color-gray-500)" />` and the same on `<YAxis>` (axis line + tick text; recharts' default is #666 = gray-500); `<Tooltip … cursor={{ fill: "var(--color-chart-grid)", stroke: "var(--color-chart-grid)" }} contentStyle={{ backgroundColor: "var(--color-white)", borderColor: "var(--color-chart-grid)" }} />`. Legend/tooltip item text already take the series fills (`var(--color-money-in/out)`); the tooltip label inherits gray-900.
- `QuickActions.tsx` `PRIMARY` (≈ line 20): `text-white` → `text-on-accent`.
- `WeekDues.tsx` (≈ line 49, if it survives D8): `text-white` → `text-on-accent`; `hover:bg-red-800` stays (red-800 has a dark value).
- `CashFlowWaterfall.tsx` / `ExpenseDonut.tsx` read `PALETTE.*` — no edit: T3 turns `PALETTE` into `var(--color-…)` strings with the same keys (`style={{ backgroundColor }}` and SVG `fill` accept them).
- **Wheel colours** (mock name → token): green → `--color-accent`; red → `--color-money-out` (the app's red; the mock's #b42318 is not copied — "never restyles"); gold → `--color-gold`; green-2 → `--color-accent-2`; green-3 → `--color-accent-3`; gold-2 → `--color-gold-2`; grey («أخرى») → `--color-chart-muted`; track → `--color-track`; ink → `--color-gray-900`; muted → `--color-gray-500`; card → `--color-white`; the «اليوم» dot → `--color-gray-900`; the numbered row circle → `bg-accent text-on-accent`. Tailwind classes exist for all (`fill-gold`, `stroke-track`, `bg-accent-2` …).
- **Focus halo** in the SVG: `var(--focus-ring, var(--color-accent))` (the global `:focus-visible` rule's own expression).
- Keyframes: `wheel-draw`, `wheel-pop`, `wheel-lit`; `.home-details` / `.home-details-body` as D20 — all in `globals.css` now.

### Lists for `nav` (src/components/chrome/** except ThemeToggle*) — apply these
- `TopBar.tsx` `<header>`: `bg-accent` → `bg-topbar`; `border-t-accent-dark border-b-accent-dark` → `border-t-topbar-dark border-b-topbar-dark`; `[--focus-ring:#fff]` → `[--focus-ring:var(--color-on-topbar)]` (the token lint catches the `#fff`).
- `TopBar.tsx` establishment `<p>`: `border-white/40` → `border-on-topbar/40`; `text-white` → `text-on-topbar`.
- `TopBar.tsx` account `<Link>`: `text-white hover:bg-accent-dark` → `text-on-topbar hover:bg-topbar-dark`. (The logout `Button variant="secondary"` stays: it is a surface button.) Update the header comment's "#006c35" to name the token.
- `AddSheet.tsx`: `SIDE_TRIGGER`, `PRIMARY_ROW` and the «+» disc `<span>`: `text-white` → `text-on-accent`. Primary row caption (D33): `text-on-accent-muted` (5.22:1 light, 5.12:1 dark).
- `NavBadge.tsx`: `text-white` → `text-on-accent` (on money-out).
- `src/app/(owner)/owner/transactions/(list)/page.tsx` (≈ line 57, the add button): `text-white` → `text-on-accent`.
- `NavProgress` needs nothing (`.nav-progress` reads `--color-progress`).

### Mutations (themeCss.test.ts, run on a scratch copy via `THEME_CSS=`)
M1 light `--color-accent` #006c35 → #006c36 → "keeps every pre-v1.5 colour token" failed · M2 `--color-page` light changed → "gives every new token the light value" failed · M3 one value differs in the system block → "identical for the explicit choice and for system" failed · M4 `--color-track` removed from both dark blocks → "redefine every colour token" failed · M5 `--color-amber-50` added to `@theme static` → "never restates Tailwind's default palette" (+ new-token case) failed · M6 backdrop back to `rgb(0 0 0 / 0.5)` → "leaves no raw colour in a screen rule" failed · M7 explicit dark block under `@media all` → file fails to load (the single-dark-screen-block guard) · M8 print `color-scheme: light` removed → "print is light by construction" failed · M9 dark gray-500 → #6b7b72 → six "gray-500 on …" contrast cases failed · M10 dark on-accent → #fff → five "on-accent on …" cases failed.

## T2–T4 (done)

### T2 — toggle and SSR
- `src/lib/theme.ts` (client-safe): `ThemeChoice`, `parseTheme` (absent/unknown → `null`), `nextTheme` (light → dark → system → light), `THEME_COOKIE = "theme"`, `THEME_STORAGE_KEY = "ui:theme"` (D31), `themeCookie(choice, secure)` = `theme=<c>; Path=/; Max-Age=31536000; SameSite=Lax` (+ `; Secure` on https; never HttpOnly), `htmlThemeAttrs(choice)` (only `data-theme`; `color-scheme` comes from the CSS, D32), `chooseTheme` (a click: localStorage + cookie + attribute, no reload) and `reconcileTheme` (on mount: a present cookie wins and localStorage follows; no cookie + a valid stored choice → cookie rewritten and applied; neither → system), both on an injectable `ThemeEnv` so tests use stubs.
- `src/app/layout.tsx`: `async`, reads `cookies()` → `{...htmlThemeAttrs(parseTheme(…))}` on `<html>`; no inline script. `viewport.themeColor` is now a light/dark pair (`#006c35` / `#14532d`, the band). On a light OS, light is unchanged.
- `ThemeToggle.tsx` (async server wrapper: `cookies()` → `parseTheme`) renders `ThemeToggleButton choice={…}` (client): a 44 × 44 button, `text-on-topbar hover:bg-topbar-dark`, sun/moon/screen icon drawn with `Svg` from `icons.tsx`, `aria-label`/`title` = `t.theme.toggle` with the current mode.

### T3 — everything reads tokens
- **Charts:** `PALETTE` values are `var(--color-…)` strings with the same keys (pinned: each key's token has the old hex as its light value and has a dark value). So every hand-written SVG chart flips: sparklines, waterfall, ring/progress/instalment bars, live clock, payslip hero, illustrations, and the donut cells. recharts' own colours (grid, axis, tooltip, cursor) were on `home`'s list (`--color-chart-grid`, `gray-500`, `white`).
- **Girih in dark:** the files in `public/brand/zakham-bg-v3/` stay untouched. In dark, the same art is multiplied onto the dark page colour (`--page-blend: multiply`, veil transparent). The near-white ground leaves the page colour as it is, and the lattice comes out a shade darker, like an engraving that can only add contrast. In light, `background-blend-mode: normal` (the initial value) changes nothing.
- **Wordmark (D33):** `AuthCard` and the root `not-found` carry the green file (`wordmark-light`) and the white one (`wordmark-dark`, `loading="lazy"` so a light page never fetches it). The pair switches by tokens (`--wordmark-light/dark` → `display`), so the cookie, "system" and print (green) all work. The top bar keeps its white file.
- **Text on fills:** all `text-white` in my files → `text-on-accent`. Nothing in `src/` uses `text-white` now.
- **Print:** always light. The dark blocks are screen-only, and `@media print { :root { color-scheme: light } }` is set.

### T4 — tests (all mutation-proven; runs on scratch copies via `THEME_CSS=` / `TOKEN_LINT_ROOT=`, or in-tree on my own files with a `cp` backup restored at once; `git diff` clean afterwards)
- **Token lint** (`tokenLint.test.ts`). It walks `src/**` (`.ts`/`.tsx`/`.css`, skipping test files and `src/generated`), strips comments with a string-aware stripper (guard: ≥ 60 % of the code is kept, and the layout's function survives), and flags a hex in a colour context or an `rgb()`/`hsl()`/`oklch()` literal.
  - Allow-list: `globals.css`, `src/app/api/export/`, `src/lib/mail/`, and the layout's two `themeColor` lines by exact pattern. A liveness case checks each entry still excuses something.
  - Fixture cases cover `[--focus-ring:#fff]`, `stroke="#fff"`, 8-digit hex, `rgb()`/`rgba()`/`hsl()`. They also check that anchors such as `href="#add-entry"`, URLs and comments are not flagged.
  - Mutations: a hex in `AuthCard` (scratch tree) → "finds no hard-coded colour" failed · `src/lib/mail/` removed from the allow-list → whole-tree + "whole files only under the listed paths" failed · layout pattern narrowed to light only → whole-tree, liveness, themeColor cases failed · `//` comments no longer stripped → whole-tree + "does not flag // white on #004d26" failed · stripper blanking → the guard case + every "flags" case failed.
- **Theme logic** (`theme.test.ts`, `themeToggle.test.ts`). Mutations T1–T11, each failing exactly its case:
  - T1 cycle reversed · T2 unknown → "system" (also kills the wrapper's null cases)
  - T3 `Secure` dropped · T4 system writes `data-theme` · T5 the click skips localStorage
  - T6 no cookie + stored choice not rewritten · T7 cookie present but localStorage not updated
  - T8 the layout spread removed (source check) · T9 the wrapper passes "system" for no cookie
  - T10 a 36 px button · T11 `HttpOnly` added
- **CSS** (`themeCss.test.ts`, `themeContrast.test.ts`). The T1 mutations M1–M10 still hold. New ones: P1 `PALETTE.amber` → blue token → "amber keeps its light value" failed · P1b `PALETTE.grey` back to a hex → palette case + token lint failed · P2 dark `--page-blend: normal` → girih case failed · P3/P5 wordmark `loading="lazy"` / `wordmark-light` class removed → wordmark case failed · P4 dark `--wordmark-dark: none` → wordmark case failed · on-gold light #fff → new-token + light on-gold cases failed; on-gold dark = light ink → "on-gold on gold" failed.

### Light mode unchanged — measured, not just pinned
- **Method:** I compiled `globals.css` at `main` `3369686` and the current file with the repo's own Tailwind 4.3.3 (`@tailwindcss/node`, same candidates). Both rendered the same markup: six harness screens, with the new class names mapped back to their v1.4 names and the white wordmark removed.
- **Screenshots:** in Chromium at 390 px, light OS with no attribute, and dark OS with `data-theme="light"`. All **12/12 screenshots are byte-identical** to `main`.
- **Computed styles:** every computed property of every element (6 pages × 2 modes) matches. The only differences are the in-flight 280 ms route-fade opacity, which is timing.
- An earlier 15-pixel diff turned out to be a harness artefact: the HTML was served dark, then flipped to light, and a button's colour transition was caught mid-way.

### Dark screenshots (`progress/v15/qa/`)
- **Shots:** `theme-login-dark`, `theme-owner-dark`, `theme-ledger-dark`, `theme-form-dark`, `theme-dialog-dark` (modal open), `theme-404-dark`, `theme-owner-system-darkOS` (no attribute, OS dark), `theme-owner-dark-1280`, plus `theme-login-light` / `theme-owner-light` for comparison.
- **How they were made:** a throwaway static harness in the scratchpad. It renders real components (AppShell with the mounted toggle, StatCard, Card/Table/MoneyText/Badge, Button variants, Input/Switch, Toast, EmptyState, the real `(auth)` layout + `LoginForm`, the root `not-found`) with fake data, using `react-dom/static` and mocked `next/*`. The pages are served with the built CSS. No database, no server.
- **What they show:**
  - deep-green band with white wordmark and moon icon
  - dark cards, light-green buttons with ink labels
  - in/out tints, amber notice, badges
  - date picker in dark `color-scheme`
  - the dialog over a darker backdrop
  - white wordmark on the auth card and the 404
  - no horizontal scroll (`scrollWidth` 390)

### Final gates (T1–T4, shared tree at the end)
`tsc` 0 · vitest **133 files / 1896 tests**, all green · `npm run build` exit 0 (placeholder `DATABASE_URL`, under `.claude/build.lock`) · bundles `progress/v15/bundles-theme.json`, 55 routes: max **+5.1 KB gz** (`/owner`, mostly `home`'s wheel); auth routes +1.4–1.5 (the toggle is not on them, so that is the shared chunk); none near +40.

### Round 1 — R1-T1 (SHOULD, fixed)
- **(a) Named colours.** The token lint now also flags a CSS named or system colour (the full keyword list) given as the value of a colour prop or style key in TS/TSX: `fill`, `stroke`, `stopColor`, `color`, `backgroundColor`, `borderColor`, … whether written `="x"`, `={"x"}` or `: "x"`. `none`, `currentColor`, `transparent`, `inherit` and `var()` pass, and so do non-colour keys (`tone="green"`, `label: "white"`). Fixture cases cover each form.
  - Mutation: `LedgerArt` `fill="var(--color-white)"` → `fill="white"` (scratch tree, `TOKEN_LINT_ROOT`) → "finds no hard-coded colour" failed, naming LedgerArt.
- **(b) Palette coverage.** New case: every default-palette class used in `src/` must have its `--color-<name>-<step>` in the dark block. Classes counted: `bg`/`text`/`border(-side)`/`fill`/`stroke`/`ring(-offset)`/`outline`/`divide`/`from`/`via`/`to`/`decoration`/`accent`/`caret`/`placeholder`/`shadow`, with or without variants and opacity. `gray` (app-owned), `white` (the surface) and `black` (kept on purpose) are excluded. A guard case shows the pattern finds real steps. Nothing was missing: every step in use, including `home`'s and `nav`'s new code, already has a dark value.
  - Mutation: `bg-sky-100` added to `AuthCard` (scratch tree) → "every one is redefined in the dark block" failed with `--color-sky-100 (src/features/auth/components/AuthCard.tsx)`.
- `tokenLint.test.ts` now has 33 cases (218 lines).

### QA — D42 N4
- The button already carried `title={label}` (same text as its `aria-label`) from T2. It is now pinned: `themeToggle.test.ts` "hover title equals the accessible name" × 3 modes. Mutation: `title` removed → all 3 cases failed (restored). The cycle is unchanged (light → dark → system, §C2), still pinned by `theme.test.ts`.

### qa-tests survivors — D43 (all killed now; re-mutated the qa-tests way)
- **T01 — a click must advance the cycle.** New `src/components/chrome/themeToggleClick.test.ts` (5 cases). It stubs React's `useState`/`useEffect`, calls the component as a function and fires `onClick` against stub `window`/`document`. It checks the cycle from each state, plus the stored value, the attribute and the cookie.
  - Mutation: the click re-applies `current` → the 4 "from X a click chooses Y" cases failed.
- **T02 — `Secure` on https.** Same file: https gives `; Secure`, http gives none.
  - Mutation: `secure: false` → that case failed.
- **T13 — the literal keys.** `theme.test.ts` now pins `THEME_COOKIE` = `"theme"` and `THEME_STORAGE_KEY` = `"ui:theme"`, and the storage stub compares against the literal.
  - Mutation: key → `"theme"` → the key case + 3 storage cases failed.
- **T11 (NOTE, pinned anyway).** The layout's `themeColor` per scheme must equal `--color-topbar` light / dark (`themeCss.test.ts`).
  - Mutation: dark → `#000000` → that case failed.
- **Brittle layout test loosened.** The source is compared whitespace-free, with trailing commas dropped. The spread may be inline or go through one local assigned from `parseTheme((await cookies()).get(THEME_COOKIE)?.value)`.
  - Proof: a multi-line reformat with the local renamed → passed; the inline form → passed; reading the wrong cookie → failed.
- **Token lint** (rules moved to `tokenLint.testkit.ts`; both helpers renamed `*.testkit.ts` and skipped by the lint like tests, because their regex literals hold quote characters the comment stripper cannot see past). Each was re-mutated on `Badge.tsx:10` in a scratch tree, as qa-tests did:
  - **T06:** `_` added to the hex lookbehind → `shadow-[0_0_0_1px_#ffffff]` → "finds no hard-coded colour" failed.
  - **T07:** named colours inside arbitrary values (`fill-[white]`, `bg-[color:red]`, `[--focus-ring:white]`) → `fill-[white]` failed it.
  - **T08:** `black` colour classes are flagged unless their variant chain ends in `backdrop:` (my ruling: the only use is a modal's `backdrop:bg-black/50`, which dims the page in both themes, and the unlayered `dialog::backdrop` rule paints `--color-backdrop` over it anyway) → `text-black` failed it; `backdrop:bg-black/50` passes.
  - **T10:** `drop-shadow`, `text-shadow`, `inset-ring` and `inset-shadow` are added to the palette-coverage utilities (compound names first, with a guard case) → `drop-shadow-sky-100` → "every one is redefined in the dark block" failed.
  - **T09 (NOTE):** `color-mix(` is flagged in TS too.
- New fixtures: 9 "flags" + 3 "does not flag". `tokenLint.test.ts` now has 45 cases.

### Reviewer round 4 — R4-T1 (SHOULD, fixed)
- The lint skips `*.testkit.ts`, so `tokenLint.test.ts` now closes that hatch by name with two cases.
- **(a) Only the two helpers may exist.** `src/lib/themeCss.testkit.ts` and `src/lib/tokenLint.testkit.ts` are an explicit list; any `*.testkit.*` file elsewhere in `src` fails.
  - Mutation: `src/components/sneaky.testkit.ts` holding `"#fff"` (scratch tree, `TOKEN_LINT_ROOT`) → "the only *.testkit files under src are the two theme helpers" failed. The hex itself was skipped, which is the hole this case closes.
- **(b) No app file may import a testkit.** Static `from`, dynamic `import()` and `require()` all count; two fixture lines check the matcher.
  - Mutation: `Badge.tsx` importing `@/lib/tokenLint.testkit` (scratch tree) → "no non-test file imports a .testkit module" failed.
- `tokenLint.test.ts` now has 47 cases.

## For nav — mounting the toggle (T2)
- Import: `import { ThemeToggle } from "./ThemeToggle";` (in `src/components/chrome/TopBar.tsx`; full path `@/components/chrome/ThemeToggle`).
- Element: `<ThemeToggle />` — **no props**. It is an async server component (reads the `theme` cookie) rendering the client `ThemeToggleButton`; TopBar and AppShell are server components, so it mounts directly. Do not import `ThemeToggleButton` yourself.
- It is a 44 × 44 icon button, `text-on-topbar hover:bg-topbar-dark`, with its own `aria-label` («المظهر: فاتح/داكن/حسب الجهاز»). Suggested place: just before the account link, in the same row as the other top-bar buttons.

## In progress
- Task: none — T1–T4 and the follow-up (F1, F2) done; reported to the lead.
- Next action: reviewer findings, if any.

## Gotchas I found
- Tailwind 4.3 compiles `color-scheme` with lightningcss into `--lightningcss-light/dark` helper vars — harmless.
- `npm run build` type-checks the whole shared tree: at T1 time it stopped on `nav`'s in-flight tests (`reportsTab.test.ts:114`, `shell.test.ts:49`) and once on a file `home` had just deleted; the CSS compiled (`✓ Compiled successfully`) and the emitted CSS was checked (`.bg-white{background-color:var(--color-white)}`, both dark blocks, wheel keyframes).
- Buttons have a colour transition, so a page served in one theme and flipped by script animates its colours for ~150 ms. The real toggle does this on purpose; for screenshots or diffs, serve the HTML with the attribute already set.
- A colour declared only in `@theme` is emitted only when a utility uses it; `@theme static` emits it always. `var(--color-gold)` written in a `.tsx` attribute does not count as a use, hence the static block for the new tokens.
- `react-dom/static` `prerenderToNodeStream` renders async server components (the ThemeToggle wrapper) in a plain vitest run; `renderToStaticMarkup` cannot.

## Questions / requests sent to lead
- Decision request: `white` = surface in dark + `text-on-accent` (deep ink in dark) on fills + deep-green top bar with white (above). → accepted as D36.
- `--color-on-gold` was added at `home`'s request (their D40 / R1-H3); its light value is a new token (#171717 = gray-900 light), so it changes no existing pixel.
- The test-only helpers are now `src/lib/themeCss.testkit.ts` (block parser, comment stripper, contrast) and `src/lib/tokenLint.testkit.ts` (lint rules). They live in `src/lib/**`, the lead's area by CLAUDE.md; tell me if you want them moved.

## Follow-up (D45, D46 — the user's rulings 1 and 2, 2026-10-12)

### Tasks
- **F1 — two-state toggle (D45).** `src/lib/theme.ts`: `nextTheme` retired; new `explicitTheme` (a stored or cookie `system` → no choice), `shownTheme(choice, deviceDark)`, `toggleTheme(shown)` (the opposite of what is shown), and `themeFromCookies` (the client reads `document.cookie`). `chooseTheme` and `themeCookie` take only light/dark. `reconcileTheme` returns `ThemeMode | null`; null means follow the device. These are unchanged: `parseTheme`, `htmlThemeAttrs`, the cookie/`ui:theme` format, the layout and the dark CSS blocks.
- New `src/components/chrome/ThemeToggleState.ts` holds the browser glue both controls share:
  - `browserEnv` and `deviceIsDark()` (matchMedia);
  - `useThemeChoice`: on mount it reconciles from `document.cookie` and reads the device, then follows OS changes;
  - a `ui:theme-change` window event, so a choice made in one control reaches the other (they never show at once; this matters on resize past 480 px).
- `ThemeToggleButton.tsx`:
  - It draws both icons (sun `.theme-light-only`, moon `.theme-dark-only`). Two new rules in `globals.css` switch them with the wordmark's `--wordmark-light/dark` variables, so the first paint is right before hydration, whether the choice comes from the cookie or from "system".
  - `aria-label` and `title` name the **action** (`t.theme.toDark` / `toLight`). This happens at once for a stored choice, or after mount from the device.
  - Before mount, with no choice, there is no aria-label and no title. Two CSS-picked `sr-only` texts name the button instead.
  - The button carries `max-[480px]:hidden` (`THEME_TOGGLE_CLASS`).
- **F2 — placement (D46).**
  - New `ThemeSegmented.tsx`: the «المظهر» row. It is `role="group"`, labelled by its span, with two buttons فاتح / داكن. Each has `aria-pressed` and is 44 × 64 px. The active one is `bg-accent text-on-accent`. The row carries `min-[480px]:hidden`.
  - Before mount neither segment is pressed. After mount the pressed one is what the page shows.
  - It is mounted as the first row of `MoreSheet` (after the title bar, before the tiles), and under the h1 on `/staff/account` and `/admin/account`. The owner's «حسابي» does not get it.
  - `TopBar.tsx`: D37 is removed (`ESTABLISHMENT_NAME_TEXT` and `max-[375px]:*` are gone). The name is plain text in its `flex-1` box again.

### Tests (all new or rewritten; mutations run in-tree with a cp backup restored at once, scripted)
- Test files:
  - `src/lib/theme.test.ts`: the two-state toggle, `shownTheme`, `explicitTheme`, `themeFromCookies` (8 cases), and reconcile with `system`.
  - `themeToggle.test.ts`: labels, first paint, both icons, the CSS switch, the 480 px class, and the ThemeSegmented markup.
  - `themeToggleClick.test.ts`: taps, `Secure`, segment presses, the pressed state, mount and sync. It is rewritten with stubbed hooks.
  - New `themePlaces.test.ts`: the «المزيد» first row and the staff/admin «حسابي».
  - `shell.test.ts`: the D37 describe is replaced by a D46 one, and the D36 regex no longer expects the name's `<span>`.
- Mutations (→ failing cases):
  - M1 `toggleTheme` returns `shown` → 13 failed, among them every "first tap stores the opposite" and "repeat taps flip" case.
  - M2 the first tap ignores the device (`shownTheme(choice, false)`) → 2 failed: the device-dark cases, from null and from "system".
  - M3a reconcile takes a "system" cookie as a choice → 2 failed: "a stored system … is no choice", and "on mount with a system cookie".
  - M3b the button reads a "system" cookie as light → 2 failed.
  - M4 the label names the current mode, not the action → 4 failed.
  - M4b `title` removed → 3 failed.
  - M5 `max-[480px]:hidden` removed → "hidden below 480 px only" failed.
  - M6 `max-[375px]:border-s-0` restored → the D46 name case failed.
  - M6b the `max-[375px]:sr-only` span restored → 3 failed.
  - M7 the sheet row moved after the tiles → 2 failed.
  - M8 / M8b the row removed from staff / admin «حسابي» → that role's case failed.
  - M9 a segment press toggles instead of storing → both "pressing «داكن»/«فاتح» stores …" cases failed.
  - M10 `min-[480px]:hidden` removed → "shows only below 480 px" failed.
  - M11 `aria-pressed` removed → 3 failed.
  - M11b the pressed state ignores the device → 2 failed.
  - M12 `.theme-dark-only` reads `--wordmark-light` → the CSS-switch case failed.
  - M13 no `ui:theme-change` listener → the mount/sync case failed.
  - M14 mount ignores `document.cookie` → the mount case failed.
  - M15 the cookie lookup matches `xtheme=` → it first survived; I added the case `xtheme=light; theme=dark → dark`, which kills it.

### Gates
`tsc` 0 · vitest **138 files / 2016 tests**, all green (shared tree, with `home`'s in-flight work) · `npm run build` exit 0 (placeholder `DATABASE_URL`, under `.claude/build.lock`) · bundles `progress/v15/bundles-followup-theme.json`, 55 routes: max **+6.2 KB gz** vs `bundle-baseline.json` (`/owner`). Against `bundles-release.json` it is at most **+0.7 KB** (owner routes, the shared chrome chunk) and +0.6 on staff/admin «حسابي»; auth is +0.0.

### Screenshots (`progress/v15/qa/followup-*.png`, static harness: real AppShell/TopBar/MoreSheet/staff account page rendered with `react-dom/static`, built CSS, the post-mount state)
- `followup-topbar-{375,390,480}-{light,dark}.png`. Below 480 px the button is hidden (`display: none`) and the name gets 99 px at 375 and 114 px at 390. Before, it got about 62 px (D42 N10). At 480 px the button shows.
- `followup-more-{375,390,480}-{light,dark}.png`. Below 480 px the row is first in the sheet with segments of 44 × 64 px. At 480 px the row is `display: none`.
- `followup-staff-account-390-{light,dark}.png`.

### Open questions
- Icon: the button shows the **current** scheme (sun in light, moon in dark), as in v1.5. The label names the action. Tell me if you want the icon to show the target instead.
- With no stored choice, before hydration (a split second) no segment is pressed. The server cannot know the device's scheme.

### D50 — the icon shows the target (lead's ruling)
- `ThemeToggleButton.tsx`: the moon now carries `theme-light-only` (shown while light is on screen) and the sun `theme-dark-only`, matching the action label. CSS unchanged.
- Test: `themeToggle.test.ts` "the icon shows the target, like the label (D50)" × light/dark/null identifies each icon by its shape, not order. Mutation: old mapping restored → all 3 cases failed (restored).
- Gates: `tsc` 0 · vitest 138 files / 2019 tests · build 0 · bundles re-measured into `bundles-followup-theme.json`. `followup-topbar-*` (and `followup-more-*`, `followup-staff-account-*`) re-shot: moon at 480 light, sun at 480 dark.

### Follow-up review (reviewer F-S1, F-N1, F-N2)
- **F-S1 (SHOULD, test only).** The `matchMedia` stub in `themeToggleClick.test.ts` now records its `change` handler, and its `matches` is live like a real MediaQueryList. A new case mounts the button with the device light, flips the device to dark and calls the handler. The last state must then be `true`, and after cleanup the handler must be gone.
  - Mutation: deleting `media?.addEventListener("change", onDevice)` → the new case failed.
  - Mutation: deleting `media?.removeEventListener(...)` → the same case failed.
- **F-N1.**
  - `ThemeSegmented` now takes an optional `choice`.
  - New `src/components/chrome/ThemeSegmentedServer.tsx`, an async wrapper that reads the `theme` cookie the way ThemeToggle does. The staff and admin «حسابي» pages mount it, so a stored light/dark choice is already pressed at SSR.
  - With no cookie, or a `system` one, neither segment is pressed until mount (D50).
  - «المزيد» is a client component, closed at hydration, so it keeps reading the cookie on mount (threading the prop would mean editing nav's RoleNav).
  - Test: `themePlaces.test.ts` renders with `react-dom/static` and checks the pressed state for the cookies dark, light, system and none, on both pages.
  - Mutation: the wrapper drops `choice` → the dark and light cases failed.
  - Mutation: the client ignores the prop → the same 2 cases failed.
  - Equivalent mutation: passing a raw `system` through unchanged survives. It is equivalent because a shown "system" matches neither segment, so nothing is pressed either way, and mount reconciles it to no choice.
- **F-N2.** The `globals.css` comment above `.theme-light-only` now says the icon names the target (D50).
- Gates: `tsc` 0 · vitest 138 files / 2024 tests · build 0 (under the lock) · bundles re-measured, max +6.2 KB gz vs baseline (`/owner`).

## D52 — category palette (the user's ruling, 2026-10-12)

### How the six were chosen
- **Families:** petrol, plum, teal, indigo, clay and slate. Each family's light/dark pair keeps one hue and saturation; only the lightness differs.
- **Search:** a scripted search in the scratchpad, using CIEDE2000 validated against Sharma's reference pairs.
  - Order and lightness were chosen to maximise the smallest neighbour ΔE around the ring, in both themes at once.
  - Hard limits: ΔE ≥ 18 from every semantic colour (a margin over the rule's 15); 3.3–9:1 on the card; chroma ≤ 55 (no neon); slate chroma ≤ 12.
  - Tie-break: the all-pairs minimum.
- **Result:** the smallest neighbour ΔE is 30.5. Every pair, neighbours or not, is ≥ 20.6 apart (light) and ≥ 22.5 (dark).

### Measured table (card: light `#ffffff`, dark `--color-white` `#172019`; semantic set: accent, money-in, money-out, gold in each theme)
| token | family | light | dark | nearest semantic ΔE (light / dark) | ΔE to next, contrast (light / dark) | card contrast (light / dark) |
|---|---|---|---|---|---|---|
| cat-1 | petrol | `#2298c3` | `#6cc5e5` | money-in 40.7 / money-in 33.7 | → cat-2: 54.1, 1.77:1 / 48.8, 1.62:1 | 3.31:1 / 8.56:1 |
| cat-2 | plum | `#a63f73` | `#cb76a1` | money-out 23.9 / money-out 19.6 | → cat-3: 52.2, 1.64:1 / 46.6, 1.55:1 | 5.87:1 / 5.29:1 |
| cat-3 | teal | `#20978a` | `#1b7e73` | money-in 18.7 / accent 20.2 | → cat-4: 36.4, 1.40:1 / 36.9, 2.37:1 | 3.59:1 / 3.40:1 |
| cat-4 | indigo | `#6865bd` | `#b2b0dd` | money-out 40.3 / money-out 29.7 | → cat-5: 45.6, 1.26:1 / 38.9, 1.55:1 | 5.02:1 / 8.07:1 |
| cat-5 | clay | `#ac7339` | `#c18244` | gold 19.0 / gold 19.0 | → cat-6: 31.4, 1.96:1 / 30.8, 1.56:1 | 3.99:1 / 5.21:1 |
| cat-6 | slate («أخرى») | `#4f5259` | `#6c6f7a` | accent 27.3 / accent 32.5 | → cat-1: 30.5, 2.37:1 / 31.6, 2.57:1 | 7.83:1 / 3.34:1 |

Every neighbour pair is ΔE ≥ 30, so the "contrast ≥ 1.3:1 or ΔE ≥ 30" rule holds through ΔE even where the contrast is 1.26:1 (cat-4 → cat-5, light). Chroma C*: slate 5 (light) / 7 (dark); the other five are 24–52.

### Code
- `globals.css`: `--color-cat-1…6` are in `@theme static` (light) and in both dark blocks.
- `visualPalette.ts`: `PALETTE.cat1…cat6`.
- `categoryColours.ts`: `CATEGORY_COLOURS` is cat1…cat5. The new `OTHER_COLOUR` is cat6, used for «أخرى» and any rank past five.
- Light mode changes only on the donut and ring 2. `LIGHT_AT_MAIN` (every pre-existing token) still passes. The six new light values are added to `LIGHT_NEW` with a D52 comment.
- `themeContrast`'s `PALETTE_AT_MAIN` now excludes the `cat*` keys; their pins live in the new test.
- The project ring (`CategoryRing.tsx`) is unchanged: it is outside D52.

### Tests
- **New `src/lib/categoryPalette.test.ts`** (34 cases):
  - Sharma reference pairs, ×6 in both argument orders;
  - the light and dark values are pinned, and the system dark block matches the explicit one;
  - `PALETTE.cat*` read the cat tokens;
  - the donut and the wheel import `categoryColour`;
  - in each theme: no category colour equals, or is within ΔE 15 of, accent, money-in, money-out or gold; each neighbour pair (6–1 included) is ΔE ≥ 20 and has contrast ≥ 1.3 or ΔE ≥ 30; each colour is ≥ 3:1 on the card; cat-6 has the lowest chroma.
- **Maths:** `deltaE2000`, `deltaE2000Lab` and `chromaOf` are in `src/lib/themeCss.testkit.ts`.
- **`wheelFollowup.test.ts` updated:**
  - order pin: cat1…cat5, then cat6;
  - «أخرى» and past-five are cat6;
  - new: no ring-2 or donut colour is a semantic PALETTE entry;
  - the arcs-stroked case now checks all six cat colours.

### Mutations (scripted, cp backup restored at once)
| # | Mutation | Cases that failed |
|---|---|---|
| P1 | light cat-3 set to money-in | pins, exclusion vs money-in and vs accent, `LIGHT_NEW` |
| P2 | dark cat-5 set to `#c9a64a` (within ΔE 15 of gold) | exclusion vs gold (dark), dark pins, system-block pin |
| P3 | dark cat-2 set to `#6cb5e5` (next to cat-1) | dark "cat-1 reads apart from the next one", pins |
| P4 | light cat-6 set to `#a0a3aa` (< 3:1) | "cat-6 is ≥ 3:1 on the card" (light), pins |
| P5 | light cat-6 set to `#7a4f8a` (saturated) | "«أخرى» (cat-6) is the most neutral" (light), pins |
| P6 | light cat-6 set to `#3f8aa8` (too close to cat-1) | light "cat-6 reads apart from the next one", pins |
| P7 | `OTHER_COLOUR` set to cat5 | 3 `wheelFollowup` cases |
| P8 | `CATEGORY_COLOURS` back to the v1.3 colours | 4 cases, including "no category colour is a semantic one" |
| P9 | ring 2 shifted one rank off the donut | 4 cases, including "for each rank ring 2's colour is the donut's" |
| P10 | `PALETTE.cat1` reads cat-2 | the PALETTE case, the order case |
| P11 | the ΔE rotation term (Rt) dropped | the 2 Sharma pairs that exercise it |

### Gates
- `tsc` 0.
- vitest: 139 files / 2072 tests.
- Build exit 0 (placeholder `DATABASE_URL`, under `.claude/build.lock`).
- Bundles: `progress/v15/bundles-d52-theme.json`. Max +6.2 KB gz vs baseline (`/owner`); ±0.0 vs `bundles-followup-theme.json`.

### Screenshot
`progress/v15/qa/d52-home-390-{light,dark}.png`: the real `WheelCard` and `ExpenseDonut`, bundled client-side with esbuild in the scratchpad and served with the built CSS. They use reduced motion (the end state) and the fixture from `wheelFollowup.test.ts`. Ring 2, row 2's swatches and the donut show the same six colours in the same order, and none of them reads as the in/out/accent/gold of rings 1 and 3.

### Note for home
`ExpenseDonut.tsx`'s comment (line 28) still says «أخرى» is "always grey". It is now cat-6 slate. That is `home`'s file, so I left it.

### D52 review (reviewer D52-S1, N2, N3)
- **D52-S1.** The ruling extends the neighbour rule to the consecutive pairs plus (1, k) for k = 2…6: without «أخرى» the ring closes on rank k → 1. Two pairs failed it: light cat-1/cat-3 (ΔE 20.6, 1.08:1) and dark cat-1/cat-4 (ΔE 23.4, 1.06:1).
  - I searched for the smallest change (one colour per theme; hue/saturation/lightness perturbations) that keeps every D52 rule and keeps ΔE ≥ 18 from the semantic colours.
  - Light cat-3 `#20978a` → **`#127c78`** (teal, darker; ΔE 10.2 from the old value).
  - Dark cat-4 `#b2b0dd` → **`#989ac7`** (indigo, a little darker; ΔE 6.8).
  - Nothing else moved.
  - Getting ΔE ≥ 22 on light 1–3 would have needed ΔE 19 of change to the teal, so I kept the minimal fix: 20.4 at 1.52:1, which meets the rule on contrast.
- **Test.** `categoryPalette.test.ts` checks `NEIGHBOURS` = 1–2 … 5–6, 6–1, and 1–3 / 1–4 / 1–5. A coverage case pins that exact pair set.
  - Mutation S1a: light cat-3 back to `#20978a` → "light theme cat-1 and cat-3 read apart" failed (plus the pin).
  - Mutation S1b: dark cat-4 back to `#b2b0dd` → "dark theme cat-1 and cat-4 read apart" failed (plus the pins).
  - Mutation S1c: the 1–k pairs dropped from the test → both coverage cases failed.
- **N2.** The one-function check now runs on whitespace-free source. It accepts any import shape that names `categoryColour` from `…/categoryColours` and requires a call.
  - Proof: a multi-line import passes.
  - Mutation: the donut stops calling the function → the case failed.
- **N3.** Sharma rows 9–15 (the hue wrap at 180°) are added, both argument orders.
  - Mutation: the mean hue never wraps → rows 11, 12, 15 (and row 17) failed.
  - Mutation: Δh never wraps → row 17 failed.
  - Equivalent mutation: forcing the +360 branch survives because the T terms are periodic and hb ≈ 90° or 450° sits far from 275° in the rotation term.

#### Updated table (supersedes the one above)
| token | family | light | dark | nearest semantic ΔE (light / dark) | ΔE to next, contrast (light / dark) | card contrast (light / dark) |
|---|---|---|---|---|---|---|
| cat-1 | petrol | `#2298c3` | `#6cc5e5` | money-in 40.7 / money-in 33.7 | → cat-2: 54.1, 1.77:1 / 48.8, 1.62:1 | 3.31:1 / 8.56:1 |
| cat-2 | plum | `#a63f73` | `#cb76a1` | money-out 23.9 / money-out 19.6 | → cat-3: 47.4, 1.17:1 / 46.6, 1.55:1 | 5.87:1 / 5.29:1 |
| cat-3 | teal | `#127c78` | `#1b7e73` | accent 18.6 / accent 20.2 | → cat-4: 31.9, 1.00:1 / 32.8, 1.82:1 | 5.02:1 / 3.40:1 |
| cat-4 | indigo | `#6865bd` | `#989ac7` | money-out 40.3 / money-out 30.4 | → cat-5: 45.6, 1.26:1 / 37.9, 1.19:1 | 5.02:1 / 6.19:1 |
| cat-5 | clay | `#ac7339` | `#c18244` | gold 19.0 / gold 19.0 | → cat-6: 31.4, 1.96:1 / 30.8, 1.56:1 | 3.99:1 / 5.21:1 |
| cat-6 | slate («أخرى») | `#4f5259` | `#6c6f7a` | accent 27.3 / accent 32.5 | → cat-1: 30.5, 2.37:1 / 31.6, 2.57:1 | 7.83:1 / 3.34:1 |

| pair (the ring closes on rank k → 1) | light ΔE, contrast | dark ΔE, contrast |
|---|---|---|
| cat-1 / cat-2 | 54.1, 1.77:1 | 48.8, 1.62:1 |
| cat-1 / cat-3 | 20.4, 1.52:1 | 29.1, 2.51:1 |
| cat-1 / cat-4 | 25.3, 1.52:1 | 23.4, 1.38:1 |
| cat-1 / cat-5 | 44.2, 1.21:1 | 43.8, 1.64:1 |
| cat-1 / cat-6 | 30.5, 2.37:1 | 31.6, 2.57:1 |

- Every pair the rule names passes: ΔE ≥ 20, and contrast ≥ 1.3:1 or ΔE ≥ 30.
- Any two of the six (any pair) are ≥ ΔE 20.4 apart in light and ≥ 20.2 in dark.
- Chroma C*: light 35 / 48 / 29 / 52 / 44 / **5**; dark 30 / 40 / 30 / 25 / 46 / **7**. Slate stays the most neutral.

Gates:
- `tsc` 0; vitest 139 files / 2087 tests.
- Build exit 0 (under `.claude/build.lock`).
- Bundles `bundles-d52-theme.json`: max +6.2 KB gz vs baseline (`/owner`), unchanged.
- `d52-home-390-{light,dark}.png` re-shot.
