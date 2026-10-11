# progress/v14/qa-tests.md — v1.4 CP-C recording for `qa-tests`

Read every new/changed test (`git diff --name-only 78a93f8..HEAD -- 'src/**/*.test.ts'`, 19 files) and tried to break each rule of `docs/V14-SPEC.md` (A–C, D4–D22) with a mutation the builder did not list. Only you write here. Newest at the bottom.

## Files I own
`progress/v14/qa-tests.md` and the scratchpad. No source, test or doc was edited; no git write.

## Method
- Mutations ran on a **scratch copy** of `src` (`<scratchpad>/qa-tests/tree`, `node_modules` and `prisma` symlinked, `vitest.config.mts` copied), never in the shared tree. `mut.sh <old> <new> <file> <tests…>` applies a single exact replacement to the copy (refuses if the pattern is not unique), runs vitest from the copy's root, restores the copy from the repo and `cmp`-verifies. After the run `diff -rq src <copy>/src` was empty. This works for relative imports too, unlike the alias trick (PROGRESS Gotcha), because the whole tree is the copy.
- Gates on the real tree at the end: `npx vitest run` → **84 files / 1405 tests green**; `npx tsc --noEmit` → **0 errors**; `git status --short` → only ` M README.md` (another agent's CP-C edit, not mine).

## Mutations run — 28 (22 killed, 6 survived)
"K" = exactly the named case(s) failed; "S" = **survived** (a finding below).

| # | Mutation (file:line, scratch copy) | Tests run | Result |
|---|---|---|---|
| P1 | `received >= plan.totalHalalas` → `>` (`transactions/openPlanPayments.ts:93`) | openPlanPayments, openMoneyPath | K — OPP "C4: closes at exactly the total", OMP "C4 …" (+3 cascades) |
| P2 | received sum `where` drops `establishmentId` (`:88`) | openPlanPayments, scoping | K — OPP :141 `toEqual`, SC "recordOpenPlanPayment" driver |
| P3 | edit path ignores a posted `instalmentId` (`:148` → `existing.instalmentId` only) | openPlanPayments | K — OPP :237 planBothLinks |
| P4 | edit-path date floor `<` → `<=` (`:158`) | openPlanPayments, openMoneyPath | **S** → F4 |
| P5 | `linkColumns` writes `planId` (`transactions/links.ts:62`) | openPlanPayments | K — OPP :222 P19 |
| P6 | P15 refusal → `throw` (`transactions/payments.ts:83`) | openExclusions | K — OE :150 |
| P7 | `updateOpenPlan` guard `requireOwner` → `requireMember` (`plans/openActions.ts:74`) | openPlans, scoping | **S** → F1 |
| P8 | `isReferenced` adds `deletedAt: null` (`plans/openRules.ts:72`) | openPlans, openExclusions, openMoneyPath, scoping | **S** → F3 |
| P9 | `checkOpenRefs` drops the kept-party exception (`openRules.ts:59`) | openPlans, openMoneyPath, scoping | **S** → F5 |
| P10 | `receivedOf` drops `deletedAt: null` (`openRules.ts:78`) | openPlans, openMoneyPath, scoping | K — only by the gate's probe rule (SC :1831), no behaviour pin → N1 |
| P11 | expected end `>=` start → `>` (`lib/validation/plans.ts:107`) | validation/openPlans | K — :57 "may equal the start" |
| P12 | gate widened: `amountHalalas` in `PROBE_SELECT_KEYS` (`scoping.test.ts:379`) | scoping | K — D5 pin :674 and the older :"refuses a probe that selects the amount" |
| P13 | `getOpenPlan` drops `kind: "OPEN_ENDED"` (`plans/openQueries.ts:71`) | openExclusions, openMoneyPath, scoping | **S** → F2 |
| P14 | `listParties` balances drop the kind filter (`parties/queries.ts:92`) | openExclusions | K — OE :168 |
| P15 | statement drops the kind filter (`parties/statement.ts:65`) | openExclusions | K — 6 cases (D4 corrupt row + D6 throw on `p_open_null`) |
| P16 | `clientRules` drops the kind filter (`reminders/clientRules.ts:37`) | openExclusions | K — OE :145 |
| P17 | `openRemaining` drops the kind filter (`plans/openRemaining.ts:23`) | openExclusions | K — OE :188 (`pStd` → 10000, not null) |
| P18 | `openRemaining` drops `establishmentId` | scoping | K — 5 cases (listParties, getParty, statement drivers + sweep) |
| P19 | `receivedByPlan` drops `establishmentId` (`openQueries.ts:24`) | scoping | K — 6 cases |
| P20 | `getOpenPlan` payments read drops `establishmentId` (`openQueries.ts:82`) | scoping | K — "getOpenPlan" driver |
| A1 | `activeHref` returns `"+"` for exactly `/owner/transactions/new` (`chrome/nav.ts:135`) | nav | K — :132 and the BottomTabs render :300 |
| A2 | `ledgerTab` case-insensitive/trimmed (`(list)/ledgerTab.ts:17`) | ledgerTab | K — :13 ("Activities", "activities ") |
| A3 | `/owner/projects` redirect wrapped in try/catch (`projects/(list)/page.tsx:22`) | page.test | K — all 3 ("rendered instead of redirecting") |
| C1 | `applyShown` activates every row (`transactions/components/categoryList.ts:73`) | categoryQuick | **S** → F8 |
| C2 | mount ignores payment mode (`TransactionForm.tsx:197`, `!payment` dropped) | categoryQuick | K — :143 |
| C3 | mount ignores a locked original (`!originalLocked` dropped) | categoryQuick | K — :150 |
| L1 | `projects.within` restored to «ضمن إضافة» (`i18n/ar.v12a.ts`) | v14Rename | K — key-based case :34 |
| L2 | `countdown.today` restored to «مستحقة اليوم» (`ar.v12a.ts`) | instalmentWording | K — :33 |

Checked by reading, not run (equivalent or already listed by the builder): `received > total` with off-by-one is P1; `assertSingleLink` one-arm — the helper is symmetric and both orders are pinned (OPP :207); `requireOwner`→other guard on `createOpenPlan`/`close`/`reopen`/`recordOpenPlanPayment` pinned (OP :110, :254; OPP :191); `date >= startDate` on the record path pinned at the boundary (OPP :172); the other C5 sites (`dues.ts:48/123/149`, `queries.ts:139/159`, `aging.ts:74`, `digest.ts:63`, `payments.ts:83`) were mutated by `plans` and their D4 cases read as real (each PGlite case has the corrupt `i_open` row beside the `i_std` control); `hasPlans` always true → OE :118 (est2); `countPendingStaff` without `status` → SC :1169 `toEqual`; `addRows("STAFF", false)` two rows → nav :250; one-row «+» as a button → nav :272/:317; `moreBadgeTotal` counting tab hrefs → nav :228; `applyHidden` not resetting → categoryQuick :204; `settingsRedirectPath("")` → same branch as the pinned "bogus" (join-code); `manageCategories` dropped from one owner page → categoryQuick :161 static; `LockBadge`/`LockedNotice` without href → settingsPages :86/:99; staff `lockHref` → ledgerRows :65; `OpenPlanPaymentSchema` not stripping → validation :104; `reopenOpenPlan` on STANDARD → OP :244; `updatePlan` on OPEN_ENDED → OP :263 + OMP :146; STAFF with canEdit on a `planId` row → OPP :231; `getStaffDues` → OE :121 (shares `unpaidUntil`); `paymentOf` ignoring `planId` → OPP :282 (`ops()[0] === "bump"`); `openPlansRemaining` without `state`/clamp → OE :188/:194; `getPartyStatement` including open plans → P15 above; `WeekDues` with `hasPlans: undefined` hides (type forbids it; `getDues` always sets it); `ledgerTab("Activities")` → A2; redirect with an invalid status → page.test :52.

## Rule → pin table (summary)
| Rule | Pinning test(s) | Verdict |
|---|---|---|
| A1–A4 | `categoryQuick.test.ts` (pure `categoryList` rules + static renders; mount condition :126–159) | real; `applyShown` weak (F8); click-handler wiring (`onSelect` after add) is unpinnable by `renderToStaticMarkup` — rules live in the pure helpers, acceptable |
| A5, D11 | `settingsPages.test.ts` :58–83 | real |
| A6 | `categoryQuick.test.ts` :126–237, `categoryActions.test.ts` | real |
| B1, D16(b)(c) | `nav.test.ts` :236–286, :317 | real |
| B2, D13, A2/A3 | `nav.test.ts` :74–234 | real |
| B3 | `ledgerTab.test.ts`, `page.test.ts` | URL rules real; the page's tab render itself unpinned (N7) |
| B4/B5 | `v14Rename.test.ts`, `nav.test.ts` :158 | real (`\b` inert, N5) |
| C1 (single link) | `openPlanPayments.test.ts` :206–227 | real |
| C2 (form/schema) | `validation/openPlans.test.ts`, `openPlans.test.ts` | real (form render unpinned — qa-visual) |
| C3 (inherited columns, bar, payments list) | `openPlanPayments.test.ts` :124, `openPlanView.test.ts`, `openMoneyPath.test.ts` :128 | real |
| C4 (≥, non-deleted sum, edit/delete never move state) | OPP :144/:137, OMP :154/:167/:177 | real |
| C5 (11 sites) | `openExclusions.test.ts` (PGlite, D4 fixture) | real for 10 sites; the converse read `getOpenPlan` has no kind pin (F2) |
| C6 / P11 | `openPlanView.test.ts` :28–38 | helper pinned; page filter + `PlanFilters` carry unpinned (F7) |
| C7 | all of the above + SC drivers :1805–1883 | real |
| D4 | OE fixture `i_open` | non-vacuous (P15 mutation and the 4 kind mutations I ran each failed exactly their case) |
| D5 | SC :674–683 | positive + both refusals; gate widening caught (P12) |
| D6 / P17 | `kind.test.ts`, OE :220–234 | real |
| D7 / P4 | OPP :191, :231, :290 | **`updateOpenPlan` guard unpinned (F1)**; staff edit-page redirect unpinned (F6) |
| D8 | VAL :51–64, OP :130/:205, OPP :167/:252 | real; edit-path boundary unpinned (F4) |
| D9 / P3 / P13 | OPP :230–288 | real |
| D10 / M4 | OE :159–211, OMP `agreement()` | real |
| D12 | `categoryActions.test.ts` :99–121, SC :1018 | real |
| P1 | OP :262, OMP :146 | real |
| P7 | OE :213 (`p_del`, read side) | action side unpinned (F3) |
| P10 / V5 kept refs | OP :178 (editable before first payment) | kept-inactive exception unpinned (F5) |
| P16 | OP :120 + static :272 | real |
| P19 | OPP :215–227 | real |
| D17 c2/c14/c18/c6 wiring | — | links only, unpinned (N3) |
| D17 c4, c19 | `settingsPages.test.ts`, `ledgerRows.test.ts`, `categoryQuick.test.ts` :150 | real |
| D17 c5 | `categoryQuick.test.ts` :240–278 | real (one static regex, N6) |
| D17 c9 | `WeekDues.test.ts`, OE :113 | real |
| D17 c10 / M2 | `nav.test.ts` :175, :228, :300; SC :1165 | real; layout badge key unpinned (N3) |
| D17 c12 / M1 | `ledgerRows.test.ts` | real |
| D17 c15 / R2-1 | `dueListLinks.test.ts` | prefix + 44 px only (N4) |
| c7 / c8 / c16 / c17, M5, M6 | `instalmentWording.test.ts` | real |
| D22 (payable COMPLETED, reopen non-archived, `paymentOf`) | `openPlanView.test.ts` :35, OP :244, OPP :282 | real |

## Scoping gate / static sweeps (checked by reading + P12/P18–P20)
- `FILES` (SC :2365–2437) lists all five new server modules; `S8` server-only list (:2563–2576) has the four `server-only` ones (`openActions.ts` is `"use server"`, correctly not there); the nested-read scan (:2485) covers `src/features/transactions` (top level — `openPlanPayments.ts` is there); `admin.test.ts` :446–485 walks `src/components/chrome` recursively, so `AddSheet.tsx`/`navSlots.ts` are inside the chrome rule.
- Drivers: `createOpenPlan`, `updateOpenPlan` (locked + unlocked), `closeOpenPlan`, `reopenOpenPlan`, `recordOpenPlanPayment`, `getOpenPlan`, `getOpenPlanPaymentLink`, `listPlans` with an open row (`receivedByPlan`), `updateTransaction`/`deleteTransaction` on a `planId` row, `countPendingStaff`, rule-11 foreign ids; `openPlansRemainingByParty` is exercised through the `listParties`/`getParty`/`getPartyStatement` drivers (P18 proved it). Dropping `establishmentId` in any new read fails the gate (P18–P20).
- New `"use client"` files (`AddSheet`, `OpenPaymentForm`, `OpenPlanActions`, `OpenPlanForm`, `CategoryChips`, `CategoryQuickActions`): none imports a server-only module; two import **values** from the validation barrel (N2).

## Findings

### BLOCKER
- **F1 — `updateOpenPlan`'s OWNER guard is unpinned** (Security rule 1, D7 "all OWNER"). `src/features/plans/openPlans.test.ts:254–259` ("every open action is behind requireOwner") calls only `closeOpenPlan` and `reopenOpenPlan`; `:108–118` pins `createOpenPlan`. Changing `src/features/plans/openActions.ts:74` to `requireMember` (a STAFF login could then rename/re-ceiling an open plan) passes `openPlans.test.ts` and `scoping.test.ts`. **Fix (`plans`):** in that case add `await updateOpenPlan("plan_1", null, openForm());` and assert `h.guards` equals `["requireOwner", "requireOwner", "requireOwner"]` (or a dedicated `it` per action, as `categoryActions.test.ts:78–97` does).

### SHOULD
- **F2 — `getOpenPlan` has no pin on its `kind: "OPEN_ENDED"` filter** (`src/features/plans/openQueries.ts:71`). Both `/owner/plans/[id]` (`(detail)/page.tsx:45`) and `[id]/edit/page.tsx:40` ask `getOpenPlan` **first**, so with the filter gone a STANDARD/SALARY plan renders as an open agreement (open form, «تسجيل دفعة»). Survived `openExclusions`, `openMoneyPath`, `scoping`. **Fix (`plans`):** `src/features/plans/openExclusions.test.ts:231` "getPlan is a scheduled read…" → add `expect(await getOpenPlan("est1", "p_std")).toBeNull();` (the D6 mirror).
- **F3 — P7 is pinned on the read side only.** `getOpenPlan.partyLocked` counts soft-deleted rows (`openExclusions.test.ts:213`, `p_del`), but the action's probe `isReferenced` (`src/features/plans/openRules.ts:72`) with `deletedAt: null` added survives every suite — a plan whose only payment was deleted shows «locked» yet accepts a forged party/direction/start change. **Fix (`plans`):** in `openExclusions.test.ts` (auth mock is est1's owner) add `expect(await updateOpenPlan("p_del", null, <form: partyId "pArch", direction "IN", title, categoryId "cin", startDate "2026-01-01", totalHalalas "">)).toMatchObject({ fieldErrors: { partyId: "err.planPartyLocked" } })` (import `updateOpenPlan` from `./openActions`).
- **F4 — D8 boundary on the edit path.** `src/features/transactions/openPlanPayments.ts:158` `<` → `<=` survives: `openPlanPayments.test.ts:252–255` pins only `shift(-31)`; the record path pins the boundary at `:172`. **Fix (`plans`):** add `expect((await updateTransaction("tx_1", null, editForm({ date: shift(-30) }))).ok).toBe(true);` to that case.
- **F5 — V5/P10 "kept, never newly assigned" is unpinned for open plans.** Dropping the `kept.partyId` exception in `src/features/plans/openRules.ts:59` survives: an open plan whose party was deactivated could then not be edited at all (title/total/notes refused with `err.partyInvalid`). `openPlans.test.ts:138–151` covers the create path only. **Fix (`plans`):** in the `updateOpenPlan` block add `h.party = { active: false }` → `openForm()` (same party) → `ok: true`; `openForm({ partyId: "party_2" })` with `h.party = { active: false }` → `err.partyInvalid`. Same for the kept category (`:60`).
- **F6 — P4's staff edit-page redirect has no pin.** `src/app/(staff)/staff/transactions/[id]/edit/page.tsx:46` `if (row.planId) redirect("/staff/transactions")` — the action-level `err.forbidden` is pinned (OPP :231), the page is not; removing the line would hand canEdit staff a form that fails on submit. **Fix (`plans`, the file was widened to it in D15):** a page test on the `projects/(list)/page.test.ts` model — mock `server-only`, `next/navigation` (`redirect` throws with `destination`, `notFound`), `@/lib/auth` (`requireCanEdit`), `@/features/transactions/queries` (`getTransaction` → a row with `planId`), the four list reads → expect destination `/staff/transactions`; a row without `planId` renders.
- **F7 — P11 at the page is unpinned.** `payable()` is pinned (`openPlanView.test.ts:35`), but `src/app/(owner)/owner/plans/(list)/page.tsx:32` (`pick ? all.filter(payable) : all`) and `src/features/plans/components/PlanFilters.tsx:49,81` (hidden `pick` input, clear link keeping `?pick=payment`) have no test; `const rows = all` survives by construction. **Fix (`plans`):** `renderToStaticMarkup(createElement(PlanFilters, { filter, parties: [], pick: true }))` → contains `name="pick"` and `href="/owner/plans?pick=payment"` (and neither without `pick`); move the row filter into `openPlanView.ts` as `pickRows(rows, pick)` and pin it beside `payable`, or render the page with mocks as `settingsPages.test.ts` does.
- **F8 — `applyShown` is weakly pinned.** `src/features/transactions/components/categoryList.ts:73` replaced by "activate every row" passes `categoryQuick.test.ts:221–224`. **Fix (`cats`):** add `expect(shown.filter((c) => !c.active).map((c) => c.id)).toEqual(["in_hidden"]); expect(shown).toHaveLength(LIST.length);` and that `activeOf(shown, "IN")` equals `activeOf(LIST, "IN")`.

