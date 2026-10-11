# progress/words.md — v1.4 part 3 (`words`: i18n values, subtitles, helper lines, empty states)

Brief: `progress/v14/brief-p3-words.md`; spec `docs/V14-SPEC.md` D29–D31. Only `words` writes here.

## Files I own
`src/i18n/*.ts` values; `src/i18n/v14Part3Wording.test.ts` (new); literal-pin lines in `nav.test.ts` / `partyQuick.test.ts` / `aging.test.ts` / `instalmentWording.test.ts` / `src/features/admin/*.test.ts`; `src/features/admin/actions.ts` `DEFAULT_CATEGORIES` only; subtitle/helper/empty-state JSX in `owner/dues/page.tsx`, `owner/plans/(list)/page.tsx`, `owner/settings/locks/page.tsx`, `StaffTab.tsx`, `DirectionToggle.tsx`, `OwnerStatCards.tsx`, `LockBadge.tsx`; tests beside them.

## Tasks completed
| Task | Files touched | Build/tests pass | Notes for others |
|---|---|---|---|
| W1 | `src/components/chrome/nav.test.ts` (rows read through `t.addSheet.*`, one literal pin for R1), new `src/i18n/v14Part3Wording.test.ts` (23 cases), `src/i18n/ar.v12a.ts` values `comingSoon.staffBody` / `toLogins` («دخول الموظفين») and `statement.writeOff` («إنهاء وأرشفة وشطب المتبقي — {title}» — the «أرشفة الاتفاقية» sweep caught it; export test reads through `t`) | tsc 0; vitest 94 files / 1518 green | «تطبيق» sweep allows «التطبيق» (= the app, `settings.appVersion`); «رمز الانضمام» allowed under `auth.*`, `err.*`, `signupForm.*` only |
| W3 | `src/app/(owner)/owner/dues/page.tsx` (subtitle under the h1; the empty week gets `hint={t.dues.emptyIntro}` + two 44 px links, stacked on phones, `no-print`), new `duesPage.test.ts` beside it | green | overdue card's empty text unchanged |
| W4 | `plans/(list)/page.tsx` (subtitle under the h1, outside the pick banner), `settings/locks/page.tsx` (subtitle under the h1; `locksHint` stays in the card), new `plansListPage.test.ts`, one **appended** `describe` in `settingsPages.test.ts` (D32 S1) | green | |
| W5 | `StaffTab.tsx` (`LinkLoginHint`: one key, split at render time around `t.navItem.staffList`, link to `/owner/staff`, shown once as the first `<li>` of the approved card, only with rows), new `StaffTab.test.ts` (href present, the word exactly once inside `<a>`, none without rows) | green | row controls stubbed in the test — `flows` edits them |
| W6 | `DirectionToggle.tsx` (`<p id="direction-help">` under the pair, `aria-describedby` on the fieldset), new `directionToggle.test.ts` | green | fixed id: one toggle per form |
| W7 | `OwnerStatCards.tsx` (`hint` on «الصافي» only), `LockBadge.tsx` (`title` both arms; owner arm also writes the line beside the link), new `OwnerStatCards.test.ts`, `LockBadge.test.ts`; `ledgerRows.test.ts` two pins tightened (see Gotchas) | green | |
| R1 S1 (reviewer) | `LockBadge.tsx`: the owner's written line gets `no-print` (the link beside it already had it — with the new owner-ledger print it would print on every locked row); `LockBadge.test.ts` pins the span's class; `StaffTab.test.ts` escapes the RegExp built from the i18n value (reviewer note) | `LockBadge.test.ts` + `StaffTab.test.ts`: 6/6 green; mutation killed. `tsc` on the shared tree: 2 errors, both in `flows`' in-flight `reportFilters.test.ts:56` / `staffRowActions.test.ts:52`, none in my files | |
| W8 | values: tanween on `settings.regenerateConfirm` «فورًا», `err.tooLong/establishmentNameShort/establishmentNameLong/rangeTooLong/amountTooLarge` «جدًا» (no test pinned them literally); every D29 bold string equals its value (pinned) | tsc 0; vitest 107 files / 1549; build + bundles below | |
| W2 | `src/features/admin/actions.ts` (`DEFAULT_CATEGORIES` «سداد من عميل»), `src/features/admin/admin.test.ts` (IN names pinned in order) | same | the wording test also anchors the seed row's syntax in the source (`{ nameAr: "سداد من عميل", type: "IN" }`) |

