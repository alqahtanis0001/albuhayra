# progress/v13/people.md — v1.3 recording for `people`

## My five items (docs/V13-SPEC.md)
1. 10 — Coloured `MonthGrid` cells + legend swatches (letters kept; print plain) and a 12-month heat strip on the employee detail page
2. 11 — Live `ClockCard`: ticking clock from server time, grace ring green → amber (< 5 min) → red, check + recorded time after check-in
3. 12 — Payslip hero in `PayslipView` (net large; gross → deductions → net SVG steps; print as plain numbers)
4. 13 — `PartyStatementView` header: balance words and a balance-over-time sparkline (hidden in print)
5. 14 — Aging visual: four bucket tiles above `AgingTable` and a stacked bar per party row

Your own running notes. Only you write here. The lead merges it into PROGRESS.md at checkpoints. Keep entries short; newest at the bottom.

## Files I own
`src/features/attendance/components/**`, `src/features/employees/components/**`, `src/features/parties/components/PartyStatementView.tsx`, `src/features/reports/components/AgingTable.tsx`, related `loading.tsx` skeletons. Granted: `src/app/(owner)/owner/staff/[id]/(detail)/page.tsx`, `src/app/(owner)/owner/reports/aging/page.tsx`, `src/app/(staff)/staff/me/(home)/page.tsx` (props only); read-only additions to `attendance/mine.ts`, `attendance/queries.ts`, `reports/aging.ts`. New by request to the lead: `parties/components/statementVisual(.test).ts`, `reports/components/agingVisual(.test).ts`.

## Tasks completed
| Task | Files touched | Build/tests pass | Notes for others |
|---|---|---|---|
| 10 grid + heat strip | `attendance/components/MonthGrid.tsx`, `attendanceVisual.ts` (+test), `AttendanceHeatStrip.tsx` (new, server), `attendance/queries.ts` (+`getAttendanceYear`), `staff/[id]/(detail)/page.tsx` | typecheck ✓ vitest ✓ | New read `getAttendanceYear` = `attendanceRecord.findMany` (existing pair) |
| 11 live clock | `attendance/mine.ts` (`nowMs`, `schedule.graceMinutes`), `clockMath.ts` (+test in `attendanceVisual.test.ts`), `LiveClock.tsx` (new, client), `ClockCard.tsx` | ✓ | Staff page unchanged (ClockCard takes `self`) |
| 12 payslip hero | `employees/components/payslipSteps.ts` (+test), `PayslipHero.tsx` (new, server), `PayslipView.tsx` | ✓ | Owner + staff payslip pages both get it |
| 13 statement header | `PartyStatementView.tsx`, `parties/components/statementVisual.ts` (+test) | ✓ | Uses dash's `Sparkline` (found on disk) |
| 14 aging visual | `reports/aging.ts` (`AgingSide.counts`), `aging.test.ts` (toEqual extended with `counts` only), `AgingTable.tsx`, `reports/components/agingVisual.ts` (+test) | ✓ | No new DB call |

## In progress
- Task: items 10–14 done; the reviewer is reviewing the block
- Lead rulings (accepted): the attendance-rate denominator, the (grace + 1)-minute ring window, and leaving transit time uncorrected. The lead added and mutation-checked the scoping driver for `getAttendanceYear`.

