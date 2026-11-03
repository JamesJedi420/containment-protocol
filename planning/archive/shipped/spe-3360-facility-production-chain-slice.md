# SPE-3360 — Facility production-chain model

| Field             | Value                                                                    |
| ----------------- | ------------------------------------------------------------------------ |
| **Status**        | **Recently shipped**                                                     |
| **Issue**         | [SPE-3360](https://linear.app/spectranoir/issue/SPE-3360)                |
| **Parent**        | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — Backlog       |
| **Branch**        | `jamesdyedbq/spe-3360-facility-production-chain-model`                   |
| **Base main SHA** | `0b81cf30581ce382bd3fd9f324fc986205f54ed1`                               |

## Delegated approval

**Decision:** `delegated_approve` SPE-3360  
**Authority:** `docs/cursor-delegated-backlog-approval.md` on `origin/main` @ `c88ed2915b1a02d632ce0e9f9a45e0b0b87d1753`  
**Date:** 2026-10-27  
**Continuation:** Explicit user ship-loop request (Hermes unavailable)

### Queue state

- Manifest `primary`: SPE-1052; SPE-3406 merged Done (PR #4428 @ `0b81cf30`)
- Clean `main`, no open PRs
- No Containment Protocol implementation slice In Progress (Dead Air ignored)

### Candidates compared

| Candidate | Verdict |
| --- | --- |
| SPE-3439 | Skipped — live execution blocked on SPE-2995←SPE-1434 |
| SPE-3441 | Skipped — hard prerequisite SPE-3394 |
| SPE-3452 | Skipped — hard blocked on SPE-1084 |
| SPE-3181 | Skipped — parked after bounded #4356 |
| SPE-1896 / SPE-792 / SPE-1564 / SPE-3150 | Skipped — parent umbrellas |
| **SPE-3360** | Childless SPE-1052 leaf; no `blockedBy`; consumes shipped storage/labor/dependency seams |

### Decision criteria

- **Priority:** Unblocked facility production after SPE-3406 harvest handoff
- **Dependency:** SPE-1027 / SPE-1058 / SPE-3383 available as consumers
- **Feasibility:** Pure domain chain variants + stage resolution + sanitize
- **Scope:** One coding slice for the approved SPE-3360 boundary
- **Architectural readiness:** Cultivation harvest names SPE-3360 consumer

### Contradiction review

- SPE-3043 STOP: unrelated
- SPE-1027 / SPE-1657 / SPE-113: do not duplicate; handoff envelopes only

### Eligibility checklist

All true: exists Backlog→In Progress; not recentlyShipped; not umbrella; ACs fit one slice; no open blockers; slice doc on branch.

### Prohibitions honored

No new Linear issue/relationship; SPE-1052 not selected; PR review/CI mandatory.

## Boundary

Pure domain `facilityProductionChain.ts`: authored chain variants, stage resolution, recirculation guards, SPE-1058 labor consume, SPE-1027 handoff envelopes, SPE-3383-style dependency interruption reasons, optional registry sanitize. No GameState week-close wire, no UI, no parallel ledger.

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Live GameState stock debit / week-close | SPE-1027 / SPE-1052 | Handoff envelopes only this slice |
| Facility register columns | SPE-3359 | Status projection packet only |
| Site temporary crafting | SPE-1657 | Distinct owner |
| Permanent gear mutation | SPE-113 | Distinct owner |
