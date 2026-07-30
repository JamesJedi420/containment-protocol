# SPE-2767 — Automatic case closure after workshop Fabrication enqueue

| Field               | Value                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Linear**          | [SPE-2767](https://linear.app/spectranoir/issue/SPE-2767/automatic-case-closure-after-workshop-fabrication-enqueue)     |
| **GitHub**          | [#3405](https://github.com/JamesJedi420/containment-protocol/issues/3405)                                                |
| **Status**          | **In Progress**                                                                                                          |
| **Parent**          | [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028/department-workshop-and-processing-queue-model)                 |
| **Branch**          | `agent/spe-2767-workshop-finalization-case-closure`                                                                      |
| **Base `main` SHA** | `2cba2355`                                                                                                               |

## Goal

Automatically resolve open workshop-finalization cases once durable SPE-2766
Fabrication enqueue proof exists.

## Acceptance

- Open/`in_progress` cases with a valid SPE-2765 handoff and non-empty
  `departmentWorkshopFinalizationFabricationQueueId` become `resolved`
  (cleared `assignedTeamIds`, `weeksRemaining` zeroed).
- Week close runs resolve immediately after SPE-2766 Fabrication enqueue
  (including game-over idempotent replay).
- Missing enqueue marker leaves the case open (stock/funding-blocked path).
- Replay / save-load stay resolved without double mutation; siblings isolated.
- Production queue contents are unchanged by the closer.
- Mission `resolveCase` scoring/rewards and failed/cancelled dispositions are
  not used.

## Validation

- `npx vitest run src/test/sim.production.test.ts src/test/departmentWorkshopPersistence.test.ts`
- `npm run lint -- --quiet`
- `npm run verify:backlog-handoff`

## Deferred

| Item                              | Owner              | Why deferred                                                              |
| --------------------------------- | ------------------ | ------------------------------------------------------------------------- |
| Wait for Fabrication completion   | SPE-1028 follow-up | Closure uses enqueue proof only; production duration stays independent.   |
| Fabrication UI redesign           | SPE-1028 follow-up | Domain status flip reuses existing case status.                           |
| Facility modifiers and operations | Separate owners    | No safety, adjacency, quality, facility, report, or operation-event work. |

Parent SPE-1028 remains **In Progress** because its broader workshop acceptance
criteria remain open.
