# progress/v15/theme.md

Your own running notes. Only you write here. The lead merges it into PROGRESS.md at checkpoints. Keep entries short; newest at the bottom.

## Files I own
`src/app/globals.css`; `src/app/layout.tsx` (D11); `src/lib/theme.ts` (+ test); `src/components/chrome/ThemeToggle*.tsx` (+ test); `src/components/visualPalette.ts`; `src/lib/tokenLint.test.ts`; `src/lib/themeCss.test.ts` (new, the token-layer pins); `src/features/auth/components/AuthCard.tsx`, `src/app/not-found.tsx` (D33); hex → token replacements in every file not owned by `home` / `nav` (D12).

## Tasks completed
| Task | Files touched | Build/tests pass | Notes for others |
|---|---|---|---|
| T1 token layer (C1) | `src/app/globals.css`, `src/lib/themeCss.test.ts` (new, 91 cases) | tsc 0; vitest 126 files / 1794, 1 failing = `nav`'s in-flight `SalaryPickList.test.ts` (mine all green; 121 / 1734 all green earlier); build exit 0; bundles `progress/v15/bundles-theme.json` max +4.2 KB gz (`/owner`, from `home`'s in-flight code — CSS adds no JS) | token names and lists below |

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

### Dark contrast (WCAG 2.x, measured; all text pairs pinned in `themeCss.test.ts`, 83 cases)
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

Others: gray-600 / 700 / 900 on gray-200 6.96 / 8.46 / 11.64 · gray-900 on tint-in 9.98, tint-out 11.59, tint-amber 9.96, tint-blue 11.22, tint-teal 10.01, tint-grey 10.02, heat-1 12.17, heat-2 9.13, heat-3 6.73, heat-4 4.77, amber-50 11.41, orange-100 10.64, red-200 10.37, paid-static 10.72 · accent-dark on accent-line 4.82, on nav-pulse 4.94 · amber-800 on amber-50 8.34, on card 10.47 · amber-900 on amber-50 9.40 · on-accent on accent 6.35, accent-dark 8.25, money-in 8.28, money-out 7.67, red-800 9.38 · on-accent-muted on accent 5.12 · on-topbar on topbar 9.11, topbar-dark 12.79 · progress bar (#5fbf88) on topbar-dark strip 5.66. Non-text: gold on card 8.52; track on card 1.32 (a track, decorative, as the mock); accent-line border on card 1.53 (light: 1.6).

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

## In progress
- Task: T1 done; waiting for the lead's message before T2–T4.
- Where I am: reported T1.
- Next action: T2 (theme.ts, layout, ThemeToggle wrapper + button), then T3 (my own text-white/hex replacements, PALETTE → vars, girih in dark, wordmark swap), T4 (token lint, theme/SSR/toggle tests, screenshots).

## Gotchas I found
- Tailwind 4.3 compiles `color-scheme` with lightningcss into `--lightningcss-light/dark` helper vars — harmless.
- `npm run build` type-checks the whole shared tree: at T1 time it stopped on `nav`'s in-flight tests (`reportsTab.test.ts:114`, `shell.test.ts:49`) and once on a file `home` had just deleted; the CSS compiled (`✓ Compiled successfully`) and the emitted CSS was checked (`.bg-white{background-color:var(--color-white)}`, both dark blocks, wheel keyframes).

## Questions / requests sent to lead
- Decision request: `white` = surface in dark + `text-on-accent` (deep ink in dark) on fills + deep-green top bar with white (above).
