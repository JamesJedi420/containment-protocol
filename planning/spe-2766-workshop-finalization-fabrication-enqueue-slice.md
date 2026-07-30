# SPE-2766 — Canonical workshop finalization Fabrication enqueue

| Field               | Value                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Linear**          | [SPE-2766](https://linear.app/spectranoir/issue/SPE-2766/canonical-workshop-finalization-fabrication-enqueue)     |
| **GitHub**          | [#3402](https://github.com/JamesJedi420/containment-protocol/issues/3402)                                          |
| **Status**          | **Ready to ship**                                                                                              |
| **Parent**          | [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028/department-workshop-and-processing-queue-model)           |
| **Branch**          | `agent/spe-2766-workshop-finalization-fabrication-enqueue`                                                         |
| **Base `main` SHA** | `c9d30dc8`                                                                                                         |

## Goal

Consume a durable SPE-2765 case-scoped workshop finalization handoff to enqueue
global Fabrication once for the authored final recipe.

## Acceptance

- Open/in-progress cases with a valid `departmentWorkshopFinalizationHandoff`
  enqueue `finalRecipeId` onto `productionQueue` via `queueFabrication` rules.
- Week close runs enqueue immediately after SPE-2765 handoff reconcile
  (including game-over idempotent replay).
- A durable `departmentWorkshopFinalizationFabricationQueueId` blocks
  re-enqueue on save/load and repeated week close.
- Missing stock or underfunded agency leaves the handoff intact and does not
  set the consume marker.
- Closed/resolved cases and malformed handoffs fail closed; siblings stay
  isolated.
- Cases are not auto-resolved when Fabrication starts.

## Validation

- `npx vitest run src/test/sim.production.test.ts src/test/departmentWorkshopPersistence.test.ts`
- `npm run lint -- --quiet`
- `npm run verify:backlog-handoff`
- `npm run test:run` (non-trivial week-close path)

## Deferred

| Item                              | Owner              | Why deferred                                                                 |
| --------------------------------- | ------------------ | ---------------------------------------------------------------------------- |
| Automatic case closure            | SPE-1028 follow-up | Case lifecycle remains explicit and independent of Fabrication enqueue.      |
| Fabrication UI redesign           | SPE-1028 follow-up | Domain enqueue reuses existing production queue surfaces.                    |
| Facility modifiers and operations | Separate owners    | No safety, adjacency, quality, facility, report, or operation-event changes. |

Parent SPE-1028 remains **In Progress** because its broader workshop acceptance
criteria remain open.
