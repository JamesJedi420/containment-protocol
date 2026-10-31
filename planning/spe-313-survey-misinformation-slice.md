# SPE-313 — Catastrophic survey misinformation

| Field      | Value                                                   |
| ---------- | ------------------------------------------------------- |
| **Status** | **In Progress**                                         |
| **Linear** | [SPE-313](https://linear.app/spectranoir/issue/SPE-313) |
| **Parent** | none                                                    |
| **Branch** | `feat/spe-313-survey-misinformation`                    |
| **Base**   | `b57249c6ed3ecb829b0dc997ee20fd53d478cafc`              |

## Boundary and plan

Pure `src/domain/surveyMisinformation.ts`: critical survey failures imprint `false_absence` or `false_richness`; ordinary failures stay neutral; `revealSurveyMisinformation` is the later reveal action. Reuses `assertBoundedInteger`. No GameState, UI, geology sim, or SPE-311/312 ownership changes.

## Deferred

| Item                 | Owner   | Boundary                  |
| -------------------- | ------- | ------------------------- |
| Site confirmation    | SPE-311 | Done; do not reimplement. |
| Survey clocks        | SPE-312 | Done; do not reimplement. |
| Clue-confidence wire | future  | No GameState confidence.  |
