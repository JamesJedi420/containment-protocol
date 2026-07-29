# SPE-2762 — Canonical failure/cancellation lifecycle signal producer

| Field               | Value                                                                                                             |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Linear**          | [SPE-2762](https://linear.app/spectranoir/issue/SPE-2762/canonical-failurecancellation-lifecycle-signal-producer) |
| **Status**          | **Shipped**                                                                                                       |
| **Parent**          | [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028/department-workshop-and-processing-queue-model)          |
| **Branch**          | `agent/spe-2762-canonical-failure-cancellation-lifecycle-signals`                                                 |
| **Base `main` SHA** | `f9114df4`                                                                                                        |

## Goal

Produce durable prerequisite work-order terminal proof only from explicit
canonical case lifecycle dispositions, never by inferring failure or
cancellation from ordinary case state.

## Acceptance

- Canonical case resolution returns an explicit `failed` disposition only for
  a real `fail` outcome; success, partial, deadline, assignment, status, and
  lifecycle-stage changes produce no disposition.
- Lifecycle orchestration expands an explicit `failed` or `cancelled`
  disposition over matching reserved prerequisite orders in stable work-order
  order and delegates every write to the existing terminal registrar.
- Identical replay is a no-op, conflicting durable proof remains
  first-write-wins, and malformed provenance is isolated per work order and
  case.
- Week close carries failure proof into the existing completion → release →
  successor sequence. Pre-existing or same-week completion wins and completed
  inputs are never refunded.
- Producer-created proof and its one-time release remain idempotent across
  save/load without a persistence or operation-event schema change.
- Workshop cleanup, Fabrication, final case closure, UI, and global queues are
  unchanged.

## Validation

- `npx vitest run src/test/caseLifecycleWeeklyOrchestration.test.ts src/test/sim.advanceWeek.test.ts src/test/prerequisiteProcessingOrders.test.ts src/test/departmentWorkshopPersistence.test.ts`
- `npm run lint`
- `npm run format:check`
- `npm run verify:backlog-handoff`
- `npm run test:run`

## Deferred

| Item                            | Owner              | Why deferred                                                                |
| ------------------------------- | ------------------ | --------------------------------------------------------------------------- |
| Canonical cancellation command  | SPE-1028 follow-up | No production store/UI cancellation owner exists; callers must be explicit. |
| Workshop lane and order cleanup | SPE-1028 follow-up | Signal production owns proof only, not queue membership or cleanup.         |
| Final fabrication/case closure  | SPE-1028 follow-up | Those lifecycles remain outside prerequisite reservation accounting.        |
| Global Fabrication and UI       | SPE-1028 follow-up | This slice changes only pure domain and existing week-close orchestration.  |

Parent SPE-1028 remains **In Progress** because its broader workshop acceptance
criteria remain open.
