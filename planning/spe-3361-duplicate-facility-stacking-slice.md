# SPE-3361 — Duplicate facility stacking rules

| Field             | Value                                                                              |
| ----------------- | ---------------------------------------------------------------------------------- |
| **Status**        | **In progress**                                                                    |
| **Issue**         | [SPE-3361](https://linear.app/spectranoir/issue/SPE-3361)                          |
| **Parent**        | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — Backlog                |
| **Branch**        | `jamesdyedbq/spe-3361-duplicate-facility-stacking-rules`                            |
| **Base main SHA** | `8fc38166`                                                                         |

## Delegated approval

**Decision:** `delegated_approve` SPE-3361  
**Authority:** `docs/cursor-delegated-backlog-approval.md` on `origin/main` blob `c88ed2915b1a02d632ce0e9f9a45e0b0b87d1753` (main `8fc38166`)  
**Date:** 2026-10-19  
**Continuation:** Hermes full-task delegation after SPE-1565 merge (PR #4330); SPE-3181 withdrawn same session

### Queue state

- SPE-1565 Done / PR #4330 @ `8fc38166`; clean main; no open PRs
- SPE-3181 returned to Backlog (completion rule not one pure slice)

### Candidates compared

| Candidate | Verdict |
| --- | --- |
| SPE-1052 | Parent |
| SPE-3181 | Withdrawn — GameState / SPE-3041 / SPE-1135 completion rule |
| SPE-3359 | Facility register UI — UI-bound |
| SPE-3188 / SPE-3189 / SPE-3360 / SPE-3406 | Larger contracts |
| **SPE-3361** | Eligible; five ACs; compact pure stacking packets |

## Approved boundary

Pure caller-owned duplicate-facility stacking in `src/domain/duplicateFacilityStacking.ts`.

- Bounded stacking benefit with diminishing returns / hard cap
- Staffing / upkeep / spatial / maintenance / vulnerability burden projection
- Disabled/damaged duplicate reduces effective output deterministically
- Distinct from generic effect stacking / equipment modifiers
- No GameState, week-close wire, optimization puzzle, or facility UI

## API

| Symbol | Behavior |
| --- | --- |
| `projectDuplicateFacilityStack` | Stack count → bounded benefit + diminishing returns |
| `projectDuplicateFacilityBurden` | Burden bands from redundant count |
| `projectDisabledDuplicateStackEffect` | Disabled units change effective output |
| Acceptance fixture | Composed in contract tests |

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Live GameState / register UI wiring | SPE-3359 / future consumers | Pure layer only |
| Generic effect stacking policy | existing owners | Distinct boundary |
| Full SPE-3181 recurring requirements | SPE-3181 | Separate child; remains Backlog |

## Validation

- `npm exec vitest run -- src/test/duplicateFacilityStacking.contract.test.ts`
- `npm run verify:backlog-handoff`