## In progress
- Task: none — W1–W8 done.
- Gates on the final shared tree: `tsc` 0; vitest 107 files / 1549 tests; `npm run build` exit 0 (lock held, no retry needed), 55 routes; `progress/v14/bundles-p3-words.json` vs baseline: every route +1.7…+8.3 KB gz (the i18n values grow every route by ~3.3 KB; the larger deltas are on the entry/plan forms, which are `flows`' client work in the same tree), max +8.3 on `/staff/transactions/*`, none over +40.

## Mutations (every rule, break → fail → restore byte-exactly)
| Rule | Mutation | Case that failed | Restored |
|---|---|---|---|
| R1 value | `quickActions.recordPayment` → «تسجيل دفعة» (ar.v12b.ts) | only `R1: the home tile and the «+» row…` (1 failed / 22 passed) | `cp` backup, `cmp` byte-exact |
| R1 links | dues page: drop the «الجهات» link | only `empty week: …both links…` | `cp`/`cmp` |
| R16 plans | drop the subtitle `<p>` | both cases of `plansListPage.test.ts` (plain + pick mode) | `cp`/`cmp` |
| R16 locks | drop the subtitle `<p>` | only `R16 — the locks page subtitle` (re-proven after the move to an appended block) | `cp`/`cmp` |
| R5 hint | drop the hint `<li>` | only `one ACTIVE row: …` | `cp`/`cmp` |
| R2 helper | drop the helper `<p>` | only `renders the sentence under the two segments…` | `cp`/`cmp` |
| R15 net | drop `hint=` on «الصافي» | only `the net hint appears exactly once…` | `cp`/`cmp` |
| R15 badge | swap `badgeHintOwner` ↔ `badgeHintStaff` | both arms of `LockBadge.test.ts` | `cp`/`cmp` |
| R15 print | drop `no-print` from the owner line | only `owner: title + the line as text + the link` | `cp`/`cmp` |
| R7 seed | `DEFAULT_CATEGORIES` row → «دفعة من عميل» | `R7: «دفعة من عميل» is in no value…` (wording) and `creates the 13 default categories` (admin) | `cp` backup, `cmp` byte-exact |

## Gotchas I found
- **R15's text collides by substring with two older pins in `ledgerRows.test.ts`** (committed on `main`, not `flows`' in-flight work): «لا يمكن التعديل …» contains «تعديل» (`not.toContain(t.common.edit)` meant the pencil), and the staff `title` «الشهر مقفل» contains «شهر مقفل» (the badge count doubled). Tightened both to what they meant: the pencil as `>تعديل<` / an `/edit` href, the badge as `شهر مقفل</span>`. Not in my ownership list — flagged to the lead.
- `renderToStaticMarkup` splits `{prefix}<Link/>{suffix}` into separate text nodes, so a "sentence minus the word" string never exists in the markup; assert prefix + `<a …>word</a>` + suffix with one regex.
- The «تطبيق» sweep must allow «التطبيق» (= the app, `settings.appVersion`): the regex requires a non-letter before the word.
- `grep -E '\b'` does not bound Arabic words; sweep with an explicit following-character class instead.

## Questions / requests sent to lead
- W1 report sent (nav pin + wording test green; W2 done; three extra values changed — accepted by the lead in D32).
- Request: `ledgerRows.test.ts` (not in my file list) — two assertions tightened as above; please ratify or tell me to revert.
- No new key needed anywhere (the R5 link is split at render time, per D32 S6).
