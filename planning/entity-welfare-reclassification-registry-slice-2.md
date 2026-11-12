# SPE-2114 — Entity welfare reclassification registry GameState persistence (slice 2)

One-page implementation plan. Linear: [SPE-2339](https://linear.app/spectranoir/issue/SPE-2339) (child under [SPE-2114](https://linear.app/spectranoir/issue/SPE-2114)). Follows shipped slice 1 (`planning/entity-welfare-reclassification-registry-slice-1.md`, PR #2433).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2339 — Entity welfare reclassification registry GameState persistence (slice 2)](https://linear.app/spectranoir/issue/SPE-2339) |
| **Status** | **Shipped** — PR #2545 @ `44967537` |
| **Parent** | [SPE-2114](https://linear.app/spectranoir/issue/SPE-2114) — Entity welfare reclassification registry; umbrella [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) |
| **Branch** | `spe-2114-entity-welfare-reclassification-persistence-slice-2`                                        |
| **Base `main` SHA** | `b2129bd1`                                                                                          |

## Goal

Persist validated `EntityWelfareReclassificationRecord` entries on `GameState` with sanitize/hydration and save round-trip tests. Slice 1 deferred persistence; weekly orchestration and SPE-1046 affiliation wire-up are slice 3+.

## Prerequisite (on `main` @ `b2129bd1`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/entityWelfareReclassificationRegistry.ts` (SPE-2114 / PR #2433) |
| Fixtures             | `PENDING_TO_APPROVED_FIXTURE`, `HOSTILE_TO_COOPERATIVE_FIXTURE` |
| Sibling persistence  | `visualTriggerHazardRecords` (SPE-2336), `massAnomalousPopulationEmergenceRecords` (SPE-2332) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `entityWelfareReclassificationRecords` on `GameState`           | Weekly `advanceWeek` hook    |
| `sanitizeEntityWelfareReclassificationRecords` + `runTransfer` hydrate wire | SPE-1046 affiliation wire-up |
| `validateEntityWelfareReclassificationRecord` on hydrate; drop invalid, no throw | Mirror UI |
| Default `{}` in `createStartingState`                              | SPE-1046 parent Done             |
| Sanitize unit tests + save/import round-trip (byte-stable)         | Registry schema/validation changes |

## Acceptance

- [x] Valid fixture round-trips through serialize/import
- [x] Invalid/duplicate-id entries dropped safely on hydrate
- [x] Franchise/branded token guards preserved on hydrate
- [x] Nested review/evidence refs byte-stable after round-trip
- [x] Warning-only records persist
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/entityWelfareReclassificationRegistry.ts`, `src/domain/models.ts` |
| Store  | `src/app/store/runTransfer.ts`                                        |
| Data   | `src/data/startingState.ts`                                           |
| Tests  | `src/test/entityWelfareReclassificationRegistryPersistence.test.ts` |
| Plan   | `planning/entity-welfare-reclassification-registry-slice-2.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Weekly entity welfare reclassification orchestration hook | SPE-2114 slice 3+ | Persistence must land before orchestration |
| Mirror UI | SPE-1046 follow-up | Out of persistence-only boundary |
| SPE-1046 affiliation wire-up | SPE-1046 | Parent umbrella; out of persistence-only boundary |
| SPE-1888 welfare-debt engine | SPE-1888 | Field hook only in slice 1 |
| SPE-1310 case lifecycle integration | SPE-1310 | Out of registry mirror boundary |

## See also

- `planning/entity-welfare-reclassification-registry-slice-1.md`
- `planning/visual-trigger-hazard-registry-slice-2.md`
