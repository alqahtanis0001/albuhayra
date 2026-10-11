# progress/words.md — v1.4 part 3 (`words`: i18n values, subtitles, helper lines, empty states)

Brief: `progress/v14/brief-p3-words.md`; spec `docs/V14-SPEC.md` D29–D31. Only `words` writes here.

## Files I own
`src/i18n/*.ts` values; `src/i18n/v14Part3Wording.test.ts` (new); literal-pin lines in `nav.test.ts` / `partyQuick.test.ts` / `aging.test.ts` / `instalmentWording.test.ts` / `src/features/admin/*.test.ts`; `src/features/admin/actions.ts` `DEFAULT_CATEGORIES` only; subtitle/helper/empty-state JSX in `owner/dues/page.tsx`, `owner/plans/(list)/page.tsx`, `owner/settings/locks/page.tsx`, `StaffTab.tsx`, `DirectionToggle.tsx`, `OwnerStatCards.tsx`, `LockBadge.tsx`; tests beside them.

## Tasks completed
| Task | Files touched | Build/tests pass | Notes for others |
|---|---|---|---|
| W1 | `src/components/chrome/nav.test.ts` (rows read through `t.addSheet.*`, one literal pin for R1), new `src/i18n/v14Part3Wording.test.ts` (23 cases), `src/i18n/ar.v12a.ts` values `comingSoon.staffBody` / `toLogins` («دخول الموظفين») and `statement.writeOff` («إنهاء وأرشفة وشطب المتبقي — {title}» — the «أرشفة الاتفاقية» sweep caught it; export test reads through `t`) | tsc 0; vitest 94 files / 1518 green | «تطبيق» sweep allows «التطبيق» (= the app, `settings.appVersion`); «رمز الانضمام» allowed under `auth.*`, `err.*`, `signupForm.*` only |
| W2 | `src/features/admin/actions.ts` (`DEFAULT_CATEGORIES` «سداد من عميل»), `src/features/admin/admin.test.ts` (IN names pinned in order) | same | the wording test also anchors the seed row's syntax in the source (`{ nameAr: "سداد من عميل", type: "IN" }`) |

## In progress
- Task: W3–W7 (JSX + render tests)
- Where I am: W1/W2 reported to the lead
- Next action: dues page empty state, subtitles, StaffTab hint, DirectionToggle helper, net-card hint, LockBadge title

## Mutations (every rule, break → fail → restore byte-exactly)
| Rule | Mutation | Case that failed | Restored |
|---|---|---|---|
| R1 value | `quickActions.recordPayment` → «تسجيل دفعة» (ar.v12b.ts) | only `R1: the home tile and the «+» row…` (1 failed / 22 passed) | `cp` backup, `cmp` byte-exact |
| R7 seed | `DEFAULT_CATEGORIES` row → «دفعة من عميل» | `R7: «دفعة من عميل» is in no value…` (wording) and `creates the 13 default categories` (admin) | `cp` backup, `cmp` byte-exact |

## Gotchas I found
-

## Questions / requests sent to lead
-
