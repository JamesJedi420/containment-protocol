# SPE-2752 — Canonical workshop enqueue and priority write seam

| Field               | Value                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Linear**          | [SPE-2752](https://linear.app/spectranoir/issue/SPE-2752/canonical-workshop-enqueue-and-priority-write-seam) |
| **Status**          | **Shipped**                                                                                                  |
| **Parent**          | [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028/department-workshop-and-processing-queue-model)     |
| **Branch**          | `agent/spe-2752-workshop-enqueue-priority`                                                                   |
| **Base `main` SHA** | `3bc69777c49328b45c649a409577fc5d578dbb40`                                                                   |

## Goal

Add the first canonical workshop write path: deterministic, immutable work-order
creation/enqueue and queued-lane priority writes over SPE-2747's durable
registries, without processing the work.

## Boundary

- Reuse SPE-2745 contracts and validation, SPE-2747 sanitization/read state,
  and SPE-2083 authored department/task eligibility.
- `enqueueDepartmentWorkshopWorkOrder` inserts a valid work order into the
  target department's queued lane at the end of that lane.
- `prioritizeDepartmentWorkshopWorkOrder` moves one existing queued item to the
  front, preserving the relative order of every other queued item.
- Writes return frozen success/failure results, preserve code-unit registry
  order, and only replace workshop registries in `GameState`.
- A zero-capacity snapshot may accept a queued order; capacity governs later
  processing, which remains out of scope.

## Acceptance

- [x] Valid eligible work orders enqueue deterministically with stable registry
      and queue ordering.
- [x] Malformed data, unsupported tasks, duplicate IDs/case workloads, missing
      definitions/snapshots, and wrong priority lanes fail closed with explicit
      reason codes.
- [x] Pure writes do not mutate or alias caller state and replay identically.
- [x] Store actions write only workshop registries; save/load round-trips and
      reset returns empty workshop state.
- [x] Week-close and the global case queue remain unchanged.

## Validation

- `npm run test:run -- src/test/departmentWorkshopWrites.test.ts src/test/departmentWorkshopPersistence.test.ts src/test/departmentWorkshopQueue.test.ts src/app/store/gameStore.test.ts src/app/store/saveSystem.test.ts`
- `npm run lint -- --quiet`
- `npm run verify:audits-index`
- `npm run verify:backlog-handoff`
- `npm run verify:theme-contracts`

## Deferred

| Item                                             | Suggested owner       | Why deferred                                                  |
| ------------------------------------------------ | --------------------- | ------------------------------------------------------------- |
| Workshop processing/advance tick                 | Future SPE-1028 child | Enqueue does not choose when work starts or progresses.       |
| Week-close ordering                              | Future SPE-1028 child | Requires an explicit idempotent orchestration contract.       |
| Adjacency, quality, safety, and facility effects | Future SPE-1028 child | These require independent gameplay inputs and outcome policy. |
| SPE-2703 prerequisite planning                   | SPE-2703              | This seam accepts explicit caller-owned orders only.          |

No `GameState` fields or save schema fields were added, so `SCHEMA_REGISTRY.md`
remains accurate without modification. Parent SPE-1028 remains Backlog.
