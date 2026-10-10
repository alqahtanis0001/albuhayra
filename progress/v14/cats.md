# progress/v14/cats.md — v1.4 recording for `cats`

Spec: `docs/V14-SPEC.md` §A (categories managed from the transaction form). Your own running notes. Only you write here. The lead merges it into PROGRESS.md at checkpoints. Keep entries short; newest at the bottom.

## Files I own
`src/features/transactions/components/**` (new `CategoryQuickActions.tsx`, `CategoryChips.tsx`; `TransactionForm.tsx` is frozen at ~250 lines — mount the new component from it with one line, nothing more), `src/features/settings/components/Categories*.tsx`, `src/features/settings/actions.ts` **only** the category actions, `src/app/(owner)/owner/settings/page.tsx` (= `settings/(index)/page.tsx`), `src/app/(owner)/owner/settings/categories/**`.

## Tasks completed
| Task | Files touched | Build/tests pass | Notes for others |
|---|---|---|---|

## In progress
- Task: Phase 1 orientation done (2026-10-10). Waiting for "go".
- Where I am: plan below; no code written.
- Next action: on "go", tasks T1 → T6 in order.

### Plan (Phase 2)
**Files to create (all mine)**
- `src/features/transactions/components/categoryList.ts` — pure, no React: `applyAdded(list, row)` → `{ categories, selected: row.id }` (replace the row by id when `createCategory` revived it, else append; `active: true`); `applyHidden(list, id, selected, direction, keepId)` → `{ categories, selected }` (row marked `active: false`, never deleted; `selected` reset to `""` when it is no longer among `categoryOptions(...)`); `lastActiveOf(list, direction)`; `quickCreateForm(nameAr, direction)` → the FormData `createCategory` takes; `swallowEnter(e)` (Enter → `preventDefault` + run save, so implicit submission of the entry form never fires).
- `CategoryQuickActions.tsx` (client) — the row of two text links (`type="button"`, `no-print`), the inline add box, edit mode, the success Toast. Props: `direction`, `categories`, `selected`, `keepId`, `onCategories`, `onSelect`. Calls `createCategory(null, quickCreateForm(...))` / `setCategoryActive(id, false)` inside `startTransition`; client-side `CategoryInputSchema.shape.nameAr` check first. The box uses a plain labelled `<input>` **without `name`** (the shared `Input` requires `name`, which would put it in the entry form's FormData) and `id="category-quick-name"`; errors via `errorMessage` under the box (`role="alert"`).
- `CategoryChips.tsx` (client) — `<ul aria-label={t.categoryQuick.chipsLabel}>` of the direction's active categories, `.v14-wiggle`; ✕ = `type="button"`, `aria-label` = `t.categoryQuick.hide` with `{name}` (`.replace("{name}", () => name)` — `$&`-safe); last active → ✕ `disabled` + `title` and sr-only text = `errorMessage("err.lastActiveCategory")`; ✕ → `ConfirmDialog` (`hideConfirm`, `{name}` filled) → hide; leaving chip gets `.v14-fade-out` and is dropped on `onAnimationEnd`, or at once when `useReducedMotion()` (no animation → no event). Last row: `t.categoryQuick.done` button + `Link` `t.categoryQuick.more` → `/owner/settings/categories`.
- Tests: `src/features/transactions/components/categoryQuick.test.ts` (pure + render), `src/features/settings/categoryActions.test.ts` (**location needs OK, see Q4**), `src/features/settings/components/categoriesPage.test.ts` (page render).

**Files to change**
- `TransactionForm.tsx` (frozen) — +5 lines, nothing else: 1 import; `const [list, setList] = useState(categories);`; line 141 `categoryOptions(categories, …)` → `categoryOptions(list, …)` (changed, not added); prop `manageCategories?: boolean` (destructure + type = 2 lines); 1 mounting line directly under the category `<Select>`: `{manageCategories && !originalLocked && !payment ? <CategoryQuickActions … onCategories={setList} onSelect={setCategoryId} /> : null}`. The `<Select>` element, its options markup and placeholder are untouched; only the array it maps over is now client state. 254 → 259 lines (Q1).
- `settings/actions.ts` — category actions only: `createCategory` returns `ActionResult<{ id; nameAr; type }>` (both the insert and the revive path) instead of `ActionResult<null>`; `revalidateSettings()` in the four category actions also revalidates `/owner/transactions` and `/staff/transactions` (`"layout"` — covers new, `[id]/edit` and the list's category filter). `requireOwner()` is already the first line of all four (confirmed) — that is the control; the hidden links are presentation.
- `CategoryForms.tsx` — `State` widened so `AddCategoryForm` still types against the new `createCategory` result. No behaviour change.
- `settings/categories/page.tsx` — back link `t.categoriesPage.back` → `/owner/settings` and the hint line at the top; `CategoriesTab` unchanged (list/add/rename/activate/deactivate/move up/down stay).

**Owner-only decision (server)**: the owner pages `owner/transactions/new/page.tsx` and `[id]/edit/page.tsx` pass `manageCategories` (both already sit under `(owner)/layout.tsx` → `requireOwner()`); the staff pages pass nothing, so a staff render never mounts the component. Pinned statically: no file under `src/app/(staff)` mentions `manageCategories`, both owner form pages do. (Q2: those two pages are not mine.)

**Edit mode / add box never submit the form**: no nested `<form>`; every button `type="button"` (the shared `Button` defaults to it, raw buttons set it); the name input has no `name` and its Enter is swallowed; the chips' ✕ and «تم» are buttons, «المزيد» is a link.

**Tests (each mutation-proven; mutation → expected failing case)**
1. Staff render of `TransactionForm` (props as the staff page passes) has no `categoryQuick.add`/`edit` text; owner render (`manageCategories`) has both. Mutation: mount condition `manageCategories ||true` → staff case fails. Static: `src/app/(staff)/**` never mentions `manageCategories`; owner new/edit pages do. Mutation: add it to the staff new page → fails.
2. `applyAdded` puts the row in its own direction's options only and returns it as `selected`; a revived row is replaced in place, not duplicated. `quickCreateForm` carries the current direction as `type`. Mutations: append to both directions → "only current direction" fails; return the old selection → "becomes selected" fails; push instead of replace → "revived not duplicated" fails.
3. `applyHidden`: option gone, a selected hidden one → `""`, an unselected one leaves the selection; in edit mode the entry's own hidden category stays as «(معطل)» like a reload. Pin the existing ledger behaviour: `listTransactions` maps `categoryNameAr` from an inactive category and its `where` has no `active` filter (mutation, temporary in `transactions/queries.ts`, restored byte-exactly: add `category: { active: true }` → fails). `updateTransaction` keeping an unchanged inactive category is already pinned in `scoping.test.ts:1188` — I re-run its mutation (drop `keptCategoryId` in `links.ts:95`) and record it rather than duplicate it.
4. `CategoryChips` with one active category in the direction: its ✕ is `disabled` and carries the `lastActiveCategory` text; with two, neither is. Mutation: drop the disable → fails. Action: `setCategoryActive(id, false)` with `count` 0 → `err.lastActiveCategory` (mutation `=== 0` → `< 0` → fails).
5. Guards: `createCategory` / `updateCategory` / `setCategoryActive` / `setCategoryOrder` each call `requireOwner` (mutation: `requireUser` in one → its case fails). Revalidation: create and hide revalidate `/owner/transactions` and `/staff/transactions` (mutation: remove one → fails). `createCategory` returns `{ id, nameAr, type }` on both paths (mutation: return `data: null` on revive → fails).
6. `/owner/settings/categories` renders for the owner (page called with mocked `requireOwner`/`listCategories`/actions/`next/navigation`): has the back link to `/owner/settings`, the hint, both direction groups. Mutation: remove the back link → fails. `/owner/settings` no longer lands on categories (depends on Q3).
7. No nested form: owner `TransactionForm` render has exactly one `<form`; `CategoryQuickActions` / add box / `CategoryChips` rendered alone have zero; every `<button` in them has `type="button"`; the name input has no `name=`. Mutation: give the box a `<form>` / a `type="submit"` → fails. `swallowEnter` calls `preventDefault` (mutation: remove it → fails).
8. Scoping gate: no new `db.*` call; `settings/actions.ts` is in the sweep; the `createCategory` driver's expectation changes with the new return (Q5).

Rendering: there is **no** `renderToStaticMarkup` precedent in `src/` (grep finds none; `vitest.config.mts` includes only `*.test.ts`, so tests use `createElement`, not JSX). I will add the first, node environment, mocking `server-only`, `next/navigation` (`useRouter`), `@/features/settings/actions`, `@/lib/db`, `@/lib/auth`, `next/cache`. No dependency added (`react-dom/server` ships with `react-dom`).

## Gotchas I found
- `/owner/settings` has **no cards**: `(index)/page.tsx` is only a redirect, and `settingsRedirectPath(undefined)` → `/owner/settings/categories`. So the A5 back link «← الإعدادات» → `/owner/settings` would land on the very page it leaves (Q3).
- `createCategory` returns `ActionResult<null>` — no id to append/select (Q5).
- The shared `Input` requires `name`; inside the entry form a named input would be posted with the entry. Use a plain labelled input there.
- Under reduced motion `.v14-fade-out` has no animation, so `animationend` never fires — unmount at once in that case or the chip stays.

## Questions / requests sent to lead
- Q1. `TransactionForm.tsx` +5 lines (254 → 259): import, list state, `manageCategories` prop (2), mounting line; plus the one-word change on line 141. OK?
- Q2. Owner-only via a new boolean prop `manageCategories` passed by `src/app/(owner)/owner/transactions/new/page.tsx` and `[id]/edit/page.tsx` (one line each; not my files — please make it, or authorise me). Alternative with no page change: derive from `doneHref.startsWith("/owner/")` — server-decided but implicit; I recommend the prop. Also: hide the links in payment mode (`payment` set — the category comes from the plan, and D9 fixes it for open-plan payments)? I recommend hiding.
- Q3. Conflict A5 vs code: there is no settings index page with cards; `/owner/settings` redirects to categories. Proposal: in `settingsPaths.ts` (not mine; brief says it "stays as is") change only the **no-tab fallback** to `/owner/settings/join-code` (first item of the new الإعدادات group), keeping `?tab=categories` → categories so old bookmarks still work. Otherwise the back link needs another target. Your call.
- Q4. Test file for the settings category actions: may I create `src/features/settings/categoryActions.test.ts` (and `src/features/settings/components/categoriesPage.test.ts`)? Not under my owned paths.
- Q5. `createCategory` return → `ActionResult<{ id: string; nameAr: string; type: DirectionValue }>`: a contract change (docs/BACKEND.md action table), and `scoping.test.ts:1018` expects `data: null` — needs updating to the new shape (not my file; one expectation).
- Q6. Spec's «← الإعدادات»: a left arrow in RTL points away from "back" (existing back links use plain `t.common.back`). Keep verbatim? I will unless told otherwise.
- No new string keys needed (the `hidden` toast after a hide uses `t.categoryQuick.hidden`).

### Lead's rulings (2026-10-10 handover; also `docs/V14-SPEC.md` D11–D12) — no "go" yet
- Q1 yes: `TransactionForm.tsx` may reach 259 lines.
- Q2 yes: I add the `manageCategories` line to `owner/transactions/new/page.tsx` and `[id]/edit/page.tsx` myself; links **hidden in payment mode** (`!payment` in the mount condition).
- Q3 yes: I own exactly one change in `settingsPaths.ts`: tab-less fallback → `/owner/settings/join-code`; `?tab=categories` keeps → categories. Test 6 then pins `settingsRedirectPath(undefined)` ≠ categories and `settingsRedirectPath("categories")` = categories (mutation: restore the old fallback → fails).
- Q4 yes: test files beside the settings feature are fine.
- Q5 yes: `createCategory` returns `{ id, nameAr, type }`; I update the one `scoping.test.ts` expectation (~line 1018) myself.
- Q6: keep «← الإعدادات» verbatim.
- Next session: start at T1 on the lead's "go"; re-read `TransactionForm.tsx`, `settings/actions.ts`, `scoping.test.ts` around the `createCategory` driver and `settingsPaths.ts` first (others may have edited since).
