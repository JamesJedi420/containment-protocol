# SPE-2434 — Psychological resilience registry GameState persistence (slice 2)

One-page implementation plan. Linear: [SPE-2434](https://linear.app/spectranoir/issue/SPE-2434) (child under [SPE-1615](https://linear.app/spectranoir/issue/SPE-1615)). Follows shipped slice 1 registry anchor (`src/domain/psychologicalResilienceRegistry.ts`).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2434 — Psychological resilience registry GameState persistence (slice 2)](https://linear.app/spectranoir/issue/SPE-2434) |
| **Parent** | [SPE-1615](https://linear.app/spectranoir/issue/SPE-1615) — Psychological resilience depletion             |
| **Branch** | `jamesdyedbq/spe-1615-psychological-resilience-registry-slice-2`                                           |
| **Status** | **Shipped** — PR #2739 @ `467fe4d6`                                                                        |
| **Base `main` SHA** | `c6beab29`                                                                                          |

## Goal

Persist validated `PsychologicalResilienceRecord` entries on `GameState` with sanitize/hydration and save round-trip tests. Mirror SPE-2431 / SPE-848 slice 2 persistence pattern. Weekly depletion orchestration deferred to a later slice.

## Prerequisite (on `main` @ `c6beab29`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Resilience registry  | `src/domain/psychologicalResilienceRegistry.ts` (SPE-1615 slice 1)     |
| Fixture              | `PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE`                    |
| Persistence pattern  | `sanitizeSurveillanceInterventionTuningRecords` (SPE-848 slice 2)      |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `psychologicalResilienceRecords` on `GameState`                      | Weekly `advanceWeek` depletion orchestration  |
| `sanitizePsychologicalResilienceRecords` + `runTransfer` hydrate wire | SPE-1908 compose wire-up                   |
| `validatePsychologicalResilienceRecord` on hydrate; drop invalid, no throw | Planning mirror UI                    |
| Default `{}` in `createStartingState`                              | Full SPE-1615 parent Done                     |
| Persistence + advanceWeek preservation regression tests            |                                               |

## Acceptance

- [x] Valid fixture round-trips through serialize/import
- [x] Invalid/duplicate-id entries dropped safely on hydrate
- [x] Owner refs (`operatorRef`) byte-stable after round-trip
- [x] Treatment/rest flags preserved through round-trip
- [x] `advanceWeek` preserves resilience records unchanged
- [x] Slice 1 registry tests unchanged
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/models.ts`                                                |
| Store  | `src/app/store/runTransfer.ts`                                        |
| Data   | `src/data/startingState.ts`                                           |
| Tests  | `src/test/psychologicalResilienceRegistryPersistence.test.ts`, `src/test/advanceWeek.psychologicalResilienceRecords.integration.test.ts` |
| Plan   | `planning/spe-1615-psychological-resilience-registry-slice-2.md`, `planning/backlog.md` |

## Deferred

| Item | Suggested owner | Why deferred |
| ---- | --------------- | ------------ |
| Weekly depletion orchestration hook in `advanceWeek` | SPE-1615 slice 3+ | Persistence must land before orchestration |
| SPE-1908 cross-join compose wiring | SPE-1615 slice 3+ | Populated maps not required for persistence |
| Planning mirror UI | SPE-1615 slice 4+ | Mirror follows persistence pattern |
| Full SPE-1615 parent Done | SPE-1615 | Multiple slices remain |

## See also

- `planning/spe-1615-psychological-resilience-registry-slice-1.md` — registry anchor (shipped)
- `planning/spe-848-surveillance-tuning-registry-slice-2.md` — persistence-only slice pattern
