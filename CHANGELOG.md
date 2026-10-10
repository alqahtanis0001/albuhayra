# Changelog — زخم

Started at v1.3. Earlier releases (v1.0 – v1.2c) are recorded in `PROGRESS.md` (*Done*, *Decisions*, *Session log*).

## v1.3 — visual pass (unreleased)
Spec: `docs/V13-SPEC.md`. No schema change, no migration, no new route, no new environment variable; no rule or stored number changed — queries only gained read-only fields (the dashboard's daily series, opening balances and month-to-date comparison, instalment states on plan rows, aging counts, a 12-month attendance read, the clock's server timestamp and grace).

### Added
- **Page backgrounds:** brand art behind the sign-in screens (the card overlaps the green band; wordmark and links moved inside the card) and behind the owner/staff/admin content column (veiled for text contrast); hidden in print.
- **Home (owner):** stat cards count up from 0; 30-day sparklines (line on الرصيد and الصافي, bars on الوارد and الصادر); momentum on «الصافي» against the same days of last month («—» when there is nothing to compare, capped at ±999%); expense donut (top 5 + «أخرى») whose slices and legend rows open the ledger filtered to that category and month (the table stays as the screen-reader and print version); a «التدفق النقدي» waterfall tab on the six-month card. Staff home: count-up on its two cards.
- **المستحقات:** a week ribbon — «متأخرة» plus one tile per day to the end of the week, each with its count and لنا/علينا totals; tapping a tile scrolls to and highlights that day's rows.
- **الاتفاقيات:** a segmented instalment bar on list cards and the plan header (paid, partial, overdue, due, upcoming); after «تسجيل دفعة» the form returns to the plan with `?paid=`, the paid row is highlighted, its segment fills and its badge fades in, and the parameter is then cleared from the address.
- **الإضافات:** budget meter coloured green → gold (≥ 80%) → red (> 100%) with amounts under the bar; a cost-by-category ring on the project page (hand-drawn SVG, not recharts).
- **Empty states:** six original line illustrations (ledger, parties, dues, projects, employees, agreements).
- **الحضور:** month grid tinted by status (letters kept; prints as letters on white); a 12-month attendance strip with the rate in each cell on the employee page.
- **حضوري:** a live clock card with a ring counting down the grace period, turning amber under 5 minutes and red once a check-in would be late; a check with the server-recorded time after check-in.
- **Payslip:** a hero card — net salary large, gross → deductions → net steps.
- **كشف الحساب:** the balance in words («لنا عنده» / «علينا له» / «متسوٍّ») with a balance-over-time sparkline.
- **أعمار المستحقات:** four bucket tiles (count + total) per side and a stacked bar per party.

### Changed
- The budget line «{spent} من {budget}» is replaced by the new meter's amounts.
- Every animation is ≤ 800 ms, ease-out, and off under reduced motion; only the live clock ticks continuously.
- `.svg` requests skip the proxy like `.png` (no sign-in redirect and no CSP header on the file; the page backgrounds are same-origin CSS images).
- The owner dashboard's loading skeleton reserves the sparkline height.
- Print: the ribbon, instalment bar, sparklines, rings and statement header are hidden; tinted cells print as plain text on white.
