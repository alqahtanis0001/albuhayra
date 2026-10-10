# Brief — `cats` (v1.4 §A: categories managed from the transaction form)

**Ready for go: YES** (reviewer pre-code findings folded in, 2026-10-10; orientation plan already in `progress/v14/cats.md` — start from it). First task on "go": T1 of your plan.

## Amendments after the pre-code review (binding; they override the text below)
- **Ownership widened (D15):** you also own the one `manageCategories` line in `src/app/(owner)/owner/transactions/new/page.tsx` and `[id]/edit/page.tsx` (`plans` adds its own line to the edit page after yours lands — tell the lead when it has), the one `scoping.test.ts:1018` expectation that pinned `createCategory → data: null`, and the tab-less fallback in `settingsPaths.ts` (D11).
- **D11:** there is no settings index page; the tab-less fallback becomes `/owner/settings/join-code`; «← الإعدادات» links to `/owner/settings` (which now lands on join-code); `?tab=categories` keeps working. Brief test 5's "index no longer lists it" becomes "`/owner/settings` no longer lands on categories".
- **D12:** `createCategory` returns `ActionResult<{ id, nameAr, type }>` on both the insert and the revive path (contract amended in `docs/BACKEND.md`). `TransactionForm.tsx` may reach 259 lines. The quick-action links are hidden in payment mode and when `originalLocked`. Test files beside the settings feature are allowed. Keep «← الإعدادات».
- **K4:** hiding the entry's own current category on the edit form keeps it listed as «(معطل)» and selected (kept-not-newly-assigned, `categoryOptions.ts`); appending **upserts by id** (a revived category may already be listed as «(معطل)»).
- **K5:** unmount the fading chip by a **200 ms timer** (at once under `useReducedMotion`), never by waiting for `animationend`.
- **K6:** the inline input has no `name`; Enter is swallowed; every new button `type="button"`; test 6 also asserts no `type="submit"` inside the quick-actions markup; `ConfirmDialog` renders inside the entry `<form>` — fine, it has no form of its own.
- **K7:** chip ✕ hit area ≥ 44 px; the last-active ✕ disabled with `errorMessage("err.lastActiveCategory")` (precedent `CategoryRowActions.tsx`).
- **K8:** `revalidatePath` for `[id]/edit` needs the route pattern + `"page"`, or revalidate the `/owner/transactions` and `/staff/transactions` layouts as you planned.
- **K9:** the wiggle is 0.3 s per half-rock (`alternate`), as the CSS now says.
- **C1:** component tests are `.ts` files using `createElement` + `renderToStaticMarkup` (yours will be the first — fine); prefer pure helpers (`categoryList.ts`) for the rules.

Read `progress/v14/brief-common.md` first. Spec: `docs/V14-SPEC.md` §A, A1–A6; Decisions D1–D15.

## You own
`src/features/transactions/components/**` — new `CategoryQuickActions.tsx`, `CategoryChips.tsx`; `TransactionForm.tsx` is **frozen** (254 lines): one mounting line and the minimum plumbing for the options list, nothing else. `src/features/settings/components/Categories*.tsx`, `src/features/settings/actions.ts` **category actions only** (`createCategory`, `updateCategory`, `setCategoryActive`, `setCategoryOrder` — do not touch join-code/staff/password actions in the same file), `src/app/(owner)/owner/settings/(index)/page.tsx`, `src/app/(owner)/owner/settings/categories/**`.
Not yours: `nav.ts` (the «التصنيفات» menu entry is removed by `add`), `src/app/(owner)/owner/transactions/new/page.tsx` and the staff pages (if the owner page must pass a prop so the component knows it is the owner, request it — or derive it from a prop `TransactionForm` already receives; check first).

