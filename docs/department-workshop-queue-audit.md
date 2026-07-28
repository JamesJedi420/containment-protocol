# Department workshop queue audit

This checklist records the bounded SPE-2745/SPE-1028 queue-and-slot foundation and
the boundaries that later workshop slices must preserve.

## Canonical owners

| Concern                                       | Owner                                                 |
| --------------------------------------------- | ----------------------------------------------------- |
| Department capabilities and task eligibility  | `src/domain/departmentCapabilities.ts` (SPE-2083)     |
| Coordination delay over workload snapshots    | `src/domain/departmentCoordination.ts` (SPE-2084)     |
| Workshop queue/slot contracts and transitions | `src/domain/departmentWorkshopQueue.ts` (SPE-2745)    |
| Durable work-order/snapshot registries        | `GameState` + `hydrateGame` (SPE-2747)                |
| Canonical enqueue and queued-lane priority    | `departmentWorkshopQueue.ts` + `gameStore` (SPE-2752) |
| Global case queue                             | `src/domain/sim/queue.ts`                             |
| Facility upgrade/effect aggregation           | `src/domain/facility.ts`                              |
| Campaign week-close ordering                  | `src/domain/sim/advanceWeek.ts`                       |

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

SPE-2747 adds `readDepartmentWorkshopState`, which sanitizes the two optional
GameState registries before this projection is called. The read seam returns
frozen work-order and snapshot maps, preserves lane order, and never advances
work. SPE-2084 still owns coordination delay and receives the same validated
snapshot/work-order contract it consumed before persistence existed.

## Canonical writes

SPE-2752 adds `enqueueDepartmentWorkshopWorkOrder` and
`prioritizeDepartmentWorkshopWorkOrder`. Enqueue appends a valid, eligible
order to an existing department snapshot's queued lane; priority moves an
existing queued order to the front while preserving the remaining lane order.
Both write paths return frozen results, reject duplicate work-order IDs and case
workloads, and replace only the two workshop registries through `gameStore`.
They never fill slots, advance work, change global case-queue priorities, or
depend on a positive slot capacity.

## Persistence and hydration

- `departmentWorkshopWorkOrders` is keyed by embedded work-order ID.
- `departmentWorkshopSnapshots` is keyed by embedded department ID.
- New and legacy games receive fresh empty maps; missing fields do not inherit
  workshop records from a hydration fallback.
- Valid keys are inserted in code-unit order. Integer-index IDs are rejected
  because JavaScript would enumerate them ahead of canonical insertion order.
- Key/ID mismatches, missing departments, unsupported tasks, malformed
  capacity/progress, lane duplicates, and foreign-department membership drop
  only the affected registry sibling.
- Static SPE-2083 department definitions remain authored data and are never
  copied into GameState or manual saves.
- `GAME_STORE_VERSION` and `GAME_SAVE_VERSION` remain unchanged.

## Isolation checks

- SPE-2747 may persist these contracts, but must not add a processing hook.
- SPE-2752 may enqueue or reorder only an existing workshop queued lane; it must
  not start, advance, pause, resume, or complete work.
- Do not call workshop advancement from `advanceWeek` in SPE-2745.
- Do not reuse or mutate `GameState.caseQueue`.
- Do not derive workshop slots from facility effects until a later slice defines
  that integration.
- Do not add SPE-2084 delay to SPE-95's global coordination penalty.
- Do not add UI, persistence, quality, adjacency, safety, research, or crafting
  behavior under this kernel.

## Tests

- `src/test/departmentWorkshopQueue.test.ts`
- `src/test/departmentWorkshopPersistence.test.ts`
- `src/test/departmentWorkshopWrites.test.ts`
- `src/test/departmentCoordination.test.ts`
- `src/test/missionIntakeDepartmentCapabilities.integration.test.ts`
- `src/test/queue.test.ts`
- `src/test/facility.test.ts`
- `src/test/sim.coordinationFriction.test.ts`
- `test/boundary-enforcement.test.ts`
