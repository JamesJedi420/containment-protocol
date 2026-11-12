# SPE-1028 child — Workshop completion outcome bridge

| Field               | Value                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2754](https://linear.app/spectranoir/issue/SPE-2754/workshop-completion-outcome-bridge)             |
| **Status**          | **Shipped**                                                                                              |
| **Parent**          | [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028/department-workshop-and-processing-queue-model) |
| **Branch**          | `agent/spe-1028-workshop-completion-outcome-bridge`                                                      |
| **Base `main` SHA** | `8c7e1ec9`                                                                                               |

## Goal

Map every newly completed persisted workshop order to one explicit, durable
downstream `completed` receipt, with no modifiers or case-queue mutation.

## Ownership and ordering

- SPE-2745 remains the owner of work completion detection and removal from
  workshop lanes.
- SPE-2747 registries remain the source of work-order identity and authored
  department/case/task fields.
- SPE-2753 remains the single processing tick at campaign week close.
- This slice consumes only that tick's `completedWorkOrderIds`, immediately
  after the tick, and owns the durable completion-receipt registry.
- Receipts are keyed by work-order ID; an existing receipt prevents duplicate
  emission across replays and save/load.

## Acceptance

- [x] A completed order produces one `completed` outcome with its authored
      department, case, task type, and closing week.
- [x] The bridge is deterministic, immutable, and stable under duplicate or
      reordered completion IDs.
- [x] A subsequent close and a save/load replay do not emit a second receipt.
- [x] Workshop queues and the global case queue remain unchanged except for
      the existing SPE-2753 lane completion transition.
- [x] No adjacency, quality, safety, facilities, UI, SPE-95, SPE-2088, or
      SPE-2703 behavior changes.

## Validation

- `npm run test:run -- src/test/departmentWorkshopPersistence.test.ts src/test/departmentWorkshopQueue.test.ts`
- `npm run lint -- --quiet`
- `npm run verify:audits-index`
- `npm run verify:backlog-handoff`
- `npm run verify:theme-contracts`

## Deferred

| Item                                                                      | Suggested owner       | Boundary                                                                             |
| ------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------ |
| Applying completion receipts to inventory, quality, safety, or facilities | Future SPE-1028 child | SPE-2755 selects the case-record ledger only; every other consumer remains deferred. |
| Duration-aware SPE-2084 coordination policy                               | Future SPE-1028 child | SPE-2084 retains workload-delay ownership.                                           |

Parent SPE-1028 remains open because its broader workshop acceptance
criteria remain open.
