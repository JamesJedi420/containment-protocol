# SPE-311 — Survey success versus actual site confirmation

| Field      | Value                                                   |
| ---------- | ------------------------------------------------------- |
| **Status** | **In Progress**                                         |
| **Linear** | [SPE-311](https://linear.app/spectranoir/issue/SPE-311) |
| **Parent** | none                                                    |
| **Branch** | `feat/spe-311-survey-site-confirmation`                 |
| **Base**   | `348270b943d8e4e65225b0d6fca875f700a3b10f`              |

## Boundary and plan

Pure `src/domain/surveySiteConfirmation.ts`: separate survey outcome from site confirmation. Successful surveys may resolve to `no_site`, `false_positive_traces`, or `misinformation` without an actionable node; only `viable_site` with a non-empty `siteNodeId` is actionable. Fail closed on malformed packets. No GameState, week-close, UI, or geology simulator.

## Deferred

| Item                        | Owner   | Boundary                                      |
| --------------------------- | ------- | --------------------------------------------- |
| Terrain survey runtime wire | SPE-312 | Terrain-scaled survey clocks remain separate. |
| Catastrophic misinformation | SPE-313 | Broader misinformation pressure stays open.   |
| Resource-site generation    | future  | No site graph mutation in this slice.         |
