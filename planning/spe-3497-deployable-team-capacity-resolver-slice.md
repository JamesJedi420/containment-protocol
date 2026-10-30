# SPE-3497 — Deployable-team capacity progression resolver (slice 1)

| Field      | Value                                                                                  |
| ---------- | -------------------------------------------------------------------------------------- |
| **Status** | **In Progress**                                                                        |
| **Linear** | [SPE-3497](https://linear.app/spectranoir/issue/SPE-3497)                              |
| **Parent** | [SPE-3045](https://linear.app/spectranoir/issue/SPE-3045) (Backlog); umbrella SPE-1023 |
| **Branch** | `feat/spe-3497-deployable-team-capacity-resolver`                                      |
| **Base**   | `747502039337e542146a067a71449df1d4dcc941`                                             |

## Boundary and plan

Pure `src/domain/deployableTeamCapacity.ts`: resolve organization-wide deployable-team capacity from SPE-3044 `maxDeployableTeams` (6–30) and caller-owned `progressionStep` using the documented SPE-3045 gate formula (`TIER1=4`, terminal step `12`, floor lerp). Assess requested allocations with reason `organization-capacity-exhausted`, never `capacity-locked`. No GameState, week-close, UI, contraction, or grandfathering.

## Formula

```
capacity = 4 + floor((ceiling - 4) * clamp(step, 0, 12) / 12)
```

## Deferred

| Item                                         | Owner    | Boundary                                      |
| -------------------------------------------- | -------- | --------------------------------------------- |
| Idle contraction / grandfathering / over-cap | SPE-3045 | Parent remains open for remaining acceptance. |
| SPE-2898 transition idempotence              | SPE-2898 | Rule-change grandfathering contract.          |
| Live allocation seam wire                    | SPE-3045 | Consume resolver at response allocation.      |
