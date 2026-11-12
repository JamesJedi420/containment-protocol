# SPE-1095 — Recovery movement outcome seam (slice 1)

| Field             | Value                                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------------- |
| **Status**        | **In Progress** (producer seam; full thoroughfare AC deferred)                                                  |
| **Issue**         | [SPE-1095](https://linear.app/spectranoir/issue/SPE-1095/movement-channels-thoroughfare-flow-and-route-control) |
| **Consumer**      | [SPE-3735](https://linear.app/spectranoir/issue/SPE-3735) — keeps In Progress until full path evidenced         |
| **Branch**        | `jamesdyedbq/spe-1095-recovery-movement-outcome-seam`                                                           |
| **Base main SHA** | `c56297f1b2a8e925eab70036cbffd09e72731e89`                                                                      |

## Goal

Ship the smallest deterministic SPE-1095 recovery-movement outcome producer that emits real `RecoveryMovementEvidence` packets for SPE-3735 `confirmRecoveryMovement`, without equating arrival with verified recontainment and without implementing the full movement-channel / thoroughfare umbrella.

## Boundary

### In scope

- Pure domain producer `src/domain/recoveryMovementOutcome.ts`
- Resolve compact caller-owned attempt facts → `movementId` / `subjectRef` / `movementCommitted` / `arrivedAtDestination` / reason codes
- `toRecoveryMovementEvidence` maps outcomes to `{ producerOwner: 'SPE-1095', movementId, subjectRef, movementCommitted, arrivedAtDestination }`
- Contract tests including producer → `confirmRecoveryMovement` integration (`in_transit` / `admission_pending` / fail)
- SCHEMA_REGISTRY producer-owner note (no new persisted GameState map)
- Backlog / handoff sync

### Out of scope

- Marking SPE-1095 or SPE-3735 **Done**
- Full Linear thoroughfare AC (route classes, capacity/congestion, control points, hidden paths, cascading reroute)
- Pathfinding / navigation solver
- SPE-3735 coordinator mechanics changes
- GameState persistence / week-close / UI for movement outcomes
- Capture/combat systems (SPE-104 remains separate)

## Acceptance (this seam)

- [x] Deterministic committed success with stable `movementId` (in-transit and arrived packets)
- [x] Fail-closed `movementCommitted: false` for uncommitted movement, ineligible route, transit interrupted
- [x] Malformed attempts reject without evidence
- [x] Real producer evidence advances SPE-3735 to `in_transit` / `admission_pending` / rejects `movement_not_committed` without completing recovery
- [ ] Full SPE-1095 Linear thoroughfare acceptance — **deferred**

## Deferred

| Item                                         | Owner    | Why                                   |
| -------------------------------------------- | -------- | ------------------------------------- |
| Primary/secondary route class differentials  | SPE-1095 | Full thoroughfare AC remainder        |
| Capacity / congestion / bottleneck cascading | SPE-1095 | Full thoroughfare AC remainder        |
| Control-point accelerate / delay / deny      | SPE-1095 | Full thoroughfare AC remainder        |
| Hidden / newly opened route discovery        | SPE-1095 | Full thoroughfare AC remainder        |
| Player route-control actions                 | SPE-1095 | Full thoroughfare AC remainder        |
| Non-person traffic on same route logic       | SPE-1095 | Full thoroughfare AC remainder        |
| Persisted movement ledger / week-close / UI  | SPE-1095 | Schema seam only this slice           |
| SPE-3735 full acceptance §1 end-to-end Done  | SPE-3735 | Assignment claim + remaining deferred |

## Validation

- `npm run test:run -- src/test/recoveryMovementOutcome.contract.test.ts`
- `npm run verify:backlog-handoff` after backlog/manifest edits
