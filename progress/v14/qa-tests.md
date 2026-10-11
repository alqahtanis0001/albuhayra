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

## Part 2 (2026-10-11)
Scope: HEAD `3e00d7b` (`v1.4 part 2: forms and first run`), the seven test files in `git diff --name-only 5abaf5a..HEAD -- 'src/**/*.test.ts'`, rules D23–D28 of `docs/V14-SPEC.md`, `docs/BACKEND.md › Security` + the v1.4 part-2 bullet, and the builders' lists (`p2-forms` M1–M42, `p2-home` M1–M21, reviewer's spot-checks) — every mutation below is one they did not list. Same method as CP-C: `src` re-copied to `<scratchpad>/qa-tests/tree/src` (the part-1 copy moved aside as `src.part1`), `node_modules`/`prisma` symlinked, `vitest.config.mts` copied; `mut.sh` applies one unique replacement, runs vitest from the copy, restores from the repo and `cmp`-verifies; scripts `p2-d24.sh`, `p2-d23.sh`, `p2-d25.sh`, logs `p2-d24.log`, `p2-d23-d25.log`. `diff -rq src <copy>/src` empty at the end. No source, test or doc edited; no git write.

### Mutations run — 32 (27 killed, 5 survived)
| # | Mutation (file:line, scratch copy) | Tests run | Result |
|---|---|---|---|
| E1 | `shouldOpenDetails` B1 arm counts **any** `fieldErrors` key (`entryDetailsState.ts:43`) | entryDetails | K — "B1: opens when a server field error names one of the three fields" (`amountHalalas` → false, :121) |
| E2 | `return remembered` → `initial ? remembered : false` (:44) | entryDetails | K — "otherwise the remembered value decides" :126 |
| E3 | `readDetailsOpen` catch returns `true` (:51) | entryDetails | K — :198 (throwing storage) |
| E4 | mount effect also calls `rememberDetailsOpen(next)` (`EntryDetails.tsx:78`) | entryDetails | K — S7 **static** pin only (`rememberDetailsOpen\(` count :222); the render half cannot see an effect |
| E5 | `hidden={!open}` → `className={open ? … : "hidden"}` (`EntryDetails.tsx:143`) | entryDetails, partyQuick | K — :141 `\shidden=""` and the toast static pin :294. Correct strictness: D24 says the *attribute* (it is also what removes the panel from the a11y tree behind `aria-controls`) → N3 |
| E6 | `lockParty={payment}` → `{false}` (:107) | entryDetails, partyQuick | K — payment-mode cases :166, PQ :130 |
| E7 | page passes `?partyId=` unvalidated (`transactions/new/page.tsx:40`) | new/page | K — "an unknown id, an inactive party, a list or an empty value are ignored" |
| E8 | `DETAIL_FIELDS` drops `counterparty` (:19) | entryDetails | K — :101 and the B1 case |
| E9 | the **late-error effect** removed (`EntryDetails.tsx:85–87`) | entryDetails | **S** → S2 |
| E12 | mount effect `setOpen(readDetailsOpen())` — remembered overrides the rule after hydration (:78) | entryDetails | **S** → S1 |
| E13 | `TransactionForm.tsx` padded to 251 lines | entryDetails | K — "ends below 250 lines" :229 |
| Q1 | plan hidden input posts `postedPartyId(value)` not `(shown)` (`PlanPartySelect.tsx:95`) | partyQuick | K — static pin :276 (`value={postedPartyId(shown)}`); behaviourally: while the box is open the old party would post |
| Q4 | box type `Select` lists every `PartyTypeEnum` value (`PartyQuickAdd.tsx:139`) | partyQuick | K — :309 `value="EMPLOYEE"` |
| Q5 | `applyAddedParty` upsert keeps the old `active` (`quickPartyList.ts:52`) | partyQuick | K — revived-namesake assertion :197–198 |
| Q7 | `PlanForm.chooseParty` default list = `parties` (stale prop) (`PlanForm.tsx:108`) | partyQuick | K — anchored static pin :235 |
| Q9 | `createParty` → `requireUser()` (`parties/actions.ts:41`, first occurrence only) | parties | K — "createParty calls requireOwner and nothing weaker" + "writes nothing when requireOwner refuses" (`parties.test.ts:87–100`) — the D23 control holds |
| Q12 | `LinkFields.onAdded` leaves the box open (no `setAdding(false)`) (`LinkFields.tsx:120`) | partyQuick | K — only by the anchored static pin :240 (misleading case name) → N6 |
| Q13 | `EntryDetails.onPartyAdded` appends instead of upserting (:111) | partyQuick | K — S3 static pin :212 |
| Q15 | `PartyQuickAdd` posts the raw `name`, not `parsed.data` (:57) | partyQuick | K — static pin :337 |
| Q22 | staff `transactions/new/page.tsx` passes `manageParties` | partyQuick | K — static sweep :140 |
| Q25 | `onKeyDown={swallowEnter…}` removed (`PartyQuickAdd.tsx:132`) | partyQuick | K — static pin :336 |
| Q26 | `quickAdd = !locked` (sentinel for staff) (`PlanPartySelect.tsx:77`) | partyQuick | K — "staff renders … have no «+ جهة جديدة»" |
| F2 | `allDone` over three steps (`firstRun.ts:52`) | firstRun, FirstRunCard | K — "allDone only when all four flags are true" |
| F11 | plan step borrows `stepParty`'s label (`firstRun.ts:38`) | firstRun, FirstRunCard | K — order + labels cases |
| F6 | `FirstRunCard` `useState(false)` — shown before storage is read (`FirstRunCard.tsx:90`) | FirstRunCard | K — "renders the card hidden and no-print until storage has been read" |
| F8 | `hide()` without `rememberFirstRunHidden()` (:98–101) | firstRun, FirstRunCard | **S** → S3 |
| F12 | `shouldShowFirstRun(firstRun, false)` — stored flag ignored after mount (:96) | firstRun, FirstRunCard | **S** → S4 |
| F13 | progress prints the remaining count (:61) | FirstRunCard | K — "«0 من 4»" :82 (the `twoDone` fixture alone would not: 2 = 4 − 2) |
| F4 | `db.plan.count({})` (`firstRunReads.ts:25`) | scoping | K — 4 cases (driver, first-run case, categories case, the sweep) |
| F9 | `getOwnerDashboard` returns constant flags (`queries.ts:222`) | scoping | K — "first-run reads are scoped and reduce to four booleans" (`toEqual` on the flags, :843) |
| C1 | `m-auto` moved to the **end** of the class string (`ConfirmDialog.tsx:61`) | ConfirmDialog | K — but only by the over-strict static pin :34 (`className="m-auto `); the render pin :29 is satisfied → N1 |
| C2 | `categoriesPage.back` loses the «→» (`ar.v14.ts:35`) | settingsPages, v14Rename | **S** → B1 |

