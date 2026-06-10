# SPE-2431 — Surveillance tuning registry GameState persistence (slice 2)

One-page implementation plan. Linear: [SPE-2431](https://linear.app/spectranoir/issue/SPE-2431) (child under [SPE-848](https://linear.app/spectranoir/issue/SPE-848)). Follows shipped slice 1 registry anchor (`src/domain/surveillanceCapacityInterventionTuningRegistry.ts`).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2431 — Surveillance tuning registry GameState persistence (slice 2)](https://linear.app/spectranoir/issue/SPE-2431) |
| **Parent** | [SPE-848](https://linear.app/spectranoir/issue/SPE-848) — Surveillance and capacity intervention tuning     |
| **Branch** | `jamesdyedbq/spe-848-surveillance-tuning-registry-slice-2`                                                 |
| **Status** | **Ready for PR**                                                                                           |
| **Base `main` SHA** | `94231fb3`                                                                                          |

## Goal

Persist validated `SurveillanceInterventionTuningRecord` entries on `GameState` with sanitize/hydration and save round-trip tests. Mirror SPE-1882 / SPE-1886 slice 2 persistence pattern. Weekly orchestration hook deferred to a later slice.

## Prerequisite (on `main` @ `94231fb3`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Tuning registry      | `src/domain/surveillanceCapacityInterventionTuningRegistry.ts` (SPE-848 slice 1) |
| Fixture              | `SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE`                               |
| Coercive persistence pattern | `sanitizeCoerciveProtocolRecords` in `coerciveContainedPersonProtocolRegistry.ts` |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `surveillanceInterventionTuningRecords` on `GameState`               | Weekly `advanceWeek` orchestration hook       |
| `sanitizeSurveillanceInterventionTuningRecords` + `runTransfer` hydrate wire | Compose / contradiction evaluators / surfacing |
| `validateSurveillanceInterventionTuningRecord` on hydrate; drop invalid, no throw | Full SPE-848 parent Done                 |
| Default `{}` in `createStartingState`                              |                                               |
| Persistence + advanceWeek preservation regression tests            |                                               |

## Acceptance

- [x] Valid fixture round-trips through serialize/import
- [x] Invalid/duplicate-id entries dropped safely on hydrate
- [x] Owner refs (`subjectRef`, `tuningRationaleRef`) byte-stable after round-trip
- [x] `advanceWeek` preserves tuning records unchanged
- [x] Slice 1 registry tests unchanged
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/surveillanceCapacityInterventionTuningRegistry.ts`, `src/domain/models.ts` |
| Store  | `src/app/store/runTransfer.ts`                                        |
| Data   | `src/data/startingState.ts`                                           |
| Tests  | `src/test/surveillanceCapacityInterventionTuningRegistryPersistence.test.ts`, `src/test/advanceWeek.surveillanceInterventionTuningRecords.integration.test.ts` |
| Plan   | `planning/spe-848-surveillance-tuning-registry-slice-2.md`, `planning/backlog.md` |

## Deferred

| Item | Suggested owner | Why deferred |
| ---- | --------------- | ------------ |
| Weekly orchestration hook in `advanceWeek` | SPE-848 slice 3+ | Persistence must land before orchestration |
| Cross-system reconciliation compose wiring | SPE-1908 / SPE-2430 follow-ups | Populated maps not required for persistence |
| Full SPE-848 parent Done | SPE-848 | Multiple slices remain |

## See also

- `planning/coercive-contained-person-protocol-model-slice-2.md` — persistence-only slice pattern
- `planning/spe-1908-cross-system-reconciliation-slice-3.md` — surveillance-tuning cross-join (shipped)
