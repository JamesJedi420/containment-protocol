# Department workshop queue audit

This checklist records the bounded SPE-2745/SPE-1028 queue-and-slot foundation and
the boundaries that later workshop slices must preserve.

## Canonical owners

| Concern                                      | Owner                                              |
| -------------------------------------------- | -------------------------------------------------- |
| Department capabilities and task eligibility | `src/domain/departmentCapabilities.ts` (SPE-2083)  |
| Coordination delay over workload snapshots   | `src/domain/departmentCoordination.ts` (SPE-2084)  |
| Caller-owned workshop queue/slot transitions | `src/domain/departmentWorkshopQueue.ts` (SPE-2745) |
| Global case queue                            | `src/domain/sim/queue.ts`                          |
| Facility upgrade/effect aggregation          | `src/domain/facility.ts`                           |
| Campaign week-close ordering                 | `src/domain/sim/advanceWeek.ts`                    |

## Workshop snapshot invariants

- `departmentId` resolves to one validated SPE-2083 definition.
- `slotCapacity` is a non-negative integer.
- `queued`, `active`, and `paused` arrays are dense and preserve caller order.
- A work-order ID occurs in at most one lane.
- Active membership never exceeds slot capacity.
- Every referenced work order exists, targets the same department, and uses one
  of that department's authored task types.
- Progress is a non-negative integer below `requiredWork`.
- Completed work does not remain in any snapshot lane.

Malformed inputs fail closed with a deterministic reason and no synthesized
snapshot. Zero capacity is a valid snapshot but blocks advancement while
returning an immutable copy of the caller state.

## Processing tick

One call to `advanceDepartmentWorkshopQueue` is one abstract processing tick:

1. Fill open slots from the front of `queued`.
2. Advance each active item by one unit in active order.
3. Remove completed items in active order.
4. Backfill freed slots from `queued`; replacements begin advancing next tick.

Paused work neither consumes capacity nor advances. Pause/resume operations
preserve progress. Resume requires an open slot and does not silently reorder the
waiting queue.

## SPE-2084 compatibility

`projectDepartmentWorkshopWorkload` maps:

| Workshop field            | SPE-2084 workload field |
| ------------------------- | ----------------------- |
| `departmentId`            | `departmentId`          |
| active cases, then queued | `queuedCaseIds`         |
| `slotCapacity`            | `weeklyCapacity`        |
| paused work               | excluded                |

Active case IDs lead the projection because they occupy the current capacity
batch. Duplicate projected case IDs fail closed so coordination delay is never
silently undercounted. Zero slot capacity projects as zero; SPE-2084 remains the
owner of the resulting `zero-department-capacity` coordination block.

The projection is a structural/current-occupancy compatibility view. It does not
fold remaining multi-tick work duration into SPE-2084's coarse weekly-capacity
formula. A later SPE-1028 integration child must define that throughput policy
before treating workshop duration as authoritative coordination delay.

## Isolation checks

- Do not add these snapshots to `GameState` in SPE-2745.
- Do not call workshop advancement from `advanceWeek` in SPE-2745.
- Do not reuse or mutate `GameState.caseQueue`.
- Do not derive workshop slots from facility effects until a later slice defines
  that integration.
- Do not add SPE-2084 delay to SPE-95's global coordination penalty.
- Do not add UI, persistence, quality, adjacency, safety, research, or crafting
  behavior under this kernel.

## Tests

- `src/test/departmentWorkshopQueue.test.ts`
- `src/test/departmentCoordination.test.ts`
- `src/test/missionIntakeDepartmentCapabilities.integration.test.ts`
- `src/test/queue.test.ts`
- `src/test/facility.test.ts`
- `src/test/sim.coordinationFriction.test.ts`
- `test/boundary-enforcement.test.ts`
