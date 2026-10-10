# progress/v14/plans.md — v1.4 recording for `plans`

Spec: `docs/V14-SPEC.md` §C (open agreements). Your own running notes. Only you write here. The lead merges it into PROGRESS.md at checkpoints. Keep entries short; newest at the bottom.

## Files I own
`src/features/plans/**`, `src/app/(owner)/owner/plans/**`, `src/lib/validation.ts` → in this tree `src/lib/validation/plans.ts` + the barrel `index.ts` (**only** the new open-plan schemas, announced to the lead), `src/features/transactions/actions.ts` **only** the new `recordOpenPlanPayment` path (put the body in its own module beside `payments.ts`; `actions.ts` must not grow). **Added at CP-A (user's ruling):** `src/features/parties/statement.ts` and the one `totalHalalas` line in `src/features/transactions/payments.ts` — for the compile pass and the open-plan rows of the statement.

## Task order (binding)
P0 — compile pass first: `npm run typecheck` and `npm run build` green on the new schema (8 errors: `plans/dues.ts` ×3, `plans/queries.ts` ×2, `parties/statement.ts` ×2, `transactions/payments.ts` ×1), per D6 (narrow and fail loud, never `?? 0`). Nothing else until P0 is reported done.

## Tasks completed
| Task | Files touched | Build/tests pass | Notes for others |
|---|---|---|---|

## In progress
- Task:
- Where I am:
- Next action:

## Gotchas I found
- 

## Questions / requests sent to lead
- 