## Decisions
- **Attendance rate** = (حاضر + متأخر + عن بُعد) ÷ (those + غائب). عطلة and إجازة are left out, and so are unrecorded days (unknown, never absent). null → «لا توجد بيانات» (white cell, «—»). A month wholly before the hire month → «قبل التعيين» (gray-50). The hire month itself counts. Heat steps: < 50% / < 75% / < 90% / ≥ 90% → `bg-heat-1..4`. The % is written in every cell, with the full counts as sr-only text and `title`; no tab stops (ruling S12).
- **Heat strip layout**: 6 columns on phones (2 rows), 12 from `sm`; oldest first in the DOM, so the oldest sits at the right (inline start).
- **Clock**: late iff HH:MM > start + grace, so a check-in is on time through the whole start + grace minute. The ring's window is start → start + grace + 1:00, i.e. (grace + 1) minutes. It is full before the start. It turns amber when fewer than 300 s are left (exactly 5:00 is still green) and fully red once late. The words show `floor(left/60)` minutes, and «أقل من دقيقة» below 60 s. The clock starts from `self.nowMs` (the server instant `getMySelf` already reads) and advances by `Date.now()` delta. It formats with `Asia/Riyadh` + `latn` and is not aria-live. No ring (`kind: none`) when `!canClock` or on a non-work day. It shows `noStart` when either the start or the grace is null (both mean "no late counted"). After check-in: a full green ring with a check and `checkedIn` holding the server-recorded `record.checkIn`. The old «سُجّل الحضور» time line was removed as a duplicate; check-out stays.
- **Clock skew**: the time the page takes to travel from the server is not corrected, so the clock can run a second or two behind. Accepted.
- **Payslip hero**: net from `slip.netHalalas`. The three steps are HTML rows (label + MoneyText, deductions with `direction="OUT"` → «−» and red), each with an SVG bar (`no-print`, `aria-hidden`). Print therefore shows plain numbers. There is no grey track, because the gross bar is grey (grey on greySoft fails). `t.payslipHero.stepsText` is unused: the rows already are the text.
- **Statement sign convention** (`statement.ts`): `balanceHalalas` + = لنا → «لنا عنده», − = علينا → «علينا له», 0 → «متسوٍّ». The header is `no-print` and is only shown when there are rows. The sparkline has one point per date (the last balance of the day) and only appears from 2 dates on. Its tone is in / out / neutral by the closing sign. Points are index-spaced, not time-spaced.
- **Aging**: `AgingSide.counts = { upTo30, upTo60, upTo90, over90, total }` counts instalments on its own side only. The tiles sit inside each side's card, above the table (`no-print`). Tile tints go `bg-tint-amber` → `bg-orange-100` → `bg-tint-out` → `bg-red-200` with gray-900 text. The bar is HTML flex spans, not SVG (logical RTL for free), `aria-hidden`, `no-print`, with the youngest bucket at the right. Segment fills are amber-500 / orange-600 / red-700 / red-900; widths come from `bucketShares` (basis points, largest remainder, sum exactly 100, zeros when empty) as an inline `width` only — tints stay classes. `agingVisual.barLabel` is unused (the bar is aria-hidden); `segment` is the hover title.

## Mutations tried (all killed)
(Rerun after `flow` reported that we shared the `/tmp/mut.bak` backup path around 18:19. I now use a private backup in my scratchpad. All 23 mutations were killed again, and every file I own was checked intact.)
attendanceRate: +LEAVE in the denominator, −REMOTE from attended, `=== 0`→`< 0`. heatStep: `< 0.5`→`<= 0.5`, `< 0.9`→`<= 0.9`. heatCells: `<`→`<=` hire month. lastMonths: off-by-one. graceLeft: window without +1, `<= 0`→`< 0` late, `< 300`→`<= 300` amber, no clamp, floor→ceil, Riyadh offset 0. payslipSteps: no clamp at 0, no scale floor 1, rounding. balanceKind: `>`→`>=`. statementPoints: no per-date merge. bucketShares: no zero guard, tie order flipped, no remainder distribution. aging counts: no total increment, both sides into one.

## Gotchas I found
- `aging.test.ts:84` is a whole-report `toEqual`, so even a sibling `AgingSide.counts` breaks it. I extended it with the two `counts` objects only; nothing was loosened.
- Skeletons were not changed. They live in `src/components/skeletons/v12b` (not mine), and the new cards (heat strip, payslip hero, statement header) only add height below or above the existing shapes.

## Questions / requests sent to lead
- Asked for the grant for `statementVisual.ts` / `agingVisual.ts` (+tests) and the `aging.test.ts` toEqual extension — **approved by the lead** (only the `counts` field added; no existing value or assertion changed). 

## Review fixes (block passed, no blockers)
- SHOULD `LiveClock`: back/forward can replay a stale server payload. At mount, if `Date.now() − serverNowMs > 60 s`, it calls `router.refresh()` once. A ref guards it: once per mount, including Strict Mode's double run; the tick is unchanged.
- NOTE `LiveClock`: the wrapper is now a `div`; `<time dateTime="HH:MM:SS">` sits on the digits only.
- NOTE statement spark summary: dates now go through `summaryDate(iso)` (statementVisual.ts, tested), which uses DateText's own formatters: "2026-09-29 (1448/04/18 هـ)".
- Recorded, not changed (lead's instruction):
  - The heat strip shows «لا توجد بيانات» for months after an end date.
  - The legend title prints.
  - The payslip deductions line shows a red «−» (MoneyText `direction="OUT"`).
  - `attendance/queries.ts` imports `lastMonths` from `components/attendanceVisual.ts` (layering only; the helper is pure).
- Process: mutations now back up to and restore from a private scratchpad copy inside one command. A reviewer's suite run earlier caught `attendanceVisual.ts` mid-mutation.
- SHOULD `LiveClock` ring: `pathLength` is dropped (older iOS Safari ignores it). The dasharray is now in real circumference units via the new `ringDash(fraction, r)` in clockMath.ts: `${round(f·2πr)} ${round(2πr)}`, clamped to 0..1 and rounded to 0.01. The start point (`rotate(-90)`, top) and direction are unchanged. It is tested, and four mutations were all killed (no clamp, gap = arc, πr, whole-unit rounding), each made and undone from a private copy in one command.
