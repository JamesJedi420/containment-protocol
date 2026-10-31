# SPE-475 — Interrogation self-incrimination system

| Field      | Value                                                   |
| ---------- | ------------------------------------------------------- |
| **Status** | **In Progress**                                         |
| **Linear** | [SPE-475](https://linear.app/spectranoir/issue/SPE-475) |
| **Parent** | none                                                    |
| **Branch** | `feat/spe-475-interrogation-self-incrimination`         |
| **Base**   | `7850aaf1`                                              |

## Boundary and plan

Pure `src/domain/interrogationSelfIncrimination.ts`: break-state ladder (holds → slip → contradiction → partial_leak → confession) with deprivation/coercion/skill/temperament stacks. No courtroom simulator or GameState.

## Deferred

| Item                         | Owner    | Boundary                                   |
| ---------------------------- | -------- | ------------------------------------------ |
| Detention intake integration | SPE-1052 | Facility/week-close wiring stays separate. |
| Social-conflict UI           | SPE-33   | Presentation layer not in this slice.      |