Checked by reading, not run: `presetPartyId` joining `preset` (builder M13, static :235); the owner page passing the preset in payment mode (M15, page test :88); `postedPartyId` returning the sentinel (M17); `QUICK_PARTY_TYPES` with EMPLOYEE (M16); duplicate on a second add (M18); `addedParty` raw name (M19); cancel writing `""` (M37/M38); toast inside the panel (M40); the plan select regaining `name` (M24); `locked`/`disabled` sentinel (M22/M39); `firstRunSteps` order/href/flag (M1–M3); `shouldShowFirstRun` ignoring `hidden` (M5); `readFirstRunFlags` dropping `establishmentId`/`deletedAt` (M15/M16/M19 — F4 re-proved the plan read); `firstRun` gaining a number (M17); `no-print`/`m-auto` dropped (M9/M20); all-done render (M10).

### Rule → pin
| Rule | Pin | Verdict |
|---|---|---|
| D23 owner-only / last option / locked / payment | `partyQuick.test.ts` :88–153 | real (Q22, Q26; builder M20–M23, M35) |
| D23 sentinel never posts | :155–184 (pure `postedPartyId` + hidden-input renders) | real; the "while the box is open" half is a static pin (Q1) |
| D23 upsert + select + direction; S3; S5 | :186–250 | real (Q5, Q7, Q13, Q15 — Q7/Q13/Q15 static-anchored) |
| D23 box: three types, no `name`, no submit, Enter swallowed, refusal shown | :300–339 | real (Q4; Q25 static) |
| D23 control `createParty` → `requireOwner` | `parties.test.ts:87–100` | real (Q9) |
| D24 `shouldOpenDetails` matrix, B1 arm | `entryDetails.test.ts:98–128` | real (E1, E2, E8) |
| D24 collapsed-in-DOM / `hidden` / ARIA / payment / staff / `no-print` | :130–187 | real (E5, E6) |
| D24 remembered per device, S7 | :189–225 | pure helpers real (E3); **the component's effects are unpinned** (E9, E12 → S1, S2) |
| D24 `?partyId=` on the owner page | `new/page.test.ts` | real (E7) |
| D24/D28 `TransactionForm` < 250, `preset` excludes `presetPartyId` | :227–240 (static) | real (E13) |
| D25 steps order/href/flag, `allDone`, `shouldShowFirstRun`, storage | `firstRun.test.ts` | real (F2, F11) |
| D25 card renders (hidden pre-mount, null when done, ticks, links, digits, 44 px) | `FirstRunCard.test.ts` | real (F6, F13); **the component's `hide()` and after-mount `hidden` wiring are unpinned** (F8, F12 → S3, S4); the page's placement unpinned (N2) |
| D25 four scoped boolean reads | `scoping.test.ts:829–849` + FILES :2399 + S8 :2607 | real (F4, F9) |
| D26a `m-auto` | `ConfirmDialog.test.ts` | real; the source pin over-strict (N1) |
| D26b «→» prefix | — | **unpinned** (C2 → B1): `settingsPages.test.ts:71` reads the value through `t`, so any value passes |
| D27 S1 nameless `Select`, no radios | `partyQuick.test.ts:311, :318` | real |
| D28 `firstRunReads.ts` server-only, `quickPartyList.ts` name | gate S8; PQ header comment | real / by construction |

