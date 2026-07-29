# SPE-2761 — Failure/cancellation prerequisite reservation release

| Field               | Value                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2761](https://linear.app/spectranoir/issue/SPE-2761/failurecancellation-prerequisite-reservation-release) |
| **Status**          | **Shipped**                                                                                                    |
| **Parent**          | [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028/department-workshop-and-processing-queue-model)       |
| **Branch**          | `agent/spe-2761-failure-cancellation-reservation-release`                                                      |
| **Base `main` SHA** | `0b6b8c40`                                                                                                     |

## Goal

Release exact inputs from an unconsumed case-scoped prerequisite-processing
reservation only after durable, canonical work-order proof says the order
failed or was cancelled.

## Acceptance

- A fail-closed terminal-signal registry records only explicit `failed` or
  `cancelled` proof with work-order, case, department, task, and week
  provenance.
- Registration derives provenance from the authored envelope and workshop
  order; malformed, future, completed, missing, and conflicting proof is
  rejected.
- Week close credits completed output first, refunds canonically terminalled
  reservations second, and attempts automatic successors last.
- Refunds restore the reservation's exact declared inputs atomically and remove
  only that reservation; invalid inventory or unsafe sums leave the affected
  work order untouched without blocking other cases.
- Terminal proof remains durable across save/load and prevents the same work
  order from being activated again. Replay never duplicates a refund.
- Fabrication, final production, case resolution, UI, operation events,
  workshop cleanup, and global queues are unchanged.

## Validation

- `npx vitest run src/test/prerequisiteProcessingOrders.test.ts src/test/dependentPrerequisiteActivation.test.ts src/test/departmentWorkshopPersistence.test.ts`
- `npm run lint`
- `npm run format:check`
- `npm run verify:backlog-handoff`
- `npm run test:run`

## Deferred

| Item                                | Owner              | Why deferred                                                                |
| ----------------------------------- | ------------------ | --------------------------------------------------------------------------- |
| Failure/cancellation decision logic | SPE-1028 follow-up | This slice consumes explicit proof and does not infer terminal lifecycle.   |
| Workshop lane and order cleanup     | SPE-1028 follow-up | Release owns inventory/reservations only; queue cleanup needs its own seam. |
| Final fabrication and case closure  | SPE-1028 follow-up | These remain outside prerequisite reservation accounting.                   |
| Global Fabrication and UI           | SPE-1028 follow-up | The durable case-owned registries remain the only integration surface.      |

Parent SPE-1028 remains **In Progress** because its broader workshop acceptance
criteria remain open.
