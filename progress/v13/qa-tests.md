# progress/v13/qa-tests.md — v1.3 recording for `qa-tests`

## My five items (docs/V13-SPEC.md, Step 4)
1. Run the gates: `npm run typecheck`, `npx vitest run`, `npm run build`
2. Mutation-check every new computed value in the v1.3 pure helpers (on scratchpad copies, never in the shared tree)
3. Measure per-route gzipped client JS against `progress/v13/bundle-baseline.json` (fail if any route grows > 60 KB); explain the ≈ −13 KB shift and check lazily loaded chunks
4. Check no new `"use client"` boundary swallows a server component tree unnecessarily
5. Record every result with numbers in this file

Your own running notes. Only you write here. The lead merges it into PROGRESS.md at checkpoints. Keep entries short; newest at the bottom.

## Files I own
(copy from the ownership map in CLAUDE.md)

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