### Static sweeps
- New server-only module since part 1: `src/features/dashboard/firstRunReads.ts` only — in FILES (`scoping.test.ts:2399`) and S8 (:2607); `queries.ts` already listed. The other seven new files are `"use client"` (4) or pure (3).
- No new `"use client"` file imports a server-only module: `PartyQuickAdd` → `@/features/parties/actions` (`"use server"`, the `CategoryQuickActions` pattern), `categoryList` (pure), the validation barrel (value import — part-1 N2 class, bundle measured by `p2-forms`); `PlanPartySelect` → `PlanBits`; `FirstRunCard` → `dashboard/visuals` → `lib/dates`, `lib/money` (no `server-only`); `src/lib/validation/{auth,email}.ts` mention "server-only" in comments only.
- Staff pages: no `(staff)` file mentions `manageParties` (sweep :140, Q22 proves it live).

### Findings

#### BLOCKER
- **B1 — D26b's «→» is unpinned.** The spec's test list says "the i18n value starts with «→»"; `src/features/settings/components/settingsPages.test.ts:71` only checks `out` contains `t.categoriesPage.back`, so `back: "الإعدادات"` (C2) passes everything. One line, no code change — **`lead`** (owns `ar.v14.ts`; or `p2-home`, D26's owner): after :71 add `expect(t.categoriesPage.back.startsWith("→ ")).toBe(true);`. Trivial, but by this brief's definition (an unpinned spec rule) it is the one BLOCKER.

#### SHOULD
- **S1 — D24 "opens automatically regardless of the remembered state" holds only on the server render.** `src/features/transactions/components/EntryDetails.tsx:78` replaced by `setOpen(readDetailsOpen())` (E12) passes `entryDetails.test.ts`: after hydration, an edited entry with a note on a device that remembers «compact» would collapse the note — the exact value-hiding D24 forbids. `renderToStaticMarkup` runs no effects, so pin it statically in the S7 case (:213–225), **`p2-forms`**: `expect(source).toContain("setOpen(shouldOpenDetails({ ...rule, remembered: readDetailsOpen() }));"); expect(source.match(/readDetailsOpen\(\)/g)).toHaveLength(1);`.
- **S2 — D27 B1's real path is unpinned.** The B1 arm is pinned on the pure rule and on the *initial* render (the `useState` initialiser), but the effect that opens the panel when a **later** submit is refused (`EntryDetails.tsx:85–87`) can be deleted (E9) and every case passes — which is the scenario B1 was raised for (the error sits in a `hidden` field, the user sees only the toast). Static pin, same case, **`p2-forms`**: `expect(source).toMatch(/useEffect\(\(\) => \{\s*if \(shouldOpenDetails\(\{ fieldErrors, remembered: false \}\)\) setOpen\(true\);\s*\}, \[fieldErrors\]\);/);`.
- **S3 — D25 «إخفاء» remembered: the component may never write it.** `FirstRunCard.tsx:98–101` `hide()` without `rememberFirstRunHidden()` (F8) survives `firstRun.test.ts` + `FirstRunCard.test.ts`; the pure helpers are pinned, their wiring is not (the builder recorded the after-mount branch as "not provable without a DOM" — the static half is). **`p2-home`**, new case in `FirstRunCard.test.ts`: `const source = readFileSync("src/features/dashboard/components/FirstRunCard.tsx","utf8"); expect(source).toMatch(/function hide\(\) \{\s*rememberFirstRunHidden\(\);\s*setHidden\(true\);\s*\}/);`.
- **S4 — D25 the stored flag never reaches the render.** `FirstRunCard.tsx:96` `shouldShowFirstRun(firstRun, false)` (F12) survives: a dismissed card comes back on every visit. Same new case, **`p2-home`**: `expect(source).toContain("shouldShowFirstRun(firstRun, hidden === true)"); expect(source).toContain("setHidden(readFirstRunHidden())");`.

#### NOTE
- **N1** `ConfirmDialog.test.ts:34` `/<dialog[\s\S]*?className="m-auto /` requires `m-auto` to be the **first** class; a class reorder (C1 — what a Tailwind class sorter does) fails a test whose name says the class moved to a wrapper. `/<dialog[\s\S]*?className="[^"]*\bm-auto\b/` keeps the intent. `p2-home`.
- **N2** `src/app/(owner)/owner/page.tsx:45` — no test renders or reads the owner home, so `<FirstRunCard firstRun={data.firstRun} />` moved below `OwnerStatCards`, or handed a constant, survives by construction. One static `toMatch(/<QuickActions \/>\s*<FirstRunCard firstRun=\{data\.firstRun\} \/>\s*<OwnerStatCards/)` in `FirstRunCard.test.ts`. `p2-home`.
- **N3** The `hidden`-attribute pin (:141) rejects a `display:none` class (E5). Intended: D24 names the attribute, and only the attribute removes the panel from the accessibility tree the button's `aria-controls` points at. No change.
- **N4** Q12 (box left open after a successful add) is killed only by the anchored string pin "the plan forms select and derive through the client-state list" (:240) — a misleading name for that failure, same class as part-1 N6. Acceptable for v1.4.
- **N5** F13 shows the `twoDone` fixture is symmetric (2 done = 2 remaining); the `none` render (:82) is what carries the digit rule — keep both fixtures.
- **N6** `git status --short` → only ` M progress/v14/qa-tests.md` (this file). Scratch copy byte-identical to `src` after every run.

### Gates (real tree, end of part 2)
`npx vitest run` → **91 files / 1475 tests green**; `npx tsc --noEmit` → **0 errors**.
