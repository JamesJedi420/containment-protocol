# Department workshop queue audit

This checklist records the bounded SPE-2745/SPE-1028 queue-and-slot foundation and
the boundaries that later workshop slices must preserve.

## Canonical owners

| Concern                                       | Owner                                                     |
| --------------------------------------------- | --------------------------------------------------------- |
| Department capabilities and task eligibility  | `src/domain/departmentCapabilities.ts` (SPE-2083)         |
| Coordination delay over workload snapshots    | `src/domain/departmentCoordination.ts` (SPE-2084)         |
| Workshop queue/slot contracts and transitions | `src/domain/departmentWorkshopQueue.ts` (SPE-2745)        |
| Durable work-order/snapshot registries        | `GameState` + `hydrateGame` (SPE-2747)                    |
| Canonical enqueue and queued-lane priority    | `departmentWorkshopQueue.ts` + `gameStore` (SPE-2752)     |
| Registry-level processing tick                | `processDepartmentWorkshopTick` (SPE-2753)                |
| Completion outcome receipt                    | `registerDepartmentWorkshopCompletionOutcomes` (SPE-2754) |
| Completion output quality grade               | `resolveDepartmentWorkshopCompletionQuality` (SPE-2768)   |
| Completion unsafe-processing safety           | `resolveDepartmentWorkshopCompletionSafety` (#3411)       |
| Completion receipt case consumer              | case-local receipt ledger at `advanceWeek` (SPE-2755)     |
| Prerequisite processing plan                  | `prerequisiteProcessing.ts` (SPE-2703 kernel)             |
| Case-scoped processing-order envelopes        | `prerequisiteProcessingOrders.ts` + `GameState` (SPE-2757) |
| Global case queue                             | `src/domain/sim/queue.ts`                                 |
| Facility upgrade/effect aggregation           | `src/domain/facility.ts`                                  |
| Campaign week-close ordering                  | `src/domain/sim/advanceWeek.ts`                           |

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

SPE-2753 owns the registry-level traversal: it sanitizes through the durable
read seam, advances each snapshot once in code-unit department-ID order, and
returns a new frozen registry only when an item actually starts, advances, or
completes. `advanceWeek` calls that pure tick once after final campaign state
preserves the canonical registries and before downstream persisted-record hooks.
Completed definitions remain in the work-order registry but are removed from
all snapshot lanes, so a repeat tick cannot advance them again.

The completion bridge runs immediately after that one tick at the same
week-close seam. It maps each newly completed work-order ID to exactly one
persisted `completed` receipt keyed by that ID, carrying the authored
department, case, task type, closing week, SPE-2768 `quality` grade
(`nominal` by default; `degraded` plus a stable reason when caller-owned
condition axes mark poor input, specialist, or room state), and unsafe-processing
`safety` disposition (`safe` by default; `unsafe` plus a stable reason when
caller-owned isolation, ventilation, PPE, or dual-auth axes are poor). Quality
`roomContamination` is not safety contamination: the two grades are orthogonal.
Existing receipts win, so a replay or save/load cannot create a duplicate or
rewrite quality or safety. The receipt is deliberately not a case resolution,
global queue write, adjacency/facility modifier, or incident spawn. SPE-2755
then consumes the sanitized durable receipt registry into only the matching
non-resolved case's `departmentWorkshopCompletionWorkOrderIds` ledger. The
ledger is sorted and deduplicated, so it is the case-side idempotency boundary
across close replays and save/load. Missing/resolved cases, the global queue,
inventory, adjacency, live facility wiring, and secondary-incident producers
remain outside this seam. Live facility/staff projection into quality or safety
conditions is a later SPE-1028 child.

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
- `advanceWeek` calls only `processDepartmentWorkshopTick` once; do not add a
  second processing hook or call per-department advancement from another
  week-close path. Its completion bridge consumes that one tick's completion
  IDs only.
- Do not reuse or mutate `GameState.caseQueue`.
- Only the authored open case may consume a completion receipt; do not use this
  case-local ledger to resolve, reprioritize, or otherwise advance case flow.
- `planPrerequisiteProcessing` is a pure draft planner: do not treat its stock
  allocations as inventory reservations or its dependency IDs as persisted work
  order lifecycle state.
- SPE-2757 envelopes are durable, case-owned planner outputs only. They do not
  reserve inventory, create workshop work orders, enqueue work, emit completion
  output, or change the global case queue.
- Do not derive workshop slots from facility effects until a later slice defines
  that integration.
- Do not add SPE-2084 delay to SPE-95's global coordination penalty.
- Do not add UI, adjacency, research, or crafting behavior under this kernel.
  SPE-2768 may grade quality and #3411 may grade safety on completion receipts
  from caller-owned conditions only; neither invents live facility/staff wiring,
  inventory mutation, or secondary-incident spawn.

## Tests

- `src/test/departmentWorkshopQueue.test.ts`
- `src/test/departmentWorkshopPersistence.test.ts`
- `src/test/departmentWorkshopWrites.test.ts`
- `src/test/prerequisiteProcessing.test.ts`
- `src/test/prerequisiteProcessingOrders.test.ts`
- `src/test/departmentCoordination.test.ts`
- `src/test/missionIntakeDepartmentCapabilities.integration.test.ts`
- `src/test/queue.test.ts`
- `src/test/facility.test.ts`
- `src/test/sim.coordinationFriction.test.ts`
- `test/boundary-enforcement.test.ts`
