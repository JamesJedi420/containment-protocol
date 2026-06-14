# SPE-1309 — Unified cognitive hazard engine (slice 2)

One-page implementation plan. Linear: child under [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) — **cognitive hazard exposure persistence (slice 2)** (create/claim on start). Parent [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) stays **Backlog** — unified engine AC rows 1–3 not fully met until advanceWeek wire-up slices.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | SPE-1309 child — cognitive hazard exposure persistence (slice 2)                                           |
| **Status** | **In Progress**                                                                                            |
| **Parent** | [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) — Unified cognitive hazard engine (umbrella)    |
| **Branch** | `spe-1309-unified-engine-slice-2`                                                                          |
| **Base `main` SHA** | `aa6c6d90`                                                                                          |

## Goal

Persist validated `CognitiveHazardExposureRecord` entries on `GameState` with sanitize/hydration and save round-trip tests. Mirror SPE-2434 / SPE-1615 slice 2 persistence pattern. Weekly exposure orchestration deferred to a later slice.

## Prerequisite (on `main` @ `aa6c6d90`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Engine anchor        | `src/domain/cognitiveHazardEngine.ts` (SPE-1309 slice 1 / PR #2807)    |
| Fixtures             | `COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE`, memetic escalation, failed countermeasure |
| Persistence pattern  | `sanitizePsychologicalResilienceRecords` (SPE-2434 slice 2)            |

## Gap (pre-slice)

- Slice 1 domain anchor exists but exposure records are not on `GameState`.
- Save/load and hydrate paths do not sanitize cognitive hazard exposure maps.
- No byte-stable round-trip regression for fixture records.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `cognitiveHazardExposureRecords` on `GameState`                    | Weekly `advanceWeek` exposure orchestration   |
| `sanitizeCognitiveHazardExposureRecords` + `runTransfer` hydrate wire | Sibling registry compose wire-up           |
| `validateCognitiveHazardExposureRecord` on hydrate; drop invalid, no throw | Planning mirror UI                    |
| Default `{}` in `createStartingState`                              | Full SPE-1309 parent Done                     |
| Persistence tests (sanitize round-trip, invalid drop, save/load)   | UI surfacing                                  |
| Slice doc (this file) + backlog handoff                            | SPE-2108 / SPE-2116 weekly hook changes       |

## Acceptance

- [x] Valid fixture round-trips through `sanitizeCognitiveHazardExposureRecords`
- [x] Invalid/duplicate-id entries dropped safely on hydrate without throw
- [x] Subject refs byte-stable after save/load round-trip
- [x] Warning-only records (e.g. failed countermeasure without refs) persist when valid
- [x] Repeated sanitize is byte-stable for fixture records
- [x] Slice 1 engine tests unchanged
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/cognitiveHazardEngine.ts`, `src/domain/models.ts`         |
| Store  | `src/app/store/runTransfer.ts`                                        |
| Data   | `src/data/startingState.ts`                                           |
| Tests  | `src/test/cognitiveHazardEnginePersistence.test.ts`                   |
| Plan   | `planning/spe-1309-unified-engine-slice-2.md`, `planning/backlog.md`  |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| `advanceWeek` exposure tick / sibling compose wire-up | SPE-1309 follow-up | Persistence must land before orchestration |
| Agent/knowledge/procedure simulation triggers | SPE-1309 follow-up | Parent AC row 3 runtime effects deferred |
| Planning mirror UI | SPE-1309 follow-up | Mirror follows persistence pattern |
| Full SPE-1309 parent Done | SPE-1309 | Multiple slices remain |

## Validation

- `npm run lint`
- `npm run test:run src/test/cognitiveHazardEnginePersistence.test.ts src/test/cognitiveHazardEngine.test.ts`

## See also

- `planning/spe-1309-unified-engine-slice-1.md` — domain anchor (shipped)
- `planning/spe-1615-psychological-resilience-registry-slice-2.md` — persistence-only slice pattern
