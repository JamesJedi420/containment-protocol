# SPE-1310 — Anomaly case lifecycle state machine slice 2

One-page implementation plan. Linear: [SPE-2410](https://linear.app/spectranoir/issue/SPE-2410) (child under [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310)). Follows shipped slice 1 (`planning/anomaly-case-lifecycle-state-machine-slice-1.md`, PR #2687).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2410 — CaseInstance.lifecycleStage persistence (slice 2)](https://linear.app/spectranoir/issue/SPE-2410) |
| **Parent** | [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310) — Anomaly case lifecycle state machine; stays **Backlog** until remaining AC gaps close |
| **Branch** | `spe-1310-anomaly-case-lifecycle-state-machine-slice-2`                                                    |
| **Status** | **In progress** — SPE-2410                                                                                 |
| **Base `main` SHA** | `9ca9ca68`                                                                                          |

## Goal

Persist optional `lifecycleStage?: CaseLifecycleStage` on `CaseInstance` with sanitize/hydrate wire-up and save round-trip tests. Slice 1 shipped the pure domain graph only.

## Prerequisite (on `main` @ `9ca9ca68`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Lifecycle graph      | `src/domain/caseLifecycleStateMachine.ts` (SPE-2409 / PR #2687)        |
| Registry persistence pattern | `planning/minor-anomaly-item-registry-slice-2.md` (SPE-2314)   |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `lifecycleStage?: CaseLifecycleStage` on `CaseInstance`            | `advanceWeek` integration                     |
| `sanitizeCaseLifecycleStage` + `normalizeCaseInstance` hydrate     | UI surfacing                                  |
| `sanitizeCasesMap` wire-up (via normalizeCase)                     | `presumed_neutralized` disposition            |
| Default `lead` on `createStarterCase` only                         | Policy-tier upgrade on adaptation             |
| Drop invalid persisted stages without throw (no silent coerce)     | Legacy `CaseStatus` remapping                 |
| No backfill when field absent on persisted cases                   | Full SPE-1310 parent Done                     |
| Sanitize + save/import round-trip tests                            |                                               |

## Acceptance

- [x] Valid `lifecycleStage` round-trips through serialize/import
- [x] Invalid/unknown stage strings dropped safely on hydrate
- [x] Cases without `lifecycleStage` remain byte-stable after round-trip
- [x] New starter cases get `lifecycleStage: 'lead'`
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/models.ts`, `src/domain/case/normalizeCase.ts`, `src/domain/templates/startingCases.ts` |
| Store  | `src/app/store/runTransfer.ts`                                        |
| Tests  | `src/test/caseLifecycleStagePersistence.test.ts`                      |
| Plan   | `planning/anomaly-case-lifecycle-state-machine-slice-2.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| `advanceWeek` lifecycle tick / intake registry wire-up | SPE-1310 slice 3+ | Requires trigger sources beyond persistence |
| UI surfacing on mission triage / cases board | Mission triage refresh | Blocked per `ux/mission-triage.md` |
| `presumed_neutralized` disposition with surveillance clocks | SPE-1310 / SPE-921 | Parent AC; not in slice-2 graph |
| Policy-revision-on-adaptation tier upgrade transition | SPE-1310 | Adaptation trigger deferred |
| Legacy `CaseStatus` mapping / migration | SPE-1310 follow-up | Preserve mistaken records; map in dedicated slice |

## Validation

- `npm run lint`
- `npm run test:run src/test/caseLifecycleStagePersistence.test.ts`

## See also

- `planning/anomaly-case-lifecycle-state-machine-slice-1.md`
- `src/domain/caseLifecycleStateMachine.ts`
