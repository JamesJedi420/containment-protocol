# SPE-3384 — Elapsed-time invariant simulation updates

| Field             | Value                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------- |
| **Status**        | **Recently shipped**                                                                  |
| **Issue**         | [SPE-3384](https://linear.app/spectranoir/issue/SPE-3384)                             |
| **Parent**        | [SPE-1071](https://linear.app/spectranoir/issue/SPE-1071) — Backlog                    |
| **Branch**        | `jamesdyedbq/spe-3384-elapsed-time-invariant-simulation-updates`                      |
| **Base main SHA** | `c57014559d0098429e2d705d498532506706670b`                                            |

## Delegated approval

**Decision:** `delegated_approve` SPE-3384  
**Authority:** `docs/cursor-delegated-backlog-approval.md` on `origin/main` @ `c88ed2915b1a02d632ce0e9f9a45e0b0b87d1753`  
**Date:** 2026-10-27  
**Continuation:** Hermes autonomous shipping (`CP_DISPATCH_ID=a0ec9b87b821caf7e6fc9e4c`)

### Queue state

- Manifest `primary`: SPE-1052; stale `inProgress` SPE-3470 (Linear **Done**, PR #4425 @ `c5701455`)
- Clean `main`, no open PRs
- Recommended next named no concrete eligible SPE-1052 leaf
- No SPE implementation slice In Progress on Linear (DA-* ignored)

### Candidates compared

| Candidate | Verdict |
| --- | --- |
| SPE-1052 / SPE-1564 / SPE-792 / SPE-3150 | Parent umbrellas |
| SPE-3470 | Done / merged — handoff stale only |
| SPE-3439 / SPE-3441 / SPE-3451 / SPE-3452 / SPE-3385 | Open `blockedBy` |
| SPE-1058 / SPE-1896 / SPE-3181 / SPE-2794 / SPE-120 | James assignee; no delegate |
| SPE-3360 / SPE-3406 | Not one coherent coding slice |
| SPE-3394 | Soft-depends on SPE-120 |
| SPE-3343 / SPE-3344 | Open `blockedBy` |
| SPE-3457 | Deferred — hard live-case input verification risk |
| SPE-3417 | Eligible contradiction check; deferred behind this substrate |
| **SPE-3384** | Childless; no `blockedBy`; coherent ACs; unlocks SPE-3406 |

### Eligibility checklist

- Exists / Backlog → In Progress: true
- Not recentlyShipped: true
- Not parent / no children: true
- AC fit one slice: true
- No open blockedBy: true
- Slice doc before feature code: true
- Ownership: `delegate`/`assignee` absent at pick

## Approved boundary

Pure deterministic elapsed-time update contract in `src/domain/elapsedTimeInvariantUpdate.ts`:

- Rate-based producers consume authoritative elapsed units (not scheduler invocations)
- Fine vs coarse cadence equivalence for equal elapsed time
- Integer remainder handling for discrete stored values
- Two representative producers: accumulation/repair-like and decay/exposure-like
- Explicit discrete/event-counted producer path (not converted to rate)
- No second clock/scheduler; SPE-1071 remains campaign-time owner; SPE-3180 untouched
- No GameState persistence schema unless remainder persistence is required (prefer non-persisted remainder in result)

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Subjective/local time dilation | SPE-3180 | Separate contradiction boundary |
| Managed cultivation growth consumer | SPE-3406 | Consumer of this contract |
| Live advanceWeek wiring of all rate producers | Existing owners | Prove contract via fixtures first |

## Validation

- Targeted: `npm exec vitest run -- src/test/elapsedTimeInvariantUpdate.test.ts` (8 passed)
- `npm run verify:backlog-handoff`
- ESLint on touched files
