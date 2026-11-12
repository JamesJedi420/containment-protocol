# SPE-330 — Finite-command construct control

| Field      | Value                                                   |
| ---------- | ------------------------------------------------------- |
| **Status** | **Recently shipped** (PR #4559 @ `370131ef`)            |
| **Linear** | [SPE-330](https://linear.app/spectranoir/issue/SPE-330) |
| **Parent** | none                                                    |
| **Branch** | `feat/spe-330-finite-command-construct`                 |
| **Base**   | `da6fac97`                                              |

## Boundary and plan

Pure `src/domain/finiteCommandConstruct.ts`: fixed bounded command vocabulary; deterministic movement/attack effects; delayed fail-safe after unattended ticks. No AI/NLP or GameState.

## Deferred

| Item                   | Owner    | Boundary                              |
| ---------------------- | -------- | ------------------------------------- |
| Construct runtime wire | SPE-1052 | Week-close / boarding stays separate. |
| Team UI presentation   | SPE-33   | Presentation not in this slice.       |
