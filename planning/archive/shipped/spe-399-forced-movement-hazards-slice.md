# SPE-399 — Long-range and vertical forced-movement hazards

| Field      | Value                                                   |
| ---------- | ------------------------------------------------------- |
| **Status** | **Recently shipped** (PR #4552 @ `5639fd45`)            |
| **Linear** | [SPE-399](https://linear.app/spectranoir/issue/SPE-399) |
| **Parent** | none                                                    |
| **Branch** | `feat/spe-399-forced-movement-hazards`                  |
| **Base**   | `8d248a60e06ba5b361d0f3b490583c3b93b42575`              |

## Boundary and plan

Pure `src/domain/forcedMovementHazard.ts`: kinds for short knockback, long-range horizontal, vertical level change, and one-way exit; apply produces deterministic displacement with `longRange` / `oneWayExit` / `traversalChanged` flags. No physics sim, GameState, or map UI.

## Deferred

| Item                    | Owner  | Boundary                     |
| ----------------------- | ------ | ---------------------------- |
| Packet navigation wire  | future | No live map graph mutation.  |
| Trap system integration | future | Registry only in this slice. |
