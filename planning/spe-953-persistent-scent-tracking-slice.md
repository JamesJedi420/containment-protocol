# SPE-953 — Persistent scent tracking and masking countermeasures

| Field      | Value                                                   |
| ---------- | ------------------------------------------------------- |
| **Status** | **In Progress**                                         |
| **Linear** | [SPE-953](https://linear.app/spectranoir/issue/SPE-953) |
| **Parent** | none                                                    |
| **Branch** | `feat/spe-953-persistent-scent-tracking`                |
| **Base**   | `ed8bb53d`                                              |

## Boundary and plan

Pure `src/domain/persistentScentTracking.ts`: durable scent-lock acquisition, bounded masking with pre-encounter prep surfaces, contamination/reacquisition plan-change signal. Distinct from nearby smell checks. No smell simulator or GameState.

## Deferred

| Item                     | Owner    | Boundary                                      |
| ------------------------ | -------- | --------------------------------------------- |
| Trail-forensics layering | SPE-877  | Broader forensics owners stay separate.       |
| Live pursuit / UI wire   | SPE-1052 | Facility/week-close wiring not in this slice. |