### NOTE
- **N1** `receivedOf` (`openRules.ts:76–82`) without `deletedAt: null` is killed only because the gate reads an all-link-key `where` with a `_sum` as a forbidden probe (SC :1831) — no case shows a deleted payment is excluded from the `err.totalBelowPaid` comparison. One line in `openMoneyPath.test.ts` after the delete at `:170`: `updateOpenPlan(planId, null, openForm({ totalHalalas: "1000" }))` → `ok: true` (4000 before the delete, 1000 after). `plans`.
- **N2** Two new client files import **values** from the validation barrel: `CategoryQuickActions.tsx:23` (`CategoryInputSchema`, `invalid`) and `OpenPlanForm.tsx:24` (`OpenPlanInputSchema`, `PartyTypeEnum`, `invalid`); `OpenPaymentForm.tsx:26` is type-only. Measured within budget (+4.4/+4.7 KB; `PlanForm.tsx:31` already imported the barrel), so nothing to change for v1.4 — recorded because it is the Gotcha's class. `lead` (record), `cats`/`plans`.
- **N3** Link-only D17 wiring with no pin: c2 `owner/dues/page.tsx` → `t.dues.pickOther` / `/owner/plans?pick=payment` (`add`); c14 the three `/owner/transactions?tab=activities` hrefs in `ActiveProjects.tsx` / `ProjectActions.tsx` / `ProjectForm.tsx` (`add`); c18 `PlanFilters.tsx:64` `archivedFilter` label (`plans`; folds into F7's render); c6 `PartyList`/`PartyBits` remainder line render (`plans`; the number is pinned); c10 `(owner)/layout.tsx:26` badge key `"/owner/staff/logins"` (`add`; the count read is pinned at SC :1165). Each is one static `toContain`.
- **N4** `dueListLinks.test.ts` finds the link block by the href **prefix** (`/owner/parties/`, `/owner/plans/`): `href={\`/owner/plans/\`}` without `${row.planId}` would pass. Search for the full template. `plans`.
- **N5** `v14Rename.test.ts:43` `إضافات\b` is inert (ASCII word boundary; reviewer R1-3) — harmless, the key-based case carries the rule. `add`.
- **N6** Static regex pins (`categoryQuick.test.ts:275`, `settingsPages.test.ts:148–150`) break on a rename of `setError`/`setConfirm` with a misleading message (reviewer R1-7) — acceptable for v1.4.
- **N7** B3: no test renders `transactions/(list)/page.tsx` with `?tab=activities` (that no ledger query runs on that tab, that `Tabs` carries `t.ledger.title`); the URL rules are pinned. `add`.
- **N8** `git status --short` on the real tree shows ` M README.md` — another agent's CP-C edit (10 lines), not mine; everything else is clean and the scratch copy is byte-identical to `src`.

## Gotchas I found
- A whole-tree scratch copy (`cp -r src`, symlink `node_modules` + `prisma`, copy `vitest.config.mts`) runs every suite including PGlite and the `readFileSync("src/…")` static pins, and reaches relative imports that the alias trick cannot. 15 MB, ~10 s per run.
- A mutation on an all-link-key `where` that also carries `_sum` is reported by the gate as "probe selects an amount" — a structural kill, not a behaviour pin; read the failing case name before counting a kill as proof of the rule.

## Questions / requests sent to lead
- F1 is the one BLOCKER; F2–F8 are SHOULDs the owners can close in minutes (all are added cases, no code change). Nothing in the tree was changed by me.
