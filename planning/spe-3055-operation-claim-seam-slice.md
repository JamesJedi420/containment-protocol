# SPE-3055 — Operation claim seam (slice 1)

| Field             | Value                                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Status**        | **In Progress** (producer seam; full claim arbitration AC deferred)                                                 |
| **Issue**         | [SPE-3055](https://linear.app/spectranoir/issue/SPE-3055/operational-personnel-claim-arbitration)                   |
| **Consumer**      | [SPE-3735](https://linear.app/spectranoir/issue/SPE-3735) — keeps In Progress until full path evidenced             |
| **Parent**        | [SPE-1023](https://linear.app/spectranoir/issue/SPE-1023) — remains open                                            |
| **Branch**        | `jamesdyedbq/spe-3055-operation-claim-seam`                                                                         |
| **Base main SHA** | `f3284445f38e5550941fa7c128c6490268f74241`                                                                          |

## Goal

Ship the smallest deterministic SPE-3055 operational-personnel claim outcome producer that emits real `AssignmentClaimEvidence` packets for SPE-3735 `assignBreachRecovery`, without equating claim with deployment and without implementing the full claim/arbitration umbrella.

## Boundary

### In scope

- Pure domain producer `src/domain/operationalPersonnelClaimOutcome.ts`
- Resolve compact caller-owned attempt facts → `claimId` / `operationRef` / `claimed` / reason codes
- `toAssignmentClaimEvidence` maps outcomes to `{ producerOwner: 'SPE-3055', claimId, operationRef, claimed }`
- Thin SPE-3735 consume of typed claim evidence in `assignBreachRecovery` (persist `assignmentClaimRef`)
- Contract tests including producer → `assignBreachRecovery` integration
- SCHEMA_REGISTRY producer-owner note (no new persisted GameState map)
- Backlog / handoff sync

### Out of scope

- Marking SPE-3055, SPE-1023, or SPE-3735 **Done**
- Full Linear claim arbitration AC (priority matrix, coverage routing, composition change suite, save/load claim ledger)
- Second duty/readiness or squad-availability engine (SPE-1024 / SPE-1311 remain authoritative; consume via caller-owned refs/flags)
- SPE-2087 coverage-loss routing
- GameState persistence / week-close / UI for claim outcomes
- Capture/movement producers (SPE-104 / SPE-1095 remain separate)

## Acceptance (this seam)

- [x] Deterministic held claim with stable `claimId`
- [x] Fail-closed `claimed: false` for uncommitted claim, unsatisfied requirement set, higher-priority block
- [x] Malformed attempts reject without evidence
- [x] Real producer evidence advances SPE-3735 to `recovery_assigned` / rejects `assignment_claim_not_held` without completing recovery
- [ ] Full SPE-3055 Linear arbitration acceptance — **deferred**

## Deferred

| Item                                              | Owner    | Why                                      |
| ------------------------------------------------- | -------- | ---------------------------------------- |
| Lower-priority automated assignment respect suite | SPE-3055 | Full arbitration AC remainder            |
| Composition-change release/recompute              | SPE-3055 | Full arbitration AC remainder            |
| SPE-2087 coverage consequence routing             | SPE-2087 | Downstream coverage owner                |
| Persisted claim ledger / week-close / UI          | SPE-3055 | Schema seam only this slice              |
| SPE-3735 full acceptance §1 end-to-end Done       | SPE-3735 | Live wiring + remaining deferred         |

## Validation

- `npm run test:run -- src/test/operationalPersonnelClaimOutcome.contract.test.ts`
- `npm run test:run -- src/test/breachOriginRecovery.contract.test.ts`
- `npm run verify:backlog-handoff` after backlog/manifest edits
