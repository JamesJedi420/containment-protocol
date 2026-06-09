# SPE-1310 — Anomaly case lifecycle state machine slice 3

One-page implementation plan. Linear: [SPE-2411](https://linear.app/spectranoir/issue/SPE-2411) (child under [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310)). Follows shipped slice 2 (`planning/anomaly-case-lifecycle-state-machine-slice-2.md`, PR #2689).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2411 — advanceWeek lifecycle transition tick (slice 3)](https://linear.app/spectranoir/issue/SPE-2411) |
| **Parent** | [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310) — Anomaly case lifecycle state machine; stays **Backlog** until remaining AC gaps close |
| **Branch** | `spe-1310-anomaly-case-lifecycle-state-machine-slice-3`                                                    |
| **Status** | **Shipped** — SPE-2411 (PR #2690) @ `aa960b5d`                                                             |
| **Base `main` SHA** | `6e4e4e33`                                                                                          |

## Goal

Apply slice-1 lifecycle transitions during `advanceWeek` when deterministic weekly event sources fire; persist updated `lifecycleStage` on affected cases.

## Prerequisite (on `main` @ `6e4e4e33`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Lifecycle graph      | `src/domain/caseLifecycleStateMachine.ts` (SPE-2409 / PR #2687)        |
| Stage persistence    | `CaseInstance.lifecycleStage` hydrate (SPE-2410 / PR #2689)            |
| Intake corroboration | `applyWeeklyIntakeCorroborationTick` (SPE-854 slice 4)                 |
| Extranormal registry | `extranormalEventRecords` + `escalated_to_case` closure (SPE-2105)     |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `applyCaseLifecycleEventToCase` + `applyWeeklyCaseLifecycleTick`   | UI surfacing                                  |
| `credibility_review_passed` from intake verification upgrade         | `presumed_neutralized` disposition            |
| `anomaly_confirmed` from extranormal `escalated_to_case` ref         | Policy-tier upgrade on adaptation             |
| `advanceWeek` wire-up after intake corroboration                     | Legacy `CaseStatus` remapping                 |
| Skip cases without `lifecycleStage` (no auto-init)                   | Full SPE-1310 parent Done                     |
| Unit + integration tests                                           |                                               |

## Event mapping

| Lifecycle event | Weekly source | Transition |
| --- | --- | --- |
| `credibility_review_passed` | Linked intake report crosses into `verified` or `escalated_confidence` | `lead` → `confirmation` |
| `anomaly_confirmed` | Extranormal record `closureState: escalated_to_case` with matching `escalatedCaseRef` | `confirmation` → `containment` |

Invalid events preserve the current stage. Cases without `lifecycleStage` are unchanged.

## Acceptance

- [x] Lead case advances to `confirmation` when linked intake credibility review passes through `advanceWeek`
- [x] Confirmation case advances to `containment` on extranormal anomaly-confirmation hook
- [x] Cases without `lifecycleStage` remain unchanged after `advanceWeek`
- [x] Invalid transitions preserve stage
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/caseLifecycleWeeklyOrchestration.ts`, `src/domain/sim/advanceWeek.ts` |
| Tests  | `src/test/caseLifecycleWeeklyOrchestration.test.ts`, `src/test/advanceWeek.caseLifecycle.integration.test.ts` |
| Plan   | `planning/anomaly-case-lifecycle-state-machine-slice-3.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| `research_invalidation` / `procedure_revised` weekly hooks | SPE-1310 slice 4+ | No deterministic registry trigger mapped in slice 3 |
| UI surfacing on mission triage / cases board | Mission triage refresh | Blocked per `ux/mission-triage.md` |
| `presumed_neutralized` disposition with surveillance clocks | SPE-1310 / SPE-921 | Parent AC; not in slice-3 graph |
| Policy-revision-on-adaptation tier upgrade transition | SPE-1310 | Adaptation trigger deferred |
| Legacy `CaseStatus` mapping / migration | SPE-1310 follow-up | Preserve mistaken records; map in dedicated slice |

## Validation

- `npm run lint`
- `npm run test:run src/test/caseLifecycleWeeklyOrchestration.test.ts src/test/advanceWeek.caseLifecycle.integration.test.ts`

## See also

- `planning/anomaly-case-lifecycle-state-machine-slice-2.md`
- `src/domain/caseLifecycleStateMachine.ts`
