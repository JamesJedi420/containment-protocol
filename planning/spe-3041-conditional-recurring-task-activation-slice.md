# SPE-3041 — Conditional recurring task activation contract

| Field | Value |
| --- | --- |
| **Status** | **In progress** |
| **Issue** | [SPE-3041](https://linear.app/spectranoir/issue/SPE-3041) |
| **Parent** | [SPE-1287](https://linear.app/spectranoir/issue/SPE-1287) — Backlog |
| **Branch** | `jamesdyedbq/spe-3041-conditional-recurring-task-activation-contract` |
| **Base main SHA** | `61de2e21f122fdec660573c6cdbf14e4443a14f4` |

## Delegated approval

**Decision:** `delegated_approve` SPE-3041  
**Authority:** `docs/cursor-delegated-backlog-approval.md` on `origin/main` @ `c88ed2915b1a02d632ce0e9f9a45e0b0b87d1753`  
**Date:** 2026-10-27  
**Continuation:** Explicit user ship-loop request (Hermes unavailable)

### Queue state

- Manifest `primary`: SPE-1052; SPE-2771 Done (PR #4435 @ `61de2e21`)
- Clean `main` at pick; no open PRs
- Branch created before audit evidence

### Candidates compared

| Candidate | Verdict |
| --- | --- |
| **SPE-3041** | Winner — unblocks SPE-3181 activation |
| SPE-3439 / SPE-3452 | Hard blocked |
| SPE-3451 | Defer — large UI/construction bar |
| SPE-3056 | Blocked by SPE-3055 |
| SPE-1052 umbrellas | Rejected |

### Eligibility checklist

All true.

### Prohibitions honored

No new Linear issue/relationship; parent umbrellas not coding slice; PR review/CI mandatory.

## Boundary

- Pure condition/recurrence activation contract + SPE-1287 envelope handoff records
- Consume SPE-3181 `Spe3041ActivationIntent` as one producer exemplar
- Second producer fixture for completion rule (two subsystems)
- Idempotent activation identity; inspectable pass/fail/unavailable diagnostics
- No staffing/reservation/progress engine; no full SPE-1287 scheduler UI

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Full SPE-1287 timed-ops queue runtime | SPE-1287 | Envelope handoff only this slice |
| SPE-3056 suspension/resume | SPE-3056 | Blocked by SPE-3055 |
| Live week-close wire of all producers | Producer owners | Contract + two fixtures this slice |

## Implementation

- Domain: `src/domain/conditionalRecurringTaskActivation.ts`
- Tests: `src/domain/conditionalRecurringTaskActivation.test.ts`
- Docs: in-boundary note on SPE-3181 slice / audit as needed
