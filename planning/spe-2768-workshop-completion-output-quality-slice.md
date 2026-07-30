# SPE-2768 — Deterministic workshop completion output quality

| Field               | Value                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Linear**          | [SPE-2768](https://linear.app/spectranoir/issue/SPE-2768/deterministic-workshop-completion-output-quality)                |
| **GitHub**          | [#3408](https://github.com/JamesJedi420/containment-protocol/issues/3408)                                                |
| **Status**          | **Shipped** (PR #3409 @ `308e28c7`)                                                                                      |
| **Parent**          | [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028/department-workshop-and-processing-queue-model)                 |
| **Branch**          | `agent/spe-2768-workshop-completion-output-quality`                                                                      |
| **Base `main` SHA** | `affc2ed0`                                                                                                               |

## Goal

Grade workshop completion receipts with deterministic `nominal` / `degraded`
quality from caller-owned condition axes.

## Acceptance

- New completions record durable `quality`; legacy omit sanitizes to `nominal`.
- Any poor input / specialist / room axis yields `degraded` with a stable
  primary reason; all-good and missing conditions yield `nominal`.
- `outcome` remains `completed` for both grades so SPE-2755 / prereq /
  finalization / SPE-2767 resolve stay completion-based.
- Register accepts optional per-work-order conditions; week-close defaults
  nominal (no live facility/staff wiring).
- Replay / save-load keep stored quality; siblings isolated.
- No inventory mutation, safety incidents, adjacency, or UI.

## Validation

- `npx vitest run src/test/departmentWorkshopQueue.test.ts src/test/departmentWorkshopPersistence.test.ts`
- `npm run lint -- --quiet`
- `npm run verify:backlog-handoff`

## Deferred

| Item                                    | Owner              | Why deferred                                                         |
| --------------------------------------- | ------------------ | -------------------------------------------------------------------- |
| Live facility/staff → quality inputs    | SPE-1028 follow-up | This slice keeps caller-owned conditions only.                       |
| Inventory amount mutation from quality  | SPE-1028 follow-up | Grade is recorded on the receipt; stock effects need a separate AC.  |
| Safety / secondary incidents            | `planning/spe-1028-workshop-unsafe-processing-safety-slice.md` / [#3411](https://github.com/JamesJedi420/containment-protocol/issues/3411) | Safety disposition slice records `safe`/`unsafe` on the receipt; incident spawn remains deferred. |
| Adjacency and player workshop surface   | SPE-1028 follow-up | Still outside completion-receipt ownership.                          |

Parent SPE-1028 remains **In Progress** because its broader workshop acceptance
criteria remain open.
