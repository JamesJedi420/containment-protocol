# SPE-312 — Terrain-scaled survey clocks and coverage

| Field      | Value                                                   |
| ---------- | ------------------------------------------------------- |
| **Status** | **Recently shipped** (PR #4550 @ `b57249c6`)            |
| **Linear** | [SPE-312](https://linear.app/spectranoir/issue/SPE-312) |
| **Parent** | none                                                    |
| **Branch** | `feat/spe-312-terrain-survey-clocks`                    |
| **Base**   | `d68646f5e84def6baf5c876dac227a3dcf6e5b96`              |

## Boundary and plan

Pure `src/domain/terrainSurveyClocks.ts`: authored terrain profiles change both difficulty and area throughput; `applySurveyTick` always spends time and clears a bounded remaining area with persistent `SurveyAreaState`. No instant scan, GameState, week-close, UI, or topography simulator. SPE-311 confirmation and SPE-313 misinformation stay separate.

## Deferred

| Item                  | Owner   | Boundary                         |
| --------------------- | ------- | -------------------------------- |
| Site confirmation     | SPE-311 | Done; do not reimplement.        |
| Catastrophic misreads | SPE-313 | Misinformation layer stays open. |
| Map / GameState wire  | future  | No coverage persistence on save. |
