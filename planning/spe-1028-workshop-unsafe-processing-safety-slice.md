# SPE-1028 child — Deterministic workshop unsafe-processing safety disposition

| Field               | Value                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Linear**          | Pending create under [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028/department-workshop-and-processing-queue-model) (Linear MCP/API unavailable at slice start) |
| **GitHub**          | [#3411](https://github.com/JamesJedi420/containment-protocol/issues/3411)                                                |
| **Status**          | **Shipped** (PR #3412 @ `06a933bc`)                                                                                      |
| **Parent**          | [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028/department-workshop-and-processing-queue-model)                 |
| **Branch**          | `agent/spe-workshop-unsafe-processing-safety`                                                                            |
| **Base `main` SHA** | `ad927cc8`                                                                                                               |

## Goal

Evaluate workshop completion safety from caller-owned isolation / ventilation /
PPE / dual-auth stubs and record an explicit `safe` / `unsafe` disposition on
the durable completion receipt—orthogonal to SPE-2768 quality grades, without
spawning a parallel incident system.

## Acceptance

- New completions record durable `safety`; legacy omit sanitizes to `safe`.
- Any poor isolation / ventilation / ppe / dualAuth axis yields `unsafe` with a
  stable primary reason (isolation → ventilation → ppe → dualAuth); all-good
  and missing conditions yield `safe`.
- Quality `degraded` (including `poor_room_contamination`) does not imply
  safety `unsafe`, and unsafe isolation does not imply quality `degraded`.
- `outcome` remains `completed` for both dispositions so SPE-2755 / prereq /
  finalization / SPE-2767 resolve stay completion-based.
- Register accepts optional per-work-order safety conditions; week-close
  defaults safe (no live facility/staff wiring).
- Replay / save-load keep stored safety; siblings isolated.
- No inventory mutation, incident spawn, adjacency, or UI.

## Validation

- `npx vitest run src/test/departmentWorkshopQueue.test.ts src/test/departmentWorkshopPersistence.test.ts`
- `npm run lint -- --quiet`
- `npm run verify:backlog-handoff`

## Deferred

| Item                                         | Owner              | Why deferred                                                         |
| -------------------------------------------- | ------------------ | -------------------------------------------------------------------- |
| Live facility/staff → safety inputs          | [SPE-2772](https://linear.app/spectranoir/issue/SPE-2772) / `planning/spe-1028-workshop-live-safety-inputs-slice.md` (Backlog; mapping seam required) | Caller-owned conditions only until an explicit mapping seam exists. |
| Secondary incident spawn from unsafe receipt | [#3414](https://github.com/JamesJedi420/containment-protocol/issues/3414) / `planning/spe-1028-workshop-unsafe-secondary-incident-slice.md` | Disposition is recorded only; existing incident producers unchanged. |
| Live facility/staff → quality inputs         | SPE-1028 follow-up | Still deferred from SPE-2768.                                        |
| Adjacency and player workshop surface        | SPE-1028 follow-up | Still outside completion-receipt ownership.                          |

Parent SPE-1028 remains open for broader scope. because its broader workshop acceptance
criteria remain open.
