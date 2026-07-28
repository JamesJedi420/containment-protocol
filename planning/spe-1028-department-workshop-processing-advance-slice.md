# SPE-2753 — Deterministic department workshop processing and advance hook

| Field               | Value                                                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2753](https://linear.app/spectranoir/issue/SPE-2753/deterministic-department-workshop-processing-and-advance-hook) |
| **Status**          | **In progress**                                                                                                         |
| **Parent**          | [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028/department-workshop-and-processing-queue-model)                |
| **Branch**          | `agent/spe-2753-workshop-processing-advance`                                                                            |
| **Base `main` SHA** | `0310ae62`                                                                                                              |

## Goal

Run the first deterministic, persisted workshop processing tick once at campaign
week close, reusing the SPE-2745 queue kernel and SPE-2747 registries without
creating a second workflow or altering global queues.

## Ownership and ordering

- `processDepartmentWorkshopTick` owns immutable, code-unit department-order
  traversal of the two canonical workshop registries.
- `advanceDepartmentWorkshopQueue` remains the owner of one department's slot,
  queued/active/paused, progress, and completion semantics.
- `advanceWeek` owns timing: after finalized campaign state has preserved the
  canonical workshop registries, before downstream persisted-record hooks.
- Only `departmentWorkshopWorkOrders` and `departmentWorkshopSnapshots` may
  be written. Work-order definitions remain after completion; completion is
  represented by removal from all snapshot lanes.

## Acceptance

- [x] One week-close call advances every valid department snapshot once in
      stable department-ID order.
- [x] Replay, ordering, no-mutation, zero-capacity, completed-work, global
      queue isolation, and save round-trip behavior are covered.
- [x] Empty or paused-only snapshots remain unchanged; zero capacity remains a
      deterministic no-op with its existing reason code.
- [x] No adjacency, quality, safety, facility, UI, SPE-95, SPE-2088, or
      SPE-2703 behavior changes.

## Validation

- `npm run test:run -- src/test/departmentWorkshopPersistence.test.ts src/test/departmentWorkshopQueue.test.ts`
- `npm run test:run`
- `npm run lint -- --quiet`
- `npx prettier --check src/domain/departmentWorkshopQueue.ts src/test/departmentWorkshopPersistence.test.ts docs/department-workshop-queue-audit.md planning/spe-1028-department-workshop-processing-advance-slice.md planning/backlog.md planning/backlog-handoff-manifest.json`
- `npm run verify:audits-index`
- `npm run verify:backlog-handoff`
- `npm run verify:theme-contracts`

The repository-wide `npm run format:check` remains a pre-existing failure over
many untouched files, including existing formatting in `advanceWeek.ts`; the
newly formatted files pass the targeted Prettier check.

## Deferred

| Item                                             | Suggested owner       | Why deferred                                                                                |
| ------------------------------------------------ | --------------------- | ------------------------------------------------------------------------------------------- |
| Adjacency, quality, safety, and facility effects | Future SPE-1028 child | This tick deliberately applies only kernel work units; it has no outcome modifiers.         |
| Completion outputs and case/work-order routing   | Future SPE-1028 child | Completed orders leave their active/queued/paused lanes but do not create broader outcomes. |
| Duration-aware SPE-2084 coordination policy      | Future SPE-1028 child | SPE-2084 remains the owner of workload delay and current occupancy projection.              |
| Automatic prerequisite orders                    | SPE-2703              | This slice processes explicit orders only.                                                  |

Parent SPE-1028 remains **Backlog** because its broader workshop acceptance
criteria remain open.
