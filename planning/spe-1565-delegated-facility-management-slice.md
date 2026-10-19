# SPE-1565 — Delegated facility management model

| Field             | Value                                                                              |
| ----------------- | ---------------------------------------------------------------------------------- |
| **Status**        | **In progress**                                                                    |
| **Issue**         | [SPE-1565](https://linear.app/spectranoir/issue/SPE-1565)                          |
| **Parent**        | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — Backlog                |
| **Branch**        | `jamesdyedbq/spe-1565-delegated-facility-management-model`                          |
| **Base main SHA** | `510e3ff4`                                                                         |

## Delegated approval

**Decision:** `delegated_approve` SPE-1565  
**Authority:** `docs/cursor-delegated-backlog-approval.md` on `origin/main` blob `c88ed2915b1a02d632ce0e9f9a45e0b0b87d1753` (main `510e3ff4`)  
**Date:** 2026-10-19  
**Continuation:** Hermes full-task delegation after SPE-1563 merge (PR #4329)

### Queue state

- SPE-1563 Done / PR #4329 @ `510e3ff4`; clean main; no open PRs
- Remaining SPE-1052 children No priority → lowest SPE id (SPE-1565)

### Candidates compared

| Candidate | Verdict |
| --- | --- |
| SPE-1052 | Parent umbrella |
| SPE-1563 / SPE-1562 / SPE-1173 / SPE-1263 | Done / merged |
| SPE-1564 / SPE-1896 / SPE-3150 | Open children |
| SPE-3181+ / SPE-3362 / SPE-3406 | Eligible; higher SPE ids |
| **SPE-1565** | Eligible; four ACs; pure manager-state packets |

## Approved boundary

Pure caller-owned delegated facility management in `src/domain/delegatedFacilityManagement.ts`.

- Assigned managers/deputies run routine site control during player absence
- Separable competence / loyalty / ambition / autonomy risk bands
- Maintain vs improve vs compromise outcomes
- Direct-control vs operational-bandwidth tradeoff
- Authorized intent to consume existing SPE-3182 maintenance recovery (no free mint / private debt math)
- No GameState field, week-close wire, HR simulator, or facility UI

## API

| Symbol | Behavior |
| --- | --- |
| `projectDelegatedManagerAssignment` | Assign manager/deputy with attribute bands |
| `projectDelegatedAbsenceOperation` | Absence run outcome (maintain/improve/compromise) |
| `projectDelegatedManagerRiskEffects` | Attribute → maintenance/growth/compromise risk |
| `projectDelegationControlBandwidthTradeoff` | Direct control vs bandwidth tradeoff |
| `projectDelegatedMaintenanceRecoveryIntent` | Authorized reuse of existing recovery transaction |
| Acceptance fixture | Composed in contract tests from the projectors above (not exported from domain) |

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Live GameState / week-close wiring | future consumer | Pure layer only |
| Full HR simulator | out of constraints | Explicitly excluded |
| Facility register UI | SPE-3359 | UI out of boundary |

## Validation

- `npm exec vitest run -- src/test/delegatedFacilityManagement.contract.test.ts`
- `npm run verify:backlog-handoff`
