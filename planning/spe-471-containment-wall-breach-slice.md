# SPE-471 — Catastrophic containment-wall breach states

| Field      | Value                                                   |
| ---------- | ------------------------------------------------------- |
| **Status** | **In Progress**                                         |
| **Linear** | [SPE-471](https://linear.app/spectranoir/issue/SPE-471) |
| **Parent** | none                                                    |
| **Branch** | `feat/spe-471-containment-wall-breach`                  |
| **Base**   | `5639fd45691162f798d4993630985360b31149f3`              |

## Boundary and plan

Pure `src/domain/containmentWallBreach.ts`: barriers hold real external media; catastrophic puncture spreads to adjacent zones on a short timer with flow/power-loss coupling and opaque seal/vent/lockdown actuation handoff. Ordinary trap discharge stays non-catastrophic. Does not implement SPE-2101 automation registry. No fluid simulator or GameState.

## Deferred

| Item                         | Owner    | Boundary                                      |
| ---------------------------- | -------- | --------------------------------------------- |
| SPE-2101 automation registry | SPE-2101 | Metadata/authority not implemented here.      |
| Barrier integrity coupling   | SPE-877  | Existing `containmentBarrierIntegrity` stays. |
| Live week-close / UI wire    | future   | Pure packets only.                            |
