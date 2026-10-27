# SPE-3406 — Managed cultivation lifecycle and environmental viability

| Field             | Value                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------- |
| **Status**        | **In progress**                                                                       |
| **Issue**         | [SPE-3406](https://linear.app/spectranoir/issue/SPE-3406)                             |
| **Parent**        | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — Backlog                    |
| **Branch**        | `jamesdyedbq/spe-3406-managed-cultivation-lifecycle-and-environmental-viability`      |
| **Base main SHA** | `36090c2134ea842eff87ff73156c1b09fabeda96`                                            |

## Delegated approval

**Decision:** `delegated_approve` SPE-3406  
**Authority:** `docs/cursor-delegated-backlog-approval.md` on `origin/main` @ `c88ed2915b1a02d632ce0e9f9a45e0b0b87d1753`  
**Date:** 2026-10-27  
**Continuation:** Explicit user request to run the shipping loop (Hermes unavailable)

### Queue state

- Manifest `primary`: SPE-1052; prior `inProgress` SPE-3417 now **Done** (PR #4427 @ `36090c21`)
- Clean `main`, no open PRs
- No SPE implementation slice In Progress on Linear (DA-* ignored)

### Candidates compared

| Candidate | Verdict |
| --- | --- |
| SPE-3439 / SPE-3441 / SPE-3451 / SPE-3452 / SPE-3385 / SPE-3181 | Open `blockedBy` |
| SPE-792 / SPE-1564 / SPE-1896 / SPE-3150 / SPE-1058 | Parent umbrellas (children or child-only completion) |
| SPE-3360 | Childless / unblocked but multi-owner production program; not preferred over SPE-3384 consumer |
| SPE-3343 / SPE-3344 | Open `blockedBy` (SPE-2266 / SPE-3291) |
| SPE-1817 / SPE-3396 | Eligible contradiction checks; deferred while SPE-1052 leaf exists |
| **SPE-3406** | Childless; no `blockedBy`; SPE-3384 unlock landed; coherent managed-cultivation boundary |

### Decision criteria

- **Priority:** Unlocks facility biological production after elapsed-time substrate
- **Dependency:** SPE-3384 Done; SPE-1058 gate consumed as labor declaration only
- **Feasibility:** Pure domain profiles/instances/viability/growth/harvest + registry sanitize
- **Scope:** One coding slice for the approved SPE-3406 boundary (no new Linear child)
- **Architectural readiness:** SPE-3384, SPE-1058, SPE-1060 contribution seam, SPE-1027 harvest handoff

### Duplication check

Not in `recentlyShipped`. SPE-1060 already accepts optional cultivation contribution input; this issue owns the producer lifecycle.

### Contradiction review

- SPE-3043 STOP: unrelated — no conflict
- SPE-3121 / SPE-3107 held: unrelated — no conflict
- Does not reopen SPE-118 / SPE-103 / SPE-1112 ecology umbrellas
- Does not invent a second elapsed-time clock (SPE-3384 remains authoritative)

### Eligibility checklist

- Exists / Backlog → In Progress: true
- Not recentlyShipped: true
- Not parent / no children: true
- AC fit one slice (profiles + viability + growth + harvest + persistence sanitize): true
- No open blockedBy: true
- Slice doc before feature code: true
- Approved implementation boundary: true

### Prohibitions honored

No new issue; SPE-1052 not selected as coding slice; independent PR review preserved.

## Approved boundary

- Pure domain `src/domain/managedCultivationLifecycle.ts` (+ focused tests)
- Authored profiles with material growth/yield/environment differences
- Viability from caller-owned facility/environment inputs
- Rate-based growth via SPE-3384; discrete harvest/maturity transitions
- Labor demand declaration for SPE-1058 (no parallel workforce)
- Canonical harvest handoff envelope (no SPE-1027 / SPE-3360 ownership)
- Ornamental contribution projector for SPE-1060
- Registry sanitize/hydrate round-trip (persistence contract)
- SCHEMA_REGISTRY + in-boundary docs

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Live `advanceWeek` wiring of cultivation growth | SPE-3406 follow-on / SPE-45 | Prove domain contract first |
| Facility-register UI surfacing | SPE-3359 | Projection consumer |
| Production-chain stage orchestration | SPE-3360 | Downstream owner |
| Wild flora / biome ecology | SPE-118 / SPE-182 | Explicitly out of scope |