## What to build
- **A1** The `<select name="categoryId">` is untouched in the DOM: same element, same options markup, same placeholder, same behaviour. The *list* it renders may be client state so A3/A4 can append/remove options; the component tree around it may change, the element may not.
- **A2** `CategoryQuickActions` (client) directly under the select, **owner only**. Staff must never receive the component — decide ownership on the **server** (the owner page passes something; the staff page passes nothing). Two text links in one row: `t.categoryQuick.add` («+ إضافة تصنيف») and `t.categoryQuick.edit` («تعديل التصنيفات»). Not a nested `<form>` (invalid HTML inside the entry form): plain buttons calling the bound server actions (`createCategory`, `setCategoryActive`) via `useTransition`/`startTransition`; they must never submit the entry form (`type="button"`, stop Enter from bubbling into the form submit).
- **A3** Inline one-line box: input (label `t.categoryQuick.name`, same zod as settings: `CategoryInputSchema.nameAr`, 2–60 chars — validate client-side with the same schema, server re-validates), `t.common.save`, `t.common.cancel`. Type = the form's **current direction** (the DirectionToggle's value — read it from the form state, not the DOM). On success: append `{ id, nameAr }` to the current direction's options, select it, close the box, toast `t.categoryQuick.added` (use the existing `Toast`/`FormToast`). Errors (`err.*` → `errorMessage`) under the box. Remember `createCategory` reactivates a matching inactive category instead of inserting (Decision) — the returned row is what you append, whatever its origin.
- **A4** Edit mode: chips of the current direction's active categories (`CategoryChips`), wiggle via `.v14-wiggle` from `globals.css` (lead adds it: ±1.5°, 0.3 s, static under reduced motion), each with a ✕ (`aria-label` = `t.categoryQuick.hide` with `{name}`). ✕ → `ConfirmDialog` with `t.categoryQuick.hideConfirm` (`{name}` filled) → `setCategoryActive(id, false)`. On success: chip leaves with a 200 ms fade (`.v14-fade-out`, static under reduced motion), option removed from the select, selection reset to the placeholder if it was that one. A direction's **last active category** cannot be hidden — the existing action refuses (`t.err.lastActiveCategory`, check the exact key); disable that chip's ✕ with the reason as its title/sr text rather than letting the dialog fail. Last row: `t.categoryQuick.done` button (exits edit mode) and the link `t.categoryQuick.more` → `/owner/settings/categories`. Edit mode never submits the form.
- **A5** `/owner/settings/categories` keeps list/add/rename/activate/deactivate/move up/down exactly. Remove its card from the settings index page; the route stays; `settingsRedirectPath` (`settingsPaths.ts`) stays as is (old bookmarks must keep working). Add at the top: back link `t.categoriesPage.back` → `/owner/settings` and the hint `t.categoriesPage.hint`.
- **Revalidation**: after add/hide, the next server render of the entry form must show the new list — check the category actions' `revalidatePath` set and add the entry-form paths (`/owner/transactions/new`, `[id]/edit`, and the staff ones) if missing.
- **Print**: nothing of yours renders in print (`no-print` on the links, box and chips) — the entry form is not printed anyway, but pin it with a class.

## Tests (A6 + the rules above; each mutation-proven)
1. Staff render of the form contains no quick-action link (mutation: make the owner check always true / flip it — the staff case must fail).
2. Adding a category: the returned row is appended to the options of the **current direction only** and becomes the selected value (mutation: append to both directions → fails; don't select → fails).
3. Hiding: the option disappears; a selected one resets the value to `""`; an entry whose category was hidden still shows its name in the ledger and its edit form still accepts the existing inactive category (existing behaviour — pin it: `updateTransaction` keeps an unchanged inactive category).
4. The last active category of a direction cannot be hidden from the chips (control disabled) and the action still refuses it.
5. `/owner/settings/categories` renders for the owner (page-level test with mocked auth/queries as precedent allows), and the settings index page no longer lists it.
6. No `<form>` nested in the entry form (render to string and assert one `<form` occurrence).
7. Scoping gate: `settings/actions.ts` is already in the sweep — any new call you add is driven.

## Strings available (`src/i18n/ar.v14.ts` via `t`)
`t.categoryQuick.{add, edit, name, added, hideConfirm, hide, hidden, chipsLabel, done, more}`, `t.categoriesPage.{back, hint}`; existing `t.common.save/cancel`, `t.transaction.chooseCategory`, `t.err.*`. Need another key? Request it; do not add one.

## Things to know
- `categoryOptions.ts` in your folder builds the options today — start there.
- `src/features/transactions/components/actions.ts` / `data.ts` are the form's swap points for actions and reads (Phase 5b); the category actions live in `settings/actions.ts` and are bound by id where needed.
- A server action in a client bundle is callable whether or not its button renders (Gotcha) — hiding the links from staff is presentation; `requireOwner()` inside the category actions is the control. Confirm it is there.
- Admin pages must never import anything of yours.
