# progress/v14/ux-scout.md — recording for `ux-scout` (read-only research)

Deliverable: `docs/UX-REVIEW-v14.md` (2026-10-10). No code, no git writes, no `.env`, no DB, nothing run.

## What I read
- `CLAUDE.md`, `PROGRESS.md` (Current phase), `docs/V12-SPEC.md`, `docs/V13-SPEC.md`, `docs/V14-SPEC.md` (A/B/C, D1–D15), `docs/FRONTEND.md` (all), `docs/BACKEND.md` (headings, permission/lock lines).
- Chrome: `nav.ts`, `RoleNav.tsx`, `MoreSheet.tsx`, `(owner)/layout.tsx`, `(staff)/layout.tsx`.
- Owner home and its dashboard components; ledger list/row actions; owner/staff new + edit pages; `TransactionForm.tsx`, `LockedNotice.tsx`, `LockBadge.tsx`, `LockCell.tsx`, `JoinCodeTab.tsx`, `settingsPaths.ts`, `(index)` settings redirect, categories page.
- Parties list/detail/actions/form/bits; plans list/detail/new, `PlanForm.tsx` head, `PlanList.tsx`, `PlanActions.tsx`, `InstalmentList.tsx` (links only); dues page + `DueList.tsx`; employees home/detail/actions/profile, `EmployeeForm.tsx` (sections); attendance page; staff home, `StaffDuesCard.tsx`, `/staff/me`; `pending/page.tsx`; admin requests page; `src/lib/auth.ts`, `permissions.ts`.
- All six i18n files; `progress/v14/reviewer.md`, `brief-common/cats/add/plans.md`, `add.md`, `cats.md` (head).

## Sources tried and what failed
- `WebFetch` fails in this sandbox for every host (DNS `ENOTFOUND`); all page reads went through Firecrawl scrape (rate-limited to ~10/min, so three retry rounds).
- Verified pages: Khatabook Play listing + khatabook.com; OkCredit site + Play listing; Vyapar feature blog + Play listing; Wave account overview + categorize article; Wafeq Arabic cash-expense article + getting-started; Qoyod "نبذة", customers/suppliers KB, mobile-reports blog; Daftra mobile-app page + accounts feature page; Mezan Capterra + mezan.sa; Zoho navigating page, mobile revamp post, mobile-apps page; BNB Dafatery Play listing; «مصاريف» App Store listing.
- Failed/404: `help.wafeq.com/article/9-…` (moved), `okcredit.in/blog/what-is-okcredit-and-how-to-use-okcredit` (404), Daftra docs (`docs.daftra.com`) not reached. Mezan's own site is a marketing page with no module names; its cells are mostly n/v.
- The search engine's "Khatabook App Store" hit (`id6633420817`) is a different app (Udhar Book); discarded.
- Items marked "via search summary only" in (e) rest on the search tool's excerpt of that page, not a full read.

## Judgement calls
- Tap counts are navigation taps from الرئيسية on the phone bar; form filling, scrolling and confirm dialogs are counted only where the report says so.
- v1.4 counts assume D13's literal tab order (الرئيسية | + | السجل | المستحقات | المزيد) and B1's five rows.
- Severity: "high" = a daily owner task that ends in a dead end or needs a round trip; "medium" = adds taps, hides a function, or shows a wrong-looking number; "low" = wording or a missing link.
- Problem 2 (two «تسجيل دفعة» destinations) is reported although the user ruled it (D3/A11), because the proposed fix leaves D3 untouched.
- Suggestions marked "fits v1.4 now" ignore file ownership; several touch files no v1.4 agent owns (`PartyActions.tsx`, `ActiveProjects.tsx`, `LockedNotice.tsx`, i18n values) — the lead assigns.
- Nothing in the report proposes invoicing, VAT, attachments, bank feeds, inventory, dark mode, English, native apps or removing a function; suggestion 10 keeps every field, only folds three behind a disclosure.

## Open questions for the lead
1. May the «+» sheet gain a sixth row «اتفاقية جديدة» (B1 says "in this order", five rows)? If not, problem 3 stands as a known regression.
2. D10 keeps `listParties` untouched; is a read-only «اتفاقيات مفتوحة: المتبقي X» line on the parties list (suggestion 6) inside or outside that ruling?
3. A5 removes التصنيفات from the menu and index; is a «المزيد (…)» link visible outside edit mode (suggestion in problem 5) acceptable, or does it count as "nothing added inside/around the select"?
4. Should the unlinked-staff «+» navigate directly when the sheet would hold one row (problem 11), or is the one-row sheet accepted per A10?
5. Instalment wording «قسط» (problem 7) touches `ar.v12a.ts` values beyond the rename `add` owns — lead's file.
